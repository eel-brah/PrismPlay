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

export function createRoomDb(meta: RoomMeta) {
  return prisma.room.create({
    data: {
      name: meta.room,
      isDefault: meta.room === DEFAULT_ROOM,
      maxDurationMin: meta.durationMin,
      maxPlayers: meta.maxPlayers,
      createdById: meta.hostId,
      visibility: meta.visibility,
    },
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
    where: { id: roomId},
    data: {
      endedAt: new Date(),
    },
  });
}
export function createPlayerHistory(params: {
  roomId: number;
  durationMs: number;
  maxMass: number;
  kills: number;
  userId?: number | null;
  guestId?: string | null;
}) {
  return prisma.playerHistory.create({
    data: {
      roomId: params.roomId,
      durationMs: params.durationMs,
      maxMass: params.maxMass,
      kills: params.kills,
      userId: params.userId,
      guestId: params.guestId,
    },
  });
}

// export function endRoom(roomId: number) {
//   return prisma.room.update({
//     where: { id: roomId },
//     data: {
//       endedAt: new Date(),
//     },
//   });
// }
export async function finalizeRoomResults(roomId: number) {
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
