import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_PRIVATE_KEY: z.string().min(1),
  JWT_ACCESS_PUBLIC_KEY: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(32),

  ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),

  FRONTEND_URL: z.string().min(1),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  // ✅ add this
  REDIS_URL: z.string().min(1).default("redis://127.0.0.1:6379"),
});

export const env = schema.parse(process.env);