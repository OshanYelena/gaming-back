import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isUniqueViolation(e: any) {
  return e?.code === "P2002";
}

export class AdminBrandsService {
  async list(query: { page: number; limit: number; q?: string; featured?: boolean }) {
    const { page, limit, q, featured } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (typeof featured === "boolean") where.isFeatured = featured;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.brand.count({ where }),
      prisma.brand.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    return { page, limit, total, pages: Math.ceil(total / limit), items };
  }

  async get(id: string) {
    const b = await prisma.brand.findUnique({
      where: { id },
      include: { products: { select: { id: true } } },
    });
    if (!b) throw httpError(404, "Brand not found");
    return { ...b, productsCount: b.products.length, products: undefined };
  }

  async create(data: any) {
    try {
      return await prisma.brand.create({
        data: {
          name: data.name,
          slug: data.slug,
          logoUrl: data.logoUrl ?? null,
          website: data.website ?? null,
          description: data.description ?? null,
          isFeatured: data.isFeatured ?? false,
        },
      });
    } catch (e: any) {
      if (isUniqueViolation(e)) throw httpError(409, "Brand slug already exists");
      throw e;
    }
  }

  async update(id: string, patch: any) {
    try {
      return await prisma.brand.update({
        where: { id },
        data: {
          ...patch,
          logoUrl: patch.logoUrl === undefined ? undefined : (patch.logoUrl ?? null),
          website: patch.website === undefined ? undefined : (patch.website ?? null),
          description: patch.description === undefined ? undefined : (patch.description ?? null),
        },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Brand not found");
      if (isUniqueViolation(e)) throw httpError(409, "Brand slug already exists");
      throw e;
    }
  }

  async remove(id: string) {
    const productsCount = await prisma.product.count({ where: { brandId: id } });
    if (productsCount > 0) throw httpError(409, "Brand has products assigned. Reassign products first.");

    try {
      await prisma.brand.delete({ where: { id } });
      return { ok: true };
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Brand not found");
      throw e;
    }
  }
}