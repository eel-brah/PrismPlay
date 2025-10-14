import Fastify from "fastify";
import fs from "fs";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import { SSL_CERT_PATH, SSL_KEY_PATH } from "./config.ts";

const server = Fastify({
  https: {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH),
  },
}).withTypeProvider<ZodTypeProvider>();
export const http_server = Fastify({});

// Attach Zod validator/serializer
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

export default server;
