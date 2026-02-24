import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  UpdateMeSchema,
  ChangePasswordSchema,
  AddressCreateSchema,
  AddressUpdateSchema,
  AddressIdSchema,
} from "./users.schemas";
import { UsersController } from "./users.controller";

const r = Router();
const c = new UsersController();

r.use(requireAuth);

// /api/v1/users/me
r.get("/me", c.me);
r.patch("/me", validate(UpdateMeSchema), c.updateMe);
r.patch("/me/password", validate(ChangePasswordSchema), c.changePassword);

// /api/v1/users/me/addresses
r.get("/me/addresses", c.listAddresses);
r.post("/me/addresses", validate(AddressCreateSchema), c.createAddress);
r.put("/me/addresses/:id", validate(AddressUpdateSchema), c.updateAddress);
r.delete("/me/addresses/:id", validate(AddressIdSchema), c.deleteAddress);
r.patch("/me/addresses/:id", validate(AddressIdSchema), c.setDefaultAddress);

export default r;