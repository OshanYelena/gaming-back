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
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${year}-${rand}`;
}

type PaymentProvider = "stripe" | "quotation" | "manual" | "cod";
type OrderStatus = "pending" | "confirmed";
type PaymentStatus = "unpaid" | "paid";

export class OrdersService {
  private ownerFrom(userId?: string, sessionId?: string): CartOwner {
    if (userId) return { kind: "user", userId };
    if (sessionId) return { kind: "guest", sessionId };
    throw httpError(400, "Missing cart owner");
  }

  private async loadCart(owner: CartOwner) {
    const items = await prisma.cartItem.findMany({
      where:
        owner.kind === "user"
          ? { userId: owner.userId }
          : { sessionId: owner.sessionId },
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

    const usable = items.filter(
      (it) => it.variant.isActive && it.variant.product.status === "active"
    );

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

  async createPaymentIntent(
    userId: string | undefined,
    sessionId: string | undefined,
    currency: string
  ) {
    const owner = this.ownerFrom(userId, sessionId);
    const validated = await this.checkoutValidate(userId, sessionId);
    if (!validated.ok) throw httpError(400, "Cart validation failed");

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

  // ✅ UPDATED
  async createOrder(
    userId: string | undefined,
    sessionId: string | undefined,
    input: any
  ) {
    const owner = this.ownerFrom(userId, sessionId);

    if (owner.kind === "guest" && !input.guestEmail) {
      throw httpError(400, "guestEmail is required for guest checkout");
    }

    // Validate cart
    const validated = await this.checkoutValidate(userId, sessionId);
    if (!validated.ok) throw httpError(400, "Cart validation failed");

    // Decide mode
    const paymentProvider: PaymentProvider = (input.paymentProvider ?? "quotation") as PaymentProvider;

    let status: OrderStatus = "pending";
    let paymentStatus: PaymentStatus = "unpaid";
    let paymentIntentId: string | null = null;

    // ⚙️ choose whether quotation should reduce inventory now
    const shouldDecrementInventory = true; // set to (paymentProvider === "stripe") if you want reserve-on-paid only

    // Stripe mode (optional)
    if (paymentProvider === "stripe") {
      // Prevent 500s when stripe not configured
      if (!process.env.STRIPE_SECRET_KEY) {
        throw httpError(
          400,
          'Stripe is not configured. Use paymentProvider="quotation" to place an unpaid order.'
        );
      }

      if (!input.paymentIntentId) {
        throw httpError(400, "paymentIntentId is required for stripe checkout");
      }

      const pi = await stripe.paymentIntents.retrieve(input.paymentIntentId);

      if (pi.status !== "succeeded") {
        throw httpError(400, `Payment not completed (status: ${pi.status})`);
      }

      const expectedAmount = Math.round(validated.pricing.total * 100);
      if (pi.amount_received && pi.amount_received !== expectedAmount) {
        throw httpError(400, "Payment amount mismatch");
      }

      status = "confirmed";
      paymentStatus = "paid";
      paymentIntentId = input.paymentIntentId;
    } else {
      // quotation/manual/cod
      status = "pending";
      paymentStatus = "unpaid";
      paymentIntentId = null;
    }

    const subtotal = validated.pricing.subtotal;
    const discountAmount = validated.pricing.discountAmount;
    const shippingCost = 0;
    const taxAmount = 0;
    const total = validated.pricing.total;

    const order = await prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where:
          owner.kind === "user"
            ? { userId: owner.userId }
            : { sessionId: owner.sessionId },
        include: {
          variant: {
            include: {
              product: { select: { id: true, name: true, basePrice: true, status: true } },
            },
          },
        },
      });

      const usable = cartItems.filter(
        (it) => it.variant.isActive && it.variant.product.status === "active"
      );

      if (usable.length === 0) throw httpError(400, "Cart is empty");

      if (shouldDecrementInventory) {
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
      }

      const ordNum = orderNumberNow();

      const createdOrder = await tx.order.create({
        data: {
          orderNumber: ordNum,
          userId: owner.kind === "user" ? owner.userId : null,
          guestEmail: owner.kind === "guest" ? input.guestEmail : null,

          status,
          paymentStatus,

          shippingAddress: input.shippingAddress,
          billingAddress: input.billingAddress,

          subtotal,
          discountAmount,
          shippingCost,
          taxAmount,
          total,
          currency: input.currency,

          couponCode: validated.pricing.couponCode ?? null,
          paymentProvider,
          paymentIntentId,
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

      await tx.cartItem.deleteMany({
        where:
          owner.kind === "user"
            ? { userId: owner.userId }
            : { sessionId: owner.sessionId },
      });

      return createdOrder;
    });

    // Coupon bookkeeping
    if (validated.pricing.couponCode) {
      await prisma.promotion
        .update({
          where: { code: validated.pricing.couponCode },
          data: { usedCount: { increment: 1 } },
        })
        .catch(() => {});
    }

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
      include: {
        items: {
          include: {
            variant: {
              select: {
                id: true,
                imageUrl: true,
                optionValues: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    images: {
                      take: 1,
                      orderBy: { sortOrder: "asc" },
                      select: { url: true, altText: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
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

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: { status: "cancelled" },
      });

      for (const it of order.items) {
        await tx.variant
          .update({
            where: { id: it.variantId },
            data: { stockQuantity: { increment: it.quantity } },
          })
          .catch(() => {});
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