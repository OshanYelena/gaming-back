import { z } from "zod";

export const ListProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(), // price_asc, price_desc, newest, popular (placeholder)
    category: z.string().uuid().optional(),
    brand: z.string().uuid().optional(),
    min_price: z.coerce.number().nonnegative().optional(),
    max_price: z.coerce.number().nonnegative().optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    search: z.string().min(1).optional(),
    in_stock: z.coerce.boolean().optional(),
    status: z.enum(["active", "draft", "archived"]).optional(), // normally only active for public
  }),
});

export const ProductIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }).optional(),
});

export const ProductSlugSchema = z.object({
  params: z.object({ slug: z.string().min(1) }),
});

export const CreateReviewSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    rating: z.number().int().min(1).max(5),
    title: z.string().min(1).max(120).optional(),
    body: z.string().min(1).max(5000).optional(),
  }).strict(),
});