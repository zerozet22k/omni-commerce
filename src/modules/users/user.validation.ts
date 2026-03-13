import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(200, "Email is too long.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

const phoneSchema = z
  .string()
  .trim()
  .max(30, "Phone is too long.")
  .optional()
  .transform((value) => value || undefined);

export const registerUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is too short.")
    .max(150, "Full name is too long."),
  email: emailSchema,
  phone: phoneSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
});

export const loginUserSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password is too long."),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
