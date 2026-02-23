import { type FastifyReply, type FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import {
  createRevokedToken,
  createUser,
  findUserByEmail,
  findUserById,
  findUserPublicById,
  findUserPublicByUsername,
  getUserAchievements,
  updateUserById,
} from "./user_service.js";
import type {
  CreateUserInput,
  LoginInput,
  UpdateUserBody,
} from "./user_schema.js";
import { verifyPassword } from "../../utils/hash.js";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";

import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from "../../server/config.js";
import { findOrCreateGoogleUser } from "./user_service.js";

export type JwtPayload = { id: number };

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
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return rep
        .code(409)
        .send({ message: "Email or username already exists" });
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
  if (!user)
    return rep.code(401).send({ message: "Invalid email or password" });

  if (!user.passwordHash) {
    return rep.code(401).send({ message: "This account uses Google login" });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return rep.code(401).send({ message: "Invalid email or password" });

  const payload: JwtPayload = { id: user.id };

  const accessToken = await rep.jwtSign(payload, {
    sign: { expiresIn: "1d" },
  });
  return rep.send({
    accessToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      avatarUrl: user.avatarUrl,
    },
  });
}

export async function logoutHandler(req: FastifyRequest, rep: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth)
    return rep.code(400).send({ message: "Missing Authorization header" });

  const token = extractBearerToken(auth);
  if (!token)
    return rep.code(400).send({ message: "Invalid Authorization header" });

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
  if (!user) return rep.code(404).send({ message: "User not found" });

  return rep.send(user);
}

export async function getUserByIdHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply,
) {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return rep.code(400).send({ message: "Invalid user id" });
  }

  const user = await findUserPublicById(userId);
  if (!user) return rep.code(404).send({ message: "User not found" });

  return rep.send(user);
}

export async function getUserByUsernameHandler(
  req: FastifyRequest<{ Params: { username: string } }>,
  rep: FastifyReply,
) {
  const username = req.params.username?.trim();
  if (!username) {
    return rep.code(400).send({ message: "Invalid username" });
  }

  const user = await findUserPublicByUsername(username);
  if (!user) return rep.code(404).send({ message: "User not found" });

  return rep.send(user);
}

export async function getUserAchievementsHandler(
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply,
) {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return rep.code(400).send({ message: "Invalid user id" });
  }

  const achievements = await getUserAchievements(userId);
  if (!achievements) return rep.code(404).send({ message: "User not found" });

  return rep.send({ achievements });
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
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return rep
        .code(409)
        .send({ message: "Email or username already exists" });
    }
    return rep.code(400).send({ message: "Error updating user" });
  }
}

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return null;
}

export async function uploadAvatar(req: FastifyRequest, res: FastifyReply) {
  const part = await req.file();
  if (!part)
    return res.code(400).send({ message: "Missing file field 'avatar'" });

  if (part.fieldname !== "avatar") {
    part.file.resume();
    return res.code(400).send({ message: "Expected field name 'avatar'" });
  }

  if (!ALLOWED.has(part.mimetype)) {
    part.file.resume();
    return res.code(415).send({ message: "Unsupported image type" });
  }

  const ext = extFromMime(part.mimetype);
  if (!ext) {
    part.file.resume();
    return res.code(415).send({ message: "Unsupported image type" });
  }

  const dir = path.join(process.cwd(), "uploads", "avatars");
  await fsp.mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(dir, filename);

  await pipeline(part.file, fs.createWriteStream(filepath));
  const avatarUrl = `/uploads/avatars/${filename}`;

  await updateUserById(req.user.id, {
    avatarUrl: avatarUrl,
  });

  return res.send({
    avatarUrl: `/uploads/avatars/${filename}`,
  });
}

export async function googleRedirectHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  return rep.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function googleCallbackHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const { code } = req.query as { code?: string };
  if (!code) return rep.code(400).send({ message: "Missing code" });


  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
  };
  if (!tokenData.access_token)
    return rep.code(401).send({ message: "Google auth failed" });

  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    },
  );
  const googleUser = (await userInfoRes.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
  };


  const user = await findOrCreateGoogleUser({
    googleId: googleUser.id,
    email: googleUser.email,
    username: googleUser.name,
    avatarUrl: googleUser.picture ?? "./uploads/avatars/default.png",
  });

  const accessToken = await rep.jwtSign({ id: user.id } satisfies JwtPayload, {
    sign: { expiresIn: "1d" },
  });

  const frontendUrl =
    process.env.NODE_ENV === "development" ? "http://localhost:5173" : "";

  return rep.redirect(`${frontendUrl}/home?token=${accessToken}`);
}
