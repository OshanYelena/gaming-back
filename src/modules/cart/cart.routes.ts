import { Router } from "express";
import { CartController } from "./cart.controller";
import { validate } from "../../middleware/validate";
import { AddItemSchema, UpdateItemSchema, RemoveItemSchema, ApplyCouponSchema } from "./cart.schemas";
import { requireAuth, optionalAuth } from "../../middleware/auth";

const r = Router();
const c = new CartController();

// optionalAuth on every cart route: sets req.user when a valid Bearer token is
// present so getUserId(req) returns the real userId and the cart is associated
// with the logged-in user instead of a guest session.
// Guests (no token) are completely unaffected — the request continues normally.
r.use(optionalAuth);

r.get("/", c.get);
r.post("/items", validate(AddItemSchema), c.addItem);
r.patch("/items/:id", validate(UpdateItemSchema), c.updateItem);
r.delete("/items/:id", validate(RemoveItemSchema), c.removeItem);
r.delete("/", c.clear);

r.post("/coupon", validate(ApplyCouponSchema), c.applyCoupon);
r.delete("/coupon", c.removeCoupon);

// merge still requires a confirmed identity
r.post("/merge", requireAuth, c.merge);

export default r;
