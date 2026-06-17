import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuBan,
  LuBuilding2,
  LuCircleCheck,
  LuClipboardList,
  LuEye,
  LuEyeOff,
  LuPencil,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuTrash2,
  LuUpload,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { Modal } from "../components/ui/index.jsx";
import { assetUrl } from "../lib/assets.js";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";

const emptyForm = {
  businessName: "",
  systemName: "",
  ownerName: "",
  ownerPhone: "",
  ownerPassword: "",
  address: "",
  phone: "",
  mobile: "",
  email: "",
  logoUrl: "",
  logoFile: null,
  removeLogo: false,
  subscriptionPlan: "TRIAL",
  subscriptionStatus: "TRIAL",
  subscriptionStart: "",
  expiryDate: "",
  isActive: true,
};

const clientOnlyFields = ["logoFile", "logoUrl"];
const logoTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
const logoMaxBytes = 2 * 1024 * 1024;

function formatDateLocale(value, language) {
  if (!value) return "-";
  const locale = language?.startsWith("en")
    ? "en-US"
    : language?.startsWith("pashto")
      ? "ps-AF"
      : "fa-AF";
  return new Date(value).toLocaleDateString(locale);
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function resolveIsRtl(i18n, language) {
  const normalized = String(language || "").toLowerCase();
  return (
    (i18n.dir?.(language) || i18n.dir?.() || "ltr") === "rtl" ||
    normalized.startsWith("fa") ||
    normalized.startsWith("ps") ||
    normalized.includes("dari") ||
    normalized.includes("pashto")
  );
}

function statusTone(status, isActive = true) {
  if (!isActive || status === "SUSPENDED") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200";
  }
  if (status === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
  if (status === "TRIAL") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200";
}

function StatusPill({ status, isActive, t, isRtl = false }) {
  const label = !isActive ? "SUSPENDED" : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        !isRtl && "uppercase tracking-wide",
        statusTone(status, isActive),
      )}
    >
      {t(`superAdmin.status.${label}`, label)}
    </span>
  );
}

function StatTile({ label, value, icon: Icon, accent, isRtl = false }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_35px_-28px_rgba(15,23,42,.45)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cn("text-xs font-semibold text-[var(--text3)]", !isRtl && "uppercase tracking-[0.14em]")}>
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--text1)]">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg border",
            accent,
          )}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function dateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function tenantToForm(tenant) {
  return {
    ...emptyForm,
    businessName: tenant.systemName || tenant.businessName || "",
    systemName: tenant.systemName || "",
    address: tenant.address || "",
    phone: tenant.phone || "",
    mobile: tenant.mobile || "",
    email: tenant.email || "",
    logoUrl: tenant.logoUrl || "",
    ownerName: tenant.owner?.name || "",
    ownerPhone: tenant.owner?.phoneNumber || "",
    ownerPassword: "",
    subscriptionPlan: tenant.subscriptionPlan || "TRIAL",
    subscriptionStatus: tenant.subscriptionStatus || "TRIAL",
    subscriptionStart: dateInputValue(tenant.subscriptionStart),
    expiryDate: dateInputValue(tenant.expiryDate),
    isActive: tenant.isActive !== false,
  };
}

function trimPayload(form, mode) {
  const payload = {};
  for (const [key, value] of Object.entries(form)) {
    if (clientOnlyFields.includes(key)) continue;
    if (key === "businessName") continue;
    if (key === "ownerPassword" && value === "") continue;
    if (value === "") {
      payload[key] = ["expiryDate", "subscriptionStart"].includes(key)
        ? null
        : "";
    } else {
      payload[key] = typeof value === "string" ? value.trim() : value;
    }
  }
  payload.businessName = String(form.systemName || "").trim();
  return payload;
}

