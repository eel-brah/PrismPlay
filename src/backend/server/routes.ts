import type { FastifyInstance } from "fastify";
import { authRoutes, userRoutes } from "../modules/user/user_route.ts";
import { setTimeout } from "timers/promises";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function registerRoutes(
  server: FastifyInstance,
  http_server: FastifyInstance,
) {
  http_server.get("*", (req, rep) => {
    //TODO:
    // const host = req.headers.host.replace(/:\d+$/, ":9443");
    let host = req.headers.host ?? 'localhost';
    host = host.replace(/:\d+$/, ":9443");
    rep.redirect(`https://${host}${req.raw.url}`);
  });

  // Register static files + /game route on the main HTTPS server
  // server.register(async (app) => {
  //   await app.register(fastifyStatic, {
  //     root: path.join(__dirname, "../../../", "public/agario"),
  //     prefix: "/",
  //   });
  //
  //   app.get("/agario", async (_req, reply) => {
  //     return reply.type("text/html").sendFile("agario.html");
  //   });
  // });

  server.register(userRoutes, { prefix: "users" });
  server.register(authRoutes, { prefix: "auth" });

  server.get("/healthcheck", async () => {
    return { status: "OK" };
  });
  server.get("/protected", { preHandler: [server.auth] }, async (req, rep) => {
    return { user: req.user };
  });
}
