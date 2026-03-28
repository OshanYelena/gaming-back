// src/modules/auth/auth.controller.ts  — REPLACE the existing file
import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { env } from "../../config/env";

const REFRESH_COOKIE = "refresh_token";
const ACCESS_COOKIE  = "access_token";

function isSecureCookie() {
  return Boolean(env.COOKIE_SECURE) || env.NODE_ENV === "production";
}
function sameSiteValue() { return "lax" as const; }

function setAccessCookie(res: Response, token: string) {
  res.cookie(ACCESS_COOKIE, token, {
    httpOnly: true, secure: isSecureCookie(), sameSite: sameSiteValue(),
    maxAge: env.ACCESS_TOKEN_TTL_MIN * 60 * 1000, path: "/api/v1",
  });
}
function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true, secure: isSecureCookie(), sameSite: sameSiteValue(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000, path: "/api/v1/auth",
  });
}
function clearRefreshCookie(res: Response) { res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" }); }
function clearAccessCookie(res: Response)  { res.clearCookie(ACCESS_COOKIE,  { path: "/api/v1" }); }

export class AuthController {
  private svc = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      const result = await this.svc.register({ email, password, firstName, lastName });
      setRefreshCookie(res, result.refreshToken);
      setAccessCookie(res, result.accessToken);
      return res.status(201).json({ user: result.user, accessToken: result.accessToken });
    } catch (e) { next(e); }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const userAgent = req.get("user-agent") || undefined;
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
      const result = await this.svc.login({ email, password, userAgent, ipAddress });
      setRefreshCookie(res, result.refreshToken);
      setAccessCookie(res, result.accessToken);
      return res.json({ user: result.user, accessToken: result.accessToken });
    } catch (e) { next(e); }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rt = req.cookies?.[REFRESH_COOKIE];
      const userAgent = req.get("user-agent") || undefined;
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;
      const result = await this.svc.refresh(rt, { userAgent, ipAddress });
      setRefreshCookie(res, result.refreshToken);
      setAccessCookie(res, result.accessToken);
      return res.json({ user: result.user, accessToken: result.accessToken });
    } catch (e) { next(e); }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rt = req.cookies?.[REFRESH_COOKIE];
      await this.svc.logout(rt);
      clearRefreshCookie(res);
      clearAccessCookie(res);
      return res.status(204).send();
    } catch (e) { next(e); }
  };

  // ── New ──────────────────────────────────────────────────────────────

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.svc.forgotPassword(req.body.email);
      // Always 200 — prevents email enumeration
      return res.json({ message: "If that email is registered you will receive a reset link shortly." });
    } catch (e) { next(e); }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.svc.resetPassword(req.body.token, req.body.password);
      return res.json({ message: "Password updated successfully. Please log in with your new password." });
    } catch (e) { next(e); }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.svc.verifyEmail(req.body.token);
      return res.json({ message: "Email verified successfully." });
    } catch (e) { next(e); }
  };

  resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.svc.resendVerification(req.body.email);
      return res.json({ message: "If that email is registered and unverified you will receive a new verification link." });
    } catch (e) { next(e); }
  };
}
