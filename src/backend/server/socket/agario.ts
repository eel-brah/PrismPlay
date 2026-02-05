import { Server as SocketIOServer } from "socket.io";
import { agarioEngine } from "./agarioEngine";
import { activePlayers, agarioHandlers } from "./agarioHanders";
import { FastifyInstance } from "fastify";
import { createGuestDb } from "src/backend/modules/agario/agario_service.ts";
import { socketAuthSchema } from "src/backend/modules/agario/agario_schema.ts";
import { World } from "src/shared/agario/types";
import { JwtPayload } from "src/backend/modules/user/user_controller";
import { getIdentity, identityKey } from "./agarioUtils";

export const worldByRoom = new Map<string, World>();

export function init_agario(io: SocketIOServer, fastify: FastifyInstance) {
  const agario = io.of("/agario");

  agario.use(async (socket, next) => {
    const parsed = socketAuthSchema.safeParse(socket.handshake.auth);
    if (!parsed.success) {
      return next(new Error(parsed.error.message));
    }

    const { sessionId, token, guestId } = parsed.data;

    if (!sessionId) {
      return next(new Error("Missing sessionId"));
    }

    socket.data.sessionId = sessionId;
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
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        fastify.log.error({ id: socket.id }, errorMessage);
        return next(new Error("Guest creation failed"));
      }
      return next();
    }

    return next(new Error("No identity"));
  });

  agarioEngine(fastify.log, agario);
  agario.on("connection", async (socket) => {
    fastify.log.info({ id: socket.id }, "socket connected");
    //TODO: test this
    const ap = activePlayers.get(identityKey(getIdentity(socket)));

    if (socket.recovered) {
      fastify.log.info({ id: socket.id }, "socket recovered");
      if (ap?.timeoutId) {
        clearTimeout(ap.timeoutId);
        ap.timeoutId = undefined;
        ap.disconnectedAt = undefined;
      }
      return;
    }
    await agarioHandlers(socket, fastify);
  });
}
