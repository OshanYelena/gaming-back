import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminUsersController } from "./admin.users.controller";
import { AdminListUsersSchema, AdminUserIdParam, AdminUpdateUserSchema } from "./admin.users.schemas";

const r = Router();
const c = new AdminUsersController();

r.get("/", validate(AdminListUsersSchema), c.list);
r.get("/:id", validate(AdminUserIdParam), c.get);
r.patch("/:id", validate(AdminUserIdParam), validate(AdminUpdateUserSchema), c.update);

// list orders for a user (reuse pagination from AdminListUsersSchema? better to add a tiny schema)
r.get("/:id/orders", validate(AdminUserIdParam), c.listOrders);

export default r;