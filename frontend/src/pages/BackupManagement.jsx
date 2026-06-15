import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuArchiveRestore,
  LuCalendarCheck,
  LuCalendarClock,
  LuCircleCheck,
  LuClock,
  LuDatabase,
  LuDownload,
  LuFileArchive,
  LuHardDrive,
  LuRefreshCw,
  LuShieldAlert,
  LuShieldCheck,
  LuTrash2,
  LuUpload,
} from "react-icons/lu";
import { Modal, Spinner } from "../components/ui/index.jsx";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatSystemDateTime } from "../lib/locale.js";

const emptySchedule = {
  enabled: false,
  frequency: "DAILY",
  backupTime: "23:00",
  customCron: "",
  retentionDays: 35,
  compressionEnabled: true,
  encryptionEnabled: false,
  deleteOldAfterDays: 35,
  totalStorageBytes: 1073741824,
};

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

const greenActionButton =
  "border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:border-emerald-700 hover:bg-emerald-700 disabled:border-emerald-500 disabled:bg-emerald-500 disabled:text-white";

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDate(value, language) {
  if (!value) return "-";
  return formatSystemDateTime(value, language, { month: "short" });
}

function typeLabel(t, type) {
  return t(`backup.types.${type}`, type?.replaceAll("_", " ") || "-");
}

function statusTone(status) {
  const key = String(status || "").toUpperCase();
  if (["SUCCESS", "SAVED", "SENT"].includes(key)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
  if (["FAILED", "ERROR"].includes(key)) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200";
  }
  if (["PENDING", "IN_PROGRESS", "NOT_CONFIGURED"].includes(key)) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200";
}

function StatusPill({ status }) {
  const { t } = useTranslation();
  const key = String(status || "").toUpperCase();
  return (
    <span
      className={cn(
        "superadmin-status-pill inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold",
        statusTone(key),
      )}
    >
      {t(`backup.status.${key}`, key || "-")}
    </span>
  );
}

function SimpleCard({ children, className = "" }) {
  return (
    <section
      className={cn(
        "superadmin-card rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_45px_-36px_rgba(15,23,42,.55)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function CardHeader({ icon: Icon, title, description, children, tone = "indigo" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30"
        : "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30";

  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
            toneClass,
          )}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--text1)] sm:text-lg">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text3)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="superadmin-field flex flex-col gap-1.5">
      <span className="text-xs font-bold text-[var(--text3)]">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, icon: Icon, tone = "indigo" }) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30"
      : tone === "sky"
        ? "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30"
        : "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30";
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-[var(--text3)]">{label}</p>
          <p className="mt-2 break-words text-xl font-bold text-[var(--text1)]">{value}</p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1",
            toneClass,
          )}
        >
          <Icon size={19} />
        </span>
      </div>
    </div>
  );
}

