import { z } from "zod";

export const AddWishlistSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(), // optional future support
  }).strict(),
});

export const ProductIdParamSchema = z.object({
  params: z.object({
    productId: z.string().uuid(),
  }),
});