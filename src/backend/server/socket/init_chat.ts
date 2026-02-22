import { Server as SocketIOServer, Socket } from "socket.io";
import { FastifyInstance } from "fastify";
import { registerChatHandlers } from "./chatHandler.js";

export function init_chat(io: SocketIOServer, fastify: FastifyInstance) {
  const chat = io.of("/chat");
  chat.on("connection", (socket: Socket) => {
    registerChatHandlers(chat, socket);
  });
}
