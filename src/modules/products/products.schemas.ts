import { z } from "zod";

export const ListProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),

    // ✅ existing UUID-based filters
    category: z.string().uuid().optional(),
    brand: z.string().uuid().optional(),

    // ✅ new: frontend-friendly category filter
    // accepts a category slug (recommended) OR a name
    // Example: /api/v1/products?category_slug=graphics-card
    category_slug: z.string().min(1).optional(),

    min_price: z.coerce.number().nonnegative().optional(),
    max_price: z.coerce.number().nonnegative().optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    search: z.string().min(1).optional(),
    in_stock: z.coerce.boolean().optional(),
    status: z.enum(["active", "draft", "archived"]).optional(),
  }),
});

export const ProductSlugSchema = z.object({
  params: z.object({ slug: z.string().min(1) }),
});

export const ProductIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

// ✅ GET /api/v1/products/category/:category
// `:category` can be a slug (recommended) OR a readable name (URL-encoded)
export const CategoryProductsSchema = z.object({
  params: z.object({
    category: z.string().min(1),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    sort: z.string().optional(),
    brand: z.string().uuid().optional(),
    min_price: z.coerce.number().nonnegative().optional(),
    max_price: z.coerce.number().nonnegative().optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    search: z.string().min(1).optional(),
    in_stock: z.coerce.boolean().optional(),
    status: z.enum(["active", "draft", "archived"]).optional(),
  }),
});