import {
  DEFAULT_ROOM,
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
import { World, worldByRoom } from "./agario";
import {
  createPlayerHistoryDb,
  finalizeRoomResultsDb,
  getRoomLeaderboard,
} from "src/backend/modules/agario/agario_service";
import {
  broadcastPlayers,
  removeActivePlayer,
  sendRoomInfo,
} from "./agarioHanders";
import { FastifyBaseLogger } from "fastify";
import { Player } from "src/shared/agario/player";

const TICK_RATE = 50;
const TICK_DT = 1 / TICK_RATE;

const SINGLE_EAT_FACTOR = 1.25;
const SPLIT_EAT_FACTOR = 1.33;

const EJECT_FRICTION = 2;

interface Death {
  state: PlayerState;
  socketId: string;
}

export function agarioEngine(logger: FastifyBaseLogger, io: Namespace) {
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
    const started = world.meta.status === "started";

    const players = world.players;
    const orbs = world.orbs;
    const viruses = world.viruses;
    const ejects = world.ejects;
    const room = world.meta.room;
    const allowSpectators = world.meta.allowSpectators;

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

      // if (started && state.splitRequested) {
      //   p.split(mouse);
      //   state.splitRequested = false;
      // } else {
      //   state.splitRequested = false;
      // }
      //
      // if (started && state.ejectRequested) {
      //   ejects.push(...p.eject(mouse));
      //   state.ejectRequested = false;
      // } else {
      //   state.ejectRequested = false;
      // }

      const [eatenOrbs, eatenEjects] = p.update(dt, mouse, orbs, ejects);
      state.maxMass = Math.max(state.maxMass, state.player.getTotalMass());
      // const [eatenOrbs, eatenEjects] = p.update(
      //   dt,
      //   mouse,
      //   started ? orbs : [],
      //   started ? ejects : [],
      // );

      // if (started) {
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
      // }
      state.maxMass = Math.max(state.maxMass, state.player.getTotalMass());
    }

    // if (!started) return;

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
      handleVirusCollisions(players[id], viruses);
    }
    return handlePlayerCollisions(players, room, allowSpectators);
  }

  function handlePlayerCollisions(
    players: Record<string, PlayerState>,
    room: string,
    allowSpectators: boolean,
  ) {
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

              players[eaterOwnerId].maxMass = Math.max(
                players[eaterOwnerId].maxMass,
                players[eaterOwnerId].player.getTotalMass(),
              );
              players[eaterOwnerId].kills++;
              players[eatenOwnerId].endTime = Date.now();

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

    const deaths: Death[] = [];
    for (const id of removedPlayers) {
      const world = worldByRoom.get(room);
      if (world) {
        const state = players[id];
        deaths.push({ state, socketId: id });
        delete players[id];

        if (world.meta.hostId === state.userId) {
          for (const id of Object.keys(players)) {
            if (players[id].userId)
              world.meta.hostId = players[id].userId;
          }
        }

        const socket = io.sockets.get(id);
        if (socket) {
          removeActivePlayer(socket);
        }
      }
    }
    return deaths;
  }

  async function processDeaths(world: World, deaths: Death[]) {
    for (const death of deaths) {
      const state = death.state;
      const socket = io.sockets.get(death.socketId);
      try {
        await createPlayerHistoryDb(
          world.meta.roomId!,
          state.endTime! - state.startTime,
          state.maxMass,
          state.kills,
          state.player.name,
          state.userId,
          state.guestId,
        );
      } catch (err) {
        let errorMessage = err instanceof Error ? err.message : "Unknown error";
        if (socket) {
          logger.error({ id: socket.id }, errorMessage);
          socket.emit("agario:error", errorMessage);
        }
      }

      if (socket) {
        if (!world.meta.allowSpectators) socket.leave(world.meta.room);
        socket.emit("youLost", { reason: "eaten" });
        broadcastPlayers(socket.nsp, world.meta.room, world);
        for (const id of Object.keys(world.players)) {
          const client = socket.nsp.sockets.get(id);
          if (client) sendRoomInfo(client, world);
        }
      }
    }
  }

  function handleVirusCollisions(state: PlayerState, viruses: Virus[]) {
    const player = state.player;

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
        if (blob.mass > MAXIMUM_MASS_LIMIT) blob.mass = MAXIMUM_MASS_LIMIT;
        state.maxMass = Math.max(state.maxMass, state.player.getTotalMass());

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
      // serializedPlayers[id].lastProcessedSeq = state.input?.seq ?? 0;

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

  const FRAME_MS = 1000 / TICK_RATE;
  const MAX_CATCHUP_STEPS = 5;

  async function gameLoop() {
    const frameStart = Date.now();

    let frameDt = (frameStart - lastTime) / 1000;
    lastTime = frameStart;

    frameDt = Math.min(frameDt, 0.1);
    accumulator += frameDt;

    let steps = 0;

    while (accumulator >= TICK_DT && steps < MAX_CATCHUP_STEPS) {
      const roomsToDelete: string[] = [];
      const roomFinalizationJobs: Promise<void>[] = [];
      const tickNow = Date.now();

      for (const [room, world] of worldByRoom) {
        if (world.meta.status !== "started") continue;

        const roomEnded =
          world.meta.room !== DEFAULT_ROOM &&
          world.meta.endAt &&
          tickNow >= world.meta.endAt;

        if (roomEnded) {
          const snapshotPlayers = Object.values(world.players);

          const saveJobs = snapshotPlayers.map((player) =>
            createPlayerHistoryDb(
              world.meta.roomId!,
              tickNow - player.startTime,
              player.maxMass,
              player.kills,
              player.player.name,
              player.userId,
              player.guestId,
            ).catch((err) => {
              const socket = io.sockets.get(player.player.id);
              if (socket) {
                logger.error({ id: socket.id }, err);
                socket.emit("agario:error", "Failed to save match history");
              }
            }),
          );

          roomFinalizationJobs.push(
            (async () => {
              await Promise.all(saveJobs);

              await finalizeRoomResultsDb(world.meta.roomId!);

              const leaderboard = await getRoomLeaderboard(world.meta.roomId!);

              io.to(room).emit("agario:leaderboard-update", leaderboard);
              io.to(room).emit("agario:room-ended", { room });
            })(),
          );

          roomsToDelete.push(room);
          continue;
        }

        const deaths = simulate(TICK_DT, world);
        ensureOrbs(world.orbs);
        ensureViruses(world.viruses);

        void processDeaths(world, deaths);
      }

      for (const room of roomsToDelete) {
        worldByRoom.delete(room);
      }

      void Promise.all(roomFinalizationJobs).catch((err) =>
        logger.error({ err }, "Room finalization failed"),
      );

      accumulator -= TICK_DT;
      steps++;
    }

    for (const [room, world] of worldByRoom) {
      if (world.meta.status !== "started") continue;
      broadcastState(room, world);
    }

    const elapsed = Date.now() - frameStart;
    setTimeout(gameLoop, Math.max(0, FRAME_MS - elapsed));
  }

  gameLoop();

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
