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
import { requireAuth } from "../../middleware/auth";

const r = Router();
const c = new OrdersController();

// Checkout (guest or auth)
r.post("/checkout/validate", validate(CheckoutValidateSchema), c.checkoutValidate);
r.post("/checkout/payment-intent", validate(PaymentIntentSchema), c.paymentIntent);

// Create order (guest or auth)
r.post("/", validate(CreateOrderSchema), c.createOrder);

// Auth user order history
r.get("/", requireAuth, c.listMine);
r.get("/track/:orderNumber", validate(TrackSchema), c.trackGuest);
r.get("/:id", requireAuth, validate(OrderIdSchema), c.getMine);
r.post("/:id/cancel", requireAuth, validate(OrderIdSchema), c.cancelMine);

// Guest tracking

export default r;