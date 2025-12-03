import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";
import { MAP_HEIGHT, MAP_WIDTH } from "src/games/agario/config";

import { Player } from "src/games/agario/player";

const players: Player[] = [];

export default fp(async function socketPlugin(fastify: FastifyInstance) {
  const io = new SocketIOServer(fastify.server, {
    connectionStateRecovery: {
      // the backup duration of the sessions and the packets
      maxDisconnectionDuration: 2 * 60 * 1000,
      // whether to skip middlewares upon successful recovery
      skipMiddlewares: true,
    },
    cors: {
      origin: "*", //TODO:
    },
  });

  io.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "socket connected");

    socket.on("join", (data) => {
      fastify.log.info({ id: socket.id, data }, "player join");
      
      const new_player = new Player(socket.id, data.name, MAP_WIDTH / 2, MAP_HEIGHT / 2, "#ffffff");
      players.push(new_player);

      socket.emit("joined", { id: socket.id });
    });

    socket.on("player_input", (input) => {
      // TODO: push input to your GameServer
      // e.g. gameServer.handleInput(socket.id, input);
    });

    socket.on("disconnect", (reason) => {
      fastify.log.info({ id: socket.id, reason }, "socket disconnected");
      // TODO: remove from game
    });
  });

  fastify.decorate("io", io);
});

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}
