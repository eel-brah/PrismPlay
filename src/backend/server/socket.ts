import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";

export default fp(async function socketPlugin(fastify: FastifyInstance) {
  const io = new SocketIOServer(fastify.server, {
    // connectionStateRecovery: {},
    cors: {
      origin: "*", //TODO:
    },
  });

  io.on("connection", (socket) => {
    fastify.log.info(`Client connected: ${socket.id}`);

    // socket.on("message", (data: string) => {
    //   fastify.log.info(`Received message: ${data}`);
    //   socket.broadcast.emit("message", data); // send to all other clients
    // });
    //
    // socket.emit("message", "Hello from server!");

    socket.on("chat message", (msg) => {
      io.emit("chat message", msg);
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
