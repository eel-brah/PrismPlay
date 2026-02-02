import type { FastifyInstance } from "fastify";
import {
  registerUserHandler,
  loginHandler,
  logoutHandler,
  getMeHandler,
  getUserByIdHandler,
  getUserByUsernameHandler,
  getUserAchievementsHandler,
  updateMeHandler,
  uploadAvatar,
} from "./user_controller.ts";
import {
  achievementsResponseSchema,
  createResponseSchema,
  createUserSchema,
  loginResponseSchema,
  loginSchema,
  messageResponseSchema,
  publicUserResponseSchema,
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
  server.get("/username/:username", {
    preHandler: [server.auth],
    schema: {
      response: {
        200: publicUserResponseSchema,
        400: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
    handler: getUserByUsernameHandler,
  });
  server.get("/:id", {
    preHandler: [server.auth],
    schema: {
      response: {
        200: publicUserResponseSchema,
        400: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
    handler: getUserByIdHandler,
  });
  server.get("/:id/achievements", {
    preHandler: [server.auth],
    schema: {
      response: {
        200: achievementsResponseSchema,
        400: messageResponseSchema,
        404: messageResponseSchema,
      },
    },
    handler: getUserAchievementsHandler,
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
