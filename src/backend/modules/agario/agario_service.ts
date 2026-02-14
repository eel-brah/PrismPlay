import prisma from "../../utils/prisma.js";
import { DEFAULT_ROOM } from "../../../shared/agario/config.js";
import {
  FinalLeaderboardEntry,
  GetRoomHistoryDbReturn,
  PlayerHistoryWithRoom,
  RoomHistoryItem,
  RoomMeta,
  UserGuest,
} from "../../../shared/agario/types.js";

export function createGuestDb(guestId: string) {
  return prisma.guest.upsert({
    where: { id: guestId },
    create: { id: guestId },
    update: {},
  });
}

export async function createRoomDb(meta: RoomMeta) {
  return prisma.$transaction(async (tx) => {
    if (meta.room === DEFAULT_ROOM) {
      const existing = await tx.room.findFirst({
        where: { isDefault: true },
      });

      if (existing) {
        return existing;
      }
    }

    const activeRoom = await tx.room.findFirst({
      where: {
        name: meta.room,
        endedAt: null,
      },
    });

    if (activeRoom) {
      throw new Error("Room name already in use");
    }

    return tx.room.create({
      data: {
        name: meta.room,
        isDefault: meta.room === DEFAULT_ROOM,
        maxDurationMin: meta.durationMin,
        maxPlayers: meta.maxPlayers,
        createdById: meta.hostId === -1 ? null : meta.hostId,
        visibility: meta.visibility,
        ...(meta.endAt !== undefined && {
          endedAt: new Date(meta.endAt),
        }),
      },
    });
  });
}

export async function createPlayerHistoryDb(
  roomId: number,
  durationMs: number,
  maxMass: number,
  kills: number,
  name: string,
  userId?: number,
  guestId?: string,
) {
  if (!guestId && !userId)
    throw new Error("Either userId or guestId is required");

  if (userId && guestId)
    throw new Error("Player cannot be both user and guest");

  if (userId) {
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!exists) throw new Error("Invalid userId (user no longer exists)");

    return prisma.playerHistory.create({
      data: {
        roomId,
        durationMs,
        maxMass: Math.round(maxMass),
        kills,
        name,
        userId,
        guestId: null,
      },
    });
  }

  const exists = await prisma.guest.findUnique({
    where: { id: guestId! },
    select: { id: true },
  });

  if (!exists) throw new Error("Invalid guestId");

  return prisma.playerHistory.create({
    data: {
      roomId,
      durationMs,
      maxMass: Math.round(maxMass),
      kills,
      name,
      guestId,
      userId: null,
    },
  });
}

export async function finalizeRoomResultsDb(roomId: number) {
  return prisma.$transaction(async (tx) => {
    const players = await tx.playerHistory.findMany({
      where: { roomId },
      orderBy: [{ maxMass: "desc" }, { kills: "desc" }, { durationMs: "desc" }],
    });

    if (players.length === 0) {
      return { updated: 0 };
    }

    const updates = players.map((player, index) => {
      const rank = index + 1;

      return tx.playerHistory.update({
        where: { id: player.id },
        data: {
          rank,
          isWinner: rank === 1,
        },
      });
    });

    await Promise.all(updates);

    await tx.room.update({
      where: { id: roomId },
      data: { endedAt: new Date() },
    });

    return { updated: players.length };
  });
}

export async function getRoomLeaderboard(
  roomId: number,
): Promise<FinalLeaderboardEntry[]> {
  const players = await prisma.playerHistory.findMany({
    where: { roomId },
    include: {
      user: true,
      guest: true,
    },
    orderBy: [{ maxMass: "desc" }, { kills: "desc" }, { durationMs: "desc" }],
  });

  return players.map((p, index) => {
    return {
      id: p.userId ? p.userId : p.guestId!,
      name: p.name,
      rank: p.rank ?? index + 1,
      kills: p.kills,
      maxMass: p.maxMass,
    };
  });
}

