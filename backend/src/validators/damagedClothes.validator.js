import { z } from "zod";

const ROLE_TYPES = ["DOKHT", "QICHIKAR"];

export const damagedClothesRoleSchema = z.object({
  roleType: z.enum(ROLE_TYPES, {
    required_error: "Worker role is required",
    invalid_type_error: "Invalid worker role",
  }),
});

export const damagedClothesSearchSchema = z.object({
  query: z
    .string({ required_error: "Search query is required" })
    .trim()
    .min(1, "Search query is required"),
  userId: z.string().min(1, "Worker is required"),
  roleType: z.enum(ROLE_TYPES, {
    required_error: "Worker role is required",
    invalid_type_error: "Invalid worker role",
  }),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const createDamagedPenaltySchema = z.object({
  userId: z.string().min(1, "Worker is required"),
  orderId: z.string().min(1, "Order is required"),
  roleType: z.enum(ROLE_TYPES, {
    required_error: "Worker role is required",
    invalid_type_error: "Invalid worker role",
  }),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(300, "Reason must be 300 characters or less")
    .default("Damaged Clothes"),
});

export const damagedClothesPenaltyListSchema = z.object({
  search: z.string().trim().default(""),
  roleType: z.enum(ROLE_TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
