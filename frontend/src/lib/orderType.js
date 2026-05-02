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

function getOrderTypeTotals(order = {}, options = {}) {
  const parsedTotal = Number(order.orderTypeTotal ?? options.totalByType ?? 1);
  const parsedSequence = Number(
    order.orderTypeSequence ?? options.sequenceByType ?? 1,
  );

  const total =
    Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : 1;
  const sequence =
    Number.isFinite(parsedSequence) && parsedSequence > 0 ? parsedSequence : 1;

  return { total, sequence };
}

function normalizeNameForCompare(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a, b) {
  return normalizeNameForCompare(a) === normalizeNameForCompare(b);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripRepeatedBasePrefix(customName, baseLabel) {
  const escapedBase = escapeRegex(baseLabel);
  const matcher = new RegExp(
    `^${escapedBase}(?:\\s*(?:-|:|\\|)\\s*|\\s+)(.+)$`,
    "i",
  );
  const match = String(customName || "").match(matcher);
  return match?.[1]?.trim() || "";
}

function isNumericOnlyLabel(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function isDefaultGeneratedName(rawName, typeLabel, sequencedLabel) {
  const normalizedRaw = normalizeNameForCompare(rawName);
  const normalizedType = normalizeNameForCompare(typeLabel);
  const normalizedSequenced = normalizeNameForCompare(sequencedLabel);

  if (!normalizedRaw) return false;
  if (
    normalizedRaw === normalizedType ||
    normalizedRaw === normalizedSequenced
  ) {
    return true;
  }

  const compactRaw = normalizedRaw.replace(/\s+/g, "");
  const compactType = normalizedType.replace(/\s+/g, "");
  const compactSequenced = normalizedSequenced.replace(/\s+/g, "");
  if (compactRaw === compactType || compactRaw === compactSequenced) {
    return true;
  }

  return false;
}

function getTypeLabelCandidates(order, language = "en", options = {}) {
  const type = order?.type;
  const { sequence } = getOrderTypeTotals(order, options);
  const candidates = new Set();

  const addLabel = (label) => {
    const clean = String(label || "").trim();
    if (!clean) return;
    candidates.add(clean);
    if (Number.isFinite(sequence) && sequence > 0) {
      candidates.add(`${clean} ${sequence}`);
    }
  };

  addLabel(getOrderTypeBaseLabel(order, language));
  addLabel(getOrderTypeWithSequenceLabel(order, language, options));

  if (type && ORDER_TYPE_LABELS.en?.[type]) {
    Object.values(ORDER_TYPE_LABELS).forEach((labels) => {
      addLabel(labels?.[type]);
    });
  }

  return Array.from(candidates);
}

function isDefaultGeneratedByAnyLabel(rawName, labelCandidates = []) {
  return labelCandidates.some((label) =>
    isDefaultGeneratedName(rawName, label, label),
  );
}

export function getOrderTypeBaseLabel(orderOrType, language = "en") {
  if (
    orderOrType &&
    typeof orderOrType === "object" &&
    !Array.isArray(orderOrType)
  ) {
    return getOrderTypeLabel(orderOrType.type, language);
  }
  return getOrderTypeLabel(orderOrType, language);
}

export function getOrderTypeWithSequenceLabel(
  order,
  language = "en",
  options = {},
) {
  if (!order || typeof order !== "object") return "-";
  const typeLabel = getOrderTypeBaseLabel(order, language);
  const { total, sequence } = getOrderTypeTotals(order, options);
  return total > 1 ? `${typeLabel} ${sequence}` : typeLabel;
}

export function getOrderCustomName(order, language = "en", options = {}) {
  if (!order || typeof order !== "object") return "";

  const rawCustomName =
    typeof order.orderName === "string"
      ? order.orderName.trim()
      : typeof order.orderDisplayName === "string"
        ? order.orderDisplayName.trim()
        : "";

  if (!rawCustomName) return "";

  const typeLabel = getOrderTypeBaseLabel(order, language);
  const baseWithSequence = getOrderTypeWithSequenceLabel(
    order,
    language,
    options,
  );
  const labelCandidates = getTypeLabelCandidates(order, language, options);
  const normalizedRaw = normalizeNameForCompare(rawCustomName);

  if (!normalizedRaw) return "";
  if (
    isDefaultGeneratedName(rawCustomName, typeLabel, baseWithSequence) ||
    isDefaultGeneratedByAnyLabel(rawCustomName, labelCandidates)
  ) {
    return "";
  }
  if (isNumericOnlyLabel(rawCustomName)) return "";

  for (const candidate of labelCandidates) {
    const stripped = stripRepeatedBasePrefix(rawCustomName, candidate);
    if (stripped) {
      const normalized = normalizeNameForCompare(stripped);
      const isSameAsKnownType = labelCandidates.some(
        (label) => normalized === normalizeNameForCompare(label),
      );

      if (normalized && !isSameAsKnownType && !isNumericOnlyLabel(stripped)) {
        return stripped;
      }
      return "";
    }
  }

  return rawCustomName;
}

export function getOrderLabelParts(order, language = "en", options = {}) {
  const baseTypeLabel = getOrderTypeBaseLabel(order, language);
  const typeWithSequenceLabel = getOrderTypeWithSequenceLabel(
    order,
    language,
    options,
  );
  const customName = getOrderCustomName(order, language, options);
  const fullLabel = customName
    ? `${typeWithSequenceLabel} - ${customName}`
    : typeWithSequenceLabel;

  return {
    baseTypeLabel,
    typeWithSequenceLabel,
    customName,
    fullLabel,
  };
}

export function getOrderPrimaryDisplayName(
  order,
  customerName,
  language = "en",
  options = {},
) {
  const parts = getOrderLabelParts(order, language, options);
  const customName = String(parts.customName || "").trim();
  const fallbackName = String(customerName || "").trim();
  const showCustomerNameWithCustom =
    options.showCustomerNameWithCustom === true;

  if (customName) {
    if (showCustomerNameWithCustom && fallbackName) {
      if (namesMatch(customName, fallbackName)) return fallbackName;
      return `${fallbackName} - ${customName}`;
    }
    return customName;
  }

  return fallbackName || "-";
}

export function getOrderDisplayName(order, language = "en", options = {}) {
  if (!order || typeof order !== "object") return "-";
  return getOrderLabelParts(order, language, options).fullLabel;
}
