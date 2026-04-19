export function normalizeLanguage(language = "en") {
  const lang = String(language || "en").toLowerCase();
  if (lang.startsWith("dari") || lang.startsWith("fa")) return "dari";
  if (lang.startsWith("pashto") || lang.startsWith("ps")) return "pashto";
  return "en";
}

export function isRtlLanguage(language = "en") {
  // Project-wide policy: keep UI layout LTR for all supported languages.
  return false;
}

export function getLocaleTag(language = "en") {
  const normalized = normalizeLanguage(language);
  if (normalized === "dari") return "fa-AF";
  if (normalized === "pashto") return "ps-AF";
  return "en-US";
}

export function formatDateLocale(value, language = "en", options = {}) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(getLocaleTag(language), options).format(date);
}

export function formatDateTimeLocale(value, language = "en", options = {}) {
  return formatDateLocale(value, language, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatNumberLocale(value, language = "en", options = {}) {
  const num = Number(value || 0);
  return new Intl.NumberFormat(getLocaleTag(language), options).format(num);
}

export function applyDocumentLocale(language = "en") {
  if (typeof document === "undefined") return;
  const normalized = normalizeLanguage(language);
  const dir = "ltr";
  const htmlLang =
    normalized === "en" ? "en" : normalized === "dari" ? "fa" : "ps";
  document.documentElement.setAttribute("lang", htmlLang);
  document.documentElement.setAttribute("dir", dir);
  document.body?.setAttribute("dir", dir);
}
