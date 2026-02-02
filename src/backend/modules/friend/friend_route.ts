import type { FastifyInstance } from "fastify";
import {
  friendsListSchema,
  incomingRequestsSchema,
  sendRequestBodySchema,
  requestIdParamsSchema,
  friendIdParamsSchema,
  messageSchema,
  pendingSchema,
  userIdParamsSchema,
} from "./friend_schema";
import {
  listFriendsHandler,
  listIncomingHandler,
  sendRequestHandler,
  acceptRequestHandler,
  declineRequestHandler,
  removeFriendHandler,
  isPendingHandler,
} from "./friend_controller";

export async function friendsRoutes(app: FastifyInstance) {
  app.get("/", {
    preHandler: [app.auth],
    schema: { response: { 200: friendsListSchema } },
    handler: listFriendsHandler,
  });

  app.get("/requests/incoming", {
    preHandler: [app.auth],
    schema: { response: { 200: incomingRequestsSchema } },
    handler: listIncomingHandler,
  });

  app.post("/requests", {
    preHandler: [app.auth],
    schema: {
      body: sendRequestBodySchema,
      response: {
        201: messageSchema,
        400: messageSchema,
        404: messageSchema,
        409: messageSchema,
      },
    },
    handler: sendRequestHandler,
  });

  app.get("/requests/pending/:userId", {
    preHandler: [app.auth],
    schema: {
      params: userIdParamsSchema,
      response: { 200: pendingSchema },
    },
    handler: isPendingHandler,
  });

  app.post("/requests/:requestId/accept", {
    preHandler: [app.auth],
    schema: {
      params: requestIdParamsSchema,
      response: {
        200: messageSchema,
        400: messageSchema,
        403: messageSchema,
        404: messageSchema,
      },
    },
    handler: acceptRequestHandler,
  });

  app.post("/requests/:requestId/decline", {
    preHandler: [app.auth],
    schema: {
      params: requestIdParamsSchema,
      response: {
        200: messageSchema,
        400: messageSchema,
        403: messageSchema,
        404: messageSchema,
      },
    },
    handler: declineRequestHandler,
  });

  app.delete("/:friendId", {
    preHandler: [app.auth],
    schema: {
      params: friendIdParamsSchema,
      response: { 200: messageSchema },
    },
    handler: removeFriendHandler,
  });
}
