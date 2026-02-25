import { z } from "zod";

export const AdminProductIdParam = z.object({
  params: z.object({
    id: z.string().uuid(), // product id
  }),
});

export const AdminImageIdParam = z.object({
  params: z.object({
    imageId: z.string().uuid(),
  }),
});

export const AdminCreateProductImageSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    url: z.string().url(),
    altText: z.string().optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    variantId: z.string().uuid().optional().nullable(),
  }).strict(),
});

export const AdminUpdateProductImageSchema = z.object({
  body: z.object({
    url: z.string().url().optional(),
    altText: z.string().optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    variantId: z.string().uuid().optional().nullable(),
  }).strict(),
});

export const AdminReorderProductImagesSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    items: z.array(
      z.object({
        imageId: z.string().uuid(),
        sortOrder: z.coerce.number().int().min(0),
      }).strict()
    ).min(1),
  }).strict(),
});