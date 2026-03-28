import { Router } from "express";
import { validate } from "../../middleware/validate";
import { ProductsController } from "./products.controller";
import {
  ListProductsSchema,
  ProductSlugSchema,
  ProductIdSchema,
  CategoryProductsSchema,
} from "./products.schemas";

const r = Router();
const c = new ProductsController();

// List with filters
r.get("/", validate(ListProductsSchema), c.list);

// ✅ Products by category slug/name
// Example: GET /api/v1/products/category/graphics-card
r.get("/category/:category", validate(CategoryProductsSchema), c.listByCategory);

// Get product by slug
r.get("/:slug", validate(ProductSlugSchema), c.getBySlug);

// Admin endpoints (kept as-is)
r.post("/", c.create);
r.put("/:id", validate(ProductIdSchema), c.update);
r.delete("/:id", validate(ProductIdSchema), c.remove);

export default r;