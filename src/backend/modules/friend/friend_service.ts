import prisma from "../../utils/prisma"; 

const publicUserSelect = {
  id: true,
  username: true,
  avatarUrl: true,
  lastLogin: true,
} as const;

export async function listFriends(userId: number) {
  const rows = await prisma.friend.findMany({
    where: { userId },
    include: {
      friend: { select: publicUserSelect },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    createdAt: r.createdAt,
    friend: r.friend,
  }));
}

export async function listIncomingRequests(userId: number) {
  return prisma.friendRequest.findMany({
    where: { toUserId: userId, status: "PENDING" },
    include: { fromUser: { select: publicUserSelect } },
    orderBy: { sentAt: "desc" },
  });
}

export async function IsFrienddPending(myUserId: number, userId: number) {
  const req = await prisma.friendRequest.findFirst({
    where: {
      status: "PENDING",
      OR: [
        { fromUserId: myUserId, toUserId: userId },
        // { fromUserId: userId, toUserId: myUserId },
      ],
    },
    select: { id: true },
  });

  return !!req;
}

export async function sendFriendRequest(
  fromUserId: number,
  toUsername: string,
) {
  const toUser = await prisma.user.findUnique({
    where: { username: toUsername },
    select: { id: true },
  });

  if (!toUser) {
    return { ok: false as const, code: "NOT_FOUND" as const };
  }

  if (toUser.id === fromUserId) {
    return { ok: false as const, code: "SELF" as const };
  }

  const alreadyFriend = await prisma.friend.findUnique({
    where: { userId_friendId: { userId: fromUserId, friendId: toUser.id } },
    select: { userId: true },
  });

  if (alreadyFriend) {
    return { ok: false as const, code: "ALREADY_FRIENDS" as const };
  }

  try {
    const request = await prisma.friendRequest.create({
      data: { fromUserId, toUserId: toUser.id },
    });
    return { ok: true as const, request };
  } catch {
    return { ok: false as const, code: "ALREADY_REQUESTED" as const };
  }
}

export async function acceptFriendRequest(
  requestId: number,
  currentUserId: number,
) {
  const fr = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!fr) return { ok: false as const, code: "NOT_FOUND" as const };
  if (fr.toUserId !== currentUserId)
    return { ok: false as const, code: "FORBIDDEN" as const };
  if (fr.status !== "PENDING")
    return { ok: false as const, code: "NOT_PENDING" as const };

  await prisma.$transaction(async (tx) => {
    await tx.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });

    await tx.friend.createMany({
      data: [
        { userId: fr.fromUserId, friendId: fr.toUserId },
        { userId: fr.toUserId, friendId: fr.fromUserId },
      ],
    });
  });

  return { ok: true as const };
}

export async function declineFriendRequest(
  requestId: number,
  currentUserId: number,
) {
  const fr = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!fr) return { ok: false as const, code: "NOT_FOUND" as const };
  if (fr.toUserId !== currentUserId)
    return { ok: false as const, code: "FORBIDDEN" as const };
  if (fr.status !== "PENDING")
    return { ok: false as const, code: "NOT_PENDING" as const };

  await prisma.friendRequest.delete({
    where: { id: requestId }
  });
  // await prisma.friendRequest.update({
  //   where: { id: requestId },
  //   data: { status: "DECLINED", respondedAt: new Date() },
  // });

  return { ok: true as const };
}

export async function removeFriend(userId: number, friendId: number) {
  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    },
    select: { userId: true },
  });

  if (!existing) {
    return { ok: false as const, code: "NOT_FRIENDS" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    await tx.friendRequest.deleteMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: friendId },
          { fromUserId: friendId, toUserId: userId },
        ],
      },
    });
  });

  return { ok: true as const };
}
