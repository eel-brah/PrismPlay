import { MAX_ORBS, MAXIMUM_MASS_LIMIT } from "src/shared/agario/config";
import {
  BlobData,
  Mouse,
  Orb,
  PlayerData,
  PlayerState,
} from "src/shared/agario/types";
import { radiusFromMass, randomOrb } from "src/shared/agario/utils";
import type { Server as SocketIOServer } from "socket.io";
import { Player } from "src/shared/agario/player";

const TICK_RATE = 50;
const TICK_DT = 1 / TICK_RATE;

const SINGLE_EAT_FACTOR = 1.25;
const SPLIT_EAT_FACTOR = 1.33;

export function agarioEngine(
  io: SocketIOServer,
  players: Record<string, PlayerState>,
  orbs: Orb[],
) {
  function ensureOrbs() {
    while (orbs.length < MAX_ORBS) {
      orbs.push(randomOrb());
    }
  }
  function canEat(
    attacker: BlobData,
    defender: BlobData,
    attackerBlobs: number,
  ) {
    const required = attackerBlobs === 1 ? SINGLE_EAT_FACTOR : SPLIT_EAT_FACTOR;
    return attacker.mass >= defender.mass * required;
  }

  function simulate(dt: number) {
    const ids = Object.keys(players);

    for (const id of ids) {
      const state = players[id];
      const p = state.player;
      const input = state.input;

      if (!input) continue;

      const mouse: Mouse = { x: input.mouseX, y: input.mouseY };

      if (state.splitRequested) {
        p.split(mouse);
        state.splitRequested = false;
      }

      const eatenOrbs = p.update(dt, mouse, orbs);

      if (eatenOrbs.length > 0) {
        let changed = false;
        for (const orbId of eatenOrbs) {
          const idx = orbs.findIndex((o) => o.id === orbId);
          if (idx !== -1) {
            orbs.splice(idx, 1);
            changed = true;
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
    const removedPlayers = new Set<string>();

    for (let i = 0; i < ids.length; i++) {
      const idA = ids[i];
      if (removedPlayers.has(idA)) continue;

      const playerA = players[idA]?.player;
      if (!playerA) continue;

      for (let j = i + 1; j < ids.length; j++) {
        const idB = ids[j];
        if (removedPlayers.has(idB)) continue;

        const playerB = players[idB]?.player;
        if (!playerB) continue;

        const blobsA = playerA.blobs;
        const blobsB = playerB.blobs;

        if (blobsA.length === 0 || blobsB.length === 0) continue;

        outer: for (let ai = 0; ai < blobsA.length; ai++) {
          for (let bi = 0; bi < blobsB.length; bi++) {
            const a = blobsA[ai];
            const b = blobsB[bi];

            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distance = Math.hypot(dx, dy);
            const ra = radiusFromMass(a.mass);
            const rb = radiusFromMass(b.mass);
            const minDist = ra + rb;

            if (distance === 0) {
              dx = Math.random() - 0.5;
              dy = Math.random() - 0.5;
              distance = Math.hypot(dx, dy) || 1;
            }

            if (distance >= minDist) {
              continue;
            }

            const aCanEat = canEat(a, b, blobsA.length);
            const bCanEat = canEat(b, a, blobsB.length);

            if (aCanEat || bCanEat) {
              let eaterOwnerId: string;
              let eatenOwnerId: string;
              let eaterBlob: typeof a | typeof b;
              let eatenBlobIndex: number;

              if (aCanEat) {
                eaterOwnerId = idA;
                eatenOwnerId = idB;
                eaterBlob = a;
                eatenBlobIndex = bi;
              } else {
                eaterOwnerId = idB;
                eatenOwnerId = idA;
                eaterBlob = b;
                eatenBlobIndex = ai;
              }

              const eaterPlayer = eaterOwnerId === idA ? playerA : playerB;
              const eatenPlayer = eatenOwnerId === idA ? playerA : playerB;

              const eatenBlobs = eatenPlayer.blobs;
              const eatenBlob = eatenBlobs[eatenBlobIndex];
              if (!eatenBlob) continue;

              eaterBlob.mass += eatenBlob.mass;
              if (eaterBlob.mass > MAXIMUM_MASS_LIMIT)
                eaterBlob.mass = MAXIMUM_MASS_LIMIT;

              eatenBlobs.splice(eatenBlobIndex, 1);

              if (eatenBlobs.length === 0) {
                removedPlayers.add(eatenOwnerId);
              }

              if (removedPlayers.has(idA) || removedPlayers.has(idB)) {
                break outer;
              }
            } else {
              const overlap = minDist - distance;
              const nx = dx / distance;
              const ny = dy / distance;

              const totalMass = a.mass + b.mass;
              const aWeight = b.mass / totalMass;
              const bWeight = a.mass / totalMass;

              a.x -= nx * overlap * aWeight;
              a.y -= ny * overlap * aWeight;
              b.x += nx * overlap * bWeight;
              b.y += ny * overlap * bWeight;
            }
          }
        }
      }
    }

    for (const id of removedPlayers) {
      delete players[id];
      const client = io.sockets.sockets.get(id);
      if (client) {
        client.emit("youLost", { reason: "eaten" });
      }
    }
  }

  function broadcastState() {
    const serializedPlayers: Record<string, PlayerData> = {};
    for (const [id, state] of Object.entries(players)) {
      serializedPlayers[id] = state.player.serialize();
      // console.log(serializedPlayers[id]);
      // console.log(serializedPlayers[id].blobs[0].mass);
    }

    io.sockets.emit("heartbeat", {
      players: serializedPlayers,
      orbs,
    });
  }

  let lastTime = Date.now();
  let accumulator = 0;

  setInterval(() => {
    const now = Date.now();
    let frameDt = (now - lastTime) / 1000;
    lastTime = now;

    frameDt = Math.min(frameDt, 0.1);
    accumulator += frameDt;

    while (accumulator >= TICK_DT) {
      simulate(TICK_DT);
      ensureOrbs();
      accumulator -= TICK_DT;
    }

    broadcastState();
  }, 1000 / TICK_RATE);
}
