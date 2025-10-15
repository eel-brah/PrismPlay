import server, { http_server } from "./server.ts";
import { setGlobalErrorHandler } from "./errorHandler.ts";
import { registerRoutes } from "./routes.ts";
import { setupAuth } from "./auth.ts";
import { PORT, HTTP_PORT, IP } from "./config.ts";
import loggingHook from "./loggingHook.ts";

// Set up error handling
setGlobalErrorHandler(server);

// Auth setup
await setupAuth(server);

await loggingHook(server);

// Register routes
registerRoutes(server, http_server);

async function main() {
  try {
    await server.listen({ port: PORT, host: IP });
    await http_server.listen({ port: HTTP_PORT, host: IP });
    // console.log(`Server started at ${IP}:${PORT}`);
    // console.log(`HTTP server started at ${IP}:${HTTP_PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
