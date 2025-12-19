import { FastifyInstance } from "fastify";
import { Socket } from "socket.io";
import { Player } from "src/shared/agario/player";
import { randomColor } from "src/shared/agario/utils";
import { World, worldByRoom } from "./agario";

function getWorld(room: string): World {
  let w = worldByRoom.get(room);
  if (!w) {
    w = { players: {}, orbs: [], ejects: [], viruses: [] };
    worldByRoom.set(room, w);
  }
  return w;
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

type agarioPayload = {
  room: string;
  name: string;
};
const ROOM_RE = /^[A-Za-z0-9_-]{1,20}$/;
function isValidRoomName(room: string) {
  return ROOM_RE.test(room);
}

export function agarioHandlers(socket: Socket, fastify: FastifyInstance) {
  fastify.log.info({ id: socket.id }, "agario handlers attached");

  socket.on("agario:join-room", ({ room, name }: agarioPayload) => {
    const roomName = room.trim().length > 0 ? room.trim() : "FFA";
    if (!isValidRoomName(roomName)) {
      socket.emit(
        "agario:start-error",
        "Invalid room name (use A-Z, 0-9, _ or -)",
      );
      return;
    }

    if (roomName === "FFA" || worldByRoom.has(roomName)) {
      socket.join(roomName);
      joinRoom(socket, roomName, name);
    } else {
      socket.emit("agario:start-error", "There is no room with this name");
    }
  });

  socket.on("agario:create-room", ({ room, name }: agarioPayload) => {
    const roomName = room.trim();
    if (!isValidRoomName(roomName) || roomName === "FFA") {
      socket.emit("agario:start-error", "Invalid room name");
      return;
    }

    if (worldByRoom.has(roomName)) {
      socket.emit("agario:start-error", "Room already exists");
      return;
    }

    joinRoom(socket, roomName, name);
  });

  function joinRoom(socket: Socket, room: string, name: string) {
    const prevRoom = socket.data.room as string | undefined;

    if (prevRoom === room) {
      socket.emit("agario:start-error", "You are already in this room");
      return;
    }

    if (prevRoom) {
      socket.leave(prevRoom);
      const prevWorld = worldByRoom.get(prevRoom);
      if (prevWorld) {
        delete prevWorld.players[socket.id];
        if (Object.keys(prevWorld.players).length === 0) {
          worldByRoom.delete(prevRoom);
        }
      }
    }

    socket.join(room);

    const world = getWorld(room);

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
  }

  socket.on("input", (input) => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    ctx.state.input = input;
  });

  socket.on("split", () => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    ctx.state.splitRequested = true;
  });

  socket.on("eject", () => {
    const ctx = getCtx(socket);
    if (!ctx) return;
    ctx.state.ejectRequested = true;
  });

  socket.on("disconnect", (reason) => {
    fastify.log.info({ id: socket.id, reason }, "socket disconnected");
    const ctx = getCtx(socket);
    if (!ctx) return;

    delete ctx.world.players[socket.id];

    if (Object.keys(ctx.world.players).length === 0) {
      worldByRoom.delete(ctx.room);
    }
  });
}
