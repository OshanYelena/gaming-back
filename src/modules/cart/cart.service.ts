import { prisma } from "../../config/prisma";
import { redis } from "../../config/redis";
import type { Prisma, CartItem } from "@prisma/client";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

type CartOwner =
  | { kind: "user"; userId: string }
  | { kind: "guest"; sessionId: string };

type CartItemWithVariant = Prisma.CartItemGetPayload<{
  include: {
    variant: {
      include: {
        product: {
          select: {
            id: true;
            name: true;
            slug: true;
            basePrice: true;
            status: true;
          };
        };
      };
    };
  };
}>;

function couponKey(owner: CartOwner) {
  return owner.kind === "user"
    ? `cart:coupon:user:${owner.userId}`
    : `cart:coupon:session:${owner.sessionId}`;
}

export class CartService {
  private ownerFrom(userId?: string, sessionId?: string): CartOwner {
    if (userId) return { kind: "user", userId };
    if (sessionId) return { kind: "guest", sessionId };
    throw httpError(400, "Missing cart owner");
  }

  async getCart(userId?: string, sessionId?: string) {
    const owner = this.ownerFrom(userId, sessionId);

    const items: CartItemWithVariant[] = await prisma.cartItem.findMany({
      where: owner.kind === "user" ? { userId: owner.userId } : { sessionId: owner.sessionId },
      orderBy: { addedAt: "asc" },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, basePrice: true, status: true },
            },
          },
        },
      },
    });

    // Filter out inactive/draft products or inactive variants
    const usableItems = items.filter(
      (it) => it.variant.isActive && it.variant.product.status === "active"
    );

    const pricing = this.computeTotals(usableItems);

    const couponCode = await redis.get(couponKey(owner));
    const coupon = couponCode ? await this.validateCouponPreview(couponCode, pricing.subtotal) : null;

    const discountAmount = coupon?.discountAmount ?? 0;
    const total = Math.max(0, pricing.subtotal - discountAmount);

    return {
      owner,
      items: usableItems.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        addedAt: it.addedAt,
        variant: {
          id: it.variant.id,
          sku: it.variant.sku,
          optionValues: it.variant.optionValues,
          stockQuantity: it.variant.stockQuantity,
          price: it.variant.price ?? it.variant.product.basePrice,
          imageUrl: it.variant.imageUrl,
          product: it.variant.product,
        },
        lineTotal: (it.variant.price ?? it.variant.product.basePrice).toNumber() * it.quantity,
      })),
      subtotal: pricing.subtotal,
      coupon: coupon ? { code: coupon.code, type: coupon.type, discountAmount } : null,
      total,
    };
  }

  async addItem(userId: string | undefined, sessionId: string | undefined, variantId: string, quantity: number) {
    const owner = this.ownerFrom(userId, sessionId);

    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      include: { product: { select: { status: true, basePrice: true } } },
    });
    if (!variant || !variant.isActive || variant.product.status !== "active") {
      throw httpError(404, "Variant not found");
    }

    // stock check (soft): still allow add, but cap to stock if stock is tracked
    if (variant.stockQuantity >= 0 && quantity > variant.stockQuantity) {
      throw httpError(400, "Not enough stock");
    }

    // If item exists already for same owner + variant => increment
    const existing = await prisma.cartItem.findFirst({
      where:
        owner.kind === "user"
          ? { userId: owner.userId, variantId }
          : { sessionId: owner.sessionId, variantId },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (variant.stockQuantity >= 0 && newQty > variant.stockQuantity) throw httpError(400, "Not enough stock");

      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
      return updated;
    }

    const created = await prisma.cartItem.create({
      data:
        owner.kind === "user"
          ? { userId: owner.userId, variantId, quantity }
          : { sessionId: owner.sessionId, variantId, quantity },
    });

    return created;
  }

  async updateItem(userId: string | undefined, sessionId: string | undefined, cartItemId: string, quantity: number) {
    const owner = this.ownerFrom(userId, sessionId);

    const item = await prisma.cartItem.findFirst({
      where:
        owner.kind === "user"
          ? { id: cartItemId, userId: owner.userId }
          : { id: cartItemId, sessionId: owner.sessionId },
      include: { variant: true },
    });

    if (!item) throw httpError(404, "Cart item not found");

    if (item.variant.stockQuantity >= 0 && quantity > item.variant.stockQuantity) {
      throw httpError(400, "Not enough stock");
    }

    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
    });
  }

  async removeItem(userId: string | undefined, sessionId: string | undefined, cartItemId: string) {
    const owner = this.ownerFrom(userId, sessionId);

    const item = await prisma.cartItem.findFirst({
      where:
        owner.kind === "user"
          ? { id: cartItemId, userId: owner.userId }
          : { id: cartItemId, sessionId: owner.sessionId },
      select: { id: true },
    });

    if (!item) throw httpError(404, "Cart item not found");

    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return { ok: true };
  }

  async clearCart(userId: string | undefined, sessionId: string | undefined) {
    const owner = this.ownerFrom(userId, sessionId);

    await prisma.cartItem.deleteMany({
      where: owner.kind === "user" ? { userId: owner.userId } : { sessionId: owner.sessionId },
    });

    await redis.del(couponKey(owner)); // clear coupon too
    return { ok: true };
  }

  async applyCoupon(userId: string | undefined, sessionId: string | undefined, code: string) {
    const owner = this.ownerFrom(userId, sessionId);

    const cart = await this.getCart(userId, sessionId); // includes subtotal
    const coupon = await this.validateCouponPreview(code, cart.subtotal);

    await redis.set(couponKey(owner), coupon.code, "EX", 24 * 60 * 60); // 24h
    return coupon;
  }

  async removeCoupon(userId: string | undefined, sessionId: string | undefined) {
    const owner = this.ownerFrom(userId, sessionId);
    await redis.del(couponKey(owner));
    return { ok: true };
  }

  async mergeGuestIntoUser(userId: string, sessionId: string) {
    // Merge: guest cart items into user cart, summing quantities per variant
    const [guestItems, userItems] = await Promise.all([
      prisma.cartItem.findMany({ where: { sessionId } }),
      prisma.cartItem.findMany({ where: { userId } }),
    ]);

    const userByVariant = new Map<string, CartItem>(
      userItems.map((i:any) => [i.variantId, i])
    );

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const g of guestItems) {
        const u = userByVariant.get(g.variantId);
        if (u) {
          await tx.cartItem.update({
            where: { id: u.id },
            data: { quantity: u.quantity + g.quantity },
          });
          await tx.cartItem.delete({ where: { id: g.id } });
        } else {
          await tx.cartItem.update({
            where: { id: g.id },
            data: { userId, sessionId: null },
          });
        }
      }
    });

    // coupon merge policy: if user has coupon, keep it. else copy guest coupon.
    const userCoupon = await redis.get(couponKey({ kind: "user", userId }));
    if (!userCoupon) {
      const guestCoupon = await redis.get(couponKey({ kind: "guest", sessionId }));
      if (guestCoupon) {
        await redis.set(couponKey({ kind: "user", userId }), guestCoupon, "EX", 24 * 60 * 60);
      }
    }
    await redis.del(couponKey({ kind: "guest", sessionId }));

    return { ok: true };
  }

  // ----------------- helpers -----------------

  private computeTotals(items: CartItemWithVariant[]) {
    let subtotal = 0;

    for (const it of items) {
      const unit = (it.variant.price ?? it.variant.product.basePrice).toNumber();
      subtotal += unit * it.quantity;
    }

    return { subtotal: Math.round(subtotal * 100) / 100 };
  }

  private async validateCouponPreview(codeRaw: string, subtotal: number) {
    const code = codeRaw.trim().toUpperCase();

    const promo = await prisma.promotion.findUnique({ where: { code } });
    if (!promo || !promo.isActive) throw httpError(400, "Invalid coupon");
    if (promo.startsAt && promo.startsAt.getTime() > Date.now()) throw httpError(400, "Coupon not active yet");
    if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) throw httpError(400, "Coupon expired");
    if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) throw httpError(400, "Coupon usage limit reached");
    if (promo.minOrderAmount != null && subtotal < promo.minOrderAmount.toNumber()) {
      throw httpError(400, "Cart total too low for this coupon");
    }

    // Only percentage/fixed supported in this “user cart” pass.
    // (Later: BXGY + volume discounts from your doc)
    const type = promo.type;
    const value = promo.value?.toNumber() ?? 0;

    let discountAmount = 0;
    if (type === "percentage") discountAmount = subtotal * (value / 100);
    else if (type === "fixed") discountAmount = value;
    else throw httpError(400, "Coupon type not supported yet");

    discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
    discountAmount = Math.round(discountAmount * 100) / 100;

    return { code, type, discountAmount };
  }
}