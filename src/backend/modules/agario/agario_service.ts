import { RoomMeta } from "src/backend/server/socket/agario";
import prisma from "src/backend/utils/prisma";
import { DEFAULT_ROOM } from "src/shared/agario/config";

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
      },
    });
  });
}

export function startRoomDb(roomId: number) {
  return prisma.room.update({
    where: { id: roomId },
    data: {
      startedAt: new Date(),
    },
  });
}

export function endRoomDb(roomId: number) {
  return prisma.room.update({
    where: { id: roomId },
    data: {
      endedAt: new Date(),
    },
  });
}

export function createPlayerHistoryDb(
  roomId: number,
  durationMs: number,
  maxMass: number,
  kills: number,
  userId?: number | null,
  guestId?: string | null,
) {
  if (!guestId && !userId) throw new Error("Either userId or guestId is required");

  return prisma.playerHistory.create({
    data: {
      roomId,
      durationMs,
      maxMass,
      kills,
      userId,
      guestId,
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
