import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export class AdminInventoryService {
  async list(query: { page: number; limit: number; q?: string; active?: boolean }) {
    const { page, limit, q, active } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (typeof active === "boolean") where.isActive = active;

    if (q) {
      const t = q.trim();
      where.OR = [
        { sku: { contains: t, mode: "insensitive" } },
        { product: { name: { contains: t, mode: "insensitive" } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.variant.count({ where }),
      prisma.variant.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ stockQuantity: "asc" }, { sku: "asc" }],
        include: {
          product: { select: { id: true, name: true, slug: true, status: true } },
        },
      }),
    ]);

    const mapped = items.map((v) => ({
      id: v.id,
      sku: v.sku,
      productId: v.productId,
      productName: v.product.name,
      productSlug: v.product.slug,
      productStatus: v.product.status,
      stockQuantity: v.stockQuantity,
      lowStockThreshold: v.lowStockThreshold,
      isActive: v.isActive,
      isLowStock: v.stockQuantity <= v.lowStockThreshold,
    }));

    return { page, limit, total, pages: Math.ceil(total / limit), items: mapped };
  }

  async lowStock(query: { page: number; limit: number }) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      // Prisma can't compare two fields directly in where; we filter in memory after fetch.
    };

    const [total, items] = await Promise.all([
      prisma.variant.count({ where }),
      prisma.variant.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ stockQuantity: "asc" }, { sku: "asc" }],
        include: { product: { select: { id: true, name: true, slug: true, status: true } } },
      }),
    ]);

    const low = items
      .filter((v) => v.stockQuantity <= v.lowStockThreshold)
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        productId: v.productId,
        productName: v.product.name,
        productSlug: v.product.slug,
        productStatus: v.product.status,
        stockQuantity: v.stockQuantity,
        lowStockThreshold: v.lowStockThreshold,
        isActive: v.isActive,
        isLowStock: true,
      }));

    return { page, limit, totalLowStock: low.length, items: low };
  }

  async updateVariant(variantId: string, patch: any) {
    try {
      const v = await prisma.variant.update({
        where: { id: variantId },
        data: patch,
        include: { product: { select: { id: true, name: true, slug: true } } },
      });

      return {
        id: v.id,
        sku: v.sku,
        productId: v.productId,
        productName: v.product.name,
        productSlug: v.product.slug,
        stockQuantity: v.stockQuantity,
        lowStockThreshold: v.lowStockThreshold,
        isActive: v.isActive,
        isLowStock: v.stockQuantity <= v.lowStockThreshold,
      };
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Variant not found");
      throw e;
    }
  }

  async bulkSet(items: { sku: string; stockQuantity: number }[]) {
    // Ensure unique SKUs in payload
    const normalized = items.map((i) => ({ sku: i.sku.trim(), stockQuantity: i.stockQuantity }));
    const skuSet = new Set(normalized.map((i) => i.sku));
    if (skuSet.size !== normalized.length) throw httpError(400, "Duplicate SKUs in request");

    const skus = normalized.map((i) => i.sku);
    const existing = await prisma.variant.findMany({
      where: { sku: { in: skus } },
      select: { id: true, sku: true },
    });

    const existingSet = new Set(existing.map((v) => v.sku));
    const missing = skus.filter((s) => !existingSet.has(s));
    if (missing.length) throw httpError(409, `Unknown SKU(s): ${missing.join(", ")}`);

    await prisma.$transaction(
      normalized.map((i) =>
        prisma.variant.update({
          where: { sku: i.sku },
          data: { stockQuantity: i.stockQuantity },
        })
      )
    );

    return { ok: true, updated: normalized.length };
  }
}