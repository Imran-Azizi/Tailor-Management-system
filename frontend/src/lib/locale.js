import { toAsciiDigits } from "./normalize.js";

const AFGHANISTAN_TIMEZONE = "Asia/Kabul";
const LRM = "\u200E";

export function normalizeLanguage(language = "en") {
  const lang = String(language || "en").toLowerCase();
  if (
    lang.startsWith("dari") ||
    lang.startsWith("dr") ||
    lang.startsWith("fa") ||
    lang.startsWith("prs")
  ) {
    return "dari";
  }
  if (lang.startsWith("pashto") || lang.startsWith("ps")) return "pashto";
  return "en";
}

export function isRtlLanguage(language = "en") {
  const normalized = normalizeLanguage(language);
  return normalized === "dari" || normalized === "pashto";
}

export function getLocaleTag(language = "en") {
  const normalized = normalizeLanguage(language);
  if (normalized === "dari") return "fa-AF-u-ca-persian-nu-latn";
  if (normalized === "pashto") return "ps-AF-u-ca-persian-nu-latn";
  return "en-US-u-nu-latn";
}

function usesAfghanLocalFormat(language = "en") {
  const normalized = normalizeLanguage(language);
  return normalized === "dari" || normalized === "pashto";
}

function hasTimeParts(options = {}) {
  return (
    options.hour !== undefined ||
    options.minute !== undefined ||
    options.second !== undefined ||
    options.dayPeriod !== undefined
  );
}

function withDateLocaleDefaults(language = "en", options = {}) {
  const next = { ...options };
  if (!next.timeZone) {
    next.timeZone = AFGHANISTAN_TIMEZONE;
  }
  if (
    hasTimeParts(next) &&
    next.hour12 === undefined &&
    next.hourCycle === undefined
  ) {
    next.hourCycle = "h23";
  }
  return next;
}

function stabilizeRtlMixedText(value, language = "en") {
  if (!isRtlLanguage(language)) return String(value ?? "");
  const text = String(value ?? "");
  if (!text) return text;
  // Keep latin-number tokens in logical order when mixed with RTL text.
  return text.replace(
    /[0-9]+(?:[./:-][0-9]+)*/g,
    (token) => `${LRM}${token}${LRM}`,
  );
}

export function formatDateLocale(value, language = "en", options = {}) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const rendered = toAsciiDigits(
    new Intl.DateTimeFormat(
      getLocaleTag(language),
      withDateLocaleDefaults(language, options),
    ).format(date),
  );
  return stabilizeRtlMixedText(rendered, language);
}

export function formatAfghanistanReportDate(value, language = "en") {
  const normalized = normalizeLanguage(language);
  const defaultOptions =
    normalized === "en"
      ? {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "2-digit",
        }
      : {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        };

  return formatDateLocale(value, language, defaultOptions);
}

export function formatSystemDate(value, language = "en", options = {}) {
  const normalized = normalizeLanguage(language);
  const defaultOptions =
    normalized === "en"
      ? { month: "2-digit", day: "2-digit", year: "numeric" }
      : { year: "numeric", month: "long", day: "2-digit" };
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
          month: "long",
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
  return formatSystemDateTime(value, language, options);
}

export function formatRelativeTimeLocale(value, language = "en", now = new Date()) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const units = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["week", 7 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000],
    ["second", 1000],
  ];
  const [unit, unitMs] =
    units.find(([, candidateMs]) => absMs >= candidateMs) || units.at(-1);
  const amount = Math.round(diffMs / unitMs);

  try {
    const rendered = toAsciiDigits(
      new Intl.RelativeTimeFormat(getLocaleTag(language), {
        numeric: "auto",
      }).format(amount, unit),
    );
    return stabilizeRtlMixedText(rendered, language);
  } catch {
    return formatDateTimeLocale(value, language);
  }
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
  const dir = isRtlLanguage(normalized) ? "rtl" : "ltr";
  const htmlLang =
    normalized === "en" ? "en-US" : normalized === "dari" ? "fa-AF" : "ps-AF";
  document.documentElement.setAttribute("lang", htmlLang);
  document.documentElement.setAttribute("dir", dir);
  document.body?.setAttribute("dir", dir);
}
