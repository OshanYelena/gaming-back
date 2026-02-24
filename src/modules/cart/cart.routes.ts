import { Router } from "express";
import { CartController } from "./cart.controller";
import { validate } from "../../middleware/validate";
import { AddItemSchema, UpdateItemSchema, RemoveItemSchema, ApplyCouponSchema } from "./cart.schemas";
import { requireAuth } from "../../middleware/auth";

const r = Router();
const c = new CartController();

// Optional auth: cart endpoints should work for guest or user.
// We'll not require auth for most endpoints.
r.get("/", c.get);
r.post("/items", validate(AddItemSchema), c.addItem);
r.patch("/items/:id", validate(UpdateItemSchema), c.updateItem);
r.delete("/items/:id", validate(RemoveItemSchema), c.removeItem);
r.delete("/", c.clear);

r.post("/coupon", validate(ApplyCouponSchema), c.applyCoupon);
r.delete("/coupon", c.removeCoupon);

// Spec: merge requires Bearer auth
r.post("/merge", requireAuth, c.merge);

export default r;