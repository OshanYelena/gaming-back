import { prisma } from "../../config/prisma";
import { hashPassword, verifyPassword } from "../../utils/hash";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export class UsersService {
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw httpError(404, "User not found");
    return user;
  }

  async updateMe(userId: string, data: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string }) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) throw httpError(404, "User not found");

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw httpError(400, "Current password is incorrect");

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Per your doc: “On password change, all refresh tokens revoked.”  [oai_citation:1‡gaming_store_backend_architecture.docx](sediment://file_0000000068c47207bebeeee0e8fb30f7)
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }
}