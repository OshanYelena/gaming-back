import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error";
import { ensureGuestSession } from "./middleware/guestSession";
import userRoutes from "./modules/users/users.routes";
import authRoutes from "./modules/auth/auth.routes";
import productRoutes from "./modules/products/products.routes";
import reviewRoutes from "./modules/reviews/reviews.routes";
import cartRoutes from "./modules/cart/cart.routes";
import orderRoutes from "./modules/orders/orders.routes";
import adminRoutes from "./modules/admin/admin.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(ensureGuestSession);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1", reviewRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use(errorHandler);