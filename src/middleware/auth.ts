import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../config/jwt";

/**
 * requireAuth — rejects with 401 if no valid Bearer token is present.
 * Use on routes that must be authenticated (order history, admin, etc.)
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  const cookieToken = (req as any).cookies?.access_token;
  const token = bearer || cookieToken;

  if (!token) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));

  try {
    const payload = verifyAccessToken(token) as any;
    (req as any).user = payload;
    next();
  } catch {
    next(Object.assign(new Error("Invalid token"), { status: 401 }));
  }
}

/**
 * optionalAuth — sets req.user if a valid Bearer token is present, but NEVER rejects.
 * If the token is missing or invalid the request continues as a guest (req.user = undefined).
 *
 * Use on routes that serve BOTH guests and logged-in users:
 *   cart (get / add / update / remove / clear / coupon)
 *   orders (create, checkout/validate, checkout/payment-intent)
 *
 * Without this, getUserId(req) always returns undefined on those routes even
 * when the client sends a valid token, so every cart and order becomes a guest record.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || "";
  const bearer = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  const cookieToken = (req as any).cookies?.access_token;
  const token = bearer || cookieToken;

  if (!token) return next(); // no token → guest, carry on

  try {
    const payload = verifyAccessToken(token) as any;
    (req as any).user = payload;
  } catch {
    // expired / invalid token → treat as guest, do NOT call next(error)
  }

  next();
}
