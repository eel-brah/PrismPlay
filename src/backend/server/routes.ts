import type { FastifyInstance } from "fastify";
import { authRoutes, userRoutes } from "../modules/user/user_route";

export function registerRoutes(
  server: FastifyInstance,
  http_server: FastifyInstance,
) {
  http_server.get("*", (req, rep) => {
    let host = req.headers.host ?? "localhost";
    host = host.replace(/:\d+$/, ":9443");
    rep.redirect(`https://${host}${req.raw.url}`);
  });

  server.register(authRoutes, { prefix: "/api/auth" });
  server.register(userRoutes, { prefix: "/api/users" });

  server.get("/api/healthcheck", async () => ({ status: "OK" }));

  server.get("/api/protected", { preHandler: [server.auth] }, async (req) => {
    return { user: req.user };
  });
}
