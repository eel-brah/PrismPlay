import fjwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { JWT_SECRET } from "./config";
import { findToken } from "../modules/user/user_service";

function extractBearerToken(authHeader: string): string | null {
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function setupAuth(server: FastifyInstance) {
  server.register(fjwt, { secret: JWT_SECRET });

  server.decorate(
    "auth",
    async (req: FastifyRequest, rep: FastifyReply): Promise<void> => {
      const auth = req.headers.authorization;
      if (!auth) {
        rep.code(401).send({ message: "Missing Authorization header" });
        return;
      }

      const token = extractBearerToken(auth);
      if (!token) {
        rep.code(401).send({ message: "Invalid Authorization header" });
        return;
      }

      try {
        await req.jwtVerify();

        const revoked = await findToken(token);
        if (revoked) {
          rep.code(401).send({ message: "Token revoked" });
          return;
        }
      } catch {
        rep.code(401).send({ message: "Unauthorized" });
      }
    },
  );
}

declare module "fastify" {
  interface FastifyInstance {
    auth: (req: FastifyRequest, rep: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { id: number };
    user: { id: number };
  }
}
