import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminPromotionsController } from "./admin.promotions.controller";
import {
  AdminListPromotionsSchema,
  AdminCreatePromotionSchema,
  AdminUpdatePromotionSchema,
  AdminPromotionIdParam,
} from "./admin.promotions.schemas";

const r = Router();
const c = new AdminPromotionsController();

r.get("/", validate(AdminListPromotionsSchema), c.list);
r.post("/", validate(AdminCreatePromotionSchema), c.create);
r.get("/:id", validate(AdminPromotionIdParam), c.get);
r.patch("/:id", validate(AdminPromotionIdParam), validate(AdminUpdatePromotionSchema), c.update);

// Soft delete (disable)
r.delete("/:id", validate(AdminPromotionIdParam), c.disable);

export default r;