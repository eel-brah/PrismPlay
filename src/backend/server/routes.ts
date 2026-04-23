import { type FastifyInstance } from "fastify";
import { authRoutes, userRoutes } from "../modules/user/user_route.js";
import { agario_routes } from "../modules/agario/agario_route.js";
import { friendsRoutes } from "../modules/friend/friend_route.js";
import pingRoute from "../modules/pong/pong_route.js";

export function registerRoutes(
  server: FastifyInstance,
) {
  server.register(authRoutes, { prefix: "/api/auth" });
  server.register(userRoutes, { prefix: "/api/users" });
  server.register(agario_routes, { prefix: "/api/agario" });
  server.register(friendsRoutes, { prefix: "/api/friend" });
  server.register(pingRoute, { prefix: "/api/pong" });

  server.get("/api/healthcheck", async () => ({ status: "OK" }));

  server.get("/api/protected", { preHandler: [server.auth] }, async (req) => {
    return { user: req.user };
  });
}
