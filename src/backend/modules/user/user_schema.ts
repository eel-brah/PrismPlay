import { z } from "zod";

const userCore = {
  username: z.string().min(5, {
    error: (issue) =>
      issue.input?.length
        ? "username must be at least 5 characters"
        : "username is required",
  }),
  email: z.email({
    error: (issue) =>
      issue.input === undefined
        ? "Email is required"
        : "Email must be a string",
  }),
};

export const createUserSchema = z.object({
  ...userCore,
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

export const userResponseSchema = z.object({
  id: z.number(),
  ...userCore,
});

export const usersResponseSchema = z.array(userResponseSchema);

export const loginSchema = z.object({
  email: z.email({
    error: (issue) =>
      issue.input === undefined
        ? "Email is required"
        : "Email must be a string",
  }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
});

export const getUserParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "id must be a number"),
});

export const updateUserSchema = z.object({
  email: z
    .email({
      error: (issue) =>
        issue.input === undefined
          ? "Email is required"
          : "Email must be a string",
    })
    .optional(),
  username: z
    .string()
    .min(5, {
      error: (issue) =>
        issue.input?.length
          ? "username must be at least 5 characters"
          : "username is required",
    })
    .optional(),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .optional(),
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

export const authHeaderSchema = z.object({
  authorization: z
    .string()
    .min(1, { message: "Authorization header is required" })
    .regex(/^Bearer\s.+$/, { message: "Authorization must be a Bearer token" }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GetUserParams = z.infer<typeof getUserParamsSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
export type AuthHeaderSchema = z.infer<typeof authHeaderSchema>;
