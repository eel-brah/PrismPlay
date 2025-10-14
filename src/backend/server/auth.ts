import fjwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { JWT_SECRET } from "./config.ts";
import prisma from "../utils/prisma.ts";

export async function setupAuth(server: FastifyInstance) {
  server.register(fjwt, { secret: JWT_SECRET });

  server.decorate("auth", async (req: FastifyRequest, rep: FastifyReply) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const decoded = await req.jwtVerify();

      const revoked = await prisma.revokedToken.findUnique({
        where: { token },
      });
      if (revoked) {
        return rep.code(401).send({ message: "Token revoked" });
      }

      req.user = decoded;
    } catch {
      return rep.code(401).send({ message: "Unauthorized" });
    }
  });
}

declare module "fastify" {
  interface FastifyInstance {
    auth: any;
  }
}
