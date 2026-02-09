import { FastifyBaseLogger, FastifyInstance } from "fastify";
import { Namespace, Socket } from "socket.io";
import { Player } from "../../../shared/agario/player";
import { randomColor } from "../../../shared/agario/utils";
import {
  ActivePlayer,
  CreateRoomPayload,
  FinalStatus,
  JoinRoomPayload,
  PlayerState,
  RoomSummary,
  RoomVisibility,
  World,
} from "../../../shared/agario/types";
import {
  DEFAULT_ROOM,
  INIT_MASS,
  MASS,
  MAX_MINUTES,
  MAX_PLAYERS_PER_ROOM,
  MAX_SPECTATORS_PER_ROOM,
  MIN_MINUTES,
  MIN_PLAYERS_PER_ROOM,
} from "../../../shared/agario/config";
import {
  createPlayerHistoryDb,
  createRoomDb,
  finalizeRoomResultsDb,
  getRoomLeaderboard,
} from "../../modules/agario/agario_service";
import { worldByRoom } from "./agario";
import {
  clampInt,
  ensureDefaultRoom,
  getIdentity,
  identityKey,
  makeKey,
  removeActivePlayer,
} from "./agarioUtils";
import { InputSchema } from "../../modules/agario/agario_schema";

export const activePlayers = new Map<string, ActivePlayer>();
export const MIN_SECOND_TO_STORE = 3;

async function startRoom(world: World) {
  if (world.meta.status === "started") return;

  world.meta.startedAt = Date.now();
  world.meta.endAt = world.meta.startedAt + world.meta.durationMin * 60000;

  const roomDb = await createRoomDb(world.meta);
  world.meta.roomId = roomDb.id;

  world.meta.status = "started";

  for (const s of Object.values(world.players)) {
    s.input = null;
    s.splitRequested = false;
    s.ejectRequested = false;
  }
}

function getCtx(socket: Socket) {
  const room = socket.data.room as string | undefined;
  if (!room) return null;
  const world = worldByRoom.get(room);
  if (!world) return null;
  const state = world.players[socket.id];
  if (!state) return null;
  return { room, world, state };
}

const ROOM_RE = /^[A-Za-z0-9_-]{1,20}$/;
function isValidRoomName(room: string) {
  return ROOM_RE.test(room);
}

function listPlayers(world: World) {
  return Object.values(world.players).map((s) => ({
    id: s.player.id,
    name: s.player.name,
  }));
}

export function sendRoomInfo(socket: Socket, world: World) {
  const youAreHost = world.meta.hostId === socket.data.userId;

  socket.emit("agario:room-info", {
    room: world.meta.room,
    visibility: world.meta.visibility,
    status: world.meta.status,
    maxPlayers: world.meta.maxPlayers,
    durationMin: world.meta.durationMin,
    startedAt: world.meta.startedAt,
    hostId: world.meta.hostId,
    youAreHost,
    key:
      youAreHost && world.meta.visibility === "private"
        ? world.meta.key
        : undefined,
    players: listPlayers(world),
    spectatorCount: world.meta.spectators.size,
  });
}

export function broadcastPlayers(ioNs: Namespace, room: string, world: World) {
  ioNs.to(room).emit("agario:room-players", {
    players: listPlayers(world),
    hostId: world.meta.hostId,
    spectatorCount: world.meta.spectators.size,
  });
}

