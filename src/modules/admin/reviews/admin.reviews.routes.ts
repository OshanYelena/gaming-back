import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminReviewsController } from "./admin.reviews.controller";
import {
  AdminListReviewsSchema,
  AdminReviewIdParam,
  AdminUpdateReviewStatusSchema,
} from "./admin.reviews.schemas";

const r = Router();
const c = new AdminReviewsController();

r.get("/", validate(AdminListReviewsSchema), c.list);
r.get("/:id", validate(AdminReviewIdParam), c.get);
r.patch("/:id/status", validate(AdminReviewIdParam), validate(AdminUpdateReviewStatusSchema), c.updateStatus);
r.delete("/:id", validate(AdminReviewIdParam), c.remove);

export default r;