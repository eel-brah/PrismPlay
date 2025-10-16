import type { FastifyInstance } from "fastify";
import {
  registerUserHander,
  getUsersHandler,
  loginHander,
  getUserByIdHandler,
  updateUserHandler,
  deleteUserHandler,
  logoutHandler,
} from "./user_controller.ts";
import {
  createResponseSchema,
  userResponseSchema,
  createUserSchema,
  getUserParamsSchema,
  loginResponseSchema,
  loginSchema,
  messageResponseSchema,
  updateUserSchema,
  usersResponseSchema,
} from "./user_schema.ts";

export async function authRoutes(server: FastifyInstance) {
  server.post(
    "/login",
    {
      schema: {
        body: loginSchema,
        response: {
          200: loginResponseSchema,
        },
      },
    },
    loginHander,
  );
  server.post(
    "/sign_up",
    {
      schema: {
        body: createUserSchema,
        response: {
          201: userResponseSchema,
        },
      },
    },
    registerUserHander,
  );

  server.post(
    "/logout",
    {
      preHandler: [server.auth],
      schema: {
        response: createResponseSchema(messageResponseSchema, [200, 400]),
      },
    },
    logoutHandler,
  );
}

export async function userRoutes(server: FastifyInstance) {
  // server.addHook("preHandler", server.auth);

  server.get(
    "/",
    {
      preHandler: [server.auth],
      schema: {
        response: {
          200: usersResponseSchema,
        },
      },
    },
    getUsersHandler,
  );
  server.get(
    "/:id",
    {
      preHandler: [server.auth],
      schema: {
        params: getUserParamsSchema,
        response: {
          404: messageResponseSchema,
          200: userResponseSchema,
        },
      },
    },
    getUserByIdHandler,
  );
  server.patch(
    "/:id",
    {
      preHandler: [server.auth],
      schema: {
        params: getUserParamsSchema,
        body: updateUserSchema,
        response: {
          400: messageResponseSchema,
          404: messageResponseSchema,
          200: userResponseSchema,
        },
      },
    },
    updateUserHandler,
  );
  server.delete(
    "/:id",
    {
      preHandler: [server.auth],
      schema: {
        params: getUserParamsSchema,
        response: {
          404: messageResponseSchema,
        },
      },
    },
    deleteUserHandler,
  );
}
