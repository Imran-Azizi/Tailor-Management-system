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

const DEFAULT_SKIP_DIGIT_KEYS = new Set([
  "password",
  "passwordhash",
  "refreshtoken",
  "accesstoken",
  "token",
  "secret",
  "hash",
]);

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizeSkipKeys(skipKeys = DEFAULT_SKIP_DIGIT_KEYS) {
  if (skipKeys instanceof Set) return skipKeys;
  return new Set(
    Array.from(skipKeys || [], (key) => String(key).toLowerCase()),
  );
}

function shouldSkipDigitNormalization(key, skipKeys) {
  if (key === null || key === undefined) return false;
  return skipKeys.has(String(key).toLowerCase());
}

function normalizeUrlSearchParams(params, options) {
  const next = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    if (shouldSkipDigitNormalization(key, options.skipKeys)) {
      next.append(key, value);
      continue;
    }
    next.append(key, toAsciiDigits(value));
  }
  return next;
}

function normalizeFormData(data, options) {
  const next = new FormData();
  for (const [key, value] of data.entries()) {
    if (
      shouldSkipDigitNormalization(key, options.skipKeys) ||
      typeof value !== "string"
    ) {
      next.append(key, value);
      continue;
    }
    next.append(key, toAsciiDigits(value));
  }
  return next;
}

export function normalizeDigits(input, options = {}) {
  const normalizedOptions = {
    skipKeys: normalizeSkipKeys(options.skipKeys),
  };

  if (input === null || input === undefined) return input;
  if (typeof input === "string") return toAsciiDigits(input);
  if (
    typeof input === "number" ||
    typeof input === "boolean" ||
    typeof input === "bigint" ||
    typeof input === "function"
  ) {
    return input;
  }
  if (input instanceof Date) return input;
  if (typeof Blob !== "undefined" && input instanceof Blob) return input;
  if (typeof File !== "undefined" && input instanceof File) return input;
  if (typeof FileList !== "undefined" && input instanceof FileList) {
    return input;
  }
  if (
    typeof URLSearchParams !== "undefined" &&
    input instanceof URLSearchParams
  ) {
    return normalizeUrlSearchParams(input, normalizedOptions);
  }
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    return normalizeFormData(input, normalizedOptions);
  }
  if (Array.isArray(input)) {
    return input.map((item) => normalizeDigits(item, normalizedOptions));
  }
  if (!isPlainObject(input)) return input;

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (shouldSkipDigitNormalization(key, normalizedOptions.skipKeys)) {
        return [key, value];
      }
      return [key, normalizeDigits(value, normalizedOptions)];
    }),
  );
}

export const normalizeDigitsDeep = normalizeDigits;
export const convertToEnglishNumbers = toAsciiDigits;

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
