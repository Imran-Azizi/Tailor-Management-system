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
    type: z.enum([
      "OUTFIT",
      "WASKAT",
      "KORTY",
      "YAKHANQAQ",
      "READY_MADE",
      "READY_MADE_WASKAT",
    ]),
    isEmergency: z.boolean().optional(),
    emergencyExpiry: optionalText,
    emergencyHour: optionalText,
    isForeignOrder: z.boolean().optional(),
  })
  .passthrough();

export const upsertOrderDraftSchema = z.object({
  id: optionalText,
  clientKey: z
    .string({ required_error: "clientKey is required" })
    .trim()
    .min(1, "clientKey is required"),
  step: z.number().int().min(0).max(10).default(0),
  status: z.enum(["DRAFT", "WAITING_FOR_BOX"]).optional().default("DRAFT"),
  waitingBoxType: optionalText,
  customerInfo: customerInfoSchema,
  orderTypes: z.array(orderTypeEntrySchema).default([]),
  measurements: z.record(z.any()).default({}),
  rakhtSelections: z.array(z.record(z.any())).default([]),
  billing: z.record(z.any()).default({}),
  orderItems: z.array(z.record(z.any())).default([]),
  entryMonth: z.number().int().min(1).max(12).optional().nullable(),
  entryYear: z.number().int().min(1300).max(2200).optional().nullable(),
  prefillOrderId: optionalText,
});
