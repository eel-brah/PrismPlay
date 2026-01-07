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

export async function createUser(input: CreateUserInput) {
  const { password, ...rest } = input;
  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: { ...rest, passwordHash },
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
