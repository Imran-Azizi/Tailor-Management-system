  function normalizeLanguage(language) {
  const lang = String(language || "en").toLowerCase();
  if (lang.startsWith("pashto") || lang.startsWith("ps")) return "pashto";
  if (lang.startsWith("dari") || lang.startsWith("fa")) return "dari";
  return "en";
}

export function getCurrencyToken(language) {
  return "AF";
}

export function formatCurrency(
  value,
  language,
  {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    trimTrailingZeros = true,
  } = {},
) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  const minDigits = Number.isFinite(minimumFractionDigits)
    ? Math.max(0, Number(minimumFractionDigits))
    : 0;
  const maxDigitsCandidate = Number.isFinite(maximumFractionDigits)
    ? Math.max(0, Number(maximumFractionDigits))
    : minDigits;
  const maxDigits = Math.max(maxDigitsCandidate, minDigits);

  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: trimTrailingZeros ? 0 : minDigits,
    maximumFractionDigits: maxDigits,
  }).format(safeAmount);
  const token = getCurrencyToken(language);

  const normalizedLanguage = normalizeLanguage(language);
  const isRtlLang =
    normalizedLanguage === "dari" || normalizedLanguage === "pashto";

  // For RTL languages (Dari/Pashto), ensure the minus sign stays on the left
  // by wrapping the number with LTR mark and using proper directional isolation.
  // The LTR mark (U+200E) forces the number and minus sign to be treated as LTR,
  // preventing the bidi algorithm from moving the minus sign to the right.
  if (isRtlLang) {
    return `\u200E${number} ${token}`;
  }

  return `${number} ${token}`;
}
