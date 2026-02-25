import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export class AdminUsersService {
  async list(query: {
    page: number;
    limit: number;
    q?: string;
    role?: string;
    active?: boolean;
    verified?: boolean;
  }) {
    const { page, limit, q, role, active, verified } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (typeof active === "boolean") where.isActive = active;
    if (typeof verified === "boolean") where.isVerified = verified;

    if (q) {
      const t = q.trim();
      where.OR = [
        { email: { contains: t, mode: "insensitive" } },
        { firstName: { contains: t, mode: "insensitive" } },
        { lastName: { contains: t, mode: "insensitive" } },
        { phone: { contains: t, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return { page, limit, total, pages: Math.ceil(total / limit), items };
  }

  async get(id: string) {
    const u = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            currency: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
            reviews: true,
          },
        },
      },
    });

    if (!u) throw httpError(404, "User not found");
    return u;
  }

  async update(id: string, patch: any) {
    // Safety: prevent admin from demoting themselves accidentally is handled better via req.user, but optional.
    try {
      return await prisma.user.update({
        where: { id },
        data: patch,
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true,
          isActive: true,
          updatedAt: true,
        },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "User not found");
      throw e;
    }
  }

  async listOrders(userId: string, query: { page: number; limit: number }) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where = { userId };

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { page, limit, total, pages: Math.ceil(total / limit), items };
  }
}