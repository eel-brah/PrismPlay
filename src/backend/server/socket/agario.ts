import { Server as SocketIOServer } from "socket.io";
import { Eject, Orb, PlayerState, Virus } from "src/shared/agario/types";
import { agarioEngine } from "./agarioEngine";
import { agarioHandlers } from "./agarioHanders";
import { FastifyInstance } from "fastify";

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
  agarioEngine(agario);
  agario.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "socket connected");
    agarioHandlers(socket, fastify);
  });
}
