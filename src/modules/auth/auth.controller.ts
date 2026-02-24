import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { env } from "../../config/env";

const REFRESH_COOKIE = "refresh_token";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth",
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
}

export class AuthController {
  private svc = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      const result = await this.svc.register({ email, password, firstName, lastName });

      setRefreshCookie(res, result.refreshToken);
      return res.status(201).json({ user: result.user, accessToken: result.accessToken });
    } catch (e) {
      next(e);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const userAgent = req.get("user-agent") || undefined;
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;

      const result = await this.svc.login({ email, password, userAgent, ipAddress });

      setRefreshCookie(res, result.refreshToken);
      return res.json({ user: result.user, accessToken: result.accessToken });
    } catch (e) {
      next(e);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rt = req.cookies?.[REFRESH_COOKIE];
      const userAgent = req.get("user-agent") || undefined;
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip;

      const result = await this.svc.refresh(rt, { userAgent, ipAddress });

      setRefreshCookie(res, result.refreshToken);
      return res.json({ user: result.user, accessToken: result.accessToken });
    } catch (e) {
      next(e);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rt = req.cookies?.[REFRESH_COOKIE];
      await this.svc.logout(rt);
      clearRefreshCookie(res);
      return res.status(204).send();
    } catch (e) {
      next(e);
    }
  };
}