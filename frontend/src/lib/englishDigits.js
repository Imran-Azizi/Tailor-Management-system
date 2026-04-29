import { toAsciiDigits } from "./normalize.js";

let localePatched = false;
let inputNormalizerInstalled = false;

function appendLatinDigitsExtension(locale) {
  const base = String(locale || "en-US");
  if (/[-_]u-/.test(base)) {
    if (/\bnu-latn\b/.test(base)) return base;
    return `${base}-nu-latn`;
  }
  return `${base}-u-nu-latn`;
}

function normalizeLocales(locales) {
  if (Array.isArray(locales)) {
    return locales.map((locale) => appendLatinDigitsExtension(locale));
  }
  return appendLatinDigitsExtension(locales || "en-US");
}

export function enforceEnglishDigits(output) {
  return toAsciiDigits(output);
}

export function patchLocaleFormatters() {
  if (localePatched || typeof window === "undefined") return;
  localePatched = true;

  const originalNumberToLocaleString = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function patchedNumberToLocaleString(
    locales,
    options,
  ) {
    const rendered = originalNumberToLocaleString.call(
      this,
      normalizeLocales(locales),
      options,
    );
    return enforceEnglishDigits(rendered);
  };

  if (typeof BigInt !== "undefined") {
    const originalBigIntToLocaleString = BigInt.prototype.toLocaleString;
    BigInt.prototype.toLocaleString = function patchedBigIntToLocaleString(
      locales,
      options,
    ) {
      const rendered = originalBigIntToLocaleString.call(
        this,
        normalizeLocales(locales),
        options,
      );
      return enforceEnglishDigits(rendered);
    };
  }

  const originalDateToLocaleString = Date.prototype.toLocaleString;
  const originalDateToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalDateToLocaleTimeString = Date.prototype.toLocaleTimeString;

  Date.prototype.toLocaleString = function patchedDateToLocaleString(
    locales,
    options,
  ) {
    const rendered = originalDateToLocaleString.call(
      this,
      normalizeLocales(locales),
      options,
    );
    return enforceEnglishDigits(rendered);
  };

  Date.prototype.toLocaleDateString = function patchedDateToLocaleDateString(
    locales,
    options,
  ) {
    const rendered = originalDateToLocaleDateString.call(
      this,
      normalizeLocales(locales),
      options,
    );
    return enforceEnglishDigits(rendered);
  };

  Date.prototype.toLocaleTimeString = function patchedDateToLocaleTimeString(
    locales,
    options,
  ) {
    const rendered = originalDateToLocaleTimeString.call(
      this,
      normalizeLocales(locales),
      options,
    );
    return enforceEnglishDigits(rendered);
  };
}

function normalizeInputElementDigits(element) {
  if (!element || typeof element.value !== "string") return;

  const nextValue = toAsciiDigits(element.value);
  if (nextValue === element.value) return;

  const start = element.selectionStart;
  const end = element.selectionEnd;
  element.value = nextValue;

  if (typeof start === "number" && typeof end === "number") {
    try {
      element.setSelectionRange(start, end);
    } catch {
      // Some input types do not support setSelectionRange.
    }
  }

  // Keep React controlled inputs in sync.
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

export function installEnglishDigitInputNormalizer() {
  if (inputNormalizerInstalled || typeof window === "undefined") return;
  inputNormalizerInstalled = true;

  const handler = (event) => {
    const target = event?.target;
    if (
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }
    normalizeInputElementDigits(target);
  };

  document.addEventListener("input", handler, true);
  document.addEventListener("change", handler, true);
  document.addEventListener("paste", () => {
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement
    ) {
      window.setTimeout(() => normalizeInputElementDigits(active), 0);
    }
  });
}
