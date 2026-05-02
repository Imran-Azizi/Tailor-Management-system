import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
}, z.string().optional());

const orderItemSchema = z.object({
  orderItemKey: optionalText,
  type: z.enum(["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"]).optional(),
  orderName: optionalText,
  totalPrice: z.number().min(0).optional().default(0),
  discount: z.number().min(0).optional().default(0),
  paidAmount: z.number().min(0).optional().default(0),
  quantity: z.number().int().min(1).optional().default(1),
  isEmergency: z.boolean().default(false),
  emergencyExpiry: z.string().optional().nullable(),
  isForeignOrder: z.boolean().default(false),
  boxId: z.number().int().optional().nullable(),
  measurements: z.record(z.any()).optional(),
});

const orderBillItemSchema = orderItemSchema.extend({
  id: optionalText,
});

const rakhtSelectionSchema = z.object({
  orderItemKey: optionalText,
  type: z.enum(["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"]).optional(),
  rakhtId: optionalText,
  rakhtTonId: optionalText,
  requiredMeters: z.number().nonnegative().optional(),
  piecePrice: z.number().nonnegative().optional(),
  priceForCustomer: z.number().nonnegative().optional(),
  totalPriceForCustomer: z.number().min(0).optional(),
});

export const createOrderSchema = z.object({
  customerInfo: z
    .object({
      customerId: optionalText,
      firstName: optionalText,
      phoneNumber: optionalText,
    })
    .optional()
    .default({}),
  entryMonth: z.number().int().min(1).max(12).optional().nullable(),
  entryYear: z.number().int().min(1300).max(2200).optional().nullable(),
  rakhtSelections: z.array(rakhtSelectionSchema).optional().default([]),
  orders: z.array(orderItemSchema).optional().default([]),
});

export const updateOrderSchema = z.object({
  totalPrice: z.number().optional(),
  discount: z.number().optional(),
  paidAmount: z.number().optional(),
  quantity: z.number().int().min(1).optional(),
  isCompleted: z.boolean().optional(),
  isEmergency: z.boolean().optional(),
  emergencyExpiry: z.string().optional().nullable(),
  isForeignOrder: z.boolean().optional(),
  boxId: z.number().int().optional().nullable(),
  foreignBoxId: z.number().int().optional().nullable(),
});

export const updateOrderBillSchema = z.object({
  customerInfo: z.object({
    customerId: optionalText,
    firstName: optionalText,
    phoneNumber: optionalText,
  }),
  rakhtSelections: z.array(rakhtSelectionSchema).optional(),
  orders: z
    .array(orderBillItemSchema)
    .min(1, "At least one order item required"),
});
