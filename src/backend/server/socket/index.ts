import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";
import { init_agario } from "./agario";
import { init_pong } from "./pong";
import { init_chat } from "./init_chat";

export default fp(async function socketPlugin(fastify: FastifyInstance) {
  const io = new SocketIOServer(fastify.server, {
    connectionStateRecovery: {
      maxDisconnectionDuration: 10000,
      skipMiddlewares: true,
    },
    cors: {
      origin: "*", //TODO:
    },
    transports: ["websocket"],
  });

  init_agario(io, fastify);
  init_pong(io, fastify);
  init_chat(io, fastify);

  fastify.decorate("io", io);
});

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

/// (1 2)
// 3
/// 3 4
// a b c