function BackupRecordCard({ row, t, language, downloadingId, deletePending, onDownload, onDelete }) {
  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-[var(--text1)]">
            {row.scopeName || typeLabel(t, row.type)}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--text3)]">
            {formatDate(row.createdAt, language)}
          </p>
        </div>
        <StatusPill status={row.status} />
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-[var(--surface2)] px-3 py-2">
          <dt className="text-xs font-bold text-[var(--text3)]">{t("backup.history.type")}</dt>
          <dd className="mt-1 font-semibold text-[var(--text1)]">{typeLabel(t, row.type)}</dd>
        </div>
        <div className="rounded-lg bg-[var(--surface2)] px-3 py-2">
          <dt className="text-xs font-bold text-[var(--text3)]">{t("backup.history.size")}</dt>
          <dd className="mt-1 font-semibold text-[var(--text1)]">
            {formatBytes(row.sizeBytes)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          className="btn btn-outline btn-sm min-h-10 justify-center"
          disabled={downloadingId === row.id}
          onClick={() => onDownload(row)}
        >
          {downloadingId === row.id ? (
            <LuRefreshCw size={14} className="animate-spin" />
          ) : (
            <LuDownload size={14} />
          )}
          {t("backup.actions.download")}
        </button>
        <button
          className="btn btn-outline btn-sm min-h-10 justify-center text-red-600"
          disabled={deletePending}
          onClick={() => onDelete(row.id)}
        >
          <LuTrash2 size={14} />
          {t("backup.actions.delete")}
        </button>
      </div>
    </article>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

export default function BackupManagement() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = resolveIsRtl(i18n, language);
  const qc = useQueryClient();

  const [backupMode, setBackupMode] = useState("SYSTEM");
  const [tenantId, setTenantId] = useState("");
  const [userId, setUserId] = useState("ALL");
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreType, setRestoreType] = useState("TENANT");
  const [restoreTenantId, setRestoreTenantId] = useState("");
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["backup-tenants"],
    queryFn: () => api.get("/tenants").then((r) => r.data),
  });

  const { data: tenantUsers = [], isFetching: usersLoading } = useQuery({
    queryKey: ["backup-tenant-users", tenantId],
    enabled: backupMode === "USER" && Boolean(tenantId),
    queryFn: () => api.get(`/backups/tenant-users/${tenantId}`).then((r) => r.data),
  });

  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ["backup-history"],
    queryFn: () => api.get("/backups").then((r) => r.data?.data || []),
    refetchInterval: 45_000,
  });

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["backup-status"],
    queryFn: () => api.get("/backups/status").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: storage } = useQuery({
    queryKey: ["backup-storage"],
    queryFn: () => api.get("/backups/storage").then((r) => r.data),
  });

  const { data: scheduleData } = useQuery({
    queryKey: ["backup-schedule"],
    queryFn: () => api.get("/backups/schedule").then((r) => r.data),
  });

  useEffect(() => {
    if (scheduleData) setScheduleForm({ ...emptySchedule, ...scheduleData });
  }, [scheduleData]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["backup-history"] });
    qc.invalidateQueries({ queryKey: ["backup-status"] });
    qc.invalidateQueries({ queryKey: ["backup-storage"] });
  };

  const backupMutation = useMutation({
    mutationFn: () => {
      if (backupMode === "SYSTEM") return api.post("/backups/system");
      if (backupMode === "TENANT") return api.post("/backups/tenant", { tenantId });
      return api.post("/backups/user-export", { tenantId, userId });
    },
    onSuccess: () => {
      toast.success(t("backup.toast.created"));
      invalidate();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("backup.toast.failed"))),
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!restoreFile) throw new Error(t("backup.validation.fileRequired"));
      const data = await fileToBase64(restoreFile);
      return api.post("/backups/restore-upload", {
        fileName: restoreFile.name,
        data,
        restoreType,
        tenantId: restoreType === "TENANT" ? restoreTenantId : null,
        confirm: true,
      });
    },
    onSuccess: () => {
      toast.success(t("backup.toast.restored"));
      setRestoreFile(null);
      setConfirmRestore(false);
      invalidate();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("backup.toast.restoreFailed"))),
  });

  const scheduleMutation = useMutation({
    mutationFn: () => api.put("/backups/schedule", scheduleForm),
    onSuccess: () => {
      toast.success(t("backup.toast.scheduleSaved"));
      qc.invalidateQueries({ queryKey: ["backup-schedule"] });
      qc.invalidateQueries({ queryKey: ["backup-storage"] });
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("backup.toast.scheduleFailed"))),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete("/backups", { params: { id } }),
    onSuccess: () => {
      toast.success(t("backup.toast.deleted"));
      invalidate();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("backup.toast.deleteFailed"))),
  });

  const canStartBackup =
    backupMode === "SYSTEM" ||
    (backupMode === "TENANT" && tenantId) ||
    (backupMode === "USER" && tenantId);

  const metrics = useMemo(
    () => ({
      total: backups.length,
      success: backups.filter((item) => item.status === "SUCCESS").length,
      storage: formatBytes(storage?.storageUsed),
    }),
    [backups, storage?.storageUsed],
  );

  async function downloadBackup(row) {
    setDownloadingId(row.id);
    try {
      const response = await api.get("/backups/download", {
        params: { id: row.id },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.fileName || "backup.json.gz";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("backup.toast.downloadFailed")));
    } finally {
      setDownloadingId("");
    }
  }

  if (statusLoading && backupsLoading) {
    return (
      <div className="page superadmin-page backup-management-page" dir={isRtl ? "rtl" : "ltr"}>
        <Spinner />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "superadmin-page backup-management-page min-h-[calc(100vh-var(--nav-h,0px))] bg-[var(--bg)] px-4 py-5 sm:px-6 lg:px-8",
        isRtl ? "text-right" : "text-left",
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,.55)] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30">
                <LuShieldCheck size={24} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-[var(--text1)] sm:text-3xl">
                    {t("backup.title")}
                  </h1>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface2)] px-2.5 py-1 text-[11px] font-bold text-[var(--text3)]">
                    {t("backup.superadminOnly")}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text3)]">
                  {t("backup.subtitle")}
                </p>
              </div>
            </div>
            <StatusPill status={status?.latestStatus || "NEVER"} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label={t("backup.metrics.total")}
              value={metrics.total}
              icon={LuFileArchive}
              tone="indigo"
            />
            <StatCard
              label={t("backup.metrics.success")}
              value={metrics.success}
              icon={LuCircleCheck}
              tone="emerald"
            />
            <StatCard
              label={t("backup.storage.used")}
              value={metrics.storage}
              icon={LuHardDrive}
              tone="sky"
            />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SimpleCard className="overflow-hidden">
            <CardHeader
              icon={LuDatabase}
              title={t("backup.simpleCreate.title")}
              description={t("backup.simpleCreate.description")}
            />
            <div className="space-y-4 p-4 sm:p-5">
              <Field label={t("backup.simpleCreate.scope")}>
                <select
                  className="inp"
                  value={backupMode}
                  onChange={(event) => {
                    setBackupMode(event.target.value);
                    setTenantId("");
                    setUserId("ALL");
                  }}
                >
                  <option value="SYSTEM">{t("backup.simpleCreate.system")}</option>
                  <option value="TENANT">{t("backup.simpleCreate.tenant")}</option>
                  <option value="USER">{t("backup.simpleCreate.user")}</option>
                </select>
              </Field>
              {backupMode !== "SYSTEM" ? (
                <Field label={t("backup.fields.tenant")}>
                  <select
                    className="inp"
                    value={tenantId}
                    disabled={tenantsLoading}
                    onChange={(event) => {
                      setTenantId(event.target.value);
                      setUserId("ALL");
                    }}
                  >
                    <option value="">
                      {tenantsLoading ? t("common.loading") : t("backup.placeholders.tenant")}
                    </option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.businessName}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {backupMode === "USER" ? (
                <Field label={t("backup.fields.user")}>
                  <select
                    className="inp"
                    value={userId}
                    disabled={!tenantId || usersLoading}
                    onChange={(event) => setUserId(event.target.value)}
                  >
                    <option value="ALL">
                      {usersLoading ? t("common.loading") : t("backup.userExport.allUsers")}
                    </option>
                    {tenantUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.accountType}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <button
                className={cn("btn min-h-11 w-full justify-center", greenActionButton)}
                disabled={!canStartBackup || backupMutation.isPending}
                onClick={() => backupMutation.mutate()}
              >
                {backupMutation.isPending ? (
                  <LuRefreshCw size={15} className="animate-spin" />
                ) : (
                  <LuUpload size={15} />
                )}
                {t("backup.simpleCreate.button")}
              </button>
            </div>
          </SimpleCard>

          <SimpleCard className="overflow-hidden">
            <CardHeader
              icon={LuArchiveRestore}
              title={t("backup.simpleRestore.title")}
              description={t("backup.simpleRestore.description")}
              tone="emerald"
            />
            <div className="space-y-4 p-4 sm:p-5">
              <Field label={t("backup.fields.restoreFile")}>
                <input
                  className="inp"
                  type="file"
                  accept=".json,.gz,.enc,application/json,application/gzip"
                  onChange={(event) => setRestoreFile(event.target.files?.[0] || null)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t("backup.fields.restoreType")}>
                  <select
                    className="inp"
                    value={restoreType}
                    onChange={(event) => setRestoreType(event.target.value)}
                  >
                    <option value="TENANT">{t("backup.restore.tenant")}</option>
                    <option value="SYSTEM">{t("backup.restore.system")}</option>
                  </select>
                </Field>
                <Field label={t("backup.fields.tenant")}>
                  <select
                    className="inp"
                    value={restoreTenantId}
                    disabled={restoreType === "SYSTEM" || tenantsLoading}
                    onChange={(event) => setRestoreTenantId(event.target.value)}
                  >
                    <option value="">{t("backup.placeholders.tenant")}</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.businessName}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                {t("backup.restore.confirmBody")}
              </div>
              <button
                className={cn("btn min-h-11 w-full justify-center", greenActionButton)}
                disabled={
                  !restoreFile ||
                  (restoreType === "TENANT" && !restoreTenantId) ||
                  restoreMutation.isPending
                }
                onClick={() => setConfirmRestore(true)}
              >
                <LuArchiveRestore size={15} />
                {t("backup.simpleRestore.button")}
              </button>
            </div>
          </SimpleCard>
        </div>

        <SimpleCard className="overflow-hidden">
          <CardHeader
            icon={LuCalendarClock}
            title={t("backup.schedule.title")}
            description={t("backup.setup.body")}
            tone="amber"
          />
          <div className="grid grid-cols-1 gap-3 p-4 sm:p-5 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(260px,.9fr)] lg:items-end">
            <label className="superadmin-option flex min-h-12 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 text-sm font-semibold text-[var(--text1)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={scheduleForm.enabled && scheduleForm.frequency === "DAILY"}
                onChange={(event) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    enabled: event.target.checked,
                    frequency: "DAILY",
                  }))
                }
              />
              {t("backup.schedule.daily")}
            </label>
            <label className="superadmin-option flex min-h-12 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 text-sm font-semibold text-[var(--text1)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={scheduleForm.enabled && scheduleForm.frequency === "WEEKLY"}
                onChange={(event) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    enabled: event.target.checked,
                    frequency: "WEEKLY",
                  }))
                }
              />
              {t("backup.schedule.weekly")}
            </label>
            <label className="superadmin-option flex min-h-12 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 text-sm font-semibold text-[var(--text1)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-indigo-600"
                checked={scheduleForm.enabled && scheduleForm.frequency === "MONTHLY"}
                onChange={(event) =>
                  setScheduleForm((prev) => ({
                    ...prev,
                    enabled: event.target.checked,
                    frequency: "MONTHLY",
                  }))
                }
              />
              {t("backup.schedule.monthly")}
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <Field label={t("backup.schedule.time")}>
                <input
                  className="inp"
                  type="time"
                  value={scheduleForm.backupTime || "23:00"}
                  onChange={(event) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      backupTime: event.target.value,
                    }))
                  }
                />
              </Field>
              <button
                className={cn("btn min-h-11 self-end justify-center", greenActionButton)}
                disabled={scheduleMutation.isPending}
                onClick={() => scheduleMutation.mutate()}
              >
                {scheduleMutation.isPending ? (
                  <LuRefreshCw size={15} className="animate-spin" />
                ) : (
                  <LuClock size={15} />
                )}
                {t("backup.schedule.save")}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-[var(--border)] bg-[var(--surface2)] px-4 py-4 text-sm sm:grid-cols-3 sm:px-5">
            {[
              [
                t("backup.storage.retention"),
                `${storage?.retentionDays || 0} ${t("backup.storage.days")}`,
              ],
              [
                t("backup.storage.compression"),
                storage?.compressionEnabled ? t("common.enabled") : t("common.disabled"),
              ],
              [
                t("backup.storage.encryption"),
                storage?.encryptionEnabled ? t("common.enabled") : t("common.disabled"),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <p className="text-xs font-bold text-[var(--text3)]">{label}</p>
                <p className="mt-1 font-bold text-[var(--text1)]">{value}</p>
              </div>
            ))}
          </div>
        </SimpleCard>

        <SimpleCard className="overflow-hidden">
          <CardHeader
            icon={LuCalendarCheck}
            title={t("backup.history.title")}
            description={status?.latestMessage || t("backup.history.emptyHelp")}
          >
            <StatusPill status={status?.latestStatus || "NEVER"} />
          </CardHeader>

          <div className="block p-4 lg:hidden">
            {backupsLoading ? (
              <div className="py-8">
                <Spinner />
              </div>
            ) : backups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface2)] px-4 py-8 text-center">
                <p className="font-bold text-[var(--text1)]">{t("backup.history.emptyTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text3)]">
                  {t("backup.history.emptyHelp")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {backups.map((row) => (
                  <BackupRecordCard
                    key={row.id}
                    row={row}
                    t={t}
                    language={language}
                    downloadingId={downloadingId}
                    deletePending={deleteMutation.isPending}
                    onDownload={downloadBackup}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="superadmin-table-wrap hidden overflow-x-auto lg:block">
            <table className="superadmin-table w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface2)]">
                  {["created", "type", "scope", "size", "status", "actions"].map((key) => (
                    <th
                      key={key}
                      className="px-5 py-3 text-start text-[11px] font-bold text-[var(--text3)]"
                    >
                      {t(`backup.history.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backupsLoading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-10">
                      <Spinner />
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-10 text-center text-[var(--text3)]">
                      {t("backup.history.emptyHelp")}
                    </td>
                  </tr>
                ) : (
                  backups.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--surface2)]"
                    >
                      <td className="px-5 py-4 text-[var(--text2)]">
                        {formatDate(row.createdAt, language)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[var(--text1)]">
                        {typeLabel(t, row.type)}
                      </td>
                      <td className="px-5 py-4 text-[var(--text2)]">{row.scopeName}</td>
                      <td className="px-5 py-4 text-[var(--text2)]">
                        {formatBytes(row.sizeBytes)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="superadmin-action-group flex flex-wrap gap-2">
                          <button
                            className="btn btn-outline btn-sm"
                            disabled={downloadingId === row.id}
                            onClick={() => downloadBackup(row)}
                          >
                            {downloadingId === row.id ? (
                              <LuRefreshCw size={14} className="animate-spin" />
                            ) : (
                              <LuDownload size={14} />
                            )}
                            {t("backup.actions.download")}
                          </button>
                          <button
                            className="btn btn-outline btn-sm text-red-600"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(row.id)}
                          >
                            <LuTrash2 size={14} />
                            {t("backup.actions.delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SimpleCard>
      </div>

      <Modal
        open={confirmRestore}
        onClose={() => (restoreMutation.isPending ? null : setConfirmRestore(false))}
        title={t("backup.restore.confirmTitle")}
        maxW={520}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="space-y-4">
          <div className="superadmin-warning flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
            <LuShieldAlert size={22} className="shrink-0" />
            <p className="text-sm leading-6">{t("backup.restore.confirmBody")}</p>
          </div>
          <div className="superadmin-action-group flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="btn btn-outline"
              disabled={restoreMutation.isPending}
              onClick={() => setConfirmRestore(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              className="btn btn-danger"
              disabled={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate()}
            >
              {restoreMutation.isPending ? (
                <LuRefreshCw size={15} className="animate-spin" />
              ) : (
                <LuArchiveRestore size={15} />
              )}
              {t("backup.restore.confirmButton")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
