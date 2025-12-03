import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";
import { INIT_RADIUS, MAP_HEIGHT, MAP_WIDTH } from "src/shared/agario/config";

import { Player } from "src/shared/agario/player";
import { Orb, PlayerData } from "src/shared/agario/types";
import { randomOrb } from "src/shared/agario/utils";

const players: Record<string, PlayerData> = {};

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

  const orbs: Orb[] = [];
  while (orbs.length < 200) {
    orbs.push(randomOrb());
  }

  setInterval(heartbeat, 100);
  function heartbeat() {
    io.sockets.emit("heartbeat", players);
  }

  io.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "socket connected");

    socket.on("join", (data) => {
      fastify.log.info({ id: socket.id, data }, "player join");

      const newPlayerData: PlayerData = {
        id: socket.id,
        name: data.name,
        x: MAP_WIDTH / 2,
        y: MAP_HEIGHT / 2,
        color: "#ffffff",
        radius: INIT_RADIUS,
      };
      players[newPlayerData.id] = newPlayerData;

      socket.emit("joined", newPlayerData);
    });

    socket.on("update", (data: PlayerData) => {
      if (players[data.id]) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
        players[data.id].radius = data.radius;
      }
    });
    socket.on("losers", (losers: string[]) => {
      socket.on("losers", (losers: string[]) => {
        losers.forEach((id) => {
          delete players[id];
          const client = io.sockets.sockets.get(id);

          if (client) {
            client.emit("youLost", { reason: "game_over" });
            client.disconnect(true);
          }
        });
      });
    });

    socket.on("disconnect", (reason) => {
      fastify.log.info({ id: socket.id, reason }, "socket disconnected");
      if (players[socket.id]) {
        delete players[socket.id];
      }
      // TODO: remove from game
    });
  });

  fastify.decorate("io", io);
});

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}
