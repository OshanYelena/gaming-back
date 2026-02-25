import { z } from "zod";

const IsoDateTimeString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid datetime" });

// Keep your DB flexible but validate common cases.
const PromoType = z.enum(["percent", "fixed"]);

export const AdminListPromotionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().optional(), // search by code
    active: z.coerce.boolean().optional(),
  }),
});

export const AdminPromotionIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const AdminCreatePromotionSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(64).transform((s) => s.trim().toUpperCase()),
    type: PromoType,
    value: z.coerce.number().positive().optional().nullable(),         // percent or fixed amount
    minOrderAmount: z.coerce.number().nonnegative().optional().nullable(),
    usageLimit: z.coerce.number().int().positive().optional().nullable(),
    startsAt: IsoDateTimeString.optional().nullable(),
    expiresAt: IsoDateTimeString.optional().nullable(),
    isActive: z.boolean().optional().default(true),
  }).strict().superRefine((val, ctx) => {
    if (val.type === "percent") {
      if (val.value == null) ctx.addIssue({ code: "custom", path: ["value"], message: "value is required for percent promo" });
      if (val.value != null && (val.value <= 0 || val.value > 100)) ctx.addIssue({ code: "custom", path: ["value"], message: "percent value must be 1..100" });
    }
    if (val.type === "fixed") {
      if (val.value == null) ctx.addIssue({ code: "custom", path: ["value"], message: "value is required for fixed promo" });
      if (val.value != null && val.value <= 0) ctx.addIssue({ code: "custom", path: ["value"], message: "fixed value must be > 0" });
    }
    if (val.startsAt && val.expiresAt) {
      const s = Date.parse(val.startsAt);
      const e = Date.parse(val.expiresAt);
      if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) {
        ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "expiresAt must be after startsAt" });
      }
    }
  }),
});

export const AdminUpdatePromotionSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(64).transform((s) => s.trim().toUpperCase()).optional(),
    type: PromoType.optional(),
    value: z.coerce.number().positive().optional().nullable(),
    minOrderAmount: z.coerce.number().nonnegative().optional().nullable(),
    usageLimit: z.coerce.number().int().positive().optional().nullable(),
    startsAt: IsoDateTimeString.optional().nullable(),
    expiresAt: IsoDateTimeString.optional().nullable(),
    isActive: z.boolean().optional(),
  }).strict(),
});