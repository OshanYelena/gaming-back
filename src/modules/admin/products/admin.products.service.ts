import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function isUniqueViolation(e: any) {
  // Prisma unique constraint error code
  return e?.code === "P2002";
}

export class AdminProductsService {
  async list(query: { page: number; limit: number; q?: string; status?: "active"|"draft"|"archived" }) {
    const { page, limit, q, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          category: { select: { id: true, name: true, slug: true } },
          variants: { select: { id: true, sku: true, stockQuantity: true, isActive: true } },
          images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
        },
      }),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  }

  async get(id: string) {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        variants: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!p) throw httpError(404, "Product not found");
    return p;
  }

  async create(data: any) {
    try {
      return await prisma.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          shortDescription: data.shortDescription ?? null,
          categoryId: data.categoryId ?? null,
          brandId: data.brandId ?? null,
          basePrice: data.basePrice,
          compareAtPrice: data.compareAtPrice ?? null,
          isGiftCard: data.isGiftCard ?? false,
          isPreOrder: data.isPreOrder ?? false,
          preOrderDate: data.preOrderDate ? new Date(data.preOrderDate) : null,
          weight: data.weight ?? null,
          tags: data.tags ?? [],
          status: data.status ?? "draft",
          metaTitle: data.metaTitle ?? null,
          metaDescription: data.metaDescription ?? null,
        },
      });
    } catch (e: any) {
      if (isUniqueViolation(e)) throw httpError(409, "SKU or slug already exists");
      throw e;
    }
  }

  async update(id: string, patch: any) {
    try {
      return await prisma.product.update({
        where: { id },
        data: {
          ...patch,
          preOrderDate: patch.preOrderDate === undefined
            ? undefined
            : patch.preOrderDate === null
              ? null
              : new Date(patch.preOrderDate),
        },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Product not found");
      if (isUniqueViolation(e)) throw httpError(409, "SKU or slug already exists");
      throw e;
    }
  }

  async archive(id: string) {
    try {
      return await prisma.product.update({
        where: { id },
        data: { status: "archived" },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Product not found");
      throw e;
    }
  }

  async listVariants(productId: string) {
    const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!exists) throw httpError(404, "Product not found");

    return prisma.variant.findMany({
      where: { productId },
      orderBy: { sku: "asc" },
    });
  }

  async createVariant(productId: string, data: any) {
    const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!exists) throw httpError(404, "Product not found");

    try {
      return await prisma.variant.create({
        data: {
          productId,
          sku: data.sku,
          optionValues: data.optionValues,
          price: data.price ?? null,
          compareAtPrice: data.compareAtPrice ?? null,
          stockQuantity: data.stockQuantity ?? 0,
          lowStockThreshold: data.lowStockThreshold ?? 5,
          imageUrl: data.imageUrl ?? null,
          isActive: data.isActive ?? true,
        },
      });
    } catch (e: any) {
      if (isUniqueViolation(e)) throw httpError(409, "Variant SKU already exists");
      throw e;
    }
  }

  async updateVariant(variantId: string, patch: any) {
    try {
      return await prisma.variant.update({
        where: { id: variantId },
        data: patch,
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Variant not found");
      if (isUniqueViolation(e)) throw httpError(409, "Variant SKU already exists");
      throw e;
    }
  }

  async updateVariantStock(variantId: string, stockQuantity: number) {
    try {
      return await prisma.variant.update({
        where: { id: variantId },
        data: { stockQuantity },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Variant not found");
      throw e;
    }
  }
}