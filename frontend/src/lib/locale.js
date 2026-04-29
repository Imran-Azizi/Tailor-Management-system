import { toAsciiDigits } from "./normalize.js";

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
  if (normalized === "dari") return "fa-AF-u-nu-latn";
  if (normalized === "pashto") return "ps-AF-u-nu-latn";
  return "en-US-u-nu-latn";
}

export function formatDateLocale(value, language = "en", options = {}) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return toAsciiDigits(
    new Intl.DateTimeFormat(getLocaleTag(language), options).format(date),
  );
}

export function formatSystemDate(value, language = "en", options = {}) {
  const normalized = normalizeLanguage(language);
  const defaultOptions =
    normalized === "en"
      ? { month: "2-digit", day: "2-digit", year: "numeric" }
      : { year: "numeric", month: "short", day: "2-digit" };
  return formatDateLocale(value, language, {
    ...defaultOptions,
    ...options,
  });
}

export function formatSystemDateTime(value, language = "en", options = {}) {
  const normalized = normalizeLanguage(language);
  const defaultOptions =
    normalized === "en"
      ? {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        };
  return formatDateLocale(value, language, {
    ...defaultOptions,
    ...options,
  });
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

export function formatDateThenTimeLocale(
  value,
  language = "en",
  { dateOptions = {}, timeOptions = {}, separator = " - " } = {},
) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const datePart = formatDateLocale(date, language, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...dateOptions,
  });
  const timePart = formatDateLocale(date, language, {
    hour: "2-digit",
    minute: "2-digit",
    ...timeOptions,
  });

  return `${datePart}${separator}${timePart}`;
}

export function formatNumberLocale(value, language = "en", options = {}) {
  const num = Number(value || 0);
  return toAsciiDigits(
    new Intl.NumberFormat(getLocaleTag(language), options).format(num),
  );
}

export function applyDocumentLocale(language = "en") {
  if (typeof document === "undefined") return;
  const normalized = normalizeLanguage(language);
  const dir = "ltr";
  const htmlLang =
    normalized === "en" ? "en-US" : normalized === "dari" ? "fa-AF" : "ps-AF";
  document.documentElement.setAttribute("lang", htmlLang);
  document.documentElement.setAttribute("dir", dir);
  document.body?.setAttribute("dir", dir);
}
