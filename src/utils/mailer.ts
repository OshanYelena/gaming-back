/**
 * mailer.ts  — src/utils/mailer.ts
 *
 * Thin wrapper around nodemailer. Reads SMTP config from environment.
 * Install: npm install nodemailer @types/nodemailer
 *
 * Required .env vars:
 *   SMTP_HOST=smtp.gmail.com      (or your provider)
 *   SMTP_PORT=587
 *   SMTP_SECURE=false             (true for port 465)
 *   SMTP_USER=you@example.com
 *   SMTP_PASS=your-app-password
 *   MAIL_FROM="ShalomTek <no-reply@shalomtek.com>"
 *   FRONTEND_URL=http://localhost:3000
 */
import nodemailer from "nodemailer";

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.MAIL_FROM ?? "ShalomTek <no-reply@shalomtek.com>";
const FRONTEND = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${FRONTEND}/auth/reset-password?token=${token}`;
  const transporter = createTransport();
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Reset your ShalomTek password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#e60000">Password Reset</h2>
        <p>We received a request to reset your password.</p>
        <p>Click the button below. This link expires in <strong>1 hour</strong>.</p>
        <a href="${url}" style="display:inline-block;background:#e60000;color:#fff;
          padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">
          Reset Password
        </a>
        <p style="font-size:12px;color:#666">
          Or copy: <a href="${url}">${url}</a>
        </p>
        <p style="font-size:12px;color:#666">
          If you didn't request this, ignore this email — your password won't change.
        </p>
      </div>
    `,
    text: `Reset your password: ${url}\n\nExpires in 1 hour.\nIf you didn't request this, ignore this email.`,
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${FRONTEND}/auth/verify-email?token=${token}`;
  const transporter = createTransport();
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Verify your ShalomTek email",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#e60000">Verify Your Email</h2>
        <p>Thanks for registering at ShalomTek Computer Solutions!</p>
        <p>Click the button below to verify your email. This link expires in <strong>24 hours</strong>.</p>
        <a href="${url}" style="display:inline-block;background:#e60000;color:#fff;
          padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">
          Verify Email
        </a>
        <p style="font-size:12px;color:#666">
          Or copy: <a href="${url}">${url}</a>
        </p>
      </div>
    `,
    text: `Verify your email: ${url}\n\nExpires in 24 hours.`,
  });
}
