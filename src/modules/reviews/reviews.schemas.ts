// src/modules/reviews/reviews.schemas.ts
import { z } from "zod";

export const CreateReviewSchema = z.object({
  params: z.object({
    id: z.string().uuid(),   // productId
  }),
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    title: z.string().min(1).max(200).optional(),
    body: z.string().min(1).max(5000).optional(),
  }).strict(),
});
