import { z } from "zod";

const usernameSchema = z
  .string({ required_error: "username is required" })
  .min(5, "username must be at least 5 characters");

const emailSchema = z
  .string({ required_error: "email is required" })
  .email("email must be valid");

const passwordSchema = z
  .string({ required_error: "password is required" })
  .min(6, "password must be at least 6 characters");

export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const userResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: userResponseSchema,
});

export const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const messageResponseSchema = z.object({
  message: z.string(),
});

export function createResponseSchema(schema: any, codes: number[]) {
  return codes.reduce((acc, code) => {
    acc[code] = schema;
    return acc;
  }, {} as Record<number, any>);
}

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
