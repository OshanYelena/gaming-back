import { z } from "zod";

export const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const RefreshSchema = z.object({
  body: z.object({}).optional(), // refresh token comes from cookie
});

export const LogoutSchema = z.object({
  body: z.object({}).optional(),
});