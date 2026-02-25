import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminCategoriesController } from "./admin.categories.controller";
import {
  AdminListCategoriesSchema,
  AdminCreateCategorySchema,
  AdminUpdateCategorySchema,
  AdminCategoryIdParam,
} from "./admin.categories.schemas";

const r = Router();
const c = new AdminCategoriesController();

r.get("/", validate(AdminListCategoriesSchema), c.list);
r.post("/", validate(AdminCreateCategorySchema), c.create);
r.get("/:id", validate(AdminCategoryIdParam), c.get);
r.patch("/:id", validate(AdminCategoryIdParam), validate(AdminUpdateCategorySchema), c.update);
r.delete("/:id", validate(AdminCategoryIdParam), c.remove);

export default r;