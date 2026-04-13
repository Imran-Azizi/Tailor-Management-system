import { z } from 'zod';

const optionalText = z.preprocess((value) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return value;
}, z.string().optional());

const orderItemSchema = z.object({
  type: z.enum(['OUTFIT', 'WASKAT', 'KORTY', 'YAKHANQAQ']),
  orderName: optionalText,
  totalPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  paidAmount: z.number().min(0),
  quantity: z.number().int().min(1).default(1),
  isEmergency: z.boolean().default(false),
  emergencyExpiry: z.string().optional().nullable(),
  boxId: z.number().int().optional().nullable(),
  measurements: z.record(z.any()).optional(),
});

export const createOrderSchema = z.object({
  customerInfo: z.object({
    customerId: optionalText,
    firstName: optionalText,
    phoneNumber: optionalText,
  }),
  orders: z.array(orderItemSchema).min(1, 'At least one order item required'),
});

export const updateOrderSchema = z.object({
  totalPrice: z.number().optional(),
  discount: z.number().optional(),
  paidAmount: z.number().optional(),
  quantity: z.number().int().min(1).optional(),
  isCompleted: z.boolean().optional(),
  isEmergency: z.boolean().optional(),
  emergencyExpiry: z.string().optional().nullable(),
  boxId: z.number().int().optional().nullable(),
});
