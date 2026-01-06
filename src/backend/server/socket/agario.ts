import { Server as SocketIOServer } from "socket.io";
import { Eject, Orb, PlayerState, Virus } from "src/shared/agario/types";
import { agarioEngine } from "./agarioEngine";
import { agarioHandlers } from "./agarioHanders";
import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/prisma.ts";
import { createGuestDb } from "src/backend/modules/agario/agario_service.ts";
import { socketAuthSchema } from "src/backend/modules/agario/agario_schema.ts";

export type RoomVisibility = "public" | "private";
export type RoomStatus = "waiting" | "started";

export type RoomMeta = {
  roomId?: number;
  room: string;
  visibility: RoomVisibility;
  key?: string;
  maxPlayers: number;
  durationMin: number;

  status: RoomStatus;
  createdAt: number;
  startedAt?: number;
  endAt?: number;

  hostId: number;

  allowSpectators: boolean;
  spectators: Set<string>;
};

export type WorldHistory = {
  playerName: string;
  maxMass: number;
  kills: number;
  durationMs: number;
};

export type World = {
  players: Record<string, PlayerState>;
  history: Map<string, WorldHistory>;
  orbs: Orb[];
  ejects: Eject[];
  viruses: Virus[];
  meta: RoomMeta;
};

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
        const decoded = fastify.jwt.verify(token);
        socket.data.userId = decoded.id as number;
      } catch {
        return next(new Error("Invalid credentials"));
      }
      return next();
    }

    if (guestId) {
      socket.data.userId = undefined;
      socket.data.guestId = guestId;
      await createGuestDb(guestId);
      return next();
    }

    return next(new Error("No identity"));
  });

  agarioEngine(agario);
  agario.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "socket connected");
    agarioHandlers(socket, fastify);
  });
}
