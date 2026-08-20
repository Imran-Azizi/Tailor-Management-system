export const BILL_TEXT_SIZE_MIN = 8;
export const BILL_TEXT_SIZE_MAX = 20;

export const DEFAULT_TENANT_BILL_TEXT_SETTINGS = Object.freeze({
  billHeaderTextSize: 14,
  billBodyTextSize: 10.5,
  billAmountTextSize: 11.5,
});

export function normalizeBillTextSize(value, fallback = DEFAULT_TENANT_BILL_TEXT_SETTINGS.billBodyTextSize) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number(fallback);
  const clamped = Math.min(Math.max(parsed, BILL_TEXT_SIZE_MIN), BILL_TEXT_SIZE_MAX);
  return Number(clamped.toFixed(1));
}

export function getTenantBillTextSettings(tenant = {}) {
  const values = tenant && typeof tenant === "object" ? tenant : {};
  return {
    billHeaderTextSize: normalizeBillTextSize(values.billHeaderTextSize, DEFAULT_TENANT_BILL_TEXT_SETTINGS.billHeaderTextSize),
    billBodyTextSize: normalizeBillTextSize(values.billBodyTextSize, DEFAULT_TENANT_BILL_TEXT_SETTINGS.billBodyTextSize),
    billAmountTextSize: normalizeBillTextSize(values.billAmountTextSize, DEFAULT_TENANT_BILL_TEXT_SETTINGS.billAmountTextSize),
  };
}

export function getTenantBillTextStyle(tenant = {}) {
  const settings = getTenantBillTextSettings(tenant);
  return {
    "--bill-header-font-size": `${settings.billHeaderTextSize}px`,
    "--bill-body-font-size": `${settings.billBodyTextSize}px`,
    "--bill-amount-font-size": `${settings.billAmountTextSize}px`,
  };
}

/** Merge tenant/shop sources so branding and bill typography both resolve. */
export function mergePrintShopSources(...sources) {
  const objects = sources.filter((source) => source && typeof source === "object");
  if (!objects.length) return null;
  return Object.assign({}, ...objects);
}

/** Root bill sheet style: tenant CSS vars + language/RTL typography. */
export function buildBillTypographyStyle(shop, billSettings = {}) {
  return {
    ...getTenantBillTextStyle(shop),
    fontFamily: billSettings.fontFamily,
    ...(billSettings.isRtl
      ? {
          textAlign: "right",
          letterSpacing: "0",
          wordSpacing: "0",
          fontFeatureSettings: '"rlig" 1, "liga" 1, "calt" 1',
        }
      : {}),
  };
}
