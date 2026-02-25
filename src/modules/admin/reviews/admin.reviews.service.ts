import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export class AdminReviewsService {
  async list(query: { page: number; limit: number; status?: string; q?: string }) {
    const { page, limit, status, q } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    if (q) {
      const t = q.trim();
      where.OR = [
        { title: { contains: t, mode: "insensitive" } },
        { body: { contains: t, mode: "insensitive" } },
        { product: { name: { contains: t, mode: "insensitive" } } },
        { user: { email: { contains: t, mode: "insensitive" } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    return { page, limit, total, pages: Math.ceil(total / limit), items };
  }

  async get(id: string) {
    const r = await prisma.review.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!r) throw httpError(404, "Review not found");
    return r;
  }

  async updateStatus(id: string, status: "pending" | "approved" | "rejected") {
    try {
      return await prisma.review.update({
        where: { id },
        data: { status },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Review not found");
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await prisma.review.delete({ where: { id } });
      return { ok: true };
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Review not found");
      throw e;
    }
  }
}