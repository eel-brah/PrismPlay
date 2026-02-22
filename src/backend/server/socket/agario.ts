import { Server as SocketIOServer } from "socket.io";
import { FastifyInstance } from "fastify";
import { createGuestDb } from "../../modules/agario/agario_service.js";
import { socketAuthSchema } from "../../modules/agario/agario_schema.js";
import { JwtPayload } from "../../modules/user/user_controller.js";
import { agarioEngine } from "../../games/agarioEngine.js";
import { agarioHandlers } from "../../games/agarioHanders.js";

export function init_agario(io: SocketIOServer, fastify: FastifyInstance) {
  const agario = io.of("/agario");

  agario.use(async (socket, next) => {
    const parsed = socketAuthSchema.safeParse(socket.handshake.auth);
    if (!parsed.success) {
      return next(new Error(parsed.error.message));
    }

    const { token, guestId } = parsed.data;

    if (token) {
      try {
        socket.data.guestId = undefined;
        const decoded = fastify.jwt.verify<JwtPayload>(token);
        socket.data.userId = decoded.id as number;
      } catch {
        fastify.log.error({ id: socket.id }, "Invalid credentials");
        return next(new Error("Invalid credentials"));
      }
      return next();
    }

    if (guestId) {
      socket.data.userId = undefined;
      socket.data.guestId = guestId;
      try {
        await createGuestDb(guestId);
      } catch (err) {
        fastify.log.error(
          { id: socket.id },
          err instanceof Error ? err.message : "Unknown error",
        );
        return next(new Error("Internal server error"));
      }
      return next();
    }

    return next(new Error("No identity"));
  });

  agarioEngine(fastify.log, agario);
  agario.on("connection", async (socket) => {
    fastify.log.info({ id: socket.id }, "socket connected");
    await agarioHandlers(socket, fastify);
  });
}
