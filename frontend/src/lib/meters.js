export function formatMeters(value) {
  if (value === null || value === undefined || value === "") return "-";

  const raw = String(value).trim().replace(/,/g, "");
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return "-";

  const normalized = /e/i.test(raw) ? numeric.toString() : raw;
  return normalized
    .replace(/^\+/, "")
    .replace(/^(-?)\./, "$10.")
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}
