import { activePlayers } from "./agarioHanders";
import { Socket } from "socket.io";
import crypto from "crypto";
import { Identity, World } from "./agarioTypes";
import { worldByRoom } from "./agario";
import {
  DEFAULT_ROOM,
  DEFAULT_ROOM_MAX_PLAYERS,
} from "src/shared/agario/config";
import { createRoomDb } from "src/backend/modules/agario/agario_service";

export function removeActivePlayer(socket: Socket) {
  const key = identityKey(getIdentity(socket));
  const activePlayer = activePlayers.get(key);
  if (activePlayer?.socketId == socket.id) {
    activePlayers.delete(key);
  }
}

export function getIdentity(socket: Socket): Identity {
  if (socket.data.userId) {
    return { type: "user", userId: socket.data.userId };
  }

  return { type: "guest", guestId: socket.data.guestId };
}

export function identityKey(identity: Identity) {
  return identity.type === "user"
    ? `user:${identity.userId}`
    : `guest:${identity.guestId}`;
}

export function clampInt(n: number, min: number, max: number) {
  n = Math.floor(Number(n));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function makeKey() {
  return crypto.randomBytes(4).toString("hex");
}

let defaultRoomInit: Promise<void> | null = null;

export async function ensureDefaultRoom() {
  if (worldByRoom.has(DEFAULT_ROOM)) return;

  if (!defaultRoomInit) {
    defaultRoomInit = (async () => {
      const world: World = {
        players: {},
        orbs: [],
        ejects: [],
        viruses: [],
        meta: {
          room: DEFAULT_ROOM,
          visibility: "public",
          maxPlayers: DEFAULT_ROOM_MAX_PLAYERS,
          durationMin: 0,
          status: "started",
          createdAt: 0,
          startedAt: undefined,
          endAt: undefined,
          hostId: -1,
          allowSpectators: true,
          spectators: new Set(),
        },
      };

      const roomDb = await createRoomDb(world.meta);
      world.meta.roomId = roomDb.id;
      worldByRoom.set(DEFAULT_ROOM, world);
    })().finally(() => {
      defaultRoomInit = null;
    });
  }

  await defaultRoomInit;
}
