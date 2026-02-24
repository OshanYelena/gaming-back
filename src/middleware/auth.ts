import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../config/jwt";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";

  if (!token) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));

  try {
    const payload = verifyAccessToken(token) as any;
    (req as any).user = payload; // { sub, email, role }
    next();
  } catch {
    next(Object.assign(new Error("Invalid token"), { status: 401 }));
  }
}