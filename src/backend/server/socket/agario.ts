import { Server as SocketIOServer } from "socket.io";
import { Eject, Orb, PlayerState, Virus } from "src/shared/agario/types";
import { agarioEngine } from "./agarioEngine";
import { agarioHandlers } from "./agarioHanders";
import { FastifyInstance } from "fastify";

export type World = {
  players: Record<string, PlayerState>;
  orbs: Orb[];
  ejects: Eject[];
  viruses: Virus[];
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
