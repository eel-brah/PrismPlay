import Fastify from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { NODE_ENV} from "./config.js";
import multipart from "@fastify/multipart";
import staticPlugin from "./static.js";

const logger =
  NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }
    : true;

const server = Fastify({
  logger,
  disableRequestLogging: true,
}).withTypeProvider<ZodTypeProvider>();

// Attach Zod validator/serializer
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

await server.register(staticPlugin);

await server.register(multipart, {
  limits: {
    files: 1,
    fileSize: 2 * 1024 * 1024,
  },
});

export default server;
