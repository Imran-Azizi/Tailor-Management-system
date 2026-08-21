import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuPencil } from "react-icons/lu";
import { Modal } from "../ui/index.jsx";
import {
  CustomerCombinedBill,
  TailorBill,
} from "../order/OrderDocumentPack.jsx";
import {
  BILL_TEXT_SIZE_MAX,
  BILL_TEXT_SIZE_MIN,
  DEFAULT_TENANT_BILL_TEXT_SETTINGS,
  getTenantBillTextSettings,
} from "../../lib/billTypography.js";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function buildPreviewSample(tenant, t) {
  const shopName = tenant?.systemName || tenant?.businessName || t("billTextSize.previewShopName");
  const customerName = t("billTextSize.previewSampleCustomer");
  const createdAt = "2026-08-19T10:30:00.000Z";
  const orderTypeLabel = t("billTextSize.previewSampleOrderType");

  const customer = {
    id: "preview-customer",
    firstName: customerName,
    billNumber: 120,
    phoneNumber: "0700123456",
  };

  const shopMeasurements = {
    height: "150",
    shoulder: "46",
    sleeve: "62",
    neck: "40",
    chest: "52",
    armpit: "24",
    waist: "48",
    skirt: "58",
    tenban: "104",
    pantLeg: "26",
    arm: "34",
    calf: "38",
    neckStyle: t("billTextSize.previewSampleNeckStyle", { defaultValue: "Round" }),
    sleeveStyle: t("billTextSize.previewSampleSleeveStyle", { defaultValue: "Standard" }),
    sleeveSize: "14",
    skirtStyle: t("billTextSize.previewSampleSkirtStyle", { defaultValue: "Straight" }),
    outfitDesign: t("billTextSize.previewSampleDesign", { defaultValue: "Classic" }),
    outfitStyle: orderTypeLabel,
    buttonStyle: t("billTextSize.previewSampleButtonStyle", { defaultValue: "Metal" }),
    pantStyle: t("billTextSize.previewSamplePantStyle", { defaultValue: "Normal" }),
    frontPocket: true,
    sidePocket: true,
    doubleSidePocket: false,
    underPocket: false,
    additionalStyleInfo: t("billTextSize.previewSampleNote", {
      defaultValue: "Please keep sleeve length exact.",
    }),
  };

  const primaryOrder = {
    id: "preview-order-1",
    type: "OUTFIT",
    orderName: customerName,
    quantity: 2,
    totalPrice: 2400,
    discount: 100,
    paidAmount: 1000,
    remaining: 1300,
    createdAt,
    isEmergency: false,
    box: { boxName: "A-12" },
    rakhtColor: t("billTextSize.previewSampleColor", { defaultValue: "Navy" }),
    rakhtColorHex: "#1e3a5f",
    rakhtBrandName: t("billTextSize.previewSampleBrand", { defaultValue: "Premium" }),
    rakhtCompanyName: t("billTextSize.previewSampleCompany", { defaultValue: "Textile Co" }),
    rakhtRequiredMeters: 3.5,
    outfit: shopMeasurements,
    measurements: shopMeasurements,
  };

  const secondaryOrder = {
    id: "preview-order-2",
    type: "WASKAT",
    orderName: t("billTextSize.previewSampleSecondName", { defaultValue: "Romel" }),
    quantity: 1,
    totalPrice: 900,
    discount: 0,
    paidAmount: 400,
    remaining: 500,
    createdAt,
    isEmergency: false,
    box: { boxName: "B-03" },
    rakhtColor: t("billTextSize.previewSampleColor", { defaultValue: "Navy" }),
    rakhtBrandName: t("billTextSize.previewSampleBrand", { defaultValue: "Premium" }),
    rakhtRequiredMeters: 1.25,
  };

  const shop = {
    ...tenant,
    systemName: shopName,
    businessName: shopName,
    address: tenant?.address || t("billTextSize.previewAddress"),
    phone: tenant?.phone || t("billTextSize.previewPhone"),
    mobile: tenant?.mobile || tenant?.phone || t("billTextSize.previewPhone"),
    logoUrl: tenant?.logoUrl || "",
  };

  return {
    customer,
    orders: [primaryOrder, secondaryOrder],
    order: primaryOrder,
    measurements: shopMeasurements,
    shop,
  };
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
            aria-label={t("billTextSize.decrease", { label })}
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
            aria-label={t("billTextSize.increase", { label })}
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
  const sample = useMemo(() => buildPreviewSample(tenant, t), [tenant, t]);
  const liveShop = useMemo(
    () => ({
      ...sample.shop,
      billHeaderTextSize: settings.billHeaderTextSize,
      billBodyTextSize: settings.billBodyTextSize,
      billAmountTextSize: settings.billAmountTextSize,
    }),
    [sample.shop, settings],
  );
  const isShop = mode === "shop";

  return (
    <div
      className={cn(
        "bill-typography-preview-frame overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3 sm:p-4",
        isShop && "bill-typography-preview-frame--shop",
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2",
        )}
      >
        <p className="text-xs font-bold text-[var(--text2)]">
          {isShop ? t("billTextSize.previewShopBill") : t("billTextSize.previewCustomerBill")}
        </p>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text3)]">
          {t("billTextSize.livePreviewHint", {
            defaultValue: "Updates instantly with size controls",
          })}
        </span>
      </div>

      <div
        className={cn(
          "bill-typography-preview-scale mx-auto origin-top",
          isShop && "bill-typography-preview-scale--shop",
        )}
      >
        {isShop ? (
          <TailorBill
            customer={sample.customer}
            order={sample.order}
            measurements={sample.measurements}
            shop={liveShop}
            preview
          />
        ) : (
          <CustomerCombinedBill
            customer={sample.customer}
            orders={sample.orders}
            shop={liveShop}
          />
        )}
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
      maxW={mode === "shop" ? 820 : 760}
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
