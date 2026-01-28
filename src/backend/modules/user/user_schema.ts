/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

const emailSchema = z.email({
  error: (issue) => {
    if (issue.input === undefined || issue.input === "")
      return "Email is required";
    if (issue.code === "invalid_type") return "Email must be a string";
    return "Email must be a valid email address";
  },
});

const usernameSchema = z
  .string({
    error: (issue) =>
      issue.input === undefined || issue.input === ""
        ? "username is required"
        : "username must be a string",
  })
  .min(5, { error: "username must be at least 5 characters" })
  .regex(/^[a-zA-Z0-9_]+$/, {
    error: "username can only contain letters and numbers",
  });

const passwordSchema = z
  .string({
    error: (issue) =>
      issue.input === undefined || issue.input === ""
        ? "Password is required"
        : "Password must be a string",
  })
  .min(6, "Password must be at least 6 characters");

const userCore = {
  username: usernameSchema,
  email: emailSchema,
};
// check ...
export const createUserSchema = z.object({
  ...userCore,
  password: passwordSchema,
});
const isoDateOrDate = z.union([z.iso.datetime(), z.date()]);
// string .url is deprecated , need to change it
export const userResponseSchema = z.object({
  id: z.number(),
  ...userCore,
  createdAt: isoDateOrDate,
  lastLogin: isoDateOrDate.nullable(),
  avatarUrl: z.string().nullable(),
});

export const usersResponseSchema = z.array(userResponseSchema);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: userResponseSchema,
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  password: passwordSchema.optional(),
  avatarUrl: z.string().nullable().optional(),
});

export const messageResponseSchema = z.object({
  message: z.string(),
});

export function createResponseSchema(schema: any, codes: number[]) {
  return codes.reduce(
    (acc, code) => {
      acc[code] = schema;
      return acc;
    },
    {} as Record<number, any>,
  );
}

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
