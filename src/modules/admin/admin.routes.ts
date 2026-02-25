import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { requireRole } from "../../middleware/roles";


import adminProductsRoutes from "./products/admin.products.routes";
import adminCategoriesRoutes from "./categories/admin.categories.routes";
import adminBrandsRoutes from "./brands/admin.brands.routes";
import adminPromotionsRoutes from "./promotions/admin.promotions.routes";

import adminOrdersRoutes from "./orders/admin.orders.routes";
import adminReviewsRoutes from "./reviews/admin.reviews.routes";
import adminImagesRoutes from "./images/admin.images.routes";
import adminInventoryRoutes from "./inventory/admin.inventory.routes"
import adminUsersRoutes from "./users/admin.users.routes";
import adminDashboardRoutes from "./dashboard/admin.dashboard.routes";



const r = Router();

r.use(requireAuth, requireRole("admin", "moderator"));

r.get("/health", (_req, res) => res.json({ ok: true, scope: "admin" }));

r.use("/products", adminProductsRoutes);
r.use("/categories", adminCategoriesRoutes);
r.use("/brands", adminBrandsRoutes);
r.use("/promotions", adminPromotionsRoutes);
r.use("/orders", adminOrdersRoutes);
r.use("/reviews", adminReviewsRoutes);
r.use("/", adminImagesRoutes);
r.use("/inventory", adminInventoryRoutes);
r.use("/users", adminUsersRoutes);
r.use("/dashboard", adminDashboardRoutes);

export default r;