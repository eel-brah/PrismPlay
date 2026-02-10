import Fastify from "fastify";
import fs from "fs";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { NODE_ENV, SSL_CERT_PATH, SSL_KEY_PATH } from "./config.js";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import staticPlugin from "./static.js";

const logger = {
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
    },
  },
};


//TODO:
if (!SSL_KEY_PATH || !SSL_CERT_PATH) {
  throw new Error("Missing SSL_KEY_PATH or SSL_CERT_PATH environment variable");
}

const server = Fastify({
  https: {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH),
  },
  // logger: NODE_ENV === "development" ? logger : false,
  logger,
  disableRequestLogging: true,
}).withTypeProvider<ZodTypeProvider>();

export const http_server = Fastify({
  logger,
  // logger: NODE_ENV === "development" ? logger : false,
  disableRequestLogging: true,
});

await server.register(staticPlugin);

// Attach Zod validator/serializer
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(multipart, {
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
});

export default server;