export async function agarioHandlers(socket: Socket, fastify: FastifyInstance) {
  fastify.log.info({ id: socket.id }, "agario handlers attached");
  try {
    await ensureDefaultRoom();
  } catch (err) {
    fastify.log.error(err, "Failed to initialize default room");
    socket.emit("agario:error", "Server is temporarily unavailable");
    socket.disconnect(true);
    return;
  }

  socket.on("agario:start-room", async () => {
    const room = socket.data.room as string | undefined;
    if (!room) {
      socket.emit("agario:error", "No room name provided");
      return;
    }

    const world = worldByRoom.get(room);
    if (!world) {
      socket.emit("agario:error", "Room not found");
      return;
    }

    if (world.meta.status !== "waiting") {
      socket.emit("agario:warning", "Room already started");
      return;
    }

    if (world.meta.hostId !== socket.data.userId) {
      socket.emit("agario:warning", "Only the host can start");
      return;
    }

    const count = Object.keys(world.players).length;
    if (count < 2) {
      socket.emit("agario:warning", "Need at least 2 players to start");
      return;
    }

    try {
      await startRoom(world);
      socket.nsp.to(room).emit("agario:room-status", {
        status: "started",
        started: world.meta.startedAt,
      });

      for (const id of Object.keys(world.players)) {
        const client = socket.nsp.sockets.get(id);
        if (client) sendRoomInfo(client, world);
      }
    } catch (err) {
      fastify.log.error(
        { id: socket.id },
        err instanceof Error ? err.message : "Unknown error",
      );
      socket.emit("agario:error", "Internal server error");
    }
  });

  socket.on("agario:list-rooms", () => {
    const summaries: RoomSummary[] = [];

    const t = Date.now();
    for (const [room, world] of worldByRoom) {
      const playerCount = Object.keys(world.players).length;

      let timeLeftSec: number | null = null;
      if (world.meta.status === "started" && world.meta.endAt) {
        timeLeftSec = Math.max(0, Math.ceil((world.meta.endAt - t) / 1000));
      }

      summaries.push({
        room,
        visibility: world.meta.visibility,
        status: world.meta.status,
        playerCount,
        maxPlayers: world.meta.maxPlayers,
        durationMin: world.meta.durationMin,
        timeLeftSec,
        allowSpectators: world.meta.allowSpectators,
        spectatorCount: world.meta.spectators.size,
      });
    }

    // summaries.sort((a, b) => {
    //   if (a.status !== b.status) return a.status === "started" ? -1 : 1;
    //   return b.playerCount - a.playerCount;
    // });

    socket.emit("agario:rooms", summaries);
  });

  socket.on("agario:create-room", async (payload: CreateRoomPayload) => {
    if (!socket.data.userId) {
      socket.emit("agario:error", "You must be logged in to create a room");
      return;
    }

    const roomName = payload.room.trim();
    if (!isValidRoomName(roomName) || roomName === DEFAULT_ROOM) {
      socket.emit("agario:error", "Invalid room name");
      return;
    }
    if (worldByRoom.has(roomName)) {
      socket.emit("agario:error", "Room already exists");
      return;
    }

    const visibility: RoomVisibility =
      payload.visibility === "private" ? "private" : "public";

    const maxPlayers = clampInt(
      payload.maxPlayers,
      MIN_PLAYERS_PER_ROOM,
      MAX_PLAYERS_PER_ROOM,
    );
    const durationMin = clampInt(payload.durationMin, MIN_MINUTES, MAX_MINUTES);

    const key = visibility === "private" ? makeKey() : undefined;

    const world: World = {
      players: {},
      orbs: [],
      ejects: [],
      viruses: [],
      meta: {
        room: roomName,
        visibility,
        key,
        maxPlayers,
        durationMin,
        status: "waiting",
        createdAt: Date.now(),
        hostId: socket.data.userId,
        allowSpectators: payload.allowSpectators,
        spectators: new Set(),
      },
    };
    worldByRoom.set(world.meta.room, world);

    const identity = getIdentity(socket);
    socket.data.identity = identity;
    await joinRoom(socket, world, roomName, payload.name, false, true);

    socket.emit("agario:room-created", {
      key,
    });
  });

  async function forceLeave(
    logger: FastifyBaseLogger,
    socket: Socket,
    room: string,
  ) {
    await deletePlayer(logger, socket, room);
    cleanupActivePlayer(socket);
  }

  socket.on("agario:join-room", async (payload: JoinRoomPayload) => {
    const roomName =
      payload.room.trim().length > 0 ? payload.room.trim() : DEFAULT_ROOM;
    if (roomName !== DEFAULT_ROOM && !isValidRoomName(roomName)) {
      socket.emit("agario:error", "Invalid room name (use A-Z, 0-9, _ or -)");
      return;
    }

    let world = worldByRoom.get(roomName);
    if (!world) {
      socket.emit("agario:error", "There is no room with this name");
      return;
    }

    if (world.meta.visibility === "private") {
      if (!payload.key || payload.key !== world.meta.key) {
        socket.emit("agario:error", "Invalid room key");
        return;
      }
    }

    const identity = getIdentity(socket);
    socket.data.identity = identity;

    await joinRoom(socket, world, roomName, payload.name, payload.spectator);

    if (world.meta.status === "waiting") {
      if (Object.keys(world.players).length === world.meta.maxPlayers) {
        try {
          await startRoom(world);
          socket.nsp.to(roomName).emit("agario:room-status", {
            status: world.meta.status,
            startedAt: world.meta.startedAt,
          });
        } catch (err) {
          fastify.log.error(
            { id: socket.id },
            err instanceof Error ? err.message : "Unknown error",
          );
          socket.emit("agario:error", "Internal server error");
        }
      }
    }
  });

  async function joinRoom(
    socket: Socket,
    world: World,
    room: string,
    name: string,
    spectator: boolean = false,
    create: boolean = false,
  ) {
    const identity = getIdentity(socket);
    const key = identityKey(identity);

    const existing = activePlayers.get(key);

    if (existing) {
      if (existing.timeoutId && !create) {
        clearTimeout(existing.timeoutId);
        if (socket.id != existing.socketId) {
          const oldId = existing.socketId;
          const oldState = world.players[oldId];

          if (!oldState) {
            activePlayers.delete(key);
            socket.emit("agario:error", "Reconnection failed");
            return;
          }

          world.players[socket.id] = world.players[existing.socketId];
          delete world.players[oldId];
          world.players[socket.id].player.id = socket.id;
          existing.socketId = socket.id;
        }

        existing.disconnectedAt = undefined;
        existing.timeoutId = undefined;
        activePlayers.set(key, existing);
        socket.join(room);
        socket.data.room = room;
        socket.data.role = spectator ? "spectator" : "player";
        socket.emit(
          "joined",
          world.players[socket.id].player.serialize(),
          false,
        );
        sendRoomInfo(socket, world);
        broadcastPlayers(socket.nsp, room, world);
        return;
      }

      if (existing.roomName === room) {
        socket.emit("agario:warning", "Already in this room");
        return;
      }
      const oldSocket = socket.nsp.sockets.get(existing.socketId);
      if (oldSocket) {
        oldSocket.emit("agario:backtomenu");
        await forceLeave(fastify.log, oldSocket, existing.roomName);
      }
    }

    if (!create) {
      if (!spectator) {
        const playerCount = Object.keys(world.players).length;
        if (playerCount >= world.meta.maxPlayers) {
          socket.emit("agario:error", "Room is full");
          return;
        }
      } else {
        if (!world.meta.allowSpectators) {
          socket.emit("agario:error", "Spectators are not allowed");
          return;
        }
        if (world.meta.spectators.size >= MAX_SPECTATORS_PER_ROOM) {
          socket.emit("agario:error", "Spectator limit reached");
          return;
        }
      }
    }
    socket.join(room);
    socket.data.room = room;
    socket.data.role = spectator ? "spectator" : "player";

    if (spectator) {
      world.meta.spectators.add(socket.id);

      socket.emit("joined", null, true);

      sendRoomInfo(socket, world);
      broadcastPlayers(socket.nsp, room, world);
      return;
    }

    const ap: ActivePlayer = {
      identity,
      roomName: room,
      socketId: socket.id,
      sessionId: socket.data.sessionId,
      timeoutId: undefined,
    };

    activePlayers.set(key, ap);

    const pname =
      name.trim().slice(0, 6) || "Pl" + Math.floor(Math.random() * 1000);
    const newPlayer = new Player(socket.id, pname, randomColor());

    world.players[socket.id] = {
      player: newPlayer,
      startTime: Date.now(),
      endTime: Date.now(),
      kills: 0,
      maxMass: INIT_MASS / MASS,
      input: null,
      userId: socket.data.userId,
      guestId: socket.data.guestId,
      splitRequested: false,
      ejectRequested: false,
      virusEatTimes: [],
    };

    socket.emit("joined", newPlayer.serialize(), false);

    sendRoomInfo(socket, world);
    broadcastPlayers(socket.nsp, room, world);
  }

  socket.on("input", (input) => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (ctx.world.meta.spectators.has(socket.id)) return;
    if (ctx.world.meta.status !== "started") return;

    const parsed = InputSchema.safeParse(input);
    if (!parsed.success) return;
    ctx.state.input = parsed.data;
  });

  socket.on("split", () => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (ctx.world.meta.spectators.has(socket.id)) return;
    if (ctx.world.meta.status !== "started") return;
    ctx.state.splitRequested = true;
  });

  socket.on("eject", () => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (ctx.world.meta.spectators.has(socket.id)) return;
    if (ctx.world.meta.status !== "started") return;
    ctx.state.ejectRequested = true;
  });

  socket.on("agario:leave-room", async () => {
    const room = socket.data.room as string | undefined;

    if (!room) {
      socket.emit("agario:error", "No room name provided");
      return;
    }

    await deletePlayer(fastify.log, socket, room);
    cleanupActivePlayer(socket);

    socket.emit("agario:left-room");
  });

  socket.on("agario:request-leaderboard", async ({ room }) => {
    const world = worldByRoom.get(room);
    if (!world) return;

    try {
      if (world.meta.roomId) {
        const leaderboard = await getRoomLeaderboard(world.meta.roomId);
        socket.emit("agario:leaderboard", leaderboard);
      } else fastify.log.info("Room id is missing");
    } catch (err) {
      fastify.log.error(
        { id: socket.id },
        err instanceof Error ? err.message : "Unknown error",
      );
      socket.emit("agario:error", "Internal server error");
    }
  });

  socket.on("disconnect", async (reason) => {
    fastify.log.info({ id: socket.id, reason }, "socket disconnected");

    const room = socket.data.room as string | undefined;
    if (!room) return null;

    const world = worldByRoom.get(room);
    if (!world) {
      socket.emit("agario:error", "Room not found");
      return;
    }
    if (world.meta.spectators.has(socket.id)) {
      await deletePlayer(fastify.log, socket, room, true);
      return;
    }

    const key = identityKey(getIdentity(socket));
    const ap = activePlayers.get(key);
    if (!ap) return;
    ap.disconnectedAt = Date.now();

    ap.timeoutId = setTimeout(async () => {
      if (ap.disconnectedAt === undefined) return;
      await deletePlayer(fastify.log, socket, ap.roomName, true);
      cleanupActivePlayer(socket);
    }, 10000);
  });
}

