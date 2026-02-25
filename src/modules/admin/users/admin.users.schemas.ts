import { z } from "zod";

const UserRole = z.enum(["customer", "admin", "moderator"]);

export const AdminListUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),

    q: z.string().optional(),           // email / name / phone
    role: UserRole.optional(),
    active: z.coerce.boolean().optional(),
    verified: z.coerce.boolean().optional(),
  }),
});

export const AdminUserIdParam = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const AdminUpdateUserSchema = z.object({
  body: z.object({
    role: UserRole.optional(),
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
  }).strict().refine((v) => Object.keys(v).length > 0, {
    message: "Provide at least one field to update",
  }),
});