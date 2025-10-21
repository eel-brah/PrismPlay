import { Prisma } from "@prisma/client";
import { hashPassword } from "../../utils/hash.ts";
import prisma from "../../utils/prisma.ts";
import type { UpdateUserBody, CreateUserInput } from "./user_schema.ts";

export async function createUser(input: CreateUserInput) {
  const { password, ...rest } = input;
  const hash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { ...rest, passwordHash: hash },
  });

  return user;
}

export async function getUsers() {
  return prisma.user.findMany({
    select: {
      email: true,
      username: true,
      id: true,
    },
  });
}

export async function findUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      username: true,
      id: true,
    },
  });
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      email: true,
      username: true,
      id: true,
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function updateUserById(id: number, data: UpdateUserBody) {
  const updateData: any = { ...data };

  if (data.password) {
    const hashed = await hashPassword(data.password);
    updateData.passwordHash = hashed;
    delete updateData.password;
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { email: true, username: true, id: true },
  });
}

export async function deleteUserById(id: number) {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch (error: unknown) {
    // Prisma errors are instances of Prisma.PrismaClientKnownRequestError
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return null; // record not found
    }

    // Re-throw for unhandled cases
    throw error;
  }
}

export async function createRevokedToken(token: string) {
  await prisma.revokedToken.create({
    data: { token },
  });
}

export async function findToken(token: string) {
  return prisma.revokedToken.findUnique({ where: { token } });
}
