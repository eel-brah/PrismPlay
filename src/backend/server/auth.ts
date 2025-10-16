import fjwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { JWT_SECRET } from "./config.ts";
import prisma from "../utils/prisma.ts";
import { findToken } from "../modules/user/user_service.ts";
import { type AuthHeaderSchema } from "../modules/user/user_schema.ts";

export async function setupAuth(server: FastifyInstance) {
  server.register(fjwt, { secret: JWT_SECRET });

  server.decorate(
    "auth",
    async (
      req: FastifyRequest<{ Headers: AuthHeaderSchema }>,
      rep: FastifyReply,
    ) => {
      try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const decoded = await req.jwtVerify();

        const revoked = await findToken(token);
        if (revoked) {
          return rep.code(401).send({ message: "Token revoked" });
        }

        req.user = decoded;
      } catch (err: any) {
        if (err?.errors) {
          return rep.code(400).send({
            message: err.errors.map((e: any) => e.message).join(", "),
          });
        }
        return rep.code(401).send({ message: "Unauthorized" });
      }
    },
  );
}

declare module "fastify" {
  interface FastifyInstance {
    auth: any;
  }
}
