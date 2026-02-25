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

const AddressSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(1),
  region: z.string().optional().nullable(),     // province/state
  postalCode: z.string().min(1),
  country: z.string().min(1),
  email: z.string().email().optional().nullable(), // optional if you use guestEmail
});


export const CreateOrderSchema = z.object({
 body: z.object({
    currency: z.string().min(1).default("USD"),
    paymentProvider: z.enum(["stripe", "cod", "bank", "quotation"]).optional(), // adjust to what you support
    guestEmail: z.string().email().optional().nullable(),
    notes: z.string().optional().nullable(),

    shippingAddress: AddressSchema,
    billingAddress: AddressSchema.optional().nullable(),

    // ✅ bypass payment intent for now:
    paymentIntentId: z.string().optional().nullable(),
  }),
});

export const OrderIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const TrackSchema = z.object({
  params: z.object({ orderNumber: z.string().min(5) }),
  query: z.object({ email: z.string().email() }),
});