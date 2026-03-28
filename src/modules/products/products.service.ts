import { Prisma, PrismaClient } from "@prisma/client";
import { prisma as prismaFromConfig } from "../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

type ListQuery = {
  page?: any;
  limit?: any;
  sort?: string;

  category?: string; // uuid
  category_slug?: string; // slug or name

  min_price?: any;
  max_price?: any;

  search?: string;
  status?: "active" | "draft" | "archived";
  in_stock?: any;
};

export class ProductsService {
  private prisma: PrismaClient = prismaFromConfig as any;

  private async resolveCategoryId(category?: string, category_slug?: string) {
    if (category) return String(category);

    if (!category_slug) return undefined;

    const token = String(category_slug).trim();
    if (!token) return undefined;

    const cat = await this.prisma.category.findFirst({
      where: {
        OR: [{ slug: token }, { name: { equals: token, mode: "insensitive" } }],
      } as any,
      select: { id: true },
    });

    if (!cat) return "__NOT_FOUND__" as const;
    return cat.id;
  }

  private parsePagination(q: ListQuery) {
    const page = Math.max(1, Number(q.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(q.limit ?? 12)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  private parseSort(sort?: string) {
    // Supported: newest(default), oldest, price_asc, price_desc, name_asc, name_desc
    switch (sort) {
      case "price_asc":
        return [{ basePrice: "asc" as const }, { createdAt: "desc" as const }];
      case "price_desc":
        return [{ basePrice: "desc" as const }, { createdAt: "desc" as const }];
      case "name_asc":
        return [{ name: "asc" as const }];
      case "name_desc":
        return [{ name: "desc" as const }];
      case "oldest":
        return [{ createdAt: "asc" as const }];
      case "newest":
      default:
        return [{ createdAt: "desc" as const }];
    }
  }

  private parseMoneyFilter(q: ListQuery) {
    const minPrice =
      q.min_price != null && String(q.min_price).trim() !== ""
        ? Number(q.min_price)
        : undefined;

    const maxPrice =
      q.max_price != null && String(q.max_price).trim() !== ""
        ? Number(q.max_price)
        : undefined;

    return { minPrice, maxPrice };
  }

  // -------- LIST PRODUCTS --------
  // Fetch products first, then hydrate categories + variants separately.
  async list(q: ListQuery) {
    const { page, limit, skip } = this.parsePagination(q);

    const categoryId = await this.resolveCategoryId(q.category, q.category_slug);
    if (categoryId === "__NOT_FOUND__") {
      return { page, limit, total: 0, pages: 0, items: [] };
    }

    const { minPrice, maxPrice } = this.parseMoneyFilter(q);

    const where: Prisma.ProductWhereInput = {
      ...(q.status ? { status: q.status } : { status: "active" }),
      ...(categoryId ? { categoryId } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: String(q.search), mode: "insensitive" } },
              { slug: { contains: String(q.search), mode: "insensitive" } },
              { sku: { contains: String(q.search), mode: "insensitive" } },
            ],
          }
        : {}),
      ...(minPrice != null || maxPrice != null
        ? {
            basePrice: {
              ...(minPrice != null ? { gte: new Prisma.Decimal(minPrice) } : {}),
              ...(maxPrice != null ? { lte: new Prisma.Decimal(maxPrice) } : {}),
            },
          }
        : {}),
    };

