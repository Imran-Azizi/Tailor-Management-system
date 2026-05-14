import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const rakhtTonSchema = z.object({
  name: nonEmpty,
  colorHex: hexColor,
  totalMeters: z.number().positive(),
});

export const createRakhtSchema = z
  .object({
    companyName: nonEmpty,
    brandName: nonEmpty,
    tonQuantity: z.number().int().min(1).max(30),
    tons: z.array(rakhtTonSchema),
    totalPrice: z.number().int().min(0),
    givenMoney: z.number().int().min(0),
  })
  .refine((data) => data.tons.length === data.tonQuantity, {
    message: "Number of ton items must match tonQuantity",
    path: ["tons"],
  });

export const updateRakhtSchema = z.object({
  companyName: nonEmpty.optional(),
  brandName: nonEmpty.optional(),
  tonQuantity: z.number().int().min(1).max(500).optional(),
  tons: z.array(rakhtTonSchema).optional(),
  totalPrice: z.number().min(0).optional(),
  givenMoney: z.number().min(0).optional(),
});

export const addRakhtTonsSchema = z
  .object({
    tons: z.array(rakhtTonSchema).min(1).max(30),
    totalPrice: z.number().min(0),
    givenMoney: z.number().min(0).default(0),
  })
  .refine((data) => data.givenMoney <= data.totalPrice, {
    message: "Given money cannot exceed total price",
    path: ["givenMoney"],
  });

export const payRemainingMoneySchema = z.object({
  companyName: nonEmpty,
  amount: z.number().int().positive(),
});
