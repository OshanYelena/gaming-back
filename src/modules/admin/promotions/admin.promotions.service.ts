import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

export class AdminPromotionsService {
  async list(query: { page: number; limit: number; q?: string; active?: boolean }) {
    const { page, limit, q, active } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (typeof active === "boolean") where.isActive = active;
    if (q) {
      where.code = { contains: q.trim().toUpperCase(), mode: "insensitive" };
    }

    const [total, items] = await Promise.all([
      prisma.promotion.count({ where }),
      prisma.promotion.findMany({
        where,
        orderBy: [{ isActive: "desc" }, { code: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    return { page, limit, total, pages: Math.ceil(total / limit), items };
  }

  async get(id: string) {
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw httpError(404, "Promotion not found");
    return promo;
  }

  async create(data: any) {
    try {
      return await prisma.promotion.create({
        data: {
          code: data.code,
          type: data.type,
          value: data.value ?? null,
          minOrderAmount: data.minOrderAmount ?? null,
          usageLimit: data.usageLimit ?? null,
          usedCount: 0,
          startsAt: data.startsAt ? new Date(data.startsAt) : null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          isActive: data.isActive ?? true,
        },
      });
    } catch (e: any) {
      if (isUniqueViolation(e)) throw httpError(409, "Promotion code already exists");
      throw e;
    }
  }

  async update(id: string, patch: any) {
    // If type changes, ensure value remains valid; schemas cover most of it.
    try {
      return await prisma.promotion.update({
        where: { id },
        data: {
          ...patch,
          startsAt:
            patch.startsAt === undefined ? undefined : patch.startsAt === null ? null : new Date(patch.startsAt),
          expiresAt:
            patch.expiresAt === undefined ? undefined : patch.expiresAt === null ? null : new Date(patch.expiresAt),
          value: patch.value === undefined ? undefined : (patch.value ?? null),
          minOrderAmount: patch.minOrderAmount === undefined ? undefined : (patch.minOrderAmount ?? null),
          usageLimit: patch.usageLimit === undefined ? undefined : (patch.usageLimit ?? null),
        },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Promotion not found");
      if (isUniqueViolation(e)) throw httpError(409, "Promotion code already exists");
      throw e;
    }
  }

  async disable(id: string) {
    try {
      return await prisma.promotion.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Promotion not found");
      throw e;
    }
  }
}