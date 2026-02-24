import { prisma } from "../../config/prisma";
import { stripe } from "../../config/stripe";
import { redis } from "../../config/redis";
import { getSessionId } from "../../middleware/guestSession";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

type CartOwner =
  | { kind: "user"; userId: string }
  | { kind: "guest"; sessionId: string };

function couponKey(owner: CartOwner) {
  return owner.kind === "user"
    ? `cart:coupon:user:${owner.userId}`
    : `cart:coupon:session:${owner.sessionId}`;
}

function orderNumberNow() {
  // ORD-YYYY-xxxxx
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${year}-${rand}`;
}

export class OrdersService {
  private ownerFrom(userId?: string, sessionId?: string): CartOwner {
    if (userId) return { kind: "user", userId };
    if (sessionId) return { kind: "guest", sessionId };
    throw httpError(400, "Missing cart owner");
  }

  private async loadCart(owner: CartOwner) {
    const items = await prisma.cartItem.findMany({
      where: owner.kind === "user" ? { userId: owner.userId } : { sessionId: owner.sessionId },
      include: {
        variant: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, basePrice: true, status: true },
            },
          },
        },
      },
      orderBy: { addedAt: "asc" },
    });

    // Filter invalid items (inactive product/variant)
    const usable = items.filter((it) => it.variant.isActive && it.variant.product.status === "active");

    return usable;
  }

  private computeSubtotal(items: any[]) {
    let subtotal = 0;
    for (const it of items) {
      const unit = (it.variant.price ?? it.variant.product.basePrice).toNumber();
      subtotal += unit * it.quantity;
    }
    subtotal = Math.round(subtotal * 100) / 100;
    return subtotal;
  }

  private async computeDiscount(owner: CartOwner, subtotal: number) {
    const couponCode = await redis.get(couponKey(owner));
    if (!couponCode) return { couponCode: null as string | null, discountAmount: 0 };

    // Minimal: only percentage/fixed (same as Cart module)
    const promo = await prisma.promotion.findUnique({ where: { code: couponCode } });
    if (!promo || !promo.isActive) return { couponCode: null, discountAmount: 0 };

    if (promo.startsAt && promo.startsAt.getTime() > Date.now()) return { couponCode: null, discountAmount: 0 };
    if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) return { couponCode: null, discountAmount: 0 };
    if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) return { couponCode: null, discountAmount: 0 };
    if (promo.minOrderAmount != null && subtotal < promo.minOrderAmount.toNumber()) return { couponCode: null, discountAmount: 0 };

    const type = promo.type;
    const value = promo.value?.toNumber() ?? 0;

    let discountAmount = 0;
    if (type === "percentage") discountAmount = subtotal * (value / 100);
    else if (type === "fixed") discountAmount = value;
    else discountAmount = 0;

    discountAmount = Math.max(0, Math.min(discountAmount, subtotal));
    discountAmount = Math.round(discountAmount * 100) / 100;

    return { couponCode: promo.code, discountAmount };
  }

  async checkoutValidate(userId?: string, sessionId?: string) {
    const owner = this.ownerFrom(userId, sessionId);
    const items = await this.loadCart(owner);

    if (items.length === 0) throw httpError(400, "Cart is empty");

    const problems: Array<{ cartItemId: string; reason: string }> = [];

    for (const it of items) {
      if (!it.variant.isActive) problems.push({ cartItemId: it.id, reason: "Variant inactive" });
      if (it.variant.product.status !== "active") problems.push({ cartItemId: it.id, reason: "Product unavailable" });
      if (it.quantity <= 0) problems.push({ cartItemId: it.id, reason: "Invalid quantity" });
      if (it.variant.stockQuantity >= 0 && it.quantity > it.variant.stockQuantity) {
        problems.push({ cartItemId: it.id, reason: "Insufficient stock" });
      }
    }

    const subtotal = this.computeSubtotal(items);
    const { couponCode, discountAmount } = await this.computeDiscount(owner, subtotal);
    const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    return {
      ok: problems.length === 0,
      problems,
      pricing: {
        subtotal,
        discountAmount,
        total,
        couponCode,
        shippingCost: 0,
        taxAmount: 0,
      },
      items: items.map((it) => ({
        cartItemId: it.id,
        variantId: it.variantId,
        quantity: it.quantity,
        unitPrice: (it.variant.price ?? it.variant.product.basePrice).toNumber(),
        product: it.variant.product,
        optionValues: it.variant.optionValues,
        stockQuantity: it.variant.stockQuantity,
      })),
    };
  }

  async createPaymentIntent(userId: string | undefined, sessionId: string | undefined, currency: string) {
    const owner = this.ownerFrom(userId, sessionId);
    const validated = await this.checkoutValidate(userId, sessionId);
    if (!validated.ok) throw httpError(400, "Cart validation failed");

    // Amount in smallest currency unit (Stripe requires integer)
    const amount = Math.round(validated.pricing.total * 100);

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        cart_owner: owner.kind === "user" ? `user:${owner.userId}` : `session:${owner.sessionId}`,
        coupon: validated.pricing.couponCode ?? "",
      },
    });

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id, amount };
  }

  async createOrder(userId: string | undefined, sessionId: string | undefined, input: any) {
    const owner = this.ownerFrom(userId, sessionId);

    // Guest order requires guestEmail
    if (owner.kind === "guest" && !input.guestEmail) {
      throw httpError(400, "guestEmail is required for guest checkout");
    }

    // 1) Re-validate cart just before order creation
    const validated = await this.checkoutValidate(userId, sessionId);
    if (!validated.ok) throw httpError(400, "Cart validation failed");

    // 2) Verify payment (Stripe)
    if (input.paymentProvider === "stripe") {
      const pi = await stripe.paymentIntents.retrieve(input.paymentIntentId);

      // Acceptable states depend on your payment flow.
      // Most common: success => status === "succeeded"
      if (pi.status !== "succeeded") {
        throw httpError(400, `Payment not completed (status: ${pi.status})`);
      }

      // Optional sanity: amount matches
      const expectedAmount = Math.round(validated.pricing.total * 100);
      if (pi.amount_received && pi.amount_received !== expectedAmount) {
        throw httpError(400, "Payment amount mismatch");
      }
    } else {
      // PayPal later
      throw httpError(400, "PayPal not implemented yet");
    }

    const subtotal = validated.pricing.subtotal;
    const discountAmount = validated.pricing.discountAmount;
    const shippingCost = 0;
    const taxAmount = 0;
    const total = validated.pricing.total;

    // 3) Transaction: decrement inventory + create order + clear cart
    const order = await prisma.$transaction(async (tx) => {
      // Re-load cart items inside the transaction to avoid drift
      const cartItems = await tx.cartItem.findMany({
        where: owner.kind === "user" ? { userId: owner.userId } : { sessionId: owner.sessionId },
        include: {
          variant: { include: { product: { select: { id: true, name: true, basePrice: true, status: true } } } },
        },
      });

      const usable = cartItems.filter((it) => it.variant.isActive && it.variant.product.status === "active");
      if (usable.length === 0) throw httpError(400, "Cart is empty");

      // Inventory checks + decrement with conditional update
      for (const it of usable) {
        if (it.variant.stockQuantity >= 0 && it.quantity > it.variant.stockQuantity) {
          throw httpError(400, "Insufficient stock");
        }

        if (it.variant.stockQuantity >= 0) {
          const updated = await tx.variant.updateMany({
            where: { id: it.variantId, stockQuantity: { gte: it.quantity } },
            data: { stockQuantity: { decrement: it.quantity } },
          });

          if (updated.count !== 1) throw httpError(409, "Stock changed, please retry");
        }
      }

      const ordNum = orderNumberNow();

      const createdOrder = await tx.order.create({
        data: {
          orderNumber: ordNum,
          userId: owner.kind === "user" ? owner.userId : null,
          guestEmail: owner.kind === "guest" ? input.guestEmail : null,

          status: "confirmed",
          paymentStatus: "paid",

          shippingAddress: input.shippingAddress,
          billingAddress: input.billingAddress,

          subtotal,
          discountAmount,
          shippingCost,
          taxAmount,
          total,
          currency: input.currency,

          couponCode: validated.pricing.couponCode ?? null,
          paymentProvider: input.paymentProvider,
          paymentIntentId: input.paymentIntentId,
          notes: input.notes ?? null,

          items: {
            create: usable.map((it) => {
              const unit = (it.variant.price ?? it.variant.product.basePrice).toNumber();
              const lineTotal = Math.round(unit * it.quantity * 100) / 100;

              return {
                variantId: it.variantId,
                productName: it.variant.product.name,
                sku: it.variant.sku,
                unitPrice: unit,
                quantity: it.quantity,
                lineTotal,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Clear cart
      await tx.cartItem.deleteMany({
        where: owner.kind === "user" ? { userId: owner.userId } : { sessionId: owner.sessionId },
      });

      return createdOrder;
    });

    // 4) Coupon usage bookkeeping (outside TX is ok; or inside if you prefer strict)
    if (validated.pricing.couponCode) {
      await prisma.promotion.update({
        where: { code: validated.pricing.couponCode },
        data: { usedCount: { increment: 1 } },
      }).catch(() => {});
    }

    // Clear coupon after order
    await redis.del(couponKey(owner)).catch(() => {});

    return order;
  }

  async listMyOrders(userId: string, query: any) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit ?? 10)));
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          currency: true,
          createdAt: true,
        },
      }),
    ]);

    return { page, limit, total, pages: Math.ceil(total / limit), items };
  }

  async getMyOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw httpError(404, "Order not found");
    return order;
  }

  async cancelMyOrder(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw httpError(404, "Order not found");

    if (!["pending", "confirmed"].includes(order.status)) {
      throw httpError(400, "Order cannot be cancelled at this stage");
    }

    // If already paid, real system does refund flow (admin endpoint in your spec).
    // For now: mark cancelled and restock items.
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: { status: "cancelled" },
      });

      // Restock (best-effort)
      for (const it of order.items) {
        await tx.variant.update({
          where: { id: it.variantId },
          data: { stockQuantity: { increment: it.quantity } },
        }).catch(() => {});
      }

      return o;
    });

    return updated;
  }

  async trackGuestOrder(orderNumber: string, email: string) {
    const order = await prisma.order.findFirst({
      where: { orderNumber, guestEmail: email },
      select: {
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        currency: true,
        createdAt: true,
        shippedAt: true,
        deliveredAt: true,
        items: {
          select: { productName: true, sku: true, quantity: true, unitPrice: true, lineTotal: true },
        },
      },
    });

    if (!order) throw httpError(404, "Order not found");
    return order;
  }
}