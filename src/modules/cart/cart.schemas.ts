import { z } from "zod";

export const AddItemSchema = z.object({
  body: z.object({
    variant_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(99).default(1),
  }).strict(),
});

export const UpdateItemSchema = z.object({
  params: z.object({
    id: z.string().uuid(), // cart item id
  }),
  body: z.object({
    quantity: z.number().int().min(1).max(99),
  }).strict(),
});

export const RemoveItemSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const ApplyCouponSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(50),
  }).strict(),
});