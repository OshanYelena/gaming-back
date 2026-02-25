import { z } from "zod";

export const AdminListCategoriesSchema = z.object({
  query: z.object({
    tree: z.coerce.boolean().optional().default(false), // if true, return nested
  }),
});

export const AdminCategoryIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const AdminCreateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    parentId: z.string().uuid().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    sortOrder: z.coerce.number().int().optional().default(0),
  }).strict(),
});

export const AdminUpdateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    parentId: z.string().uuid().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    sortOrder: z.coerce.number().int().optional(),
  }).strict(),
});