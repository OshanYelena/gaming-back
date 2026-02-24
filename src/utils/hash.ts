import bcrypt from "bcrypt";

export async function hashPassword(raw: string) {
  return bcrypt.hash(raw, 12);
}

export async function verifyPassword(raw: string, hash: string) {
  return bcrypt.compare(raw, hash);
}

// For refresh tokens stored in DB (hash them so DB leaks don’t give active sessions)
export async function hashToken(raw: string) {
  return bcrypt.hash(raw, 12);
}

export async function verifyToken(raw: string, hash: string) {
  return bcrypt.compare(raw, hash);
}