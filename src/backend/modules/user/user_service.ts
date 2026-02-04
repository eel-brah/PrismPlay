import { Prisma } from "@prisma/client";
import { hashPassword } from "../../utils/hash.ts";
import prisma from "../../utils/prisma.ts";
import type { UpdateUserBody, CreateUserInput } from "./user_schema.ts";

const safeSelect = {
  id: true,
  username: true,
  email: true,
  createdAt: true,
  avatarUrl: true,
  lastLogin: true,
} as const;

const publicSelect = {
  id: true,
  username: true,
  createdAt: true,
  avatarUrl: true,
  lastLogin: true,
} as const;

export async function createUser(input: CreateUserInput) {
  const { password, ...rest } = input;
  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: { ...rest, passwordHash },
    select: safeSelect,
  });
}

export async function touchUserLastLogin(userId: number) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLogin: new Date() },
    select: safeSelect,
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: safeSelect,
  });
}

export async function findUserPublicById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: publicSelect,
  });
}

export async function findUserPublicByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: publicSelect,
  });
}

export async function updateUserById(id: number, data: UpdateUserBody) {
  const updateData: Record<string, unknown> = { ...data };

  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
    delete updateData.password;
  }

  try {
    return await prisma.user.update({
      where: { id },
      data: updateData,
      select: safeSelect,
    });
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") return null; // not found
    }
    throw err;
  }
}

export async function createRevokedToken(token: string) {
  await prisma.revokedToken.create({ data: { token } });
}

export async function findToken(token: string) {
  return prisma.revokedToken.findUnique({ where: { token } });
}

export async function getUserAchievements(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (!user) return null;

  const [pongWins, agarioWins] = await Promise.all([
    prisma.pongMatch.count({ where: { winnerId: userId } }),
    prisma.playerHistory.count({
      where: { userId, isWinner: true },
    }),
  ]);

  const hasFirstWin = pongWins + agarioWins > 0;

  const now = Date.now();
  const veteran =
    now - new Date(user.createdAt).getTime() >= 30 * 24 * 60 * 60 * 1000;

  const [pongRecent, agarioRecent] = await Promise.all([
    prisma.pongMatch.findMany({
      where: { OR: [{ leftPlayerId: userId }, { rightPlayerId: userId }] },
      select: {
        createdAt: true,
        winnerId: true,
        leftPlayerId: true,
        rightPlayerId: true,
        leftScore: true,
        rightScore: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.playerHistory.findMany({
      where: { userId },
      select: { createdAt: true, isWinner: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const combined = [
    ...pongRecent.map((match) => ({
      createdAt: match.createdAt,
      win: match.winnerId === userId,
    })),
    ...agarioRecent.map((match) => ({
      createdAt: match.createdAt,
      win: match.isWinner,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  let hotStreakCount = 0;
  for (const entry of combined) {
    if (!entry.win) break;
    hotStreakCount += 1;
    if (hotStreakCount >= 5) break;
  }

  let precisionCount = 0;
  for (const match of pongRecent) {
    const isLeft = match.leftPlayerId === userId;
    const opponentScore = isLeft ? match.rightScore : match.leftScore;
    const isPerfectWin =
      match.winnerId === userId && opponentScore === 0;
    if (!isPerfectWin) break;
    precisionCount += 1;
    if (precisionCount >= 3) break;
  }

  return [
    { id: "first_win", name: "First Win", unlocked: hasFirstWin },
    { id: "hot_streak", name: "Hot Streak", unlocked: hotStreakCount >= 5 },
    { id: "precision", name: "Precision", unlocked: precisionCount >= 3 },
    { id: "veteran", name: "Veteran", unlocked: veteran },
  ];
}
