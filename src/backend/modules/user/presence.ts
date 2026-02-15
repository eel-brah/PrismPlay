import type { FastifyInstance } from "fastify";
import type { Server as IOServer, Socket } from "socket.io";
import prisma from "src/backend/utils/prisma";

type PresencePayload = { userId: number; online: boolean; lastSeen: number | null };

const time_before = 2000;
const userSockets = new Map<number, Set<string>>();
const offlineTimers = new Map<number, NodeJS.Timeout>();

function ensureSet(userId: number) {
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  return set;
}
function isOnline(userId: number) {
  return (userSockets.get(userId)?.size ?? 0) > 0;
}

async function getFriendIds(userId: number) {
  const rows = await prisma.friend.findMany({
    where: { userId },
    select: { friendId: true },
  });
  return rows.map((r) => r.friendId);
}

async function emitToFriends(io: IOServer, userId: number, payload: PresencePayload) {
  const friendIds = await getFriendIds(userId);
  const presence = io.of("/presence");
  for (const fid of friendIds) {
    presence.to(`user:${fid}`).emit("presence:update", payload);
  }
}

export function init_presence(io: IOServer, fastify: FastifyInstance) {
  const presence = io.of("/presence");

  presence.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = fastify.jwt.verify(token) as { id: number };
      socket.data.userId = decoded.id;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  presence.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId as number;
    socket.join(`user:${userId}`);
    const t = offlineTimers.get(userId);
    if (t) {
      clearTimeout(t);
      offlineTimers.delete(userId);
    }

    const set = ensureSet(userId);
    const wasOffline = set.size === 0;
    set.add(socket.id);

    if (wasOffline) {
      await emitToFriends(io, userId, { userId, online: true, lastSeen: null });
    }

    socket.on("presence:subscribe", async () => {
      const friendIds = await getFriendIds(userId);

      const onlineList = friendIds.map((fid) => ({ userId: fid, online: isOnline(fid) }));

      const offlineIds = onlineList.filter((x) => !x.online).map((x) => x.userId);
      const offlineUsers = offlineIds.length
        ? await prisma.user.findMany({
            where: { id: { in: offlineIds } },
            select: { id: true, lastLogin: true },
          })
        : [];

      const lastSeenById = new Map<number, number | null>(
        offlineUsers.map((u) => [u.id, u.lastLogin ? u.lastLogin.getTime() : null]),
      );

      const snapshot: PresencePayload[] = onlineList.map((x) => ({
        userId: x.userId,
        online: x.online,
        lastSeen: x.online ? null : (lastSeenById.get(x.userId) ?? null),
      }));

      socket.emit("presence:snapshot", snapshot);
    });

    socket.on("disconnect", () => {
      const set = userSockets.get(userId);
      if (!set) return;

      set.delete(socket.id);
      if (set.size > 0) return;

      const timer = setTimeout(async () => {
        if (isOnline(userId)) return;

        await prisma.user.update({
          where: { id: userId },
          data: { lastLogin: new Date() },
        });

        await emitToFriends(io, userId, { userId, online: false, lastSeen: Date.now() });
      }, time_before);

      offlineTimers.set(userId, timer);
    });
  });
}
