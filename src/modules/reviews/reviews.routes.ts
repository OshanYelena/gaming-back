// src/modules/reviews/reviews.routes.ts
import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { CreateReviewSchema } from "./reviews.schemas";   // ← fixed import
import { ReviewsController } from "./reviews.controller";

const r = Router();
const c = new ReviewsController();

// POST /api/v1/products/:id/reviews
r.post("/products/:id/reviews", requireAuth, validate(CreateReviewSchema), c.create);

export default r;
