import { Router } from "express";
import { OrdersController } from "./orders.controller";
import { validate } from "../../middleware/validate";
import {
  CheckoutValidateSchema,
  PaymentIntentSchema,
  CreateOrderSchema,
  OrderIdSchema,
  TrackSchema,
} from "./orders.schemas";
import { requireAuth, optionalAuth } from "../../middleware/auth";

const r = Router();
const c = new OrdersController();

// optionalAuth on the three guest-or-auth endpoints:
// logged-in users get their userId set → orders are linked to their account.
// guests (no token) continue to use sessionId → no behaviour change for them.
r.post("/checkout/validate", optionalAuth, validate(CheckoutValidateSchema), c.checkoutValidate);
r.post("/checkout/payment-intent", optionalAuth, validate(PaymentIntentSchema), c.paymentIntent);
r.post("/", optionalAuth, validate(CreateOrderSchema), c.createOrder);

// Auth-only routes — unchanged
r.get("/", requireAuth, c.listMine);
r.get("/track/:orderNumber", validate(TrackSchema), c.trackGuest);
r.get("/:id", requireAuth, validate(OrderIdSchema), c.getMine);
r.post("/:id/cancel", requireAuth, validate(OrderIdSchema), c.cancelMine);

export default r;
