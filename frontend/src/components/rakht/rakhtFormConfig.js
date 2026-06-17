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

function msg(t, key, defaultValue) {
  return typeof t === "function" ? t(key, { defaultValue }) : defaultValue;
}

function makeRakhtTonSchema(t) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, msg(t, "rakht.validation.tonNameRequired", "Ton color name is required.")),
    colorHex: z
      .string()
      .regex(
        /^#[0-9A-Fa-f]{6}$/,
        msg(t, "rakht.validation.tonColorInvalid", "Please select a valid color."),
      ),
    totalMeters: z.coerce
      .number({
        invalid_type_error: msg(
          t,
          "rakht.validation.tonMetersInvalid",
          "Total meters must be a valid number.",
        ),
      })
      .int(msg(t, "rakht.validation.tonMetersInvalid", "Total meters must be a valid number."))
      .positive(
        msg(
          t,
          "rakht.validation.tonMetersPositive",
          "Total meters must be greater than zero.",
        ),
      ),
  });
}

export function makeRakhtSchema(t) {
  return z
    .object({
      companyName: z
        .string()
        .trim()
        .min(
          1,
          msg(t, "rakht.validation.companyNameRequired", "Company name is required."),
        ),
      brandName: z
        .string()
        .trim()
        .min(1, msg(t, "rakht.validation.brandNameRequired", "Brand name is required.")),
      tonQuantity: z
        .number({
          required_error: msg(
            t,
            "rakht.validation.tonQuantityRequired",
            "Please select ton quantity.",
          ),
          invalid_type_error: msg(
            t,
            "rakht.validation.tonQuantityRequired",
            "Please select ton quantity.",
          ),
        })
        .int(msg(t, "rakht.validation.tonQuantityRequired", "Please select ton quantity."))
        .min(1, msg(t, "rakht.validation.tonQuantityRequired", "Please select ton quantity."))
        .max(
          500,
          msg(t, "rakht.validation.tonQuantityMax", "Ton quantity cannot exceed 500."),
        ),
      tons: z.array(makeRakhtTonSchema(t)),
      totalPrice: z.coerce
        .number({
          invalid_type_error: msg(
            t,
            "rakht.validation.totalPriceInvalid",
            "Total price must be a valid number.",
          ),
        })
        .int(msg(t, "rakht.validation.totalPriceInvalid", "Total price must be a valid number."))
        .min(0, msg(t, "rakht.validation.totalPriceInvalid", "Total price must be zero or greater.")),
      givenMoney: z.coerce
        .number({
          invalid_type_error: msg(
            t,
            "rakht.validation.givenMoneyInvalid",
            "Given money must be a valid number.",
          ),
        })
        .int(msg(t, "rakht.validation.givenMoneyInvalid", "Given money must be a valid number."))
        .min(0, msg(t, "rakht.validation.givenMoneyInvalid", "Given money must be zero or greater.")),
    })
    .refine((d) => d.tons.length === d.tonQuantity, {
      message: msg(
        t,
        "rakht.validation.tonCountMismatch",
        "Number of ton details must match the selected ton quantity.",
      ),
      path: ["tons"],
    });
}

export const rakhtSchema = makeRakhtSchema();

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

export function makeAddMoreTonsSchema(t) {
  return z
    .object({
      tonQuantity: z
        .number({
          required_error: msg(
            t,
            "rakht.validation.tonQuantityRequired",
            "Please select ton quantity.",
          ),
          invalid_type_error: msg(
            t,
            "rakht.validation.tonQuantityRequired",
            "Please select ton quantity.",
          ),
        })
        .int(msg(t, "rakht.validation.tonQuantityRequired", "Please select ton quantity."))
        .min(1, msg(t, "rakht.validation.tonQuantityRequired", "Please select ton quantity."))
        .max(
          30,
          msg(t, "rakht.validation.tonQuantityMax", "Ton quantity cannot exceed 30."),
        ),
      tons: z
        .array(makeRakhtTonSchema(t))
        .min(1, msg(t, "rakht.validation.addMoreTonsRequired", "Please add at least one ton."))
        .max(30, msg(t, "rakht.validation.tonQuantityMax", "Ton quantity cannot exceed 30.")),
      totalPrice: z.coerce
        .number({
          invalid_type_error: msg(
            t,
            "rakht.validation.totalPriceInvalid",
            "Total price must be a valid number.",
          ),
        })
        .int(msg(t, "rakht.validation.totalPriceInvalid", "Total price must be a valid number."))
        .min(0, msg(t, "rakht.validation.totalPriceInvalid", "Total price must be zero or greater.")),
      givenMoney: z.coerce
        .number({
          invalid_type_error: msg(
            t,
            "rakht.validation.givenMoneyInvalid",
            "Given money must be a valid number.",
          ),
        })
        .int(msg(t, "rakht.validation.givenMoneyInvalid", "Given money must be a valid number."))
        .min(0, msg(t, "rakht.validation.givenMoneyInvalid", "Given money must be zero or greater.")),
    })
    .refine((d) => d.tons.length === d.tonQuantity, {
      message: msg(
        t,
        "rakht.validation.tonCountMismatch",
        "Number of ton details must match the selected ton quantity.",
      ),
      path: ["tons"],
    })
    .refine((d) => d.givenMoney <= d.totalPrice, {
      message: msg(
        t,
        "rakht.validation.givenMoneyTooHigh",
        "Given money cannot exceed total price.",
      ),
      path: ["givenMoney"],
    });
}

export const addMoreTonsSchema = makeAddMoreTonsSchema();

export function sanitizeIntegerInput(value) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  return text.replace(/[^0-9]/g, "");
}
