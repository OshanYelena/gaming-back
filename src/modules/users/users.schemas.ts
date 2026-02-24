import { z } from "zod";

export const UpdateMeSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().min(6).max(30).optional(),
    avatarUrl: z.string().url().optional(),
  }).strict(),
});

export const ChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }).strict(),
});

export const AddressCreateSchema = z.object({
  body: z.object({
    label: z.string().min(1).max(30).optional(),
    fullName: z.string().min(1).max(100),
    phone: z.string().min(6).max(30).optional(),
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().optional().or(z.literal("")),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100).optional(),
    postalCode: z.string().min(1).max(20),
    country: z.string().min(1).max(80),
    isDefault: z.boolean().optional(),
  }).strict(),
});

export const AddressUpdateSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    label: z.string().min(1).max(30).optional(),
    fullName: z.string().min(1).max(100).optional(),
    phone: z.string().min(6).max(30).optional(),
    addressLine1: z.string().min(1).max(200).optional(),
    addressLine2: z.string().min(1).max(200).optional(),
    city: z.string().min(1).max(100).optional(),
    state: z.string().min(1).max(100).optional(),
    postalCode: z.string().min(1).max(20).optional(),
    country: z.string().min(1).max(80).optional(),
  }).strict(),
});

export const AddressIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});