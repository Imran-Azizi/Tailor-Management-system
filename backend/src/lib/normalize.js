// Helpers to normalize Unicode text and digits for consistent storage and searching
export const normalizeText = (value) => {
  if (value === null || value === undefined) return value;
  try {
    return String(value).normalize("NFC").trim();
  } catch (e) {
    return String(value).trim();
  }
};

const ARABIC_INDIC = [
  "\u0660",
  "\u0661",
  "\u0662",
  "\u0663",
  "\u0664",
  "\u0665",
  "\u0666",
  "\u0667",
  "\u0668",
  "\u0669",
];
const PERSIAN_INDIC = [
  "\u06F0",
  "\u06F1",
  "\u06F2",
  "\u06F3",
  "\u06F4",
  "\u06F5",
  "\u06F6",
  "\u06F7",
  "\u06F8",
  "\u06F9",
];

// Replace common non-ASCII digit characters with ASCII 0-9
export const toAsciiDigits = (input) => {
  if (input === null || input === undefined) return input;
  let s = String(input);
  // Arabic-Indic digits
  s = s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  // Eastern Arabic-Indic (Persian) digits
  s = s.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  // Fullwidth digits
  s = s.replace(/[\uFF10-\uFF19]/g, (d) => String(d.charCodeAt(0) - 0xff10));
  // Arabic decimal separator (٫) to dot
  s = s.replace(/\u066B/g, ".");
  // Arabic thousands separator (٬) remove
  s = s.replace(/\u066C/g, "");
  return s;
};

export const parseNumberLocale = (input) => {
  if (input === null || input === undefined) return NaN;
  if (typeof input === "number") return input;
  const s = toAsciiDigits(String(input)).replace(/[,\s]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
};

export const normalizePhone = (input) => {
  if (input === null || input === undefined) return input;
  const s = toAsciiDigits(String(input));
  // keep only digits and plus sign
  return s.replace(/[^0-9+]/g, "");
};
