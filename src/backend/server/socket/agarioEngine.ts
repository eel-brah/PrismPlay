import {
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_BLOBS_PER_PLAYER,
  MAX_ORBS,
  MAX_VIRUSES,
  MAXIMUM_MASS_LIMIT,
  ORB_GROWTH_RATE,
  ORB_MAX_MASS,
  VIRUS_BASE_MASS,
  VIRUS_EAT_MIN_MASS,
  VIRUS_MAX_FEED,
} from "src/shared/agario/config";
import {
  BlobData,
  Eject,
  Mouse,
  Orb,
  PlayerData,
  PlayerState,
  Virus,
} from "src/shared/agario/types";
import {
  radiusFromMass,
  randomId,
  randomOrb,
  randomViruses,
} from "src/shared/agario/utils";
import type { Namespace } from "socket.io";
import { Player } from "src/shared/agario/player";
import { World, worldByRoom } from "./agario";

const TICK_RATE = 50;
const TICK_DT = 1 / TICK_RATE;

const SINGLE_EAT_FACTOR = 1.25;
const SPLIT_EAT_FACTOR = 1.33;

const EJECT_FRICTION = 2;

export function agarioEngine(io: Namespace) {
  function ensureOrbs(orbs: Orb[]) {
    while (orbs.length < MAX_ORBS) {
      orbs.push(randomOrb());
    }
  }
  function ensureViruses(viruses: Virus[]) {
    while (viruses.length < MAX_VIRUSES) {
      viruses.push(randomViruses());
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

  function simulate(dt: number, world: World) {
    const players = world.players;
    const orbs = world.orbs;
    const viruses = world.viruses;
    const ejects = world.ejects;

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
      if (state.ejectRequested) {
        ejects.push(...p.eject(mouse));
        state.ejectRequested = false;
      }

      const [eatenOrbs, eatenEjects] = p.update(dt, mouse, orbs, ejects);

      if (eatenOrbs.length > 0) {
        // let changed = false;
        for (const orbId of eatenOrbs) {
          const idx = orbs.findIndex((o) => o.id === orbId);
          if (idx !== -1) {
            orbs.splice(idx, 1);
            // changed = true;
          }
        }
        // if (changed) {
        //   ensureOrbs(orbs);
        // }
      }
      if (eatenEjects.length > 0) {
        for (const ejectId of eatenEjects) {
          const idx = ejects.findIndex((e) => e.id === ejectId);
          if (idx !== -1) {
            ejects.splice(idx, 1);
          }
        }
      }
    }

    for (const e of ejects) {
      e.age += dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // e.x = Math.max(0, Math.min(MAP_WIDTH, e.x));
      // e.y = Math.max(0, Math.min(MAP_HEIGHT, e.y));

      if (e.x < 0 || e.x > MAP_WIDTH) e.vx *= -1;
      if (e.y < 0 || e.y > MAP_HEIGHT) e.vy *= -1;

      const decay = Math.exp(-EJECT_FRICTION * dt);
      e.vx *= decay;
      e.vy *= decay;
    }

    for (const v of viruses) {
      v.x += v.vx * dt;
      v.y += v.vy * dt;

      if (v.x < 0 || v.x > MAP_WIDTH) v.vx *= -1;
      if (v.y < 0 || v.y > MAP_HEIGHT) v.vy *= -1;

      const friction = Math.exp(-2 * dt);
      v.vx *= friction;
      v.vy *= friction;
    }

    handleVirusFeeding(viruses, ejects);

    for (const id of ids) {
      handleVirusCollisions(players[id].player, viruses);
    }
    handlePlayerCollisions(players);
  }

  function handlePlayerCollisions(players: Record<string, PlayerState>) {
    const ids = Object.keys(players);
    const removedPlayers = new Set<string>();

    for (let i = 0; i < ids.length; i++) {
      const idA = ids[i];
      if (removedPlayers.has(idA)) continue;

      const playerA = players[idA].player;
      for (let j = i + 1; j < ids.length; j++) {
        const idB = ids[j];
        if (removedPlayers.has(idB)) continue;

        const playerB = players[idB].player;

        const blobsA = playerA.blobs;
        const blobsB = playerB.blobs;

        if (blobsA.length === 0 || blobsB.length === 0) continue;

        outer: for (let ai = blobsA.length - 1; ai >= 0; ai--) {
          for (let bi = blobsB.length - 1; bi >= 0; bi--) {
            const a = blobsA[ai];
            const b = blobsB[bi];

            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distance = Math.hypot(dx, dy);
            const ra = radiusFromMass(a.mass);
            const rb = radiusFromMass(b.mass);
            const minDist = ra + rb;

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
              if (eatenOwnerId === idA) continue outer;
            } else {
              const overlap = minDist - distance;
              if (distance === 0) {
                dx = 1e-6;
                dy = 0;
                distance = 1e-6;
              }
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
      const client = io.sockets.get(id);
      if (client) {
        client.emit("youLost", { reason: "eaten" });
      }
    }
  }

  function handleVirusCollisions(player: Player, viruses: Virus[]) {
    for (let i = viruses.length - 1; i >= 0; i--) {
      const virus = viruses[i];

      for (const blob of player.blobs) {
        const dx = virus.x - blob.x;
        const dy = virus.y - blob.y;
        const dist = Math.hypot(dx, dy);

        const br = radiusFromMass(blob.mass);
        const vr = radiusFromMass(virus.mass);

        if (dist > br + vr) continue;

        if (blob.mass < VIRUS_EAT_MIN_MASS) continue;

        blob.mass += virus.mass;

        viruses.splice(i, 1);

        if (player.blobs.length >= MAX_BLOBS_PER_PLAYER) return;

        player.explodePlayer(blob);
        return;
      }
    }
  }

  function handleVirusFeeding(viruses: Virus[], ejects: Eject[]) {
    for (let i = ejects.length - 1; i >= 0; i--) {
      const e = ejects[i];

      for (const virus of viruses) {
        const dx = e.x - virus.x;
        const dy = e.y - virus.y;
        const dist = Math.hypot(dx, dy);

        const er = radiusFromMass(e.mass);
        const vr = radiusFromMass(virus.mass);

        if (dist > er + vr) continue;

        virus.mass += e.mass;
        virus.fedCount++;

        const lastDirX = Math.sign(e.vx);
        const lastDirY = Math.sign(e.vy);

        ejects.splice(i, 1);

        if (virus.fedCount >= VIRUS_MAX_FEED) {
          viruses.push({
            id: randomId(),
            x: virus.x,
            y: virus.y,
            mass: VIRUS_BASE_MASS,
            vx: -lastDirX * 600,
            vy: -lastDirY * 600,
            fedCount: 0,
          });
          virus.mass = VIRUS_BASE_MASS;
          virus.fedCount = 0;
        }

        break;
      }
    }
  }

  function broadcastState(room: string, world: World) {
    const serializedPlayers: Record<string, PlayerData> = {};

    for (const [id, state] of Object.entries(world.players)) {
      serializedPlayers[id] = state.player.serialize();
      serializedPlayers[id].lastProcessedSeq = state.input?.seq ?? 0;

      // console.log(serializedPlayers[id]);
      // console.log(serializedPlayers[id].blobs[0].mass);
    }

    io.to(room).emit("heartbeat", {
      players: serializedPlayers,
      orbs: world.orbs,
      ejects: world.ejects,
      viruses: world.viruses,
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
      for (const [room, world] of worldByRoom) {
        simulate(TICK_DT, world);
        ensureOrbs(world.orbs);
        ensureViruses(world.viruses);
      }
      accumulator -= TICK_DT;
    }

    for (const [room, world] of worldByRoom) {
      broadcastState(room, world);
    }
    // broadcastStatePerRoom();
  }, 1000 / TICK_RATE);

  setInterval(() => {
    for (const [room, world] of worldByRoom) {
      for (const orb of world.orbs) {
        if (orb.mass < ORB_MAX_MASS) {
          orb.mass = Math.min(ORB_MAX_MASS, orb.mass + ORB_GROWTH_RATE * 60);
        }
      }
    }
  }, 60 * 1000);
}
