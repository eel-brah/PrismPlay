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
};

type JoinRoomPayload = {
  room: string;
  name: string;
  key?: string;
};

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
  MAX_MINUTES,
  MAX_PLAYERS_PER_ROOM,
  MIN_MINUTES,
  MIN_PLAYERS_PER_ROOM,
} from "src/shared/agario/config";
function makeKey() {
  return crypto.randomBytes(4).toString("hex");
}

function nowMs() {
  return Date.now();
}

function startRoom(world: World) {
  if (world.meta.status === "started") return;
  world.meta.status = "started";
  world.meta.startedAt = nowMs();
  world.meta.endAt = world.meta.startedAt + world.meta.durationMin * 60000;
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

function sendRoomInfo(socket: Socket, world: World) {
  const youAreHost = world.meta.hostId === socket.id;

  socket.emit("agario:room-info", {
    room: world.meta.room,
    visibility: world.meta.visibility,
    status: world.meta.status,
    maxPlayers: world.meta.maxPlayers,
    durationMin: world.meta.durationMin,
    hostId: world.meta.hostId,
    youAreHost,
    key:
      youAreHost && world.meta.visibility === "private"
        ? world.meta.key
        : undefined,
    players: listPlayers(world),
  });
}

function broadcastPlayers(ioNs: Namespace, room: string, world: World) {
  ioNs.to(room).emit("agario:room-players", {
    players: listPlayers(world),
    hostId: world.meta.hostId,
  });
}

export function agarioHandlers(socket: Socket, fastify: FastifyInstance) {
  fastify.log.info({ id: socket.id }, "agario handlers attached");

  if (!worldByRoom.has(DEFAULT_ROOM)) {
    worldByRoom.set(DEFAULT_ROOM, {
      players: {},
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
        hostId: "server",
      },
    });
  }

  socket.on("agario:start-room", () => {
    const room = socket.data.room as string | undefined;
    if (!room) {
      socket.emit("agario:start-error", "No room name provided");
      return;
    }

    const world = worldByRoom.get(room);
    if (!world) {
      socket.emit("agario:start-error", "Room not found");
      return;
    }

    if (world.meta.status !== "waiting") {
      socket.emit("agario:start-error", "Room already started");
      return;
    }

    if (world.meta.hostId !== socket.id) {
      socket.emit("agario:start-error", "Only the host can start");
      return;
    }

    const count = Object.keys(world.players).length;
    if (count < 2) {
      socket.emit("agario:start-error", "Need at least 2 players to start");
      return;
    }

    world.meta.status = "started";
    world.meta.startedAt = Date.now();
    world.meta.endAt = world.meta.startedAt + world.meta.durationMin * 60000;

    for (const s of Object.values(world.players)) {
      s.input = null;
      s.splitRequested = false;
      s.ejectRequested = false;
    }

    socket.nsp.to(room).emit("agario:room-status", { status: "started" });

    for (const id of Object.keys(world.players)) {
      const client = socket.nsp.sockets.get(id);
      if (client) sendRoomInfo(client, world);
    }
  });

  //TODO: create another error
  socket.on("agario:leave-room", () => {
    const room = socket.data.room as string | undefined;
    if (!room) {
      socket.emit("agario:start-error", "No room name provided");
      return;
    }

    const world = worldByRoom.get(room);
    if (!world) {
      socket.emit("agario:start-error", "Room not found");
      return;
    }

    socket.leave(room);
    delete world.players[socket.id];
    socket.data.room = undefined;

    if (world.meta.hostId === socket.id) {
      const remaining = Object.keys(world.players);
      world.meta.hostId = remaining[0] ?? world.meta.hostId;
    }

    if (Object.keys(world.players).length === 0) {
      worldByRoom.delete(room);
    } else {
      broadcastPlayers(socket.nsp, room, world);

      for (const id of Object.keys(world.players)) {
        const client = socket.nsp.sockets.get(id);
        if (client) sendRoomInfo(client, world);
      }
    }

    // socket.emit("agario:left-room");
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
      });
    }

    // summaries.sort((a, b) => {
    //   if (a.status !== b.status) return a.status === "started" ? -1 : 1;
    //   return b.playerCount - a.playerCount;
    // });

    socket.emit("agario:rooms", summaries);
  });

  socket.on("agario:create-room", (payload: CreateRoomPayload) => {
    const roomName = payload.room.trim();
    if (!isValidRoomName(roomName) || roomName === DEFAULT_ROOM) {
      socket.emit("agario:start-error", "Invalid room name");
      return;
    }
    if (worldByRoom.has(roomName)) {
      socket.emit("agario:start-error", "Room already exists");
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
        createdAt: nowMs(),
        hostId: socket.id,
      },
    };

    worldByRoom.set(roomName, world);

    joinRoom(socket, roomName, payload.name);

    socket.emit("agario:room-created", {
      key,
    });
  });

  socket.on("agario:join-room", (payload: JoinRoomPayload) => {
    const roomName =
      payload.room.trim().length > 0 ? payload.room.trim() : DEFAULT_ROOM;
    if (roomName !== DEFAULT_ROOM && !isValidRoomName(roomName)) {
      socket.emit(
        "agario:start-error",
        "Invalid room name (use A-Z, 0-9, _ or -)",
      );
      return;
    }

    if (roomName === DEFAULT_ROOM) {
      joinRoom(socket, DEFAULT_ROOM, payload.name);
      return;
    }

    const world = getWorld(roomName);
    if (!world) {
      socket.emit("agario:start-error", "There is no room with this name");
      return;
    }

    if (world.meta.visibility === "private") {
      if (!payload.key || payload.key !== world.meta.key) {
        socket.emit("agario:start-error", "Invalid room key");
        return;
      }
    }

    const playerCount = Object.keys(world.players).length;
    if (playerCount >= world.meta.maxPlayers) {
      socket.emit("agario:start-error", "Room is full");
      return;
    }

    joinRoom(socket, roomName, payload.name);

    const afterJoinCount = Object.keys(world.players).length;
    if (
      world.meta.status === "waiting" &&
      afterJoinCount == world.meta.maxPlayers
    ) {
      startRoom(world);
      socket.nsp
        .to(roomName)
        .emit("agario:room-status", { status: world.meta.status });
    }
  });

  function joinRoom(socket: Socket, room: string, name: string) {
    const prevRoom = socket.data.room as string | undefined;

    if (prevRoom && prevRoom !== room) {
      socket.leave(prevRoom);
      const prevWorld = worldByRoom.get(prevRoom);
      if (prevWorld) {
        delete prevWorld.players[socket.id];
        if (Object.keys(prevWorld.players).length === 0) {
          worldByRoom.delete(prevRoom);
        }
      }
    }

    let world = worldByRoom.get(room);
    if (!world) {
      socket.emit("agario:start-error", "Fail to join");
      return;
    }

    //TODO: handle same player join the same room multiple times
    socket.join(room);

    const pname =
      name.trim().slice(0, 6) || "Pl" + Math.floor(Math.random() * 1000);
    const newPlayer = new Player(socket.id, pname, randomColor());

    world.players[socket.id] = {
      player: newPlayer,
      input: null,
      splitRequested: false,
      ejectRequested: false,
    };

    socket.data.room = room;
    socket.emit("joined", newPlayer.serialize());

    sendRoomInfo(socket, world);
    broadcastPlayers(socket.nsp, room, world);
  }

  socket.on("input", (input) => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (ctx.world.meta.status !== "started") return;
    ctx.state.input = input;
  });

  socket.on("split", () => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (ctx.world.meta.status !== "started") return;
    ctx.state.splitRequested = true;
  });

  socket.on("eject", () => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    if (ctx.world.meta.status !== "started") return;
    ctx.state.ejectRequested = true;
  });

  socket.on("disconnect", (reason) => {
    fastify.log.info({ id: socket.id, reason }, "socket disconnected");
    const ctx = getCtx(socket);
    if (!ctx) return;

    delete ctx.world.players[socket.id];

    if (ctx.world.meta.hostId === socket.id) {
      const remaining = Object.keys(ctx.world.players);
      ctx.world.meta.hostId = remaining[0] ?? ctx.world.meta.hostId;
    }

    if (Object.keys(ctx.world.players).length === 0) {
      worldByRoom.delete(ctx.room);
    } else {
      broadcastPlayers(socket.nsp, ctx.room, ctx.world);
      for (const id of Object.keys(ctx.world.players)) {
        const client = socket.nsp.sockets.get(id);
        if (client) sendRoomInfo(client, ctx.world);
      }
    }
  });
}
