import type { FastifyReply, FastifyRequest } from "fastify";
import {
  listFriends,
  listIncomingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  IsFrienddPending,
} from "./friend_service.js";

type AuthedReq = FastifyRequest & { user: { id: number } };

export async function listFriendsHandler(req: AuthedReq, rep: FastifyReply) {
  const data = await listFriends(req.user.id);
  return rep.send(data);
}

export async function listIncomingHandler(req: AuthedReq, rep: FastifyReply) {
  const data = await listIncomingRequests(req.user.id);
  return rep.send(data);
}

export async function isPendingHandler(req:FastifyRequest<{Params: {userId: number}}>, rep: FastifyReply) {
  const myUserId = req.user.id;
  const other_id = Number(req.params.userId);
  const pending = await IsFrienddPending(myUserId, other_id);
  return rep.send({pending});
}

export async function sendRequestHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const userId = (req as any).user.id;

  const body = req.body as any;
  const username = String(body?.username ?? "").trim();

  if (!username) {
    return rep.code(400).send({ message: "username is required" });
  }

  const result = await sendFriendRequest(userId, username);

  if (!result.ok) {
    if (result.code === "NOT_FOUND")
      return rep.code(404).send({ message: "User not found" });
    if (result.code === "SELF")
      return rep.code(400).send({ message: "You cannot add yourself" });
    if (result.code === "ALREADY_FRIENDS")
      return rep.code(409).send({ message: "Already friends" });
    if (result.code === "ALREADY_REQUESTED")
      return rep.code(409).send({ message: "Request already exists" });
    return rep.code(400).send({ message: "Cannot send request" });
  }

  return rep.code(201).send({ message: "Request sent" });
}

export async function acceptRequestHandler(req: AuthedReq, rep: FastifyReply) {
  const requestId = Number((req.params as any).requestId);
  const result = await acceptFriendRequest(requestId, req.user.id);

  if (!result.ok) {
    if (result.code === "NOT_FOUND")
      return rep.code(404).send({ message: "Request not found" });
    if (result.code === "FORBIDDEN")
      return rep.code(403).send({ message: "Not allowed" });
    if (result.code === "NOT_PENDING")
      return rep.code(400).send({ message: "Request is not pending" });
    return rep.code(400).send({ message: "Cannot accept request" });
  }

  return rep.send({ message: "Friend request accepted" });
}

export async function declineRequestHandler(req: AuthedReq, rep: FastifyReply) {
  const requestId = Number((req.params as any).requestId);
  const result = await declineFriendRequest(requestId, req.user.id);

  if (!result.ok) {
    if (result.code === "NOT_FOUND")
      return rep.code(404).send({ message: "Request not found" });
    if (result.code === "FORBIDDEN")
      return rep.code(403).send({ message: "Not allowed" });
    if (result.code === "NOT_PENDING")
      return rep.code(400).send({ message: "Request is not pending" });
    return rep.code(400).send({ message: "Cannot decline request" });
  }

  return rep.send({ message: "Friend request declined" });
}

export async function removeFriendHandler(
  req: FastifyRequest,
  rep: FastifyReply,
) {
  const userId = (req as any).user.id;
  const friendId = Number((req.params as any).friendId);

  if (!Number.isFinite(friendId)) {
    return rep.code(400).send({ message: "Invalid friend id" });
  }

  const result = await removeFriend(userId, friendId);

  if (!result.ok) {
    return rep
      .code(404)
      .send({ message: "You are not friends with this user" });
  }

  return rep.send({ message: "Friend removed" });
}
