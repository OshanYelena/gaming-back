// src/modules/auth/auth.routes.ts  — REPLACE the existing file
import { Router } from "express";
import { validate } from "../../middleware/validate";
import { AuthController } from "./auth.controller";
import {
  RegisterSchema, LoginSchema, RefreshSchema, LogoutSchema,
  ForgotPasswordSchema, ResetPasswordSchema,
  VerifyEmailSchema, ResendVerificationSchema,
} from "./auth.schemas";

const r = Router();
const c = new AuthController();

r.post("/register",             validate(RegisterSchema),            c.register);
r.post("/login",                validate(LoginSchema),               c.login);
r.post("/refresh",              validate(RefreshSchema),             c.refresh);
r.post("/logout",               validate(LogoutSchema),              c.logout);
r.post("/forgot-password",      validate(ForgotPasswordSchema),      c.forgotPassword);
r.post("/reset-password",       validate(ResetPasswordSchema),       c.resetPassword);
r.post("/verify-email",         validate(VerifyEmailSchema),         c.verifyEmail);
r.post("/resend-verification",  validate(ResendVerificationSchema),  c.resendVerification);

export default r;