export async function listRoomsHistoryDb(
  take: number = 20,
  skip: number = 0,
  onlyEnded: boolean = false,
): Promise<RoomHistoryItem[]> {
  const rooms = await prisma.room.findMany({
    where: onlyEnded ? { endedAt: { not: null } } : undefined,
    orderBy: [{ startedAt: "desc" }],
    take,
    skip,
    include: {
      createdBy: { select: { id: true, username: true, avatarUrl: true } },
      players: {
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          guest: { select: { id: true } },
        },
        orderBy: [{ rank: "asc" }, { maxMass: "desc" }, { kills: "desc" }],
      },
    },
  });

  return rooms.map((room) => {
    const leaderboard = room.players.map((p, index) => {
      const type: UserGuest = p.userId ? "user" : "guest";
      const trueName = p.userId && p.user ? p.user.username : null;

      return {
        id: p.userId ? p.userId : p.guestId!,
        type,
        trueName,
        name: p.name,

        rank: p.rank ?? index + 1,
        kills: p.kills,
        maxMass: p.maxMass,
        durationMs: p.durationMs,
        isWinner: p.isWinner,

        user: p.user ?? null,
        guest: p.guest ?? null,

        createdAt: p.createdAt,
      };
    });

    const winnerPlayer =
      room.players.find((p) => p.isWinner) ?? room.players[0] ?? null;

    const winner =
      winnerPlayer === null
        ? null
        : {
            id: winnerPlayer.userId
              ? winnerPlayer.userId
              : winnerPlayer.guestId!,
            type: winnerPlayer.userId ? "user" : ("guest" as UserGuest),
            name: winnerPlayer.name,
            trueName:
              winnerPlayer.userId && winnerPlayer.user
                ? winnerPlayer.user.username
                : null,
            kills: winnerPlayer.kills,
            rank: winnerPlayer.rank ?? 1,
            durationMs: winnerPlayer.durationMs,
            maxMass: winnerPlayer.maxMass,
          };

    return {
      id: room.id,
      name: room.name,
      visibility: room.visibility,
      isDefault: room.isDefault,
      maxPlayers: room.maxPlayers,
      maxDurationMin: room.maxDurationMin,
      startedAt: room.startedAt,
      endedAt: room.endedAt,

      createdBy: room.createdBy,

      playersCount: room.players.length,

      leaderboard,

      winner,
    };
  });
}

export async function getRoomHistoryDb(
  roomId: number,
): Promise<GetRoomHistoryDbReturn | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      createdBy: { select: { id: true, username: true, avatarUrl: true } },
      players: {
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          guest: { select: { id: true } },
        },
        orderBy: [{ rank: "asc" }, { kills: "desc" }, { maxMass: "desc" }],
      },
    },
  });

  if (!room) return null;

  const leaderboard = room.players.map((p, index) => {
    const type: UserGuest = p.userId ? "user" : "guest";

    const trueName = p.userId && p.user ? p.user.username : null;

    return {
      id: p.userId ? p.userId : p.guestId!,
      type,
      trueName,
      name: p.name,

      rank: p.rank ?? index + 1,
      kills: p.kills,
      maxMass: p.maxMass,
      durationMs: p.durationMs,
      isWinner: p.isWinner,

      user: p.user,
      guest: p.guest,
      createdAt: p.createdAt,
    };
  });

  return {
    id: room.id,
    name: room.name,
    visibility: room.visibility,
    isDefault: room.isDefault,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    maxPlayers: room.maxPlayers,
    maxDurationMin: room.maxDurationMin,
    createdBy: room.createdBy,
    leaderboard,
  };
}

export async function listPlayerHistoryDb(
  userId: number,
  take: number = 20,
  skip: number = 0,
): Promise<PlayerHistoryWithRoom[]> {
  return prisma.playerHistory.findMany({
    where: { userId: userId },
    include: {
      room: {
        select: {
          id: true,
          name: true,
          startedAt: true,
          endedAt: true,
          visibility: true,
          isDefault: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
}

export type GlobalLeaderboardEntry = {
  userId: number;
  username: string;
  avatarUrl: string | null;

  games: number;
  wins: number;
  totalKills: number;
  bestMass: number;
  score: number;
};

export async function getGlobalLeaderboard(
  take: number = 100,
): Promise<GlobalLeaderboardEntry[]> {
  const rows = await prisma.playerHistory.groupBy({
    by: ["userId"],
    where: { userId: { not: null } },

    _count: { _all: true },
    _sum: { kills: true },
    _max: { maxMass: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId!).filter(Boolean) } },
    select: { id: true, username: true, avatarUrl: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const winsMap = await prisma.playerHistory.groupBy({
    by: ["userId"],
    where: { isWinner: true, userId: { not: null } },
    _count: { _all: true },
  });

  const winsLookup = new Map(winsMap.map((w) => [w.userId!, w._count._all]));

  const result = rows
    .map((r) => {
      const user = userMap.get(r.userId!);
      if (!user) return null;

      const games = r._count._all;
      const wins = winsLookup.get(r.userId!) ?? 0;
      const totalKills = r._sum.kills ?? 0;
      const bestMass = r._max.maxMass ?? 0;

      const score = wins * 1000 + totalKills * 10 + bestMass * 0.001;

      return {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        games,
        wins,
        totalKills,
        bestMass,
        score,
      };
    })
    .filter(Boolean) as GlobalLeaderboardEntry[];

  result.sort((a, b) => b.score - a.score);

  return result.slice(0, take);
}
