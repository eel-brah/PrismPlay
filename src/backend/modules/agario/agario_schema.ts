import { z } from "zod";

export const socketAuthSchema = z
  .object({
    token: z.string().optional(),
    guestId: z.string().optional(),
  })
  .refine((data) => Boolean(data.token || data.guestId), {
    message: "Either token or guestId is required",
  });

export type SocketAuth = z.infer<typeof socketAuthSchema>;

export const inputSchema = z.object({
  x: z.number(),
  y: z.number(),
  dt: z.number(),
});

export const createRoomSchema = z.object({
  name: z.string(),
  room: z.string(),
  visibility: z.string(),
  players: z.number(),
  durationMin: z.number(),
  allowSpectators: z.boolean(),
});

export const joinRoomSchema = z.object({
  room: z.string(),
  name: z.string(),
  key: z.string().optional(),
  spectator: z.boolean(),
});

export type JoinRoomPayload = z.infer<typeof joinRoomSchema>;
export type CreateRoomPayload = z.infer<typeof createRoomSchema>;
export type InputState = z.infer<typeof inputSchema>;
