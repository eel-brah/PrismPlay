import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";
import { agarioHandlers } from "./agarioHanders";
import { MAX_ORBS, ORB_RADIUS } from "src/shared/agario/config";
import {
  Eject,
  Mouse,
  Orb,
  PlayerData,
  PlayerState,
  Virus,
} from "src/shared/agario/types";
import { randomOrb } from "src/shared/agario/utils";
import { agarioEngine } from "./agarioEngine";

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

  const players: Record<string, PlayerState> = {};
  const orbs: Orb[] = [];
  const ejects: Eject[] = [];
  const viruses: Virus[] = [];

  agarioEngine(io, players, orbs, ejects, viruses);

  io.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "socket connected");

    agarioHandlers(socket, players, fastify);
  });

  fastify.decorate("io", io);
});

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}
