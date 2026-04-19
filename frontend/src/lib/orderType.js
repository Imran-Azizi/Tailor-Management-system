import { normalizeLanguage } from "./locale.js";

const ORDER_TYPE_LABELS = {
  en: {
    OUTFIT: "Outfit",
    WASKAT: "Waskat",
    KORTY: "Korty",
    YAKHANQAQ: "YakhanQaq",
  },
  dari: {
    OUTFIT: "پیراهن تنبان",
    WASKAT: "واسکت",
    KORTY: "کُرتی",
    YAKHANQAQ: "یخن قاق",
  },
  pashto: {
    OUTFIT: "پیرهن تنبان",
    WASKAT: "واسکت",
    KORTY: "کرتی",
    YAKHANQAQ: "یخن قاق",
  },
};

export const ORDER_TYPE_VALUES = ["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"];

export function getOrderTypeLabel(type, language = "en") {
  if (!type) return "-";
  const normalized = normalizeLanguage(language);
  return (
    ORDER_TYPE_LABELS[normalized]?.[type] ||
    ORDER_TYPE_LABELS.en[type] ||
    type
  );
}

export function getOrderTypeOptions(language = "en") {
  return ORDER_TYPE_VALUES.map((value) => ({
    value,
    label: getOrderTypeLabel(value, language),
  }));
}
