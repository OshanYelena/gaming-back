import { Router } from "express";
import { WishlistController } from "./wishlist.controller";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { AddWishlistSchema, ProductIdParamSchema } from "./wishlist.schemas";

const r = Router();
const c = new WishlistController();

r.use(requireAuth);

r.get("/", c.list);
r.post("/", validate(AddWishlistSchema), c.add);
r.delete("/:productId", validate(ProductIdParamSchema), c.remove);
r.post("/:productId/move-to-cart", validate(ProductIdParamSchema), c.moveToCart);

export default r;