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
  { minimumFractionDigits = 0, maximumFractionDigits = 0 } = {},
) {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(safeAmount);
  const token = getCurrencyToken(language);

  return `${number} ${token}`;
}
