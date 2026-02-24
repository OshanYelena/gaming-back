import { z } from "zod";

export const CheckoutValidateSchema = z.object({
  body: z.object({
    currency: z.string().length(3).default("USD").optional(),
  }).strict().optional(),
});

export const PaymentIntentSchema = z.object({
  body: z.object({
    currency: z.string().length(3).default("USD"),
    // Optional: if you calculate shipping/tax later
    // shippingCost: z.number().nonnegative().optional(),
    // taxAmount: z.number().nonnegative().optional(),
  }).strict(),
});

export const CreateOrderSchema = z.object({
  body: z.object({
    currency: z.string().length(3).default("USD"),
    paymentProvider: z.enum(["stripe", "paypal"]).default("stripe"),
    paymentIntentId: z.string().min(5), // Stripe payment_intent id
    guestEmail: z.string().email().optional(),

    shippingAddress: z.object({
      fullName: z.string().min(1),
      phone: z.string().min(6).optional(),
      addressLine1: z.string().min(1),
      addressLine2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().optional(),
      postalCode: z.string().min(1),
      country: z.string().min(1),
    }).strict(),

    billingAddress: z.object({
      fullName: z.string().min(1),
      phone: z.string().min(6).optional(),
      addressLine1: z.string().min(1),
      addressLine2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().optional(),
      postalCode: z.string().min(1),
      country: z.string().min(1),
    }).strict(),

    notes: z.string().max(2000).optional(),
  }).strict(),
});

export const OrderIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const TrackSchema = z.object({
  params: z.object({ orderNumber: z.string().min(5) }),
  query: z.object({ email: z.string().email() }),
});