import { z } from "zod";

const ProductStatus = z.enum(["active", "draft", "archived"]);

const IsoDateTimeString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid datetime" });

export const AdminListProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().optional(), // search
    status: ProductStatus.optional(),
  }),
});

export const AdminProductIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const AdminVariantIdParam = z.object({
  params: z.object({
    variantId: z.string().uuid(),
  }),
});

export const AdminCreateProductSchema = z.object({
  body: z.object({
    sku: z.string().min(1),
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    brandId: z.string().uuid().optional(),
    basePrice: z.coerce.number().nonnegative(),
    compareAtPrice: z.coerce.number().nonnegative().optional(),
    isGiftCard: z.boolean().optional(),
    isPreOrder: z.boolean().optional(),
    preOrderDate: IsoDateTimeString.optional(),
    weight: z.coerce.number().nonnegative().optional(),
    tags: z.array(z.string()).default([]),
    status: ProductStatus.default("draft"),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
  }).strict(),
});

export const AdminUpdateProductSchema = z.object({
  body: z.object({
    sku: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    shortDescription: z.string().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    brandId: z.string().uuid().optional().nullable(),
    basePrice: z.coerce.number().nonnegative().optional(),
    compareAtPrice: z.coerce.number().nonnegative().optional().nullable(),
    isGiftCard: z.boolean().optional(),
    isPreOrder: z.boolean().optional(),
    preOrderDate: IsoDateTimeString.optional().nullable(),
    weight: z.coerce.number().nonnegative().optional().nullable(),
    tags: z.array(z.string()).optional(),
    status: ProductStatus.optional(),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
  }).strict(),
});

export const AdminCreateVariantSchema = z.object({
  params: z.object({
    id: z.string().uuid(), // product id
  }),
  body: z.object({
    sku: z.string().min(1),
    optionValues: z.record(z.string(), z.any()), // stored as Json
    price: z.coerce.number().nonnegative().optional().nullable(),
    compareAtPrice: z.coerce.number().nonnegative().optional().nullable(),
    stockQuantity: z.coerce.number().int().min(0).default(0),
    lowStockThreshold: z.coerce.number().int().min(0).default(5),
    imageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
  }).strict(),
});

export const AdminUpdateVariantSchema = z.object({
  body: z.object({
    sku: z.string().min(1).optional(),
    optionValues: z.record(z.string(), z.any()).optional(),
    price: z.coerce.number().nonnegative().optional().nullable(),
    compareAtPrice: z.coerce.number().nonnegative().optional().nullable(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
    imageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
  }).strict(),
});

export const AdminUpdateVariantStockSchema = z.object({
  body: z.object({
    stockQuantity: z.coerce.number().int().min(0),
  }).strict(),
});