import { io, type Socket } from "socket.io-client";

let presenceSocket: Socket | null = null;

export function connectPresence(token: string) {
  if (presenceSocket) return presenceSocket;

  presenceSocket = io("/presence", {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: { token },
  });

  return presenceSocket;
}

export function getPresenceSocket() {
  return presenceSocket;
}

export function disconnectPresence() {
  presenceSocket?.disconnect();
  presenceSocket = null;
}