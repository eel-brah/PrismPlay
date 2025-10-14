import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { Prisma } from "@prisma/client";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";

export function setGlobalErrorHandler(server: FastifyInstance) {
  server.setErrorHandler(
    (error: FastifyError, req: FastifyRequest, rep: FastifyReply) => {
      if (error.code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
        return rep.status(400).send({ message: "Invalid json body" });
      }
      if (error.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER") {
        return rep.status(401).send({ message: "Token missing" });
      }
      if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
        return rep.status(500).send({ message: "Token is invalid" });
      }
      if (hasZodFastifySchemaValidationErrors(error)) {
        let message = error.validation.map((v) => v.message).join(", ");
        return rep.code(400).send({
          error: "Validation Error",
          message,
          statusCode: 400,
          details: {
          issues: error.validation,
          method: req.method,
          url: req.url,
          },
        });
      }

      if (isResponseSerializationError(error)) {
        return rep.code(500).send({
          error: "Internal Server Error",
          message: "Response doesn't match the schema",
          // statusCode: 500,
          details: {
            issues: error.cause.issues,
            method: error.method,
            url: error.url,
          },
        });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return rep.status(409).send({
            message: `Unique constraint failed on: ${error.meta?.target}`,
          });
        }
        if (error.code === "P2025") {
          return rep.status(404).send({ message: "Record not found" });
        }
      }

      console.error(error);
      return rep.status(500).send({ message: "Internal server error" });
    },
  );
}
