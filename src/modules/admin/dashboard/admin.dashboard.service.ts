import { prisma } from "../../../config/prisma";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function startDateFromDays(days: number) {
  // UTC boundary is fine for backend stats (frontend can localize)
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

export class AdminDashboardService {
  async summary(days: number) {
    const since = startDateFromDays(days);

    const [
      ordersCount,
      paidOrdersCount,
      revenueAgg,
      usersCount,
      lowStockCount,
      statusCounts,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: since } } }),
      prisma.order.count({ where: { createdAt: { gte: since }, paymentStatus: "paid" } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: since }, paymentStatus: "paid" },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.user.count({ where: { role: "customer" } }),
      prisma.variant.count({
        where: {
          isActive: true,
          // NOTE: we can't compare stockQuantity <= lowStockThreshold in Prisma where directly
          // So we compute "low stock" via fetch+filter or add a DB view later.
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
    ]);

    // Better low-stock count (correct): fetch lightweight and filter in memory
    const lowStockVariants = await prisma.variant.findMany({
      where: { isActive: true },
      select: { stockQuantity: true, lowStockThreshold: true },
    });
    const lowStock = lowStockVariants.filter(v => v.stockQuantity <= v.lowStockThreshold).length;

    const revenue = revenueAgg._sum.total ?? 0;
    const aov = revenueAgg._avg.total ?? 0;

    return {
      rangeDays: days,
      since,
      kpis: {
        orders: ordersCount,
        paidOrders: paidOrdersCount,
        revenue,           // Decimal-like value from Prisma (serialize ok)
        aov,               // average order value
        customers: usersCount,
        lowStockItems: lowStock,
      },
      status: statusCounts.map(s => ({ status: s.status, count: s._count._all })),
    };
  }

  async timeseries(days: number) {
    const since = startDateFromDays(days);

    // Fetch orders in range and bucket by UTC date
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, total: true, paymentStatus: true },
    });

    const buckets = new Map<string, { date: string; orders: number; paidRevenue: number }>();

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      buckets.set(key, { date: key, orders: 0, paidRevenue: 0 });
    }

    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (!b) continue;
      b.orders += 1;
      if (o.paymentStatus === "paid") {
        // Prisma Decimal may behave like string/number depending config; force Number safely for charting
        b.paidRevenue += Number(o.total);
      }
    }

    return {
      rangeDays: days,
      since,
      items: Array.from(buckets.values()),
    };
  }

  async topSkus(days: number, limit: number) {
    const since = startDateFromDays(days);

    // Group by sku in OrderItem
    const grouped = await prisma.orderItem.groupBy({
      by: ["sku"],
      where: {
        order: { createdAt: { gte: since } },
      },
      _sum: { quantity: true, lineTotal: true },
      orderBy: [{ _sum: { quantity: "desc" } }],
      take: limit,
    });

    return {
      rangeDays: days,
      since,
      items: grouped.map(g => ({
        sku: g.sku,
        quantity: g._sum.quantity ?? 0,
        revenue: Number(g._sum.lineTotal ?? 0),
      })),
    };
  }
}