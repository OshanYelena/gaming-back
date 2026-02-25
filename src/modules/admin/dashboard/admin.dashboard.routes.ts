import { Router } from "express";
import { validate } from "../../../middleware/validate";
import { AdminDashboardController } from "./admin.dashboard.controller";
import {
  AdminDashboardSummarySchema,
  AdminDashboardTimeseriesSchema,
  AdminDashboardTopSkusSchema,
} from "./admin.dashboard.schemas";

const r = Router();
const c = new AdminDashboardController();

r.get("/summary", validate(AdminDashboardSummarySchema), c.summary);
r.get("/timeseries", validate(AdminDashboardTimeseriesSchema), c.timeseries);
r.get("/top-skus", validate(AdminDashboardTopSkusSchema), c.topSkus);

export default r;