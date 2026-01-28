import type { FastifyInstance } from "fastify";
import {
  registerUserHandler,
  loginHandler,
  logoutHandler,
  getMeHandler,
  updateMeHandler,
  uploadAvatar,
} from "./user_controller.ts";
import {
  createResponseSchema,
  createUserSchema,
  loginResponseSchema,
  loginSchema,
  messageResponseSchema,
  updateUserSchema,
  userResponseSchema,
} from "./user_schema.ts";

export async function authRoutes(server: FastifyInstance) {
  server.post("/login", {
    schema: {
      body: loginSchema,
      response: { 200: loginResponseSchema },
    },
    handler: loginHandler,
  });

  server.post("/sign_up", {
    schema: {
      body: createUserSchema,
      response: { 201: userResponseSchema },
    },
    handler: registerUserHandler,
  });

  server.post("/logout", {
    preHandler: [server.auth],
    schema: {
      response: createResponseSchema(messageResponseSchema, [200, 400]),
    },
    handler: logoutHandler,
  });
}

export async function userRoutes(server: FastifyInstance) {
  server.get("/me", {
    preHandler: [server.auth],
    schema: { response: { 200: userResponseSchema } },
    handler: getMeHandler,
  });

  server.patch("/me", {
    preHandler: [server.auth],
    schema: {
      body: updateUserSchema,
      response: {
        200: userResponseSchema,
        400: messageResponseSchema,
        409: messageResponseSchema,
      },
    },
    handler: updateMeHandler,
  });
  server.post("/avatar", {
    preHandler: [server.auth],
    handler: uploadAvatar,
  });
}
