import { Router } from "express";
import { ProductsController } from "./products.controller";
import { validate } from "../../middleware/validate";
import { ListProductsSchema, ProductSlugSchema, ProductIdSchema } from "./products.schemas";

const r = Router();
const c = new ProductsController();

r.get("/", validate(ListProductsSchema), c.list);
r.get("/:slug", validate(ProductSlugSchema), c.getBySlug);

// NOTE: keep :id routes AFTER :slug? No—because :slug will match anything.
// So we must mount /id routes on a different prefix OR use a stricter slug route.
// We'll do "/id/:id" for id-based endpoints to avoid collisions.
r.get("/id/:id/variants", validate(ProductIdSchema), c.variants);
r.get("/id/:id/reviews", validate(ProductIdSchema), c.reviews);

export default r;