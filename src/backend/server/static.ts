import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { NODE_ENV } from "./config.js";

// export default fp(async (fastify) => {
//   if (NODE_ENV === "production") {
//     fastify.register(fastifyStatic, {
//       root: path.join(process.cwd(), "dist/frontend"),
//       prefix: "/",
//     });

//     fastify.setNotFoundHandler((req, reply) => {
//   if (
//     req.url.startsWith("/api") ||
//     req.url.startsWith("/uploads") ||
//     req.url.startsWith("/socket.io")
//   ) {
//     reply.code(404).send({ message: "Not Found" });
//     return;
//   }
//   reply.sendFile("index.html");
// });

//   }

//   fastify.register(fastifyStatic, {
//     root: path.join(process.cwd(), "uploads"),
//     prefix: "/uploads/",
//     decorateReply: false, 
//   });
// });


export default fp(async (fastify) => {
  if (NODE_ENV === "production") {
    fastify.register(fastifyStatic, {
      root: path.join(process.cwd(), "dist/frontend"),
      prefix: "/",
    });
  }

  // SPA fallback — works in both modes
  fastify.setNotFoundHandler((req, reply) => {
    if (
      req.url.startsWith("/api") ||
      req.url.startsWith("/uploads") ||
      req.url.startsWith("/socket.io")
    ) {
      reply.code(404).send({ message: "Not Found" });
      return;
    }
    if (NODE_ENV === "production") {
      reply.sendFile("index.html");
    } else {
      // In dev, redirect to the Vite dev server
      reply.redirect(`https://localhost:5173${req.url}`);
    }
  });

  fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), "uploads"),
    prefix: "/uploads/",
    decorateReply: false,
  });
});