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

// Build allowed origins list from env vars.
// ALLOWED_ORIGINS = comma-separated list (optional, overrides FRONTEND_URL)
// FRONTEND_URL    = single production URL (always included)
// localhost:3000 and :3001 always allowed in non-production
const ALLOWED_ORIGINS: string[] = [
  // Always include the primary frontend URL (strip trailing slash)
  ...(env.FRONTEND_URL ? [env.FRONTEND_URL.replace(/\/$/, "")] : []),
  // Parse extra origins from ALLOWED_ORIGINS env var
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim().replace(/\/$/, "")).filter(Boolean)
    : []),
  // Always allow localhost in development
  ...(env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []),
];

// Deduplicate
const ORIGINS = [...new Set(ALLOWED_ORIGINS)];

console.log("[CORS] Allowed origins:", ORIGINS);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      if (ORIGINS.includes(origin)) return callback(null, true);
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error(`CORS: origin not allowed — ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(ensureGuestSession);

app.get("/health", (_req, res) => res.json({ ok: true, origins: ORIGINS }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1", reviewRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use(errorHandler);