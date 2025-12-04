import { FastifyInstance } from "fastify";
import { Socket } from "socket.io";
import { MAP_HEIGHT, MAP_WIDTH } from "src/shared/agario/config";
import { Player } from "src/shared/agario/player";
import { InputState, PlayerState } from "src/shared/agario/types";
import { randomColor } from "src/shared/agario/utils";

export function agarioHandlers(
  socket: Socket,
  players: Record<string, PlayerState>,
  fastify: FastifyInstance,
) {
  fastify.log.info({ id: socket.id }, "agario handlers attached");

  socket.on("join", (data) => {
    fastify.log.info({ id: socket.id, data }, "player join");
    const newPlayer = new Player(
      socket.id,
      data.name,
      MAP_WIDTH / 2,
      MAP_HEIGHT / 2,
      randomColor(),
    );

    players[socket.id] = {
      player: newPlayer,
      input: null,
    };

    socket.emit("joined", newPlayer.serialize());
  });

  socket.on("input", (input: InputState) => {
    const state = players[socket.id];
    if (!state) return;
    state.input = input;
  });

  socket.on("disconnect", (reason) => {
    fastify.log.info({ id: socket.id, reason }, "socket disconnected");
    if (players[socket.id]) {
      delete players[socket.id];
    }
  });
}
