// src/modules/auth/auth.service.ts  — REPLACE the existing file
import { prisma } from "../../config/prisma";
import { hashPassword, verifyPassword, hashToken, verifyToken } from "../../utils/hash";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../config/jwt";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../utils/mailer";
import crypto from "crypto";
import { env } from "../../config/env";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function refreshExpiryDate() {
  const ms = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms);
}

/** Generate a secure random token and its SHA-256 hash (stored in DB). */
function generateToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString("hex");          // 64-char hex, sent to user
  const hashed = crypto.createHash("sha256").update(raw).digest("hex"); // stored in DB
  return { raw, hashed };
}

export class AuthService {
  // ── Existing ──────────────────────────────────────────────────────────

  async register(input: { email: string; password: string; firstName?: string; lastName?: string }) {
    const email = input.email.toLowerCase().trim();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw httpError(409, "Email already registered");

    const passwordHash = await hashPassword(input.password);

    // Generate email verification token
    const { raw: verifyRaw, hashed: verifyHashed } = generateToken();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        isVerified: false,
        emailVerifyToken: verifyHashed,
        emailVerifyExpiresAt: verifyExpiry,
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, isVerified: true },
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(email, verifyRaw).catch(err =>
      console.error("[auth] Failed to send verification email:", err)
    );

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

    await prisma.refreshToken.update({ where: { id: tokenRow.id }, data: { revokedAt: new Date() } });

    const tokens = await this.issueTokens({
      userId: tokenRow.user.id,
      email: tokenRow.user.email,
      role: tokenRow.user.role,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    });

    return {
      user: { id: tokenRow.user.id, email: tokenRow.user.email, role: tokenRow.user.role, firstName: tokenRow.user.firstName, lastName: tokenRow.user.lastName, isVerified: tokenRow.user.isVerified },
      ...tokens,
    };
  }

  async logout(refreshTokenRaw: string) {
    if (!refreshTokenRaw) return;
    try {
      const payload = verifyRefreshToken(refreshTokenRaw);
      await prisma.refreshToken.update({ where: { id: payload.jti }, data: { revokedAt: new Date() } }).catch(() => {});
    } catch { /* ignore */ }
  }

  // ── New: Forgot Password ──────────────────────────────────────────────

  async forgotPassword(email: string) {
    const normalised = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalised }, select: { id: true, email: true, isActive: true } });

    // Always respond 200 to prevent email enumeration
    if (!user || !user.isActive) return;

    const { raw, hashed } = generateToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: hashed, passwordResetExpiresAt: expiry },
    });

    await sendPasswordResetEmail(user.email, raw).catch(err =>
      console.error("[auth] Failed to send password reset email:", err)
    );
  }

  // ── New: Reset Password ───────────────────────────────────────────────

  async resetPassword(tokenRaw: string, newPassword: string) {
    const hashed = crypto.createHash("sha256").update(tokenRaw).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashed,
        passwordResetExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) throw httpError(400, "Reset token is invalid or has expired");

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    // Revoke all existing refresh tokens so all sessions are logged out
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ── New: Verify Email ─────────────────────────────────────────────────

  async verifyEmail(tokenRaw: string) {
    const hashed = crypto.createHash("sha256").update(tokenRaw).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hashed,
        emailVerifyExpiresAt: { gt: new Date() },
      },
      select: { id: true, isVerified: true },
    });

    if (!user) throw httpError(400, "Verification link is invalid or has expired");
    if (user.isVerified) return; // idempotent

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiresAt: null,
      },
    });
  }

  // ── New: Resend Verification Email ────────────────────────────────────

  async resendVerification(email: string) {
    const normalised = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalised },
      select: { id: true, email: true, isVerified: true, isActive: true },
    });

    // Silent — prevent enumeration
    if (!user || !user.isActive || user.isVerified) return;

    const { raw, hashed } = generateToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: hashed, emailVerifyExpiresAt: expiry },
    });

    await sendVerificationEmail(user.email, raw).catch(err =>
      console.error("[auth] Failed to resend verification email:", err)
    );
  }

  // ── Private ───────────────────────────────────────────────────────────

  private async issueTokens(args: { userId: string; email: string; role: string; userAgent?: string; ipAddress?: string }) {
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
