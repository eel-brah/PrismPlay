import { Server as SocketIOServer, Socket } from "socket.io";
import { FastifyInstance } from "fastify";
import { registerChatHandlers } from "./chatHandler";

// If you have an auth schema, import it here


export function init_chat(io: SocketIOServer, fastify: FastifyInstance) {
  // 1. Create the Namespace
  const chat = io.of("/chat");

  // 2. Middleware
//   chat.use(async (socket, next) => {
//     // You can uncomment this when you are ready to enforce auth
//     /*
//     const parsed = socketAuthSchema.safeParse(socket.handshake.auth);
//     if (!parsed.success) {
//       return next(new Error(parsed.error.message));
//     }
//     socket.data.userId = parsed.data.userId;
//     */
    
//     // For now, allow connection
//     next();
//   });

  chat.on("connection", (socket: Socket) => {
    fastify.log.info({ id: socket.id }, "User connected to /chat namespace");


    registerChatHandlers(chat, socket);
  });
}