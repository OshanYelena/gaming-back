import { prisma } from "../../../config/prisma";
import { PaymentStatus } from "@prisma/client";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

type Status =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

const allowedTransitions: Record<Status, Status[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"], // optional, depends on your policy
  cancelled: [],
  refunded: [],
};

export class AdminOrdersService {
  async list(query: {
    page: number;
    limit: number;
    status?: Status;
    paymentStatus?: string;
    q?: string;
  }) {
    const { page, limit, status, paymentStatus, q } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    if (q) {
      const t = q.trim();
      where.OR = [
        { orderNumber: { contains: t, mode: "insensitive" } },
        { guestEmail: { contains: t, mode: "insensitive" } },
        { user: { is: { email: { contains: t, mode: "insensitive" } } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: { select: { id: true } },
        },
      }),
    ]);

    const mapped = items.map(({ items: orderItems, ...rest }) => ({
      ...rest,
      itemsCount: orderItems.length,
    }));

    return { page, limit, total, pages: Math.ceil(total / limit), items: mapped };
  }

  async get(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
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

  async updateStatus(id: string, nextStatus: Status) {
    const order = await prisma.order.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!order) throw httpError(404, "Order not found");

    const current = order.status as Status;
    const allowed = allowedTransitions[current] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw httpError(409, `Invalid status transition: ${current} -> ${nextStatus}`);
    }

    const patch: any = { status: nextStatus };

    if (nextStatus === "shipped") patch.shippedAt = new Date();
    if (nextStatus === "delivered") patch.deliveredAt = new Date();

    return prisma.order.update({ where: { id }, data: patch });
  }

  async updatePaymentStatus(id: string, paymentStatus: string) {
    // Validate the value is a known PaymentStatus before passing to Prisma
    const validValues = Object.values(PaymentStatus);
    if (!validValues.includes(paymentStatus as PaymentStatus)) {
      throw httpError(400, `Invalid payment status: ${paymentStatus}. Must be one of: ${validValues.join(", ")}`);
    }
    try {
      return await prisma.order.update({
        where: { id },
        data: { paymentStatus: paymentStatus as PaymentStatus },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Order not found");
      throw e;
    }
  }

  async updateNotes(id: string, notes: string | null) {
    try {
      return await prisma.order.update({
        where: { id },
        data: { notes },
      });
    } catch (e: any) {
      if (e?.code === "P2025") throw httpError(404, "Order not found");
      throw e;
    }
  }
}