import { z } from "zod";

export const TON_QTY_OPTIONS = Array.from({ length: 30 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));

function makeTonDraft(partial = {}) {
  return {
    id:
      partial.id ||
      `ton_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: partial.name || "",
    colorHex: partial.colorHex || "#94A3B8",
    totalMeters:
      partial.totalMeters === undefined || partial.totalMeters === null
        ? ""
        : String(partial.totalMeters),
  };
}

export const emptyTon = () => makeTonDraft();

export function buildTonsForQuantity(existingTons = [], quantity = 0) {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const current = Array.isArray(existingTons)
    ? existingTons.map((ton) => makeTonDraft(ton))
    : [];

  if (safeQty <= current.length) {
    return current.slice(0, safeQty);
  }

  return [
    ...current,
    ...Array.from({ length: safeQty - current.length }, () => emptyTon()),
  ];
}

const rakhtTonSchema = z.object({
  name: z.string().trim().min(1),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  totalMeters: z.coerce.number().int().positive(),
});

export const rakhtSchema = z
  .object({
    companyName: z.string().trim().min(1),
    brandName: z.string().trim().min(1),
    tonQuantity: z.number().int().min(1).max(500),
    tons: z.array(rakhtTonSchema),
    totalPrice: z.coerce.number().int().min(0),
    givenMoney: z.coerce.number().int().min(0),
  })
  .refine((d) => d.tons.length === d.tonQuantity, {
    message: "Ton items count must match Ton Quantity",
    path: ["tons"],
  });

export function emptyForm() {
  return {
    companyName: "",
    brandName: "",
    tonQuantity: null,
    tons: [],
    totalPrice: "",
    givenMoney: "",
  };
}

export function emptyAddMoreTonsForm() {
  return {
    tonQuantity: null,
    tons: [],
    totalPrice: "",
    givenMoney: "",
  };
}

export const addMoreTonsSchema = z
  .object({
    tonQuantity: z.number().int().min(1).max(30),
    tons: z.array(rakhtTonSchema).min(1).max(30),
    totalPrice: z.coerce.number().int().min(0),
    givenMoney: z.coerce.number().int().min(0),
  })
  .refine((d) => d.tons.length === d.tonQuantity, {
    message: "Ton items count must match Ton Quantity",
    path: ["tons"],
  })
  .refine((d) => d.givenMoney <= d.totalPrice, {
    message: "Given money cannot exceed total price",
    path: ["givenMoney"],
  });

export function sanitizeIntegerInput(value) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return text.replace(/[^0-9]/g, "");
}
