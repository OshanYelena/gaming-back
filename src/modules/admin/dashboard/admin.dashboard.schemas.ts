import { z } from "zod";

export const AdminDashboardSummarySchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30),
  }),
});

export const AdminDashboardTimeseriesSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30),
  }),
});

export const AdminDashboardTopSkusSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});