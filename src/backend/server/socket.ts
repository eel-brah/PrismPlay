import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Server as SocketIOServer } from "socket.io";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_ORBS,
  ORB_RADIUS,
} from "src/shared/agario/config";
import { Player } from "src/shared/agario/player";
import {
  InputState,
  Mouse,
  Orb,
  PlayerData,
  PlayerState,
} from "src/shared/agario/types";
import { randomColor, randomOrb } from "src/shared/agario/utils";

const players: Record<string, PlayerState> = {};
const orbs: Orb[] = [];

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

  function ensureOrbs() {
    while (orbs.length < MAX_ORBS) {
      orbs.push(randomOrb());
    }
  }

  function simulate(dt: number) {
    const ids = Object.keys(players);

    for (const id of ids) {
      const state = players[id];
      const p = state.player;
      const input = state.input;

      if (!input) continue;

      const mouse: Mouse = { x: input.mouseX, y: input.mouseY };

      const eatenOrbs = p.update(dt, mouse, orbs);

      if (eatenOrbs.length > 0) {
        let changed = false;
        for (const orbId of eatenOrbs) {
          const idx = orbs.findIndex((o) => o.id === orbId);
          if (idx !== -1) {
            orbs.splice(idx, 1);
            changed = true;
            const sumArea =
              Math.PI * p.radius * p.radius + Math.PI * ORB_RADIUS * ORB_RADIUS;

            p.radius = Math.sqrt(sumArea / Math.PI);
          }
        }
        if (changed) {
          ensureOrbs();
        }
      }
    }

    handlePlayerCollisions();
  }

  function handlePlayerCollisions() {
    const ids = Object.keys(players);
    const removed = new Set<string>();

    for (let i = 0; i < ids.length; i++) {
      const idA = ids[i];
      if (removed.has(idA)) continue;

      const a = players[idA].player;

      for (let j = i + 1; j < ids.length; j++) {
        const idB = ids[j];
        if (removed.has(idB)) continue;

        const b = players[idB].player;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);

        if (distance >= a.radius + b.radius) {
          continue;
        }

        let eater: PlayerData | null = null;
        let eatenId: string | null = null;

        if (a.radius >= b.radius * 1.1) {
          eater = a;
          eatenId = idB;
        } else if (b.radius >= a.radius * 1.1) {
          eater = b;
          eatenId = idA;
        } else {
          continue;
        }

        if (!eater || !eatenId) continue;

        const eaten = players[eatenId].player;
        if (!eaten) continue;

        const sumArea =
          Math.PI * eater.radius * eater.radius +
          Math.PI * eaten.radius * eaten.radius;

        eater.radius = Math.sqrt(sumArea / Math.PI);

        removed.add(eatenId);
      }
    }

    for (const id of removed) {
      delete players[id];
      const client = io.sockets.sockets.get(id);
      if (client) {
        client.emit("youLost", { reason: "eaten" });
        // client.disconnect(true);
      }
    }
  }

  function broadcastState() {
    const serializedPlayers: Record<string, PlayerData> = {};
    for (const [id, state] of Object.entries(players)) {
      serializedPlayers[id] = state.player.serialize();
    }

    io.sockets.emit("heartbeat", {
      players: serializedPlayers,
      orbs,
    });
  }

  let lastTime = Date.now();
  setInterval(() => {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    simulate(dt);
    ensureOrbs();
    broadcastState();
  }, 10);

  io.on("connection", (socket) => {
    fastify.log.info({ id: socket.id }, "socket connected");

    socket.on("join", (data) => {
      fastify.log.info({ id: socket.id, data }, "player join");
      const newPlayer = new Player(
        socket.id,
        data.name,
        MAP_WIDTH / 2,
        MAP_HEIGHT / 2,
        randomColor(),
      );

      players[socket.id] = {
        player: newPlayer,
        input: null,
      };

      socket.emit("joined", newPlayer.serialize());
    });

    socket.on("input", (input: InputState) => {
      const state = players[socket.id];
      if (!state) return;
      state.input = input;
    });

    socket.on("disconnect", (reason) => {
      fastify.log.info({ id: socket.id, reason }, "socket disconnected");
      if (players[socket.id]) {
        delete players[socket.id];
      }
    });
  });

  fastify.decorate("io", io);
});

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}
