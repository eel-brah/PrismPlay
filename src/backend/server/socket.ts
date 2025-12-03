import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";
import { INIT_RADIUS, MAP_HEIGHT, MAP_WIDTH } from "src/shared/agario/config";
import { Orb, PlayerData } from "src/shared/agario/types";
import { randomColor, randomOrb } from "src/shared/agario/utils";

const players: Record<string, PlayerData> = {};
const orbs: Orb[] = [];
const MAX_ORBS = 200;

function ensureOrbs() {
  while (orbs.length < MAX_ORBS) {
    orbs.push(randomOrb());
  }
}

//TODO: moving enemy-player collision logic server-side too so you can’t cheat by editing the client
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

  //TODO: seek better way
  setInterval(heartbeat, 100);
  function heartbeat() {
    ensureOrbs();
    io.sockets.emit("heartbeat", {players, orbs});
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
        color: randomColor(),
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
      losers.forEach((id) => {
        delete players[id];
        const client = io.sockets.sockets.get(id);

        if (client) {
          client.emit("youLost", { reason: "game_over" });
          client.disconnect(true);
        }
      });
    });
    
    socket.on("orbsEaten", (orbIds: string[]) => {
      let changed = false;

      for (const id of orbIds) {
        const index = orbs.findIndex((o) => o.id === id);
        if (index !== -1) {
          orbs.splice(index, 1);
          changed = true;
        }
      }

      if (changed) {
        ensureOrbs();
        // io.sockets.emit("orbsUpdated", orbs);
      }
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
