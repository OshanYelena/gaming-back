import { prisma } from "../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export class WishlistService {
  async list(userId: string) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        // We only have productId in schema, so fetch product via productId.
        // (Variant wishlist can be added later.)
      },
    });

    const productIds = items.map((i) => i.productId).filter(Boolean) as string[];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: "active" },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        compareAtPrice: true,
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, altText: true } },
        variants: { where: { isActive: true }, select: { id: true, stockQuantity: true, price: true } },
      },
    });

    const byId = new Map(products.map((p) => [p.id, p]));

    const enriched = items
      .map((it) => {
        const p = it.productId ? byId.get(it.productId) : null;
        if (!p) return null;

        const inStock = p.variants.some((v) => v.stockQuantity > 0);
        return {
          id: it.id,
          createdAt: it.createdAt,
          product: {
            ...p,
            thumbnail: p.images[0]?.url ?? null,
            inStock,
          },
        };
      })
      .filter(Boolean);

    return enriched;
  }

  async add(userId: string, productId: string, variantId?: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, status: true },
    });
    if (!product || product.status !== "active") throw httpError(404, "Product not found");

    if (variantId) {
      const v = await prisma.variant.findFirst({
        where: { id: variantId, productId, isActive: true },
        select: { id: true },
      });
      if (!v) throw httpError(404, "Variant not found");
    }

    // prevent duplicates
    const exists = await prisma.wishlistItem.findFirst({
      where: { userId, productId },
      select: { id: true },
    });
    if (exists) return exists;

    return prisma.wishlistItem.create({
      data: { userId, productId, variantId: variantId ?? null },
      select: { id: true, productId: true, variantId: true, createdAt: true },
    });
  }

  async remove(userId: string, productId: string) {
    const item = await prisma.wishlistItem.findFirst({
      where: { userId, productId },
      select: { id: true },
    });
    if (!item) throw httpError(404, "Wishlist item not found");

    await prisma.wishlistItem.delete({ where: { id: item.id } });
    return { ok: true };
  }

  async moveToCart(userId: string, productId: string) {
    // Strategy: move product -> add first in-stock active variant to cart
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: { where: { isActive: true }, orderBy: { sku: "asc" } },
      },
    });
    if (!product || product.status !== "active") throw httpError(404, "Product not found");

    const variant =
      product.variants.find((v) => v.stockQuantity > 0) ||
      product.variants[0];

    if (!variant) throw httpError(400, "No available variants");

    // Add to cart as quantity 1 (cart module)
    // We can do it directly using prisma since cart_items table exists.
    const existing = await prisma.cartItem.findFirst({
      where: { userId, variantId: variant.id },
      select: { id: true, quantity: true },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + 1 },
      });
    } else {
      await prisma.cartItem.create({
        data: { userId, variantId: variant.id, quantity: 1 },
      });
    }

    // Remove from wishlist
    await prisma.wishlistItem.deleteMany({ where: { userId, productId } });

    return { ok: true, movedVariantId: variant.id };
  }
}