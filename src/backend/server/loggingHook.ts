import type { FastifyInstance } from "fastify";

export default async function loggingHook(server: FastifyInstance) {
  server.addHook("onRequest", async (req, rep) => {
    server.log.info(`📡 Incoming request: ${req.method} ${req.url}`);
  });

  server.addHook("onResponse", async (req, rep) => {
    const status = rep.statusCode;

    const statusEmoji =
      status >= 500
        ? "❌"
        : status >= 400
          ? "⚠️"
          : status >= 300
            ? "➡️"
            : status >= 200
              ? "✅"
              : "";
    server.log.info(`${statusEmoji} Responded with status: ${status}`);
  });
}
