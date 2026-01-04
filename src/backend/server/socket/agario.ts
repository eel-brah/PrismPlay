import { Server as SocketIOServer } from "socket.io";
import { Eject, Orb, PlayerState, Virus } from "src/shared/agario/types";
import { agarioEngine } from "./agarioEngine";
import { agarioHandlers } from "./agarioHanders";
import { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import prisma from "../../utils/prisma.ts";

export type RoomVisibility = "public" | "private";
export type RoomStatus = "waiting" | "started";

export type RoomMeta = {
  room: string;
  visibility: RoomVisibility;
  key?: string;
  maxPlayers: number;
  durationMin: number;

  status: RoomStatus;
  createdAt: number;
  startedAt?: number;
  endAt?: number;

  hostId: string;

  allowSpectators: boolean;
  spectators: Set<string>;
};

export type World = {
  players: Record<string, PlayerState>;
  orbs: Orb[];
  ejects: Eject[];
  viruses: Virus[];
  meta: RoomMeta;
};

export const worldByRoom = new Map<string, World>();

export function init_agario(io: SocketIOServer, fastify: FastifyInstance) {
  const agario = io.of("/agario");
  agario.use(async (socket, next) => {
    const { token, guestId, sessionId } = socket.handshake.auth;

    if (!sessionId) {
      return next(new Error("Missing sessionId"));
    }

    socket.data.sessionId = sessionId;
    if (token) {
      const decoded = fastify.jwt.verify(token);

      socket.data.userId = decoded.id; 
      socket.data.identityType = "user";

      return next();
    }
    // if (token) {
    //   const user = verifyJWT(token); // your logic
    //   socket.data.userId = user.id;
    //   return next();
    // }

    if (guestId) {
      socket.data.guestId = guestId;

      // await prisma.guest.upsert({
      //   where: { id: guestId },
      //   create: { id: guestId },
      //   update: {},
      // });

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
