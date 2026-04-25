import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const customerInfoSchema = z
  .object({
    customerId: optionalText,
    firstName: optionalText,
    phoneNumber: optionalText,
  })
  .partial()
  .default({});

const orderTypeEntrySchema = z
  .object({
    type: z.enum(["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"]),
    isEmergency: z.boolean().optional(),
    emergencyExpiry: optionalText,
    emergencyHour: optionalText,
  })
  .passthrough();

export const upsertOrderDraftSchema = z.object({
  id: optionalText,
  clientKey: z
    .string({ required_error: "clientKey is required" })
    .trim()
    .min(1, "clientKey is required"),
  step: z.number().int().min(0).max(10).default(0),
  customerInfo: customerInfoSchema,
  orderTypes: z.array(orderTypeEntrySchema).default([]),
  measurements: z.record(z.any()).default({}),
});
