import { z } from "zod";

const OrderStatus = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

const PaymentStatus = z.enum([
  "unpaid",
  "paid",
  "partially_refunded",
  "refunded",
]);

export const AdminListOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    status: OrderStatus.optional(),
    paymentStatus: PaymentStatus.optional(),

    q: z.string().optional(), // search: orderNumber or email
  }),
});

export const AdminOrderIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const AdminUpdateOrderStatusSchema = z.object({
  body: z.object({
    status: OrderStatus,
  }).strict(),
});

export const AdminUpdatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: PaymentStatus,
  }).strict(),
});

export const AdminUpdateOrderNotesSchema = z.object({
  body: z.object({
    notes: z.string().max(2000).nullable(),
  }).strict(),
});