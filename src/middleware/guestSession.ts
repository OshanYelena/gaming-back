import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";

const SESSION_COOKIE = "session_id";

export function ensureGuestSession(req: Request, res: Response, next: NextFunction) {
  let sid = req.cookies?.[SESSION_COOKIE];

  if (!sid) {
    sid = crypto.randomUUID();
    res.cookie(SESSION_COOKIE, sid, {
      httpOnly: true,
      secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
      path: "/",
    });
    // make it available in the same request too
    (req as any).cookies = { ...(req as any).cookies, [SESSION_COOKIE]: sid };
  }

  next();
}

export function getSessionId(req: Request): string | undefined {
  return req.cookies?.[SESSION_COOKIE];
}