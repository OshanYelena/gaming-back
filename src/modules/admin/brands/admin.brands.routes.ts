import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminBrandsController } from "./admin.brands.controller";
import {
  AdminListBrandsSchema,
  AdminCreateBrandSchema,
  AdminUpdateBrandSchema,
  AdminBrandIdParam,
} from "./admin.brands.schemas";

const r = Router();
const c = new AdminBrandsController();

r.get("/", validate(AdminListBrandsSchema), c.list);
r.post("/", validate(AdminCreateBrandSchema), c.create);
r.get("/:id", validate(AdminBrandIdParam), c.get);
r.patch("/:id", validate(AdminBrandIdParam), validate(AdminUpdateBrandSchema), c.update);
r.delete("/:id", validate(AdminBrandIdParam), c.remove);

export default r;