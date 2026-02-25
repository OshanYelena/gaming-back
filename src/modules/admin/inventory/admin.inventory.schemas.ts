import { z } from "zod";

export const AdminListInventorySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    q: z.string().optional(), // sku or product name
    active: z.coerce.boolean().optional(),
  }),
});

export const AdminVariantIdParam = z.object({
  params: z.object({
    variantId: z.string().uuid(),
  }),
});

export const AdminUpdateVariantInventorySchema = z.object({
  body: z.object({
    stockQuantity: z.coerce.number().int().min(0).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  }),
});

export const AdminBulkInventorySchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        sku: z.string().min(1),
        stockQuantity: z.coerce.number().int().min(0),
      }).strict()
    ).min(1),
  }).strict(),
});