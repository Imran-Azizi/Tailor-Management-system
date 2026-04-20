export const RAKHT_COLOR_OPTIONS = [
  { name: "Navy Blue", hex: "#1E3A8A" },
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Sky Blue", hex: "#38BDF8" },
  { name: "Emerald Green", hex: "#059669" },
  { name: "Olive Green", hex: "#4D7C0F" },
  { name: "Mustard", hex: "#D97706" },
  { name: "Brown", hex: "#92400E" },
  { name: "Maroon", hex: "#9F1239" },
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#F8FAFC" },
  { name: "Silver Gray", hex: "#94A3B8" },
  { name: "Cream", hex: "#FDE68A" },
];

export const DEFAULT_RAKHT_COLOR_HEX = "#94A3B8";

export function isHexColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

export function normalizeRakhtColorHex(
  value,
  fallback = DEFAULT_RAKHT_COLOR_HEX,
) {
  if (isHexColor(value)) {
    return value.trim().toUpperCase();
  }
  return fallback;
}

export function resolveRakhtColorHex(colorName, colorHex) {
  if (isHexColor(colorHex)) return normalizeRakhtColorHex(colorHex);
  if (isHexColor(colorName)) return normalizeRakhtColorHex(colorName);
  return null;
}

export function findRakhtColorOptionByHex(colorHex) {
  const normalizedHex = normalizeRakhtColorHex(colorHex);
  return (
    RAKHT_COLOR_OPTIONS.find((option) => option.hex === normalizedHex) || null
  );
}
