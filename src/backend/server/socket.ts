import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";

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
    fastify.log.info(`Client connected: ${socket.id}`);
    // io.emit("connected", "User: " + socket.id.toString().slice(0, 3));

    socket.on("chat message", (msg) => {
      io.emit("chat message", socket.id.toString().slice(0, 3) + ": " + msg);
    });

    socket.on("disconnect", () => {
      fastify.log.info(`Client disconnected: ${socket.id}`);
    });
  });

  fastify.decorate("io", io);
});

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}
