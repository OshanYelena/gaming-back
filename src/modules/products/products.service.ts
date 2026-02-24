import { prisma } from "../../config/prisma";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export class ProductsService {
  async list(query: any) {
    const page = clamp(query.page ?? 1, 1, 10_000);
    const limit = clamp(query.limit ?? 20, 1, 100);
    const skip = (page - 1) * limit;

    const tags = Array.isArray(query.tags)
      ? query.tags
      : typeof query.tags === "string"
        ? query.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : undefined;

    const where: any = {
      status: query.status ?? "active",
    };

    if (query.category) where.categoryId = query.category;
    if (query.brand) where.brandId = query.brand;

    if (query.search) {
      // Simple search: name OR description OR tags contains string
      // (Later: replace with tsvector full-text as in spec)
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { shortDescription: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (tags?.length) {
      // PostgreSQL array contains: Prisma supports `hasSome`
      where.tags = { hasSome: tags };
    }

    if (query.min_price != null || query.max_price != null) {
      // price can be product basePrice OR variant override; for listing we approximate using basePrice
      // (Later improvement: compute min variant price with a view/materialized column)
      where.basePrice = {
        gte: query.min_price != null ? query.min_price : undefined,
        lte: query.max_price != null ? query.max_price : undefined,
      };
    }

    if (query.in_stock) {
      // At least one active variant with stock > 0
      where.variants = {
        some: {
          isActive: true,
          stockQuantity: { gt: 0 },
        },
      };
    }

    const orderBy = this.parseSort(query.sort);

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          basePrice: true,
          compareAtPrice: true,
          tags: true,
          status: true,
          createdAt: true,
          brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
          category: { select: { id: true, name: true, slug: true } },
          images: {
            take: 1,
            orderBy: { sortOrder: "asc" },
            select: { url: true, altText: true },
          },
          variants: {
            where: { isActive: true },
            select: { id: true, stockQuantity: true, price: true },
          },
          _count: { select: { reviews: true } },
        },
      }),
    ]);

    // add a light computed field: inStock
    const data = items.map((p) => ({
      ...p,
      inStock: p.variants.some((v) => v.stockQuantity > 0),
      thumbnail: p.images[0]?.url ?? null,
    }));

    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items: data,
    };
  }

  async getBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { isActive: true } },
      },
    });

    if (!product || product.status !== "active") {
      // public endpoint: hide drafts/archived
      return null;
    }

    // Reviews summary
    const summary = await prisma.review.aggregate({
      where: { productId: product.id, status: "approved" },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...product,
      reviewsSummary: {
        averageRating: summary._avg.rating ?? 0,
        count: summary._count.rating,
      },
    };
  }

  async listVariants(productId: string) {
    // only active products for public
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true },
    });
    if (!product || product.status !== "active") return null;

    return prisma.variant.findMany({
      where: { productId, isActive: true },
      orderBy: { sku: "asc" },
    });
  }

  async listReviews(productId: string, query: any) {
    const page = clamp(query.page ?? 1, 1, 10_000);
    const limit = clamp(query.limit ?? 10, 1, 100);
    const skip = (page - 1) * limit;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true },
    });
    if (!product || product.status !== "active") return null;

    const where = { productId, status: "approved" };

    const [total, items] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true } },
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

  private parseSort(sort?: string) {
    switch (sort) {
      case "price_asc":
        return [{ basePrice: "asc" as const }];
      case "price_desc":
        return [{ basePrice: "desc" as const }];
      case "newest":
      default:
        return [{ createdAt: "desc" as const }];
    }
  }
}