import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";
import { init_agario } from "./agario";
import { init_pong } from "./pong";

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
    //   transports: ["websocket"],
    // allowUpgrades: false,
  });

  init_agario(io, fastify);
  init_pong(io, fastify);

  fastify.decorate("io", io);
});

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}
