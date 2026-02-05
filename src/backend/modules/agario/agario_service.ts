import prisma from "src/backend/utils/prisma";
import { DEFAULT_ROOM } from "src/shared/agario/config";
import { FinalLeaderboardEntry, RoomMeta } from "src/shared/agario/types";

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

// export function endRoomDb(roomId: number) {
//   return prisma.room.update({
//     where: { id: roomId },
//     data: {
//       endedAt: new Date(),
//     },
//   });
// }

export function createPlayerHistoryDb(
  roomId: number,
  durationMs: number,
  maxMass: number,
  kills: number,
  name: string,
  userId?: number | null,
  guestId?: string | null,
) {
  if (!guestId && !userId)
    throw new Error("Either userId or guestId is required");

  return prisma.playerHistory.create({
    data: {
      roomId,
      durationMs,
      maxMass,
      kills,
      userId,
      guestId,
      name,
    },
  });
}

export async function finalizeRoomResultsDb(roomId: number) {
  // const room = prisma.playerHistory.findFirst({
  //   where: { roomId },
  // });
  // if (room.room.name === DEFAULT_ROOM)
  //   throw new Error("Default room cannot have a duration");
  // }

  return prisma.$transaction(async (tx) => {
    const players = await tx.playerHistory.findMany({
      where: { roomId },
      orderBy: [{ kills: "desc" }, { maxMass: "desc" }, { durationMs: "desc" }],
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
    orderBy: [{ kills: "desc" }, { maxMass: "desc" }, { durationMs: "desc" }],
  });

  return players.map((p, index) => {
    const isUser = !!p.user;

    return {
      id: isUser ? `user-${p.userId}` : `guest-${p.guestId}`,
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
) {
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
        orderBy: [{ rank: "asc" }, { kills: "desc" }, { maxMass: "desc" }],
      },
    },
  });

  return rooms.map((room) => {
    const leaderboard = room.players.map((p, index) => {
      const type = p.userId ? "user" : "guest";
      const trueName = p.userId && p.user ? p.user.username : null;

      return {
        id: p.userId ? p.userId : p.guestId,
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
              : winnerPlayer.guestId,
            type: winnerPlayer.userId ? "user" : "guest",
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

export async function getRoomHistoryDb(roomId: number) {
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
    const type = p.userId ? "user" : "guest";

    const trueName = p.userId && p.user ? p.user.username : null;

    return {
      id: p.userId ? p.userId : p.guestId,
      type,
      trueName,
      name: p.name,

      rank: p.rank ?? index + 1,
      kills: p.kills,
      maxMass: p.maxMass,
      durationMs: p.durationMs,
      isWinner: p.isWinner,

      user: p.user ?? null,
    };
  });

  return {
    id: room.id,
    name: room.name,
    visibility: room.visibility,
    isDefault: room.isDefault,
    startedAt: room.startedAt,
    endedAt: room.endedAt,
    // maxPlayers: room.maxPlayers,
    // maxDurationMin: room.maxDurationMin,
    createdBy: room.createdBy,
    leaderboard,
  };
}

export async function listPlayerHistoryDb(
  userId: number,
  take: number = 20,
  skip: number = 0,
) {
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
