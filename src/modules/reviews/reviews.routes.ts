import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { CreateReviewSchema } from "../products/products.schemas";
import { ReviewsController } from "./reviews.controller";

const r = Router();
const c = new ReviewsController();

// Spec: POST /api/v1/products/:id/reviews
r.post("/products/:id/reviews", requireAuth, validate(CreateReviewSchema), c.create);

export default r;