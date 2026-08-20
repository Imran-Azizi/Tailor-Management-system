import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuBuilding2,
  LuCircleCheck,
  LuEye,
  LuEyeOff,
  LuImage,
  LuLockKeyhole,
  LuMapPin,
  LuPhone,
  LuRefreshCw,
  LuSave,
  LuUpload,
  LuUser,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { assetUrl } from "../lib/assets.js";
import { getTenantBillTextSettings } from "../lib/billTypography.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { BillTypographySettingsPanel } from "../components/bill/BillTypographyControls.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isRtlLanguage } from "../lib/locale.js";
import PwaInstallPanel from "../components/pwa/PwaInstallPanel.jsx";

const emptyForm = {
  systemName: "",
  address: "",
  phone: "",
  mobile: "",
  logoUrl: "",
  logoFile: null,
  removeLogo: false,
  ownerName: "",
  ownerPhone: "",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const logoTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
const logoMaxBytes = 2 * 1024 * 1024;

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fileToLogoUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve({
        fileName: file.name,
        mimeType: file.type,
        data: result.includes(",") ? result.split(",").pop() : result,
      });
    };
    reader.onerror = () => reject(new Error("Could not read logo file."));
    reader.readAsDataURL(file);
  });
}

function normalizeForm(settings) {
  return {
    ...emptyForm,
    systemName: settings?.systemName || "",
    address: settings?.address || "",
    phone: settings?.phone || "",
    mobile: settings?.mobile || "",
    logoUrl: settings?.logoUrl || "",
    ownerName: settings?.owner?.name || "",
    ownerPhone: settings?.owner?.phoneNumber || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

function validate(form, t) {
  const errors = {};
  if (!form.systemName.trim()) errors.systemName = t("tenantSettings.validation.systemName");
  if (!form.ownerName.trim()) errors.ownerName = t("tenantSettings.validation.ownerName");
  if (!form.ownerPhone.trim()) errors.ownerPhone = t("tenantSettings.validation.ownerPhone");
  if (form.currentPassword || form.newPassword || form.confirmPassword) {
    if (!form.currentPassword) errors.currentPassword = t("tenantSettings.validation.currentPassword");
    if (!form.newPassword) errors.newPassword = t("tenantSettings.validation.newPassword");
    if (form.newPassword && form.newPassword.length < 6) {
      errors.newPassword = t("tenantSettings.validation.passwordLength");
    }
    if (form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = t("tenantSettings.validation.passwordMatch");
    }
  }
  if (form.logoFile) {
    if (!logoTypes.includes(form.logoFile.type)) {
      errors.logoFile = t("tenantSettings.validation.logoType");
    } else if (form.logoFile.size > logoMaxBytes) {
      errors.logoFile = t("tenantSettings.validation.logoSize");
    }
  }
  return errors;
}

function TextareaField({ icon: Icon, label, error, isRtl, rows = 4, className, ...textareaProps }) {
  return (
    <label
      className={cn(
        "tenant-settings-field tenant-settings-address-field flex min-w-0 flex-col gap-1.5 sm:col-span-2",
        className,
      )}
    >
      <span className={cn("text-xs font-bold text-[var(--text2)]", !isRtl && "uppercase tracking-wide")}>
        {label}
      </span>
      <span className="relative block">
        <Icon
          size={15}
          className="pointer-events-none absolute text-[var(--text3)]"
          style={isRtl ? { insetInlineEnd: 12, top: 12 } : { insetInlineStart: 12, top: 12 }}
        />
        <textarea
          className={cn("inp w-full resize-y leading-relaxed", error && "err")}
          rows={rows}
          aria-invalid={error ? "true" : undefined}
          dir={isRtl ? "rtl" : "ltr"}
          style={
            isRtl
              ? {
                  paddingInlineStart: 12,
                  paddingInlineEnd: 38,
                  paddingBlock: 12,
                  textAlign: "right",
                  unicodeBidi: "plaintext",
                }
              : { paddingInlineStart: 38, paddingBlock: 12 }
          }
          {...textareaProps}
        />
      </span>
      {error ? (
        <span className="err-msg" role="alert" aria-live="polite">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function Field({ icon: Icon, label, error, isRtl, ...inputProps }) {
  const isReadableLtr = inputProps.inputMode === "tel";
  return (
    <label className="tenant-settings-field flex min-w-0 flex-col gap-1.5">
      <span className={cn("text-xs font-bold text-[var(--text2)]", !isRtl && "uppercase tracking-wide")}>
        {label}
      </span>
      <span className="relative block">
        <Icon
          size={15}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text3)]"
          style={isRtl ? { insetInlineEnd: 12 } : { insetInlineStart: 12 }}
        />
        <input
          className={cn("inp w-full", error && "err")}
          aria-invalid={error ? "true" : undefined}
          dir={isRtl ? (isReadableLtr ? "ltr" : "rtl") : "ltr"}
          style={
            isRtl
              ? {
                  paddingInlineStart: 12,
                  paddingInlineEnd: 38,
                  textAlign: "right",
                  unicodeBidi: "plaintext",
                }
              : { paddingInlineStart: 38 }
          }
          {...inputProps}
        />
      </span>
      {error ? (
        <span className="err-msg" role="alert" aria-live="polite">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function PasswordField({
  icon: Icon,
  label,
  error,
  isRtl,
  visible,
  onToggleVisible,
  showLabel,
  hideLabel,
  ...inputProps
}) {
  return (
    <label className="tenant-settings-field flex min-w-0 flex-col gap-1.5">
      <span className={cn("text-xs font-bold text-[var(--text2)]", !isRtl && "uppercase tracking-wide")}>
        {label}
      </span>
      <span className="relative block">
        <Icon
          size={15}
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text3)]"
          style={isRtl ? { insetInlineEnd: 12 } : { insetInlineStart: 12 }}
        />
        <input
          className={cn("inp w-full", error && "err")}
          aria-invalid={error ? "true" : undefined}
          type={visible ? "text" : "password"}
          dir={isRtl ? "ltr" : "ltr"}
          style={
            isRtl
              ? {
                  paddingInlineStart: 42,
                  paddingInlineEnd: 38,
                  textAlign: "right",
                  unicodeBidi: "plaintext",
                }
              : { paddingInlineStart: 38, paddingInlineEnd: 42 }
          }
          autoComplete="new-password"
          {...inputProps}
        />
        <button
          type="button"
          className="absolute top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text3)] transition hover:bg-[var(--surface2)] hover:text-[var(--text1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          style={isRtl ? { insetInlineStart: 6 } : { insetInlineEnd: 6 }}
          onClick={onToggleVisible}
          disabled={inputProps.disabled}
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <LuEyeOff size={16} /> : <LuEye size={16} />}
        </button>
      </span>
      {error ? (
        <span className="err-msg" role="alert" aria-live="polite">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export default function TenantSettings() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isRtlLanguage(language);
  const qc = useQueryClient();
  const { user, loading: authLoading, updateTenant, updateUser } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState("");
  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [billPreviewMode, setBillPreviewMode] = useState("customer");
  const [billTypography, setBillTypography] = useState(() => getTenantBillTextSettings());

  const {
    data: settings,
    error: loadError,
    isError,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["tenant-settings", user?.tenantId],
    queryFn: () => api.get("/tenants/me/settings").then((r) => r.data),
    enabled: !authLoading && Boolean(user?.tenantId),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (settings) {
      setForm(normalizeForm(settings));
      setBillTypography(getTenantBillTextSettings(settings));
      setErrors({});
    }
  }, [settings]);

  useEffect(() => {
    if (!form.logoFile) {
      setLogoPreview("");
      return undefined;
    }
    const nextUrl = URL.createObjectURL(form.logoFile);
    setLogoPreview(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [form.logoFile]);

  const visibleLogo = logoPreview || (!form.removeLogo ? assetUrl(form.logoUrl) : "");
  const hasChanges = useMemo(() => {
    if (!settings) return false;
    const base = normalizeForm(settings);
    const baseBillTypography = getTenantBillTextSettings(settings);
    return (
      ["systemName", "address", "phone", "mobile"].some(
        (key) => (form[key] || "") !== (base[key] || ""),
      ) ||
      ["ownerName", "ownerPhone"].some((key) => (form[key] || "") !== (base[key] || "")) ||
      Boolean(form.currentPassword || form.newPassword || form.confirmPassword) ||
      Boolean(form.logoFile) ||
      Boolean(form.removeLogo) ||
      JSON.stringify(billTypography) !== JSON.stringify(baseBillTypography)
    );
  }, [form, settings, billTypography]);

  const updateMut = useMutation({
    mutationFn: (payload) => api.put("/tenants/me/settings", payload),
    onSuccess: ({ data }) => {
      toast.success(t("tenantSettings.toast.saved"));
      qc.setQueryData(["tenant-settings", user?.tenantId], data);
      updateTenant(data);
      if (data?.owner) {
        updateUser({
          name: data.owner.name,
          phoneNumber: data.owner.phoneNumber,
        });
      }
      document.title = data.systemName || "Tailoring Management System";
      setForm(normalizeForm(data));
      setErrors({});
      setPasswordVisibility({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
      });
    },
    onError: (error) => {
      if (error?.response?.data?.code === "INVALID_CURRENT_PASSWORD") {
        setErrors((prev) => ({
          ...prev,
          currentPassword: t("tenantSettings.validation.invalidCurrentPassword"),
        }));
        return;
      }
      if (error?.response?.data?.code === "PHONE_IN_USE") {
        setErrors((prev) => ({
          ...prev,
          ownerPhone: t("tenantSettings.validation.phoneInUse"),
        }));
        return;
      }
      toast.error(getApiErrorMessage(error, t("tenantSettings.toast.saveFailed")));
    },
  });

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (updateMut.isPending) return;
    const nextErrors = validate(form, t);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const payload = {
      systemName: form.systemName.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      mobile: form.mobile.trim(),
      ownerName: form.ownerName.trim(),
      ownerPhone: form.ownerPhone.trim(),
      billHeaderTextSize: billTypography.billHeaderTextSize,
      billBodyTextSize: billTypography.billBodyTextSize,
      billAmountTextSize: billTypography.billAmountTextSize,
    };
    if (form.currentPassword || form.newPassword || form.confirmPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
      payload.confirmPassword = form.confirmPassword;
    }
    if (form.logoFile) {
      payload.logoUpload = await fileToLogoUpload(form.logoFile);
    } else if (form.removeLogo) {
      payload.removeLogo = true;
    }
    updateMut.mutate(payload);
  };

  if (authLoading || isLoading) {
    return (
      <div className={cn("page tenant-settings-page", isRtl ? "text-right" : "text-left")} dir={isRtl ? "rtl" : "ltr"}>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-sm font-semibold text-[var(--text2)]">
          {t("tenantSettings.loading")}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("page tenant-settings-page", isRtl ? "text-right" : "text-left")} dir={isRtl ? "rtl" : "ltr"}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          <h1 className="text-base font-bold">{t("tenantSettings.errorTitle")}</h1>
          <p className="mt-1">
            {getApiErrorMessage(loadError, t("tenantSettings.toast.loadFailed"))}
          </p>
          <button
            type="button"
            className="btn btn-outline mt-4"
            onClick={() => qc.invalidateQueries({ queryKey: ["tenant-settings", user?.tenantId] })}
          >
            <LuRefreshCw size={15} />
            {t("tenantSettings.refresh")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-var(--nav-h,0px))] bg-[var(--bg)] px-4 py-5 sm:px-6 lg:px-8",
        "tenant-settings-page",
        isRtl ? "text-right" : "text-left",
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,.65)] sm:p-6">
          <div className="tenant-settings-hero-row flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className={cn("inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200", !isRtl && "uppercase tracking-[0.14em]")}>
                <LuCircleCheck size={13} />
                {t("tenantSettings.badge")}
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text1)] sm:text-3xl">
                {t("tenantSettings.title")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text3)]">
                {t("tenantSettings.subtitle")}
              </p>
            </div>
            <button
              type="button"
              className="tenant-settings-refresh-btn btn btn-outline h-10"
              onClick={() => qc.invalidateQueries({ queryKey: ["tenant-settings", user?.tenantId] })}
              disabled={isFetching || updateMut.isPending}
            >
              <LuRefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
              {t("tenantSettings.refresh")}
            </button>
          </div>
        </section>

        <PwaInstallPanel />

        <form onSubmit={submit} className="tenant-settings-form-grid grid grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,.65)]">
            <div className="tenant-settings-section-head flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <LuImage size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text1)]">{t("tenantSettings.branding.title")}</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text3)]">{t("tenantSettings.branding.subtitle")}</p>
              </div>
            </div>

            <div className="tenant-settings-logo-card mt-5 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)] p-4">
              <div className="tenant-settings-logo-preview flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text3)]">
                  {visibleLogo ? (
                    <img src={visibleLogo} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <LuBuilding2 size={32} />
                  )}
                </div>
                <p className="mt-3 max-w-full truncate text-sm font-bold text-[var(--text1)]">
                  {form.logoFile?.name || (visibleLogo ? t("tenantSettings.logo.current") : t("tenantSettings.logo.empty"))}
                </p>
                <p className="mt-1 text-xs text-[var(--text3)]">{t("tenantSettings.logo.allowed")}</p>
              </div>

              <div className="tenant-settings-logo-actions mt-4 flex flex-col gap-2 sm:flex-row">
                <label className="btn btn-outline flex-1 cursor-pointer justify-center">
                  <LuUpload size={15} />
                  {visibleLogo ? t("tenantSettings.logo.replace") : t("tenantSettings.logo.upload")}
                  <input
                    type="file"
                    className="sr-only"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    disabled={updateMut.isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setValue("logoFile", file);
                      setValue("removeLogo", false);
                      event.target.value = "";
                    }}
                  />
                </label>
                {visibleLogo ? (
                  <button
                    type="button"
                    className="btn btn-outline flex-1 justify-center"
                    onClick={() => {
                      setValue("logoFile", null);
                      setValue("removeLogo", true);
                    }}
                    disabled={updateMut.isPending}
                  >
                    <LuX size={15} />
                    {t("tenantSettings.logo.remove")}
                  </button>
                ) : null}
              </div>
              {errors.logoFile ? (
                <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-300">{errors.logoFile}</p>
              ) : null}
            </div>

          </section>

          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_45px_-34px_rgba(15,23,42,.65)]">
            <div className="border-b border-[var(--border)] bg-[var(--surface2)] px-5 py-4">
              <h2 className="text-base font-bold text-[var(--text1)]">{t("tenantSettings.business.title")}</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--text3)]">{t("tenantSettings.business.subtitle")}</p>
            </div>

            <div className="tenant-settings-fields-grid grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field
                icon={LuBuilding2}
                label={t("tenantSettings.fields.systemName")}
                value={form.systemName}
                onChange={(event) => setValue("systemName", event.target.value)}
                error={errors.systemName}
                disabled={updateMut.isPending}
                isRtl={isRtl}
              />
              <Field
                icon={LuPhone}
                label={t("tenantSettings.fields.phone")}
                value={form.phone}
                onChange={(event) => setValue("phone", event.target.value)}
                disabled={updateMut.isPending}
                isRtl={isRtl}
                inputMode="tel"
              />
              <Field
                icon={LuPhone}
                label={t("tenantSettings.fields.mobile")}
                value={form.mobile}
                onChange={(event) => setValue("mobile", event.target.value)}
                disabled={updateMut.isPending}
                isRtl={isRtl}
                inputMode="tel"
              />
              <TextareaField
                icon={LuMapPin}
                label={t("tenantSettings.fields.address")}
                value={form.address}
                onChange={(event) => setValue("address", event.target.value)}
                disabled={updateMut.isPending}
                isRtl={isRtl}
                placeholder={t("tenantSettings.fields.addressPlaceholder")}
              />
            </div>

            <div className="border-t border-[var(--border)] bg-[var(--surface)]">
              <div className="tenant-settings-section-head border-b border-[var(--border)] bg-[var(--surface2)] px-5 py-4">
                <h2 className="text-base font-bold text-[var(--text1)]">
                  {t("tenantSettings.billTypography.title")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text3)]">
                  {t("tenantSettings.billTypography.subtitle")}
                </p>
                <div className="mt-3 inline-flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
                  {[
                    ["customer", t("tenantSettings.billTypography.customerPreview")],
                    ["shop", t("tenantSettings.billTypography.shopPreview")],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                        billPreviewMode === mode
                          ? "bg-[var(--primary)] text-white shadow-[var(--sh-sm)]"
                          : "text-[var(--text2)] hover:bg-[var(--surface2)]",
                      )}
                      onClick={() => setBillPreviewMode(mode)}
                      disabled={updateMut.isPending}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-5">
                <BillTypographySettingsPanel
                  settings={billTypography}
                  onChange={setBillTypography}
                  tenant={settings}
                  mode={billPreviewMode}
                  isRtl={isRtl}
                  disabled={updateMut.isPending}
                />
              </div>
            </div>

            <div className="border-t border-[var(--border)] bg-[var(--surface)]">
              <div className="tenant-settings-section-head flex items-start gap-3 border-b border-[var(--border)] bg-[var(--surface2)] px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <LuUser size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text1)]">
                    {t("tenantSettings.owner.title")}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--text3)]">
                    {t("tenantSettings.owner.subtitle")}
                  </p>
                </div>
              </div>
              <div className="tenant-settings-fields-grid grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field
                  icon={LuUser}
                  label={t("tenantSettings.fields.ownerName")}
                  value={form.ownerName}
                  onChange={(event) => setValue("ownerName", event.target.value)}
                  error={errors.ownerName}
                  disabled={updateMut.isPending}
                  isRtl={isRtl}
                />
                <Field
                  icon={LuPhone}
                  label={t("tenantSettings.fields.ownerPhone")}
                  value={form.ownerPhone}
                  onChange={(event) => setValue("ownerPhone", event.target.value)}
                  error={errors.ownerPhone}
                  disabled={updateMut.isPending}
                  isRtl={isRtl}
                  inputMode="tel"
                />
                <PasswordField
                  icon={LuLockKeyhole}
                  label={t("tenantSettings.fields.currentPassword")}
                  value={form.currentPassword}
                  onChange={(event) => setValue("currentPassword", event.target.value)}
                  error={errors.currentPassword}
                  disabled={updateMut.isPending}
                  isRtl={isRtl}
                  visible={passwordVisibility.currentPassword}
                  showLabel={t("tenantSettings.showPassword")}
                  hideLabel={t("tenantSettings.hidePassword")}
                  onToggleVisible={() =>
                    setPasswordVisibility((prev) => ({
                      ...prev,
                      currentPassword: !prev.currentPassword,
                    }))
                  }
                />
                <PasswordField
                  icon={LuLockKeyhole}
                  label={t("tenantSettings.fields.newPassword")}
                  value={form.newPassword}
                  onChange={(event) => setValue("newPassword", event.target.value)}
                  error={errors.newPassword}
                  disabled={updateMut.isPending}
                  isRtl={isRtl}
                  visible={passwordVisibility.newPassword}
                  showLabel={t("tenantSettings.showPassword")}
                  hideLabel={t("tenantSettings.hidePassword")}
                  onToggleVisible={() =>
                    setPasswordVisibility((prev) => ({
                      ...prev,
                      newPassword: !prev.newPassword,
                    }))
                  }
                />
                <PasswordField
                  icon={LuLockKeyhole}
                  label={t("tenantSettings.fields.confirmPassword")}
                  value={form.confirmPassword}
                  onChange={(event) => setValue("confirmPassword", event.target.value)}
                  error={errors.confirmPassword}
                  disabled={updateMut.isPending}
                  isRtl={isRtl}
                  visible={passwordVisibility.confirmPassword}
                  showLabel={t("tenantSettings.showPassword")}
                  hideLabel={t("tenantSettings.hidePassword")}
                  onToggleVisible={() =>
                    setPasswordVisibility((prev) => ({
                      ...prev,
                      confirmPassword: !prev.confirmPassword,
                    }))
                  }
                />
                <p className="tenant-settings-owner-help rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 sm:col-span-2">
                  {t("tenantSettings.owner.passwordHelp")}
                </p>
              </div>
            </div>

            <div className="tenant-settings-actions flex flex-col-reverse gap-3 border-t border-[var(--border)] bg-[var(--surface2)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[var(--text3)]">
                {hasChanges ? t("tenantSettings.unsaved") : ""}
              </p>
              <button
                className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-600 px-5 text-sm font-semibold text-white shadow-[0_16px_32px_-22px_rgba(5,150,105,0.95)] transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_18px_36px_-20px_rgba(5,150,105,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface2)] active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--surface)] disabled:text-[var(--text3)] disabled:shadow-none sm:min-w-44"
                disabled={updateMut.isPending || !hasChanges}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/15 transition group-hover:bg-white/20 group-disabled:bg-[var(--surface2)]">
                  <LuSave size={15} className={updateMut.isPending ? "animate-pulse" : ""} />
                </span>
                <span>{updateMut.isPending ? t("tenantSettings.saving") : t("tenantSettings.save")}</span>
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
