import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pipeline } from "node:stream/promises";

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return null;
}

export async function meAvatarRoutes(app: FastifyInstance) {
  app.post("/me/avatar", { preHandler: [app.auth] }, async (req, reply) => {
    const part = await req.file();
    if (!part)
      return reply.code(400).send({ message: "Missing file field 'avatar'" });

    if (part.fieldname !== "avatar") {
      part.file.resume();
      return reply.code(400).send({ message: "Expected field name 'avatar'" });
    }

    if (!ALLOWED.has(part.mimetype)) {
      part.file.resume();
      return reply.code(415).send({ message: "Unsupported image type" });
    }

    const ext = extFromMime(part.mimetype);
    if (!ext) {
      part.file.resume();
      return reply.code(415).send({ message: "Unsupported image type" });
    }

    const dir = path.join(process.cwd(), "uploads", "avatars");
    await fsp.mkdir(dir, { recursive: true });

    const filename = `${crypto.randomUUID()}.${ext}`;
    const filepath = path.join(dir, filename);

    await pipeline(part.file, fs.createWriteStream(filepath));

    return reply.send({
      avatarUrl: `/uploads/avatars/${filename}`,
    });
  });
}
