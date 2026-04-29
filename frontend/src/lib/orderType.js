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
    ORDER_TYPE_LABELS[normalized]?.[type] || ORDER_TYPE_LABELS.en[type] || type
  );
}

export function getOrderTypeOptions(language = "en") {
  return ORDER_TYPE_VALUES.map((value) => ({
    value,
    label: getOrderTypeLabel(value, language),
  }));
}

function normalizeNameForCompare(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripRepeatedBasePrefix(customName, baseLabel) {
  const escapedBase = escapeRegex(baseLabel);
  const matcher = new RegExp(`^${escapedBase}(?:\\s*[-:|]\\s*|\\s+)(.+)$`, "i");
  const match = String(customName || "").match(matcher);
  return match?.[1]?.trim() || "";
}

export function getOrderDisplayName(order, language = "en", options = {}) {
  if (!order || typeof order !== "object") return "-";

  const typeLabel = getOrderTypeLabel(order.type, language);
  const parsedTotal = Number(order.orderTypeTotal ?? options.totalByType ?? 1);
  const parsedSequence = Number(
    order.orderTypeSequence ?? options.sequenceByType ?? 1,
  );

  const total =
    Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : 1;
  const sequence =
    Number.isFinite(parsedSequence) && parsedSequence > 0 ? parsedSequence : 1;

  const baseLabel = total > 1 ? `${typeLabel} ${sequence}` : typeLabel;

  const rawCustomName =
    typeof order.orderName === "string"
      ? order.orderName.trim()
      : typeof order.orderDisplayName === "string"
        ? order.orderDisplayName.trim()
        : "";

  if (!rawCustomName) return baseLabel;

  const normalizedBase = normalizeNameForCompare(baseLabel);
  const normalizedCustom = normalizeNameForCompare(rawCustomName);
  if (!normalizedCustom || normalizedCustom === normalizedBase) {
    return baseLabel;
  }

  const strippedCustom = stripRepeatedBasePrefix(rawCustomName, baseLabel);
  if (strippedCustom) {
    const normalizedStripped = normalizeNameForCompare(strippedCustom);
    if (normalizedStripped && normalizedStripped !== normalizedBase) {
      return `${baseLabel} - ${strippedCustom}`;
    }
    return baseLabel;
  }

  if (normalizedCustom === normalizeNameForCompare(typeLabel)) {
    return baseLabel;
  }

  return `${baseLabel} - ${rawCustomName}`;
}
