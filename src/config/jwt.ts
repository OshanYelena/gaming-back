import jwt from "jsonwebtoken";
import { env } from "./env";

export type AccessPayload = { sub: string; role: string; email: string };
export type RefreshPayload = { sub: string; jti: string };

export function signAccessToken(payload: AccessPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_PRIVATE_KEY, {
    // algorithm: "RS256",
    algorithm: "HS256",
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_PRIVATE_KEY, { algorithms: ["HS256"] }) as AccessPayload;
}

export function signRefreshToken(payload: RefreshPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`,
  });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as RefreshPayload;
}