function cleanupActivePlayer(socket: Socket) {
  const key = identityKey(getIdentity(socket));
  const ap = activePlayers.get(key);
  if (!ap) return;
  if (ap.timeoutId) clearTimeout(ap.timeoutId);
  activePlayers.delete(key);
}

async function deletePlayer(
  logger: FastifyBaseLogger,
  socket: Socket,
  roomName: string,
  disconnected = false,
) {
  const world = worldByRoom.get(roomName);
  if (!world) {
    if (!disconnected) socket.emit("agario:error", "Room not found");
    return;
  }

  const isPlayer = socket.id in world.players;
  const isSpec = world.meta.spectators.has(socket.id);
  if (!isPlayer && !isSpec) {
    if (!disconnected) socket.emit("agario:error", "Invalid");
    return;
  }

  let state: PlayerState | undefined = undefined;
  if (isPlayer) {
    const key = identityKey(getIdentity(socket));
    const ap = activePlayers.get(key);
    if (ap?.timeoutId) clearTimeout(ap.timeoutId);

    removeActivePlayer(socket);
    state = world.players[socket.id];
    if (world.meta.status == "started") {
      state.endTime = Date.now();
      const duration = state.endTime - state.startTime;
      if (duration / 1000 > MIN_SECOND_TO_STORE) {
        try {
          await createPlayerHistoryDb(
            world.meta.roomId!,
            duration,
            state.maxMass,
            state.kills,
            state.player.name,
            socket.data.userId,
            socket.data.guestId,
          );
        } catch (err) {
          if (!disconnected)
            socket.emit("agario:error", "Internal server error");
          logger.error(
            { id: socket.id },
            err instanceof Error ? err.message : "Unknown error",
          );
        }
      }
    }

    delete world.players[socket.id];
  } else {
    world.meta.spectators.delete(socket.id);
    socket.leave(roomName);
    broadcastPlayers(socket.nsp, roomName, world);
    for (const id of Object.keys(world.players)) {
      const client = socket.nsp.sockets.get(id);
      if (client) sendRoomInfo(client, world);
    }
  }

  if (world.meta.hostId === socket.data.userId) {
    let nextHost: number | undefined;
    for (const p of Object.values(world.players)) {
      if (typeof p.userId === "number") {
        nextHost = p.userId;
        break;
      }
    }
    world.meta.hostId = nextHost ?? -1;
  }

  if (Object.keys(world.players).length === 0 && roomName !== DEFAULT_ROOM) {
    if (world.meta.status === "started") {
      let leaderboard = undefined;
      try {
        if (world.meta.roomId) {
          await finalizeRoomResultsDb(world.meta.roomId);
          leaderboard = await getRoomLeaderboard(world.meta.roomId);
        } else logger.info("Room id is missing");
      } catch (err) {
        logger.error(
          { id: socket.id },
          err instanceof Error ? err.message : "Unknown error",
        );
        socket.emit("agario:error", "Internal server error");
      }
      if (leaderboard)
        socket.nsp.to(roomName).emit("agario:leaderboard", leaderboard);
      socket.to(world.meta.room).emit("agario:room-ended");
    }
    worldByRoom.delete(roomName);
    socket.leave(roomName);
  } else {
    socket.leave(roomName);
    if (state) {
      const finalStatus: FinalStatus = {
        id: socket.id,
        name: state.player.name,
        kills: state.kills,
        maxMass: state.maxMass,
      };
      if (!disconnected) socket.emit("agario:final-status", finalStatus);
    }
    broadcastPlayers(socket.nsp, roomName, world);
    for (const id of Object.keys(world.players)) {
      const client = socket.nsp.sockets.get(id);
      if (client) sendRoomInfo(client, world);
    }
  }
}
