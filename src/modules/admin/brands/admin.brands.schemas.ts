import { z } from "zod";

export const AdminListBrandsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().optional(),
    featured: z.coerce.boolean().optional(),
  }),
});

export const AdminBrandIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const AdminCreateBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    logoUrl: z.string().url().optional().nullable(),
    website: z.string().url().optional().nullable(),
    description: z.string().optional().nullable(),
    isFeatured: z.boolean().optional().default(false),
  }).strict(),
});

export const AdminUpdateBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    logoUrl: z.string().url().optional().nullable(),
    website: z.string().url().optional().nullable(),
    description: z.string().optional().nullable(),
    isFeatured: z.boolean().optional(),
  }).strict(),
});