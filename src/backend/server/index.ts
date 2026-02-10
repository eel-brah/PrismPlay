import server, { http_server } from "./server.js";
import { setGlobalErrorHandler } from "./errorHandler.js";
import { registerRoutes } from "./routes.js";
import { setupAuth } from "./auth.js";
import { PORT, HTTP_PORT, IP } from "./config.js";
import loggingHook from "./loggingHook.js";
import socketPlugin from "./socket/index.js"
// import socketPlugin from "./socket"

// Set up error handling
setGlobalErrorHandler(server);

// Auth setup
await setupAuth(server);

// Logging
await loggingHook(server);

// Register Socket.IO
server.register(socketPlugin);

// Register routes
registerRoutes(server, http_server);

async function main() {
  try {
    await server.listen({ port: PORT, host: IP });
    await http_server.listen({ port: HTTP_PORT, host: IP });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
