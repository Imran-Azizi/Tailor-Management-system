import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const numberField = z.number().positive();

export const createRakhtSchema = z.object({
  companyName: nonEmpty,
  brandName: nonEmpty,
  color: nonEmpty,
  colorHex: hexColor,
  metersPerTon: numberField,
  totalTons: numberField,
  price: z.number().min(0),
});

export const updateRakhtSchema = createRakhtSchema.partial();
