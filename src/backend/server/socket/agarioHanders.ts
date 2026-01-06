import { FastifyInstance } from "fastify";
import { Namespace, Socket } from "socket.io";
import { Player } from "src/shared/agario/player";
import { randomColor } from "src/shared/agario/utils";
import { RoomVisibility, World, worldByRoom } from "./agario";

type CreateRoomPayload = {
  room: string;
  name: string;
  visibility: RoomVisibility;
  maxPlayers: number;
  durationMin: number;
  allowSpectators: boolean;
};

type JoinRoomPayload = {
  room: string;
  name: string;
  key?: string;
  spectator: boolean;
};

type Identity = {
  type: string;
  userId?: number;
  guestId?: string;
};

type ActivePlayer = {
  identity: Identity;
  roomName: string;

  socketId: string;
  sessionId: string;
  disconnectedAt?: number;
};

const activePlayers = new Map<string, ActivePlayer>();

export function removeActivePlayer(socket: Socket) {
  const key = identityKey(getIdentity(socket));
  const activePlayer = activePlayers.get(key);
  if (activePlayer?.socketId == socket.id) {
    activePlayers.delete(key);
  }
}

function getIdentity(socket: Socket): Identity {
  if (socket.data.userId) {
    return { type: "user", userId: socket.data.userId };
  }

  return { type: "guest", guestId: socket.data.guestId };
}
function identityKey(identity: Identity) {
  return identity.type === "user"
    ? `user:${identity.userId}`
    : `guest:${identity.guestId}`;
}

function clampInt(n: number, min: number, max: number) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

import crypto from "crypto";
import { RoomSummary } from "src/shared/agario/types";
import {
  DEFAULT_ROOM,
  DEFAULT_ROOM_MAX_PLAYERS,
  INIT_MASS,
  MASS,
  MAX_MINUTES,
  MAX_PLAYERS_PER_ROOM,
  MAX_SPECTATORS_PER_ROOM,
  MIN_MINUTES,
  MIN_PLAYERS_PER_ROOM,
} from "src/shared/agario/config";
import prisma from "src/backend/utils/prisma";
import {
  createPlayerHistoryDb,
  createRoomDb,
  endRoomDb,
  finalizeRoomResultsDb,
  startRoomDb,
} from "src/backend/modules/agario/agario_service";
function makeKey() {
  return crypto.randomBytes(4).toString("hex");
}

function nowMs() {
  return Date.now();
}

async function startRoom(world: World) {
  if (world.meta.status === "started") return;
  world.meta.status = "started";
  world.meta.startedAt = nowMs();
  world.meta.endAt = world.meta.startedAt + world.meta.durationMin * 60000;

  for (const s of Object.values(world.players)) {
    s.input = null;
    s.splitRequested = false;
    s.ejectRequested = false;
  }
  await startRoomDb(world.meta.roomId!);
}

