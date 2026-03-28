// src/modules/auth/auth.schemas.ts  — REPLACE the existing file
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
  body: z.object({}).optional(),
});

export const LogoutSchema = z.object({
  body: z.object({}).optional(),
});

export const ForgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const ResetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters"),
  }),
});

export const VerifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});

export const ResendVerificationSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});
