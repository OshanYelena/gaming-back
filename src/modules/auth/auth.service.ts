import { prisma } from "../../config/prisma";
import { hashPassword, verifyPassword, hashToken, verifyToken } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../config/jwt";
import crypto from "crypto";
import { env } from "../../config/env";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function refreshExpiryDate() {
  const ms = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

export class AuthService {
  async register(input: { email: string; password: string; firstName?: string; lastName?: string }) {
    const email = input.email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw httpError(409, "Email already registered");

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        // isVerified stays false by default per spec; verification flow can be added next
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, isVerified: true },
    });

    // Issue tokens immediately (common UX). If you want “must verify before login”, we can enforce that.
    const tokens = await this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      userAgent: undefined,
      ipAddress: undefined,
    });

    return { user, ...tokens };
  }

  async login(input: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
    const email = input.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, passwordHash: true, isActive: true, isVerified: true, firstName: true, lastName: true },
    });

    if (!user) throw httpError(401, "Invalid email or password");
    if (!user.isActive) throw httpError(403, "Account disabled");

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) throw httpError(401, "Invalid email or password");

    const tokens = await this.issueTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, isVerified: user.isVerified },
      ...tokens,
    };
  }

  async refresh(refreshTokenRaw: string, meta?: { userAgent?: string; ipAddress?: string }) {
    if (!refreshTokenRaw) throw httpError(401, "Missing refresh token");

    let payload: { sub: string; jti: string };
    try {
      payload = verifyRefreshToken(refreshTokenRaw);
    } catch {
      throw httpError(401, "Invalid refresh token");
    }

    const tokenRow = await prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: { select: { id: true, email: true, role: true, isActive: true, isVerified: true, firstName: true, lastName: true } } },
    });

    if (!tokenRow) throw httpError(401, "Refresh token not found");
    if (tokenRow.revokedAt) throw httpError(401, "Refresh token revoked");
    if (tokenRow.expiresAt.getTime() < Date.now()) throw httpError(401, "Refresh token expired");
    if (!tokenRow.user.isActive) throw httpError(403, "Account disabled");
    if (tokenRow.userId !== payload.sub) throw httpError(401, "Token subject mismatch");

    const matches = await verifyToken(refreshTokenRaw, tokenRow.tokenHash);
    if (!matches) throw httpError(401, "Refresh token invalid");

    // Rotation: revoke old token row, mint new jti + token row
    await prisma.refreshToken.update({
      where: { id: tokenRow.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens({
      userId: tokenRow.user.id,
      email: tokenRow.user.email,
      role: tokenRow.user.role,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });

    return {
      user: {
        id: tokenRow.user.id,
        email: tokenRow.user.email,
        role: tokenRow.user.role,
        firstName: tokenRow.user.firstName,
        lastName: tokenRow.user.lastName,
        isVerified: tokenRow.user.isVerified,
      },
      ...tokens,
    };
  }

  async logout(refreshTokenRaw: string) {
    if (!refreshTokenRaw) return; // idempotent logout

    try {
      const payload = verifyRefreshToken(refreshTokenRaw);
      await prisma.refreshToken.update({
        where: { id: payload.jti },
        data: { revokedAt: new Date() },
      }).catch(() => {});
    } catch {
      // ignore invalid token — still clear cookie
    }
  }

  private async issueTokens(args: {
    userId: string;
    email: string;
    role: string;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const jti = crypto.randomUUID();

    const accessToken = signAccessToken({ sub: args.userId, email: args.email, role: args.role });
    const refreshToken = signRefreshToken({ sub: args.userId, jti });

    const tokenHash = await hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        id: jti,
        userId: args.userId,
        tokenHash,
        expiresAt: refreshExpiryDate(),
        userAgent: args.userAgent,
        ipAddress: args.ipAddress,
      },
    });

    return { accessToken, refreshToken };
  }
}