import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuPencil } from "react-icons/lu";
import { Modal } from "../ui/index.jsx";
import {
  BILL_TEXT_SIZE_MAX,
  BILL_TEXT_SIZE_MIN,
  DEFAULT_TENANT_BILL_TEXT_SETTINGS,
  getTenantBillTextSettings,
  getTenantBillTextStyle,
} from "../../lib/billTypography.js";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function BillTextSizeControl({ label, value, onChange, isRtl, disabled }) {
  const { t } = useTranslation();
  const nextValue = Number(value ?? DEFAULT_TENANT_BILL_TEXT_SETTINGS.billBodyTextSize);

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-xs font-bold text-[var(--text2)]", !isRtl && "uppercase tracking-wide")}>
          {label}
        </span>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
          <button
            type="button"
            className="btn btn-outline btn-xs h-8 w-8 rounded-full p-0"
            onClick={() => onChange(Number((nextValue - 0.5).toFixed(1)))}
            disabled={disabled || nextValue <= BILL_TEXT_SIZE_MIN}
            aria-label={t("billTextSize.decrease", { label, defaultValue: "Decrease {{label}}" })}
          >
            −
          </button>
          <span className="min-w-[52px] text-center text-sm font-bold text-[var(--text1)]">
            {nextValue.toFixed(1)}px
          </span>
          <button
            type="button"
            className="btn btn-outline btn-xs h-8 w-8 rounded-full p-0"
            onClick={() => onChange(Number((nextValue + 0.5).toFixed(1)))}
            disabled={disabled || nextValue >= BILL_TEXT_SIZE_MAX}
            aria-label={t("billTextSize.increase", { label, defaultValue: "Increase {{label}}" })}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export function BillTextSizeActionButton({ label, title, onClick, disabled, isRtl }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[11px] font-semibold text-[var(--text1)] shadow-[var(--sh-sm)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--border2)] hover:bg-[var(--surface2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:text-[12px]",
        isRtl ? "flex-row-reverse" : "",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <LuPencil size={12} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function BillTypographyPreview({ settings, tenant, mode, isRtl }) {
  const { t } = useTranslation();
  const shopName = tenant?.systemName || tenant?.businessName || t("billTextSize.previewShopName");
  const isShop = mode === "shop";
  const sheetClass = isShop
    ? "print-a6-sheet print-bill-sheet print-shop-bill overflow-hidden bg-white"
    : "print-a6-sheet print-bill-sheet print-customer-bill overflow-hidden bg-white";
  const metaSize = `${Math.max(8, settings.billBodyTextSize - 1.5)}px`;
  const thSize = `${Math.max(8, settings.billBodyTextSize - 1)}px`;
  const footerSize = `${Math.max(8, settings.billBodyTextSize - 1)}px`;
  const footerDateSize = `${Math.max(8, settings.billBodyTextSize - 1.5)}px`;

  return (
    <div
      className={sheetClass}
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        ...getTenantBillTextStyle(settings),
        fontFamily: "'Inter','Noto Naskh Arabic','Noto Sans Arabic',sans-serif",
      }}
    >
      <div className={cn("print-bill-header", isRtl ? "print-bill-header--rtl" : "print-bill-header--ltr")}>
        <div className="print-bill-header-body">
          <div className="print-bill-header-brand">
            <div className="print-bill-header-logo">
              <div className="print-bill-header-logo-fallback">TS</div>
            </div>
            <div className="print-bill-header-shop">
              <p
                className="print-bill-header-name print-bill-header-info-row"
                style={{ fontSize: `${settings.billHeaderTextSize}px` }}
              >
                <span className="print-bill-header-info-text">{shopName}</span>
              </p>
              <p className="print-bill-header-meta print-bill-header-address" style={{ fontSize: metaSize }}>
                {t("billTextSize.previewAddress")} • {t("billTextSize.previewPhone")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isShop ? (
        <div className="print-bill-table-wrap px-2 py-2">
          <table
            className="w-full border-collapse table-fixed"
            style={{ fontSize: `${settings.billBodyTextSize}px` }}
          >
            <thead>
              <tr>
                <th className="px-1.5 py-1 text-start" style={{ fontSize: thSize }}>
                  {t("billTextSize.previewOrderType")}
                </th>
                <th className="px-1.5 py-1 text-start" style={{ fontSize: thSize }}>
                  {t("billTextSize.previewQty")}
                </th>
                <th className="px-1.5 py-1 text-start" style={{ fontSize: thSize }}>
                  {t("billTextSize.previewTotal")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-1.5 py-1" style={{ fontSize: `${settings.billBodyTextSize}px` }}>
                  {t("billTextSize.previewSampleOrderType")}
                </td>
                <td className="px-1.5 py-1 text-center" style={{ fontSize: `${settings.billBodyTextSize}px` }}>
                  2
                </td>
                <td
                  className="px-1.5 py-1 text-end"
                  style={{ fontSize: `${settings.billAmountTextSize}px`, fontWeight: 800 }}
                >
                  {t("billTextSize.previewSampleAmount")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="print-customer-combined-wrap print-bill-table-wrap">
          <table
            className="print-customer-combined-table print-reference-detail-table w-full border-collapse table-fixed"
            style={{ fontSize: `${settings.billBodyTextSize}px` }}
          >
            <thead>
              <tr>
                <th className="px-1.5 py-1 text-start" style={{ fontSize: thSize }}>
                  {t("billTextSize.previewBillNo")}
                </th>
                <th className="px-1.5 py-1 text-start" style={{ fontSize: thSize }}>
                  {t("billTextSize.previewCustomer")}
                </th>
                <th className="px-1.5 py-1 text-start" style={{ fontSize: thSize }}>
                  {t("billTextSize.previewQty")}
                </th>
                <th className="px-1.5 py-1 text-start" style={{ fontSize: thSize }}>
                  {t("billTextSize.previewTotal")}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-1.5 py-1" style={{ fontSize: `${settings.billBodyTextSize}px` }}>
                  #120
                </td>
                <td className="px-1.5 py-1" style={{ fontSize: `${settings.billBodyTextSize}px` }}>
                  {t("billTextSize.previewSampleCustomer")}
                </td>
                <td className="px-1.5 py-1 text-center" style={{ fontSize: `${settings.billBodyTextSize}px` }}>
                  2
                </td>
                <td
                  className="px-1.5 py-1 text-end"
                  style={{ fontSize: `${settings.billAmountTextSize}px`, fontWeight: 800 }}
                >
                  {t("billTextSize.previewSampleAmount")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className={cn("print-bill-footer", isRtl ? "print-bill-footer--rtl" : "print-bill-footer--ltr")}>
        <div className="print-bill-footer-body">
          <span className="print-bill-footer-badge" style={{ fontSize: footerSize }}>
            {isShop ? t("billTextSize.shopBillBadge") : t("billTextSize.customerBillBadge")}
          </span>
          <div className="print-bill-footer-datetime">
            <span className="print-bill-footer-datetime-item" style={{ fontSize: footerDateSize }}>
              2026/08/19
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BillTypographySettingsPanel({
  settings,
  onChange,
  tenant,
  mode = "customer",
  isRtl,
  disabled = false,
  showPreview = true,
}) {
  const { t } = useTranslation();

  const updateSetting = (key, value) => {
    const safeValue = Number(value);
    if (!Number.isFinite(safeValue)) return;
    const clamped = Math.min(Math.max(safeValue, BILL_TEXT_SIZE_MIN), BILL_TEXT_SIZE_MAX);
    onChange({ ...settings, [key]: Number(clamped.toFixed(1)) });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3">
        <BillTextSizeControl
          label={t("billTextSize.header")}
          value={settings.billHeaderTextSize}
          onChange={(value) => updateSetting("billHeaderTextSize", value)}
          isRtl={isRtl}
          disabled={disabled}
        />
        <BillTextSizeControl
          label={t("billTextSize.body")}
          value={settings.billBodyTextSize}
          onChange={(value) => updateSetting("billBodyTextSize", value)}
          isRtl={isRtl}
          disabled={disabled}
        />
        <BillTextSizeControl
          label={t("billTextSize.amount")}
          value={settings.billAmountTextSize}
          onChange={(value) => updateSetting("billAmountTextSize", value)}
          isRtl={isRtl}
          disabled={disabled}
        />
      </div>

      {showPreview ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3">
          <p
            className={cn(
              "mb-2 text-xs font-bold text-[var(--text3)]",
              !isRtl && "uppercase tracking-[0.12em]",
            )}
          >
            {mode === "shop" ? t("billTextSize.previewShopBill") : t("billTextSize.previewCustomerBill")}
          </p>
          <BillTypographyPreview settings={settings} tenant={tenant} mode={mode} isRtl={isRtl} />
        </div>
      ) : null}
    </div>
  );
}

export function BillTypographySettingsModal({
  open,
  tenant,
  mode = "customer",
  onClose,
  onSave,
  isSaving,
  isRtl,
}) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(getTenantBillTextSettings(tenant));
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!open) return;
    const baseline = getTenantBillTextSettings(tenant);
    setSettings(baseline);
    setHasChanges(false);
  }, [open, tenant]);

  const handleChange = (next) => {
    setSettings(next);
    setHasChanges(JSON.stringify(next) !== JSON.stringify(getTenantBillTextSettings(tenant)));
  };

  const resetToDefault = () => {
    const defaultSettings = { ...DEFAULT_TENANT_BILL_TEXT_SETTINGS };
    setSettings(defaultSettings);
    setHasChanges(JSON.stringify(defaultSettings) !== JSON.stringify(getTenantBillTextSettings(tenant)));
  };

  const save = () => {
    onSave({
      billHeaderTextSize: settings.billHeaderTextSize,
      billBodyTextSize: settings.billBodyTextSize,
      billAmountTextSize: settings.billAmountTextSize,
    });
  };

  if (!open || !tenant) return null;

  const modalTitle =
    mode === "shop" ? t("billTextSize.shopTitle") : t("billTextSize.customerTitle");

  return (
    <Modal
      open={open}
      onClose={isSaving ? () => {} : onClose}
      title={modalTitle}
      maxW={620}
      boxClassName="superadmin-modal"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="space-y-5 p-1">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface2)] p-4">
          <p className="text-sm font-bold text-[var(--text1)]">
            {tenant.systemName || tenant.businessName}
          </p>
          <p className="mt-1 text-xs text-[var(--text3)]">{t("billTextSize.help")}</p>
        </div>

        <BillTypographySettingsPanel
          settings={settings}
          onChange={handleChange}
          tenant={tenant}
          mode={mode}
          isRtl={isRtl}
          disabled={isSaving}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-outline" onClick={resetToDefault} disabled={isSaving}>
            {t("common.reset")}
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={isSaving || !hasChanges}>
            {isSaving ? t("common.saving") : t("common.apply")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
