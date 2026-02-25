import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminProductsController } from "./admin.products.controller";
import {
  AdminListProductsSchema,
  AdminCreateProductSchema,
  AdminUpdateProductSchema,
  AdminProductIdParam,
  AdminCreateVariantSchema,
  AdminVariantIdParam,
  AdminUpdateVariantSchema,
  AdminUpdateVariantStockSchema,
} from "./admin.products.schemas";

const r = Router();
const c = new AdminProductsController();

// products
r.get("/", validate(AdminListProductsSchema), c.list);
r.post("/", validate(AdminCreateProductSchema), c.create);
r.get("/:id", validate(AdminProductIdParam), c.get);
r.patch("/:id", validate(AdminProductIdParam), validate(AdminUpdateProductSchema), c.update);
r.delete("/:id", validate(AdminProductIdParam), c.archive);

// variants under product
r.get("/:id/variants", validate(AdminProductIdParam), c.listVariants);
r.post("/:id/variants", validate(AdminCreateVariantSchema), c.createVariant);

// variants direct
r.patch("/variants/:variantId", validate(AdminVariantIdParam), validate(AdminUpdateVariantSchema), c.updateVariant);
r.patch("/variants/:variantId/stock", validate(AdminVariantIdParam), validate(AdminUpdateVariantStockSchema), c.updateVariantStock);

export default r;