function validateTenantForm(form, mode, t) {
  const errors = {};
  if (!form.systemName.trim()) errors.systemName = t("superAdmin.validation.systemName");

  if (!form.ownerName.trim()) errors.ownerName = t("superAdmin.validation.ownerName");
  if (!form.ownerPhone.trim()) errors.ownerPhone = t("superAdmin.validation.ownerPhone");
  if (form.ownerPassword && form.ownerPassword.length < 6) {
    errors.ownerPassword = t("superAdmin.validation.passwordLength");
  }
  if (form.logoFile) {
    if (!logoTypes.includes(form.logoFile.type)) {
      errors.logoFile = t("superAdmin.validation.logoType");
    } else if (form.logoFile.size > logoMaxBytes) {
      errors.logoFile = t("superAdmin.validation.logoSize");
    }
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = t("superAdmin.validation.email");
  }

  return errors;
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

function TenantModal({
  mode,
  open,
  form,
  errors,
  isPending,
  onClose,
  onChange,
  onSubmit,
}) {
  const { t, i18n } = useTranslation();
  const firstInputRef = useRef(null);
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = resolveIsRtl(i18n, language);
  const [logoPreview, setLogoPreview] = useState("");
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 0);
    setShowOwnerPassword(false);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

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

  const fieldGroups = [
    {
      title: "Business",
      fields: [
        ["systemName", t("superAdmin.fields.systemName")],
        ["address", t("superAdmin.fields.address")],
        ["phone", t("superAdmin.fields.phone")],
        ["mobile", t("superAdmin.fields.mobile")],
        ["email", t("superAdmin.fields.email")],
        ["logoFile", t("superAdmin.fields.logoFile")],
      ],
    },
    {
      title: t("superAdmin.groups.subscription"),
      fields: [
        ["subscriptionPlan", t("superAdmin.fields.subscriptionPlan")],
        ["subscriptionStatus", t("superAdmin.fields.subscriptionStatus")],
        ["subscriptionStart", t("superAdmin.fields.subscriptionStart")],
        ["expiryDate", t("superAdmin.fields.expiryDate")],
      ],
    },
  ];
  fieldGroups[0].title = t("superAdmin.groups.business");

  fieldGroups.splice(1, 0, {
    title: t("superAdmin.groups.owner"),
    fields: [
      ["ownerName", t("superAdmin.fields.ownerName")],
      ["ownerPhone", t("superAdmin.fields.ownerPhone")],
      ["ownerPassword", t("superAdmin.fields.ownerPassword")],
    ],
  });

  return (
    <Modal
      open={open}
      onClose={isPending ? () => {} : onClose}
      title={mode === "edit" ? t("superAdmin.editTenant") : t("superAdmin.createTenant")}
      maxW={860}
      boxClassName="!rounded-lg"
      bodyClassName="!p-0"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <form onSubmit={onSubmit} className="flex flex-col">
        <div className="border-b border-[var(--border)] bg-[var(--surface2)] px-5 py-4 sm:px-6">
          <p className="text-sm font-semibold text-[var(--text1)]">
            {mode === "edit" ? t("superAdmin.modalEditSubtitle") : t("superAdmin.modalCreateSubtitle")}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--text3)]">
            {t("superAdmin.modalHelp")}
          </p>
        </div>

        <div className="max-h-[68vh] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-4">
            {fieldGroups.map((group, groupIndex) => (
              <section
                key={group.title}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,.55)]"
              >
                <h3 className="text-sm font-bold text-[var(--text1)]">
                  {group.title}
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.fields.map(([key, label], index) => {
                    const isDate = ["expiryDate", "subscriptionStart"].includes(key);
                    const isPassword = key === "ownerPassword";
                    const isRequired =
                      key === "systemName" ||
                      ["ownerName", "ownerPhone"].includes(key);

                    if (key === "logoFile") {
                      return (
                        <div key={key} className="flex flex-col gap-2 lg:col-span-3">
                          <span className={cn("text-xs font-semibold text-[var(--text3)]", !isRtl && "uppercase tracking-wide")}>
                            {label}
                          </span>
                          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)] p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text3)]">
                                {visibleLogo ? (
                                  <img src={visibleLogo} alt="" className="h-full w-full object-contain" />
                                ) : (
                                  <LuBuilding2 size={22} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--text1)]">
                                  {form.logoFile?.name || (visibleLogo ? t("superAdmin.logo.current") : t("superAdmin.logo.empty"))}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--text3)]">
                                  {t("superAdmin.logo.allowed")}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <label className="btn btn-outline btn-sm cursor-pointer">
                                <LuUpload size={13} />
                                {visibleLogo ? t("superAdmin.logo.replace") : t("superAdmin.logo.upload")}
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                                  disabled={isPending}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0] || null;
                                    onChange("logoFile", file);
                                    onChange("removeLogo", false);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                              {visibleLogo ? (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => {
                                    onChange("logoFile", null);
                                    onChange("removeLogo", true);
                                  }}
                                  disabled={isPending}
                                >
                                  <LuX size={13} />
                                  {t("superAdmin.logo.remove")}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {errors.logoFile ? (
                            <span
                              className="err-msg"
                              role="alert"
                              aria-live="polite"
                            >
                              {errors.logoFile}
                            </span>
                          ) : null}
                        </div>
                      );
                    }

                    if (key === "subscriptionPlan") {
                      return (
                        <label key={key} className="flex flex-col gap-1.5">
                          <span className={cn("text-xs font-semibold text-[var(--text3)]", !isRtl && "uppercase tracking-wide")}>
                            {label}
                          </span>
                          <select
                            className="inp"
                            value={form[key]}
                            onChange={(e) => onChange(key, e.target.value)}
                            disabled={isPending}
                          >
                            <option value="TRIAL">{t("superAdmin.plan.TRIAL")}</option>
                            <option value="MONTHLY">{t("superAdmin.plan.MONTHLY")}</option>
                            <option value="YEARLY">{t("superAdmin.plan.YEARLY")}</option>
                            <option value="CUSTOM">{t("superAdmin.plan.CUSTOM")}</option>
                          </select>
                        </label>
                      );
                    }

                    if (key === "subscriptionStatus") {
                      return (
                        <label key={key} className="flex flex-col gap-1.5">
                          <span className={cn("text-xs font-semibold text-[var(--text3)]", !isRtl && "uppercase tracking-wide")}>
                            {label}
                          </span>
                          <select
                            className="inp"
                            value={form[key]}
                            onChange={(e) => onChange(key, e.target.value)}
                            disabled={isPending}
                          >
                            <option value="TRIAL">{t("superAdmin.status.TRIAL")}</option>
                            <option value="ACTIVE">{t("superAdmin.status.ACTIVE")}</option>
                            <option value="EXPIRED">{t("superAdmin.status.EXPIRED")}</option>
                            <option value="SUSPENDED">{t("superAdmin.status.SUSPENDED")}</option>
                          </select>
                        </label>
                      );
                    }

                    return (
                      <label key={key} className="flex flex-col gap-1.5">
                        <span className={cn("text-xs font-semibold text-[var(--text3)]", !isRtl && "uppercase tracking-wide")}>
                          {label}
                          {isRequired ? " *" : ""}
                        </span>
                        <div className={isPassword ? "relative" : undefined}>
                          <input
                            ref={groupIndex === 0 && index === 0 ? firstInputRef : null}
                            className={`inp${errors[key] ? " err" : ""}`}
                            aria-invalid={errors[key] ? "true" : undefined}
                            type={
                              isDate
                                ? "date"
                                : isPassword && !showOwnerPassword
                                  ? "password"
                                  : "text"
                            }
                            value={form[key]}
                            onChange={(e) => onChange(key, e.target.value)}
                            disabled={isPending}
                            autoComplete={isPassword ? "new-password" : key === "ownerPhone" ? "tel" : "off"}
                            placeholder={mode === "edit" && isPassword ? t("superAdmin.ownerPasswordPlaceholder") : undefined}
                            style={isPassword ? { paddingInlineEnd: 42 } : undefined}
                          />
                          {isPassword ? (
                            <button
                              type="button"
                              className="absolute top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text3)] transition hover:bg-[var(--surface2)] hover:text-[var(--text1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                              style={{ insetInlineEnd: 6 }}
                              onClick={() => setShowOwnerPassword((current) => !current)}
                              disabled={isPending}
                              aria-label={
                                showOwnerPassword
                                  ? t("superAdmin.hidePassword")
                                  : t("superAdmin.showPassword")
                              }
                            >
                              {showOwnerPassword ? <LuEyeOff size={17} /> : <LuEye size={17} />}
                            </button>
                          ) : null}
                        </div>
                        {errors[key] ? (
                          <span
                            className="err-msg"
                            role="alert"
                            aria-live="polite"
                          >
                            {errors[key]}
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}

            <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <span>
                <span className="block text-sm font-bold text-[var(--text1)]">
                  {t("superAdmin.fields.isActive")}
                </span>
                <span className="mt-1 block text-xs text-[var(--text3)]">
                  {t("superAdmin.activeHelp")}
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => onChange("isActive", e.target.checked)}
                disabled={isPending}
                className="h-5 w-5 accent-[var(--primary)]"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--surface2)] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isPending}
          >
            {t("common.cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {mode === "edit" ? <LuPencil size={15} /> : <LuPlus size={15} />}
            {isPending
              ? t("superAdmin.saving")
              : mode === "edit"
                ? t("superAdmin.saveChanges")
                : t("superAdmin.createTenant")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = resolveIsRtl(i18n, language);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["saas-tenants", search],
    queryFn: () =>
      api.get("/tenants", { params: { search } }).then((r) => r.data),
  });

  const totals = useMemo(
    () =>
      tenants.reduce(
        (acc, tenant) => ({
          tenants: acc.tenants + 1,
          orders: acc.orders + (tenant._count?.orders || 0),
          customers: acc.customers + (tenant._count?.customers || 0),
        }),
        { tenants: 0, orders: 0, customers: 0 },
      ),
    [tenants],
  );

  const closeModal = () => {
    setModalMode(null);
    setEditingTenant(null);
    setForm(emptyForm);
    setErrors({});
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setErrors({});
    setEditingTenant(null);
    setModalMode("create");
  };

  const openEditModal = (tenant) => {
    setForm(tenantToForm(tenant));
    setErrors({});
    setEditingTenant(tenant);
    setModalMode("edit");
  };

  const createMut = useMutation({
    mutationFn: (payload) => api.post("/tenants", payload),
    onSuccess: () => {
      toast.success(t("superAdmin.toast.created"));
      closeModal();
      qc.invalidateQueries({ queryKey: ["saas-tenants"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("superAdmin.toast.createFailed"))),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.put(`/tenants/${id}`, data),
    onSuccess: () => {
      toast.success(t("superAdmin.toast.updated"));
      closeModal();
      qc.invalidateQueries({ queryKey: ["saas-tenants"] });
      qc.invalidateQueries({ queryKey: ["tenant-settings"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("superAdmin.toast.updateFailed"))),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/tenants/${id}`),
    onSuccess: () => {
      toast.success(t("superAdmin.toast.deleted"));
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["saas-tenants"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, t("superAdmin.toast.deleteFailed"))),
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  const submit = async (event) => {
    event.preventDefault();
    if (isSaving) return;

    const mode = modalMode || "create";
    const nextErrors = validateTenantForm(form, mode, t);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = trimPayload(form, mode);
    if (form.logoFile) {
      payload.logoUpload = await fileToLogoUpload(form.logoFile);
      delete payload.removeLogo;
    } else if (form.removeLogo) {
      payload.removeLogo = true;
    } else {
      delete payload.removeLogo;
    }

    if (mode === "edit" && editingTenant?.id) {
      updateMut.mutate({ id: editingTenant.id, data: payload });
      return;
    }

    createMut.mutate(payload);
  };

  return (
    <div
      className={cn(
        "superadmin-page superadmin-dashboard-page min-h-[calc(100vh-var(--nav-h,0px))] bg-[var(--bg)] px-4 py-5 sm:px-6 lg:px-8",
        isRtl ? "text-right" : "text-left",
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,.65)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className={cn("inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200", !isRtl && "uppercase tracking-[0.14em]")}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("superAdmin.badge")}
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text1)] sm:text-3xl">
                {t("superAdmin.title")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text3)]">
                {t("superAdmin.subtitle")}
              </p>
            </div>
            <button
              className="group inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-600 px-5 text-sm font-bold text-white shadow-[0_18px_34px_-22px_rgba(5,150,105,0.95)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-600 hover:bg-emerald-700 hover:shadow-[0_22px_42px_-22px_rgba(5,150,105,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:translate-y-0 sm:w-auto"
              onClick={openCreateModal}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 transition group-hover:bg-white/20">
                <LuPlus size={16} />
              </span>
              <span>{t("superAdmin.createTenant")}</span>
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatTile
            label={t("superAdmin.metrics.tenants")}
            value={totals.tenants}
            icon={LuBuilding2}
            accent="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200"
            isRtl={isRtl}
          />
          <StatTile
            label={t("superAdmin.metrics.orders")}
            value={totals.orders}
            icon={LuClipboardList}
            accent="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
            isRtl={isRtl}
          />
          <StatTile
            label={t("superAdmin.metrics.customers")}
            value={totals.customers}
            icon={LuUsers}
            accent="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
            isRtl={isRtl}
          />
        </div>

        <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_45px_-34px_rgba(15,23,42,.65)]">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--surface2)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-bold text-[var(--text1)]">{t("superAdmin.tableTitle")}</h2>
              <p className="mt-1 text-xs text-[var(--text3)]">
                {t("superAdmin.tableSubtitle")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="iw min-w-0 sm:w-80">
                <LuSearch size={15} className="ico" />
                <input
                  className="inp with-leading-icon"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("superAdmin.searchPlaceholder")}
                />
              </div>
              <button
                className="btn btn-outline"
                onClick={() => qc.invalidateQueries({ queryKey: ["saas-tenants"] })}
                disabled={isLoading}
              >
                <LuRefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                {t("superAdmin.refresh")}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {[
                    t("superAdmin.columns.tenant"),
                    t("superAdmin.columns.plan"),
                    t("superAdmin.columns.status"),
                    t("superAdmin.columns.expiry"),
                    t("superAdmin.columns.users"),
                    t("superAdmin.columns.customers"),
                    t("superAdmin.columns.orders"),
                    t("common.actions"),
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-5 py-3 text-start text-[11px] font-bold text-[var(--text3)]"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text3)]" colSpan="8">
                      {t("superAdmin.loadingTenants")}
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text3)]" colSpan="8">
                      {t("superAdmin.noTenants")}
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--surface2)]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)]">
                            {tenant.logoUrl ? (
                              <img src={assetUrl(tenant.logoUrl)} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <LuBuilding2 size={17} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-[var(--text1)]">
                              {tenant.systemName || tenant.businessName}
                            </p>
                            {tenant.owner ? (
                              <p className="mt-0.5 truncate text-[11px] text-[var(--text3)]">
                                {tenant.owner.name} - {tenant.owner.phoneNumber}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[var(--text2)]">
                        {t(`superAdmin.plan.${tenant.subscriptionPlan}`, tenant.subscriptionPlan)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill
                          status={tenant.subscriptionStatus}
                          isActive={tenant.isActive}
                          t={t}
                          isRtl={isRtl}
                        />
                      </td>
                      <td className="px-5 py-4 text-[var(--text2)]">
                        {formatDateLocale(tenant.expiryDate, language)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[var(--text1)]">{tenant._count?.users || 0}</td>
                      <td className="px-5 py-4 font-semibold text-[var(--text1)]">{tenant._count?.customers || 0}</td>
                      <td className="px-5 py-4 font-semibold text-[var(--text1)]">{tenant._count?.orders || 0}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditModal(tenant)}
                            disabled={isSaving || deleteMut.isPending}
                          >
                            <LuPencil size={13} />
                            {t("common.edit")}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={updateMut.isPending}
                            onClick={() =>
                              updateMut.mutate({
                                id: tenant.id,
                                data: {
                                  isActive: !tenant.isActive,
                                  subscriptionStatus: tenant.isActive ? "SUSPENDED" : "ACTIVE",
                                },
                              })
                            }
                          >
                            {tenant.isActive ? <LuBan size={13} /> : <LuCircleCheck size={13} />}
                            {tenant.isActive ? t("superAdmin.suspend") : t("superAdmin.activate")}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={deleteMut.isPending}
                            style={{ color: "var(--danger)" }}
                            onClick={() => setDeleteTarget(tenant)}
                          >
                            <LuTrash2 size={13} />
                            {t("common.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <TenantModal
          mode={modalMode || "create"}
          open={Boolean(modalMode)}
          form={form}
          errors={errors}
          isPending={isSaving}
          onClose={closeModal}
          onChange={(key, value) => {
            setForm((prev) => ({ ...prev, [key]: value }));
            setErrors((prev) => {
              if (!prev[key]) return prev;
              const next = { ...prev };
              delete next[key];
              return next;
            });
          }}
          onSubmit={submit}
        />

        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => (deleteMut.isPending ? null : setDeleteTarget(null))}
          title={t("superAdmin.deleteConfirmTitle")}
          maxW={480}
          boxClassName="!rounded-lg"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 text-red-600 ring-1 ring-red-200 dark:bg-white/10 dark:text-red-200 dark:ring-red-500/30">
                  <LuTrash2 size={19} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {t("superAdmin.deleteConfirmHeading", {
                      name: deleteTarget?.systemName || deleteTarget?.businessName || "-",
                    })}
                  </p>
                  <p className="mt-1 text-sm leading-6">
                    {t("superAdmin.deleteConfirmBody")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="btn btn-outline"
                disabled={deleteMut.isPending}
                onClick={() => setDeleteTarget(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={deleteMut.isPending || !deleteTarget?.id}
                onClick={() => deleteMut.mutate(deleteTarget.id)}
              >
                {deleteMut.isPending ? (
                  <LuRefreshCw size={15} className="animate-spin" />
                ) : (
                  <LuTrash2 size={15} />
                )}
                {t("common.delete")}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