function getWorld(room: string): World | undefined {
  return worldByRoom.get(room);
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

  if (!worldByRoom.has(DEFAULT_ROOM)) {
    const defaultWorld: World = {
      players: {},
      history: new Map(),
      orbs: [],
      ejects: [],
      viruses: [],
      meta: {
        room: DEFAULT_ROOM,
        visibility: "public",
        maxPlayers: DEFAULT_ROOM_MAX_PLAYERS,
        durationMin: 0,
        status: "started",
        createdAt: 0,
        startedAt: undefined,
        endAt: undefined,
        hostId: -1,
        allowSpectators: true,
        spectators: new Set(),
      },
    };
    try {
      const roomDb = await createRoomDb(defaultWorld.meta);
      defaultWorld.meta.roomId = roomDb.id;
      worldByRoom.set(DEFAULT_ROOM, defaultWorld);
    } catch (err) {
      if (err instanceof Error) {
        socket.emit("agario:error", err.message);
      } else {
        socket.emit("agario:error", "Unknown error");
      }
    }
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

    console.log("IDDD: ", world.meta.hostId , socket.data.userId) ;
    if (world.meta.hostId !== socket.data.userId) {
      socket.emit("agario:warning", "Only the host can start");
      return;
    }

    const count = Object.keys(world.players).length;
    if (count < 2) {
      socket.emit("agario:warning", "Need at least 2 players to start");
      return;
    }

    await startRoom(world);

    socket.nsp.to(room).emit("agario:room-status", { status: "started" });

    for (const id of Object.keys(world.players)) {
      const client = socket.nsp.sockets.get(id);
      if (client) sendRoomInfo(client, world);
    }
  });

  socket.on("agario:list-rooms", () => {
    const summaries: RoomSummary[] = [];

    const t = nowMs();
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
    //TODO: 
    // if (!socket.data.userId) {
    //   socket.emit("agario:error", "You must be logged in to create a room");
    //   return;
    // }

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
      history: new Map(),
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
        createdAt: nowMs(),
        hostId: socket.data.userId,
        allowSpectators: payload.allowSpectators,
        spectators: new Set(),
      },
    };
    try {
      const roomDb = await createRoomDb(world.meta);
      world.meta.roomId = roomDb.id;
      worldByRoom.set(roomName, world);
    } catch (err) {
      if (err instanceof Error) {
        socket.emit("agario:error", err.message);
      } else {
        socket.emit("agario:error", "Unknown error");
      }
      return;
    }

    const identity = getIdentity(socket);
    socket.data.identity = identity;
    await joinRoom(socket, roomName, payload.name);

    socket.emit("agario:room-created", {
      key,
    });
  });

  async function forceLeave(socket: Socket) {
    const room = socket.data.room as string | undefined;
    if (!room) {
      socket.emit("agario:error", "No room name provided");
      return;
    }

    await deletePlayer(socket, room);
  }

  socket.on("agario:join-room", async (payload: JoinRoomPayload) => {
    const roomName =
      payload.room.trim().length > 0 ? payload.room.trim() : DEFAULT_ROOM;
    if (roomName !== DEFAULT_ROOM && !isValidRoomName(roomName)) {
      socket.emit("agario:error", "Invalid room name (use A-Z, 0-9, _ or -)");
      return;
    }

    const world = getWorld(roomName);
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

    const isSpectator = payload.spectator === true;

    if (!isSpectator) {
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

    await joinRoom(socket, roomName, payload.name, payload.spectator);

    if (roomName === DEFAULT_ROOM) return;

    const afterJoinCount = Object.keys(world.players).length;
    if (
      world.meta.status === "waiting" &&
      afterJoinCount == world.meta.maxPlayers
    ) {
      await startRoom(world);
      socket.nsp
        .to(roomName)
        .emit("agario:room-status", { status: world.meta.status });
    }
  });

  async function joinRoom(
    socket: Socket,
    room: string,
    name: string,
    spectator: boolean = false,
  ) {
    const prevRoom = socket.data.room as string | undefined;
    if (prevRoom && prevRoom !== room) {
      //TODO: Correct this
      socket.emit("agario:info", "You have joined another room");
      await deletePlayer(socket, room);
    }

    let world = worldByRoom.get(room);
    if (!world) {
      socket.emit("agario:error", "Fail to join");
      return;
    }

    const identity = getIdentity(socket);
    const key = identityKey(identity);
    console.log("K: ", key);
    console.log("S: ", socket.data.sessionId);

    const existing = activePlayers.get(key);

    if (existing) {
      // if (existing.sessionId === socket.data.sessionId) {
      //   existing.socketId = socket.id;
      //   existing.disconnectedAt = undefined;
      //   activePlayers.set(socket.id, existing);
      //   return;
      // }

      const oldSocket = socket.nsp.sockets.get(existing.socketId);
      if (oldSocket) {
        oldSocket.emit("agario:backtomenu");
        await forceLeave(oldSocket);
      }
    }

    // if (socket.data.room === room) {
    //   socket.emit("agario:warning", "Already in this room");
    //   return;
    // }
    //TODO: handle same player join the same room multiple times
    socket.join(room);
    socket.data.room = room;
    socket.data.role = spectator ? "spectator" : "player";

    if (spectator) {
      world.meta.spectators.add(socket.id);

      socket.emit("joined", {
        data: undefined,
        spectator: true,
      });

      sendRoomInfo(socket, world);
      broadcastPlayers(socket.nsp, room, world);
      return;
    }

    const ap: ActivePlayer = {
      identity,
      roomName: room,
      socketId: socket.id,
      sessionId: socket.data.sessionId,
    };

    activePlayers.set(key, ap);

    const pname =
      name.trim().slice(0, 6) || "Pl" + Math.floor(Math.random() * 1000);
    const newPlayer = new Player(socket.id, pname, randomColor());

    world.players[socket.id] = {
      player: newPlayer,
      startTime: nowMs(),
      endTime: nowMs(),
      kills: 0,
      maxMass: INIT_MASS / MASS,
      input: null,
      userId: socket.data.userId,
      guestId: socket.data.guestId,
      splitRequested: false,
      ejectRequested: false,
    };

    socket.emit("joined", newPlayer.serialize(), false);

    sendRoomInfo(socket, world);
    broadcastPlayers(socket.nsp, room, world);
  }

  socket.on("input", (input) => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (socket.data.role === "spectator") return;
    if (ctx.world.meta.status !== "started") return;
    ctx.state.input = input;
  });

  socket.on("split", () => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (socket.data.role === "spectator") return;
    if (ctx.world.meta.status !== "started") return;
    ctx.state.splitRequested = true;
  });

  socket.on("eject", () => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (socket.data.role === "spectator") return;
    if (ctx.world.meta.status !== "started") return;
    ctx.state.ejectRequested = true;
  });

  socket.on("agario:leave-room", async () => {
    const room = socket.data.room as string | undefined;

    if (!room) {
      socket.emit("agario:error", "No room name provided");
      return;
    }

    await deletePlayer(socket, room);

    // socket.emit("agario:left-room");
  });
  socket.on("disconnect", async (reason) => {
    fastify.log.info({ id: socket.id, reason }, "socket disconnected");

    const ap = activePlayers.get(identityKey(getIdentity(socket)));
    if (!ap) return;

    // ap.disconnectedAt = Date.now();
    //
    // setTimeout(async () => {
    //   // Reconnected
    //   if (ap.disconnectedAt === undefined) return;

    // await saveGameResult(socket.id);

    await deletePlayer(socket, ap.roomName);
    // }, 5000);
  });
}