    const orderBy = this.parseSort(q.sort);

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderBy as any,
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          basePrice: true,
          compareAtPrice: true,
          status: true,
          categoryId: true,
          createdAt: true, // assumes Product has createdAt (your sort uses it too)
        },
      }),
    ]);

    const productIds = products.map((p) => p.id);
    const categoryIds = [
      ...new Set(products.map((p) => p.categoryId).filter(Boolean)),
    ] as string[];

    // Hydrate categories
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } } as any,
          select: { id: true, name: true, slug: true },
        })
      : [];

    const categoryById = new Map(categories.map((c) => [c.id, c] as const));

    // Hydrate active variants
    const variants = productIds.length
      ? await this.prisma.variant.findMany({
          where: {
            productId: { in: productIds },
            isActive: true,
            ...(q.in_stock === true || q.in_stock === "true"
              ? { stockQuantity: { gt: 0 } }
              : {}),
          } as any,
          select: {
            id: true,
            productId: true,
            sku: true,
            price: true,
            stockQuantity: true,
            optionValues: true,
            isActive: true,
          },
          // ✅ FIX: Variant has NO createdAt in your schema -> use id for stable ordering
          orderBy: { id: "asc" } as any,
        })
      : [];

    const variantsByProductId = new Map<string, any[]>();
    for (const v of variants) {
      const arr = variantsByProductId.get(v.productId) ?? [];
      arr.push(v);
      variantsByProductId.set(v.productId, arr);
    }

    // Hydrate images (primary image per product)
    const images = productIds.length
      ? await this.prisma.productImage.findMany({
          where: { productId: { in: productIds } } as any,
          select: { id: true, productId: true, url: true, altText: true, sortOrder: true },
          orderBy: { sortOrder: "asc" } as any,
        })
      : [];

    const imagesByProductId = new Map<string, any[]>();
    for (const img of images) {
      const arr = imagesByProductId.get(img.productId) ?? [];
      arr.push(img);
      imagesByProductId.set(img.productId, arr);
    }

    const items = products.map((p) => ({
      ...p,
      category: p.categoryId ? categoryById.get(p.categoryId) ?? null : null,
      variants: variantsByProductId.get(p.id) ?? [],
      images:   imagesByProductId.get(p.id)   ?? [],
    }));

    return {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      items,
    };
  }

  // -------- GET PRODUCT BY SLUG --------
  async getBySlug(slug: string) {
    const s = String(slug ?? "").trim();
    if (!s) throw httpError(400, "slug is required");

    const product = await this.prisma.product.findFirst({
      where: { slug: s } as any,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        basePrice: true,
        compareAtPrice: true,
        status: true,
        categoryId: true,
        createdAt: true,
      },
    });

    if (!product) throw httpError(404, "Product not found");

    const [category, variants, images] = await Promise.all([
      product.categoryId
        ? this.prisma.category.findUnique({
            where: { id: product.categoryId } as any,
            select: { id: true, name: true, slug: true },
          })
        : Promise.resolve(null),

      this.prisma.variant.findMany({
        where: {
          productId: product.id,
          isActive: true,
        } as any,
        select: {
          id: true,
          productId: true,
          sku: true,
          price: true,
          stockQuantity: true,
          optionValues: true,
          isActive: true,
        },
        // ✅ FIX: Variant has NO createdAt
        orderBy: { id: "asc" } as any,
      }),

      this.prisma.productImage.findMany({
        where:   { productId: product.id } as any,
        select:  { id: true, url: true, altText: true, sortOrder: true },
        orderBy: { sortOrder: "asc" } as any,
      }),
    ]);

    return {
      ...product,
      category,
      variants,
      images,
    };
  }

  // -------- CREATE PRODUCT --------
  async create(input: any) {
    const name = String(input?.name ?? "").trim();
    if (!name) throw httpError(400, "name is required");

    const slug = String(input?.slug ?? "").trim() || this.slugify(name);
    if (!slug) throw httpError(400, "slug is required");

    const basePriceNum = Number(input?.basePrice ?? input?.price);
    if (!Number.isFinite(basePriceNum) || basePriceNum < 0) {
      throw httpError(400, "basePrice is required and must be >= 0");
    }

    // Optional category by id or slug
    let categoryId: string | null = null;
    if (input?.categoryId) categoryId = String(input.categoryId);
    else if (input?.category_slug) {
      const resolved = await this.resolveCategoryId(
        undefined,
        input.category_slug
      );
      if (resolved === "__NOT_FOUND__")
        throw httpError(400, "Invalid category_slug");
      categoryId = (resolved as any) ?? null;
    }

    const sku = String(input?.sku ?? "").trim() || `SKU-${Date.now()}`;

    const created = await this.prisma.product.create({
      data: {
        name,
        slug,
        sku,
        basePrice: new Prisma.Decimal(basePriceNum),
        compareAtPrice:
          input?.compareAtPrice != null &&
          String(input.compareAtPrice).trim() !== ""
            ? new Prisma.Decimal(Number(input.compareAtPrice))
            : null,
        status: input?.status ?? "active",
        categoryId,
      } as any,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        basePrice: true,
        compareAtPrice: true,
        status: true,
        categoryId: true,
      },
    });

    // Ensure at least one variant exists (cart depends on variantId)
    const vSku = `${sku}-DEFAULT`.slice(0, 64);
    await this.prisma.variant.create({
      data: {
        productId: created.id,
        sku: vSku,
        isActive: true,
        price: new Prisma.Decimal(basePriceNum),
        stockQuantity: Number.isFinite(Number(input?.stockQuantity))
          ? Number(input.stockQuantity)
          : 0,
        lowStockThreshold: Number.isFinite(Number(input?.lowStockThreshold))
          ? Number(input.lowStockThreshold)
          : 5,
        optionValues: input?.optionValues ?? {},
      } as any,
      select: { id: true },
    });

    return this.getBySlug(created.slug);
  }

  // -------- UPDATE PRODUCT --------
  async update(id: string, input: any) {
    const pid = String(id ?? "").trim();
    if (!pid) throw httpError(400, "id is required");

    const exists = await this.prisma.product.findUnique({
      where: { id: pid } as any,
      select: { id: true },
    });
    if (!exists) throw httpError(404, "Product not found");

    // Optional category resolution by category_slug
    let categoryId: string | undefined = undefined;
    if (input?.categoryId) categoryId = String(input.categoryId);
    if (!categoryId && input?.category_slug) {
      const resolved = await this.resolveCategoryId(
        undefined,
        input.category_slug
      );
      if (resolved === "__NOT_FOUND__")
        throw httpError(400, "Invalid category_slug");
      categoryId = (resolved as any) ?? undefined;
    }

    const data: Prisma.ProductUpdateInput = {
      ...(input?.name != null ? { name: String(input.name) } : {}),
      ...(input?.slug != null ? { slug: String(input.slug) } : {}),
      ...(input?.sku != null ? { sku: String(input.sku) } : {}),
      ...(input?.status != null ? { status: input.status } : {}),
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(input?.basePrice != null
        ? { basePrice: new Prisma.Decimal(Number(input.basePrice)) }
        : {}),
      ...(input?.compareAtPrice != null
        ? { compareAtPrice: new Prisma.Decimal(Number(input.compareAtPrice)) }
        : {}),
    };

    await this.prisma.product.update({
      where: { id: pid } as any,
      data: data as any,
    });

    const p = await this.prisma.product.findUnique({
      where: { id: pid } as any,
      select: { slug: true },
    });

    return this.getBySlug(p?.slug as any);
  }

  // -------- REMOVE PRODUCT --------
  async remove(id: string) {
    const pid = String(id ?? "").trim();
    if (!pid) throw httpError(400, "id is required");

    const exists = await this.prisma.product.findUnique({
      where: { id: pid } as any,
      select: { id: true },
    });
    if (!exists) throw httpError(404, "Product not found");

    await this.prisma.variant
      .deleteMany({ where: { productId: pid } as any })
      .catch(() => {});
    await this.prisma.product.delete({ where: { id: pid } as any });

    return { ok: true };
  }

  private slugify(input: string) {
    return String(input)
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}