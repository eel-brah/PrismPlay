import { z } from "zod";

export const socketAuthSchema = z.object({
  sessionId: z.string().min(1),
  token: z.string().optional(),
  guestId: z.string().optional(),
}).refine(
  (data) => Boolean(data.token || data.guestId),
  { message: "Either token or guestId is required" }
);

export type SocketAuth = z.infer<typeof socketAuthSchema>;

function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }
  return parsed.data;
}

