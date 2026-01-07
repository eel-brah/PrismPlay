import { type FastifyReply, type FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import {
  createRevokedToken,
  createUser,
  findUserByEmail,
  findUserById,
  updateUserById,
} from "./user_service.ts";
import type { CreateUserInput, LoginInput, UpdateUserBody } from "./user_schema.ts";
import { verifyPassword } from "../../utils/hash.ts";

function extractBearerToken(authHeader: string): string | null {
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function registerUserHandler(
  req: FastifyRequest<{ Body: CreateUserInput }>,
  rep: FastifyReply,
) {
  try {
    const user = await createUser(req.body);
    return rep.status(201).send(user);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return rep.code(409).send({ message: "Email or username already exists" });
    }
    return rep.code(400).send({ message: "Error creating user" });
  }
}

export async function loginHandler(
  req: FastifyRequest<{ Body: LoginInput }>,
  rep: FastifyReply,
) {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user) return rep.code(401).send({ message: "Invalid email or password" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return rep.code(401).send({ message: "Invalid email or password" });

  const accessToken = await rep.jwtSign(
    { id: user.id },
    { sign: { expiresIn: "15m" } },
  );
  console.log("uder is ", user)
  return rep.send({
    accessToken,
    user: { id: user.id, username: user.username, email: user.email , createdAt : user.createdAt, lastLogin : user.lastLogin, avatarUrl : user.avatarUrl},
  });
}

export async function logoutHandler(req: FastifyRequest, rep: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth) return rep.code(400).send({ message: "Missing Authorization header" });

  const token = extractBearerToken(auth);
  if (!token) return rep.code(400).send({ message: "Invalid Authorization header" });

  try {
    await createRevokedToken(token);
    return rep.status(200).send({ message: "Logged out successfully" });
  } catch {
    return rep.status(200).send({ message: "Logged out successfully" });
  }
}

export async function getMeHandler(req: FastifyRequest, rep: FastifyReply) {
  const userId = req.user.id;
  const user = await findUserById(userId);
  console.log(Object.keys(user ?? {}), user);
  if (!user) return rep.code(404).send({ message: "User not found" });

  return rep.send(user);
}

export async function updateMeHandler(
  req: FastifyRequest<{ Body: UpdateUserBody }>,
  rep: FastifyReply,
) {
  const userId = req.user.id;

  if (!req.body || Object.keys(req.body).length === 0) {
    return rep.code(400).send({ message: "At least one field is required" });
  }

  try {
    const updated = await updateUserById(userId, req.body);
    if (!updated) return rep.code(404).send({ message: "User not found" });
    return rep.send(updated);
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return rep.code(409).send({ message: "Email or username already exists" });
    }
    return rep.code(400).send({ message: "Error updating user" });
  }
}
