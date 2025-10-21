import type { FastifyInstance } from "fastify";
import { authRoutes, userRoutes } from "../modules/user/user_route.ts";
import { setTimeout } from "timers/promises";

export function registerRoutes(
  server: FastifyInstance,
  http_server: FastifyInstance,
) {
  http_server.get("*", (req, rep) => {
    //TODO:
    // const host = req.headers.host.replace(/:\d+$/, ":9443");
    let host = req.headers.host ?? 'localuuuuuuhost';
    host = host.replace(/:\d+$/, ":9443");
    rep.redirect(`https://${host}${req.raw.url}`);
  });

  server.register(userRoutes, { prefix: "users" });
  server.register(authRoutes, { prefix: "auth" });

  server.get("/healthcheck", async () => {
    return { status: "OK" };
  });
  server.get("/protected", { preHandler: [server.auth] }, async (req, rep) => {
    return { user: req.user };
  });
}
