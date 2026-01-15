import {  type FastifyInstance } from "fastify";
import { authRoutes, userRoutes } from "../modules/user/user_route";
import {agario_routes} from "../modules/agario/agario_route";
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
  server.register(agario_routes, {prefix: "/api/agario"})

  server.get("/api/healthcheck", async () => ({ status: "OK" }));

  server.get("/api/protected", { preHandler: [server.auth] }, async (req) => {
    // const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTMsImlhdCI6MTc2NzY1MDE0MywiZXhwIjoxNzY3NjUxMDQzfQ.Tp0MdMlVDDdTV1oP-mMF9g1Vn6B7iZb0L_rbrE-IHL8"
    // const decode = server.jwt.verify<{ id: number }>(token);
    // const decode = server.jwt.verify(token) as { id: number };
    // console.log(decode.id)
    return { user: req.user };
  });
}