async function deletePlayer(socket: Socket, roomName: string) {
  const world = worldByRoom.get(roomName);
  if (!world) {
    socket.emit("agario:error", "Room not found");
    return;
  }

  const isPlayer = socket.id in world.players;
  const isSpec = world.meta.spectators.has(socket.id);
  if (!isPlayer && !isSpec) {
    socket.emit("agario:error", "Invalid");
    return;
  }

  socket.leave(roomName);
  // socket.data.room = undefined;
  // socket.data.role = undefined;
  // socket.data.identity = undefined;
  // socket.data.sessionId = undefined;
  // socket.data.userId = undefined;
  // socket.data.guestId = undefined;

  removeActivePlayer(socket);

  if (isPlayer) {
    const state = world.players[socket.id];
    state.endTime = Date.now();
    if (world.meta.status == "started") {
      try {
        await createPlayerHistoryDb(
          world.meta.roomId!,
          state.endTime! - state.startTime,
          state.maxMass,
          state.kills,
          socket.data.userId,
          socket.data.guestId,
        );
      } catch (err) {
        //TODO: log error
        if (err instanceof Error) {
          socket.emit("agario:error", err.message);
        } else {
          socket.emit("agario:error", "Unknown error");
        }
      }
    }
    world.history.set(socket.id, {
      playerName: state.player.name,
      maxMass: state.maxMass,
      kills: state.kills,
      durationMs: state.endTime! - state.startTime,
    });

    delete world.players[socket.id];
  } else world.meta.spectators.delete(socket.id);

  if (world.meta.hostId === socket.data.userId) {
    // TODO:
    // world.meta.hostId = Object.keys(world.players)[0] ?? world.meta.hostId;
  }

  if (Object.keys(world.players).length === 0 && roomName !== DEFAULT_ROOM) {
    socket.nsp.to(roomName).emit("agario:room-ended");
    //TODO: store history
    await finalizeRoomResultsDb(world.meta.roomId!);
    // await  endRoomDb(world.meta.roomId!);
    worldByRoom.delete(roomName);
  } else {
    broadcastPlayers(socket.nsp, roomName, world);
    for (const id of Object.keys(world.players)) {
      const client = socket.nsp.sockets.get(id);
      if (client) sendRoomInfo(client, world);
    }
  }
}

// async function saveGameResult(socketId: string){
//   const player = activePlayers.get(socketId);
//   if (!player) return;
//
//   const durationSec = Math.floor((Date.now() - player.startTime) / 1000);
//
//   if (player.identity.type === "user") {
//     await prisma.agarioGameResult.create({
//       data: {
//         userId: player.identity.userId,
//         room: player.roomName,
//         durationMs: durationSec,
//         maxMass: player.maxMass,
//         //TODO:
//         rank: player.rank,
//         kills: player.kills,
//         isWinner: player.isWinner,
//       },
//     });
//   } else {
//     await prisma.agarioGameResult.create({
//       data: {
//         guestId: player.identity.guestId,
//         room: player.roomName,
//         durationMs: durationSec,
//         maxMass: player.maxMass,
//         rank: player.rank,
//         kills: player.kills,
//         isWinner: player.isWinner,
//       },
//     });
//   }
// }
