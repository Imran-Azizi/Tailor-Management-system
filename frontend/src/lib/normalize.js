// Frontend helpers to normalize Unicode text and digits
export function normalizeText(input) {
  if (input === null || input === undefined) return input;
  try {
    return String(input).normalize("NFC").trim();
  } catch (e) {
    return String(input).trim();
  }
}

export function toAsciiDigits(input) {
  if (input === null || input === undefined) return input;
  let s = String(input);
  s = s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  s = s.replace(/[\uFF10-\uFF19]/g, (d) => String(d.charCodeAt(0) - 0xff10));
  s = s.replace(/\u066B/g, ".");
  s = s.replace(/\u066C/g, "");
  return s;
}

export function parseNumberLocale(input) {
  if (input === null || input === undefined) return NaN;
  if (typeof input === "number") return input;
  const s = toAsciiDigits(String(input)).replace(/[,\s]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

export function normalizePhone(input) {
  if (input === null || input === undefined) return input;
  const s = toAsciiDigits(String(input));
  return s.replace(/[^0-9+]/g, "");
}
