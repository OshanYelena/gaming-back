import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { RegisterSchema, LoginSchema, RefreshSchema, LogoutSchema } from "./auth.schemas";

const r = Router();
const c = new AuthController();

r.post("/register", validate(RegisterSchema), c.register);
r.post("/login", validate(LoginSchema), c.login);
r.post("/refresh", validate(RefreshSchema), c.refresh);
r.post("/logout", validate(LogoutSchema), c.logout);

// Placeholders from your spec — we’ll implement next:
// r.post("/forgot-password", ...)
// r.post("/reset-password", ...)
// r.post("/verify-email", ...)

export default r;