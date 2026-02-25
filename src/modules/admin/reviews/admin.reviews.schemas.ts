import { z } from "zod";

const ReviewStatus = z.enum(["pending", "approved", "rejected"]);

export const AdminListReviewsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    status: ReviewStatus.optional(),
    q: z.string().optional(), // search by product/user/title
  }),
});

export const AdminReviewIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const AdminUpdateReviewStatusSchema = z.object({
  body: z.object({
    status: ReviewStatus,
  }).strict(),
});