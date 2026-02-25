import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminImagesController } from "./admin.images.controller";
import {
  AdminProductIdParam,
  AdminImageIdParam,
  AdminCreateProductImageSchema,
  AdminUpdateProductImageSchema,
  AdminReorderProductImagesSchema,
} from "./admin.images.schemas";

const r = Router();
const c = new AdminImagesController();

// /api/v1/admin/products/:id/images
r.get("/products/:id/images", validate(AdminProductIdParam), c.listByProduct);
r.post("/products/:id/images", validate(AdminCreateProductImageSchema), c.createForProduct);
r.patch("/products/:id/images/reorder", validate(AdminReorderProductImagesSchema), c.reorder);

// /api/v1/admin/images/:imageId
r.patch("/images/:imageId", validate(AdminImageIdParam), validate(AdminUpdateProductImageSchema), c.update);
r.delete("/images/:imageId", validate(AdminImageIdParam), c.remove);

export default r;