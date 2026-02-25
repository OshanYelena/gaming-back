import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminOrdersController } from "./admin.orders.controller";
import {
  AdminListOrdersSchema,
  AdminOrderIdParam,
  AdminUpdateOrderStatusSchema,
  AdminUpdatePaymentStatusSchema,
  AdminUpdateOrderNotesSchema,
} from "./admin.orders.schemas";

const r = Router();
const c = new AdminOrdersController();

r.get("/", validate(AdminListOrdersSchema), c.list);
r.get("/:id", validate(AdminOrderIdParam), c.get);

r.patch("/:id/status", validate(AdminOrderIdParam), validate(AdminUpdateOrderStatusSchema), c.updateStatus);
r.patch("/:id/payment-status", validate(AdminOrderIdParam), validate(AdminUpdatePaymentStatusSchema), c.updatePaymentStatus);
r.patch("/:id/notes", validate(AdminOrderIdParam), validate(AdminUpdateOrderNotesSchema), c.updateNotes);

export default r;