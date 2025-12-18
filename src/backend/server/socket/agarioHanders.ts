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

export function agarioHandlers(socket: Socket, fastify: FastifyInstance) {
  fastify.log.info({ id: socket.id }, "agario handlers attached");

  socket.on("agario:join-room", ({ room, name }) => {
    //TODO: valadate roomName
    socket.join(room);

    const world = getWorld(room);

    const newPlayer = new Player(socket.id, name.slice(0, 6), randomColor());

    world.players[socket.id] = {
      player: newPlayer,
      input: null,
      splitRequested: false,
      ejectRequested: false,
    };

    socket.data.room = room;

    socket.emit("joined", newPlayer.serialize());
  });

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
