import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminInventoryController } from "./admin.inventory.controller";
import {
  AdminListInventorySchema,
  AdminVariantIdParam,
  AdminUpdateVariantInventorySchema,
  AdminBulkInventorySchema,
} from "./admin.inventory.schemas";

const r = Router();
const c = new AdminInventoryController();

r.get("/", validate(AdminListInventorySchema), c.list);
r.get("/low-stock", validate(AdminListInventorySchema), c.lowStock);

r.patch("/variants/:variantId", validate(AdminVariantIdParam), validate(AdminUpdateVariantInventorySchema), c.updateVariant);

r.patch("/bulk", validate(AdminBulkInventorySchema), c.bulkSet);

export default r;