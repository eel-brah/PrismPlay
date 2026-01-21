import { z } from "zod";

export const publicUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatarUrl: z.string().nullable().optional(),
  lastLogin: z.union([z.string(), z.date()]).nullable().optional(),
});

export const friendRowSchema = z.object({
  createdAt: z.union([z.string(), z.date()]),
  friend: publicUserSchema,
});
export const friendsListSchema = z.array(friendRowSchema);

export const incomingRequestSchema = z.object({
  id: z.number(),
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELED"]),
  sentAt: z.union([z.string(), z.date()]),
  respondedAt: z.union([z.string(), z.date()]).nullable().optional(),
  fromUser: publicUserSchema,
});
export const incomingRequestsSchema = z.array(incomingRequestSchema);

export const sendRequestBodySchema = z.object({
  username: z.string().min(1, "username is required"),
});

export const requestIdParamsSchema = z.object({
  requestId: z.coerce.number().int().positive(),
});

export const friendIdParamsSchema = z.object({
  friendId: z.coerce.number().int().positive(),
});

export const messageSchema = z.object({
  message: z.string(),
});

export type SendRequestBody = z.infer<typeof sendRequestBodySchema>;
