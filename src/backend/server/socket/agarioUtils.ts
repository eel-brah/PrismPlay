import { activePlayers } from "./agarioHanders";
import { Socket } from "socket.io";
import crypto from "crypto";
import { Identity } from "./agarioTypes";

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
