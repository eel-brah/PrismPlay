import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createRevokedToken,
  createUser,
  deleteUserById,
  findUserByEmail,
  findUserById,
  getUsers,
  updateUserById,
} from "./user_service.ts";
import type {
  CreateUserInput,
  GetUserParams,
  LoginInput,
  UpdateUserBody,
} from "./user_schema.ts";
import { verifyPassword } from "../../utils/hash.ts";
import server from "../../server/server.ts";

export async function getUsersHandler() {
  const users = await getUsers();

  return users;
}

export async function getUserByIdHandler(
  req: FastifyRequest<{ Params: GetUserParams }>,
  rep: FastifyReply,
) {
  const { id } = req.params;
  const user = await findUserById(Number(id));
  if (!user) {
    return rep.status(404).send({ message: "User not found" });
  }
  return rep.send(user);
}

export async function updateUserHandler(
  req: FastifyRequest<{ Params: GetUserParams; Body: UpdateUserBody }>,
  rep: FastifyReply,
) {
  const { id } = req.params;
  const data = req.body;

  try {
    const updatedUser = await updateUserById(Number(id), data);
    if (updatedUser === null)
      return rep.status(404).send({ message: "User not found" });
    return rep.send(updatedUser);
  } catch (err) {
    return rep.status(400).send({ message: "Error updating user" });
  }
}

export async function deleteUserHandler(
  req: FastifyRequest<{ Params: GetUserParams }>,
  rep: FastifyReply,
) {
  const { id } = req.params;

  const user = await deleteUserById(Number(id));
  if (user === null) {
    return rep.status(404).send({ message: "User not found" });
  }
  return rep.status(204).send();
}

export async function registerUserHander(
  req: FastifyRequest<{ Body: CreateUserInput }>,
  rep: FastifyReply,
) {
  const body = req.body;

  const user = await createUser(body);
  return rep.status(201).send(user);
}

export async function logoutHandler(req: FastifyRequest, rep: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return rep.code(400).send({ message: "Missing Authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    await createRevokedToken(token);
    return rep.status(200).send({ message: "Logged out successfully" });
  } catch (err) {
    return rep.status(200).send({ message: "Token already revoked" });
  }
}

export async function loginHander(
  req: FastifyRequest<{ Body: LoginInput }>,
  rep: FastifyReply,
) {
  const body = req.body;

  const user = await findUserByEmail(body.email);
  if (!user) {
    return rep.code(401).send({ message: "Invalid email or password" });
  }

  const isPassCorrect = await verifyPassword(body.password, user.passwordHash);

  if (isPassCorrect) {
    // const { passwordHash, ...rest } = user;
    const data = {
      id: user.id,
      email: user.email,
    };
    return { accessToken: server.jwt.sign(data) };
  }

  return rep.code(401).send({ message: "Invalid email or password" });
}
