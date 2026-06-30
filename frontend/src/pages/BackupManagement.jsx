import { useEffect, useMemo, useRef, useState } from "react";
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
  LuFileCheck,
  LuHardDrive,
  LuPlay,
  LuRefreshCw,
  LuShieldAlert,
  LuShieldCheck,
  LuTrash2,
  LuUpload,
  LuX,
} from "react-icons/lu";
import { ConfirmDeleteModal, Modal, Spinner } from "../components/ui/index.jsx";
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

const restoreAcceptedTypes =
  ".json,.gz,.enc,application/json,application/gzip,application/octet-stream";

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
        "superadmin-card rounded-3xl border border-[var(--border)] bg-[var(--surface)]",
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
    <div className="superadmin-stat-card rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="relative z-[1] flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="superadmin-stat-label truncate text-xs font-bold text-[var(--text3)]">{label}</p>
          <p className="superadmin-stat-value mt-2 break-words text-2xl font-bold text-[var(--text1)]">{value}</p>
        </div>
        <span
          className={cn(
            "superadmin-stat-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1",
            toneClass,
          )}
        >
          <Icon size={21} />
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
          onClick={() => onDelete(row)}
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

function validateRestoreFile(file, t) {
  if (!file) return t("backup.validation.fileRequired");
  if (!file.size) return t("backup.validation.fileEmpty");
  const normalizedName = file.name.toLowerCase();
  if (![".json", ".gz", ".enc"].some((extension) => normalizedName.endsWith(extension))) {
    return t("backup.validation.fileType");
  }
  return "";
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
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreStage, setRestoreStage] = useState("idle");
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreError, setRestoreError] = useState("");
  const [isDraggingRestoreFile, setIsDraggingRestoreFile] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [backupPendingDelete, setBackupPendingDelete] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);
  const restoreInputRef = useRef(null);

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
      const validationError = validateRestoreFile(restoreFile, t);
      if (validationError) throw new Error(validationError);
      setRestoreStage("validating");
      setRestoreProgress(12);
      setRestoreError("");
      const data = await fileToBase64(restoreFile);
      setRestoreStage("uploading");
      setRestoreProgress(30);
      return api.post("/backups/restore-upload", {
        fileName: restoreFile.name,
        data,
        restoreType,
        tenantId: restoreType === "TENANT" ? restoreTenantId : null,
        confirm: true,
      }, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          const uploaded = Math.round((event.loaded / event.total) * 45);
          setRestoreProgress(Math.min(75, 30 + uploaded));
          if (event.loaded >= event.total) {
            setRestoreStage("restoring");
            setRestoreProgress(84);
          }
        },
      });
    },
    onSuccess: () => {
      toast.success(t("backup.toast.restored"));
      setRestoreStage("success");
      setRestoreProgress(100);
      setConfirmRestore(false);
      invalidate();
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, t("backup.toast.restoreFailed"));
      setRestoreStage("error");
      setRestoreError(message);
      setConfirmRestore(false);
      toast.error(message);
    },
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
    mutationFn: (backup) => api.delete("/backups", { params: { id: backup.id } }),
    onSuccess: (response) => {
      const fileWasMissing = response.data?.fileWasMissing === true;
      toast.success(
        fileWasMissing
          ? t("backup.toast.deletedMissing")
          : t("backup.toast.deleted"),
      );
      setBackupPendingDelete(null);
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

  function resetRestoreFlow({ close = false } = {}) {
    setRestoreFile(null);
    setRestoreType("TENANT");
    setRestoreTenantId("");
    setRestoreStage("idle");
    setRestoreProgress(0);
    setRestoreError("");
    setConfirmRestore(false);
    setIsDraggingRestoreFile(false);
    if (restoreInputRef.current) restoreInputRef.current.value = "";
    if (close) setRestoreModalOpen(false);
  }

  function selectRestoreFile(file) {
    const validationError = validateRestoreFile(file, t);
    if (validationError) {
      setRestoreFile(null);
      setRestoreStage("error");
      setRestoreError(validationError);
      toast.error(validationError);
      return;
    }
    setRestoreFile(file);
    setRestoreStage("ready");
    setRestoreProgress(0);
    setRestoreError("");
  }

  function requestRestoreConfirmation() {
    const validationError = validateRestoreFile(restoreFile, t);
    if (validationError) {
      setRestoreError(validationError);
      setRestoreStage("error");
      toast.error(validationError);
      return;
    }
    if (restoreType === "TENANT" && !restoreTenantId) {
      const message = t("backup.validation.tenantRequired");
      setRestoreError(message);
      setRestoreStage("error");
      toast.error(message);
      return;
    }
    setConfirmRestore(true);
  }

  const restoreBusy = restoreMutation.isPending;
  const restoreCanStart =
    Boolean(restoreFile) &&
    (restoreType === "SYSTEM" || Boolean(restoreTenantId)) &&
    !restoreBusy;

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
      <div className="superadmin-content mx-auto flex max-w-[1440px] flex-col gap-6">
        <header className="superadmin-hero overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="relative z-[1] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="superadmin-hero-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30">
                <LuShieldCheck size={24} />
              </span>
              <div className="min-w-0">
                <h1 className="superadmin-hero-title text-3xl font-bold tracking-[-0.035em] text-[var(--text1)] sm:text-4xl">
                  {t("backup.title")}
                </h1>
              </div>
            </div>
            <button
              className="btn superadmin-primary-action min-h-11 w-full justify-center border px-4 text-white sm:w-auto"
              onClick={() => setRestoreModalOpen(true)}
            >
              <LuArchiveRestore size={16} />
              {t("backup.simpleRestore.title")}
            </button>
          </div>

          <div className="relative z-[1] mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

        <div className="grid grid-cols-1 items-stretch gap-5 xl:grid-cols-[minmax(320px,.82fr)_minmax(0,1.18fr)]">
          <SimpleCard className="flex h-full flex-col overflow-hidden">
            <CardHeader
              icon={LuDatabase}
              title={t("backup.simpleCreate.title")}
            />
            <div id="create-backup-panel" className="flex flex-1 flex-col space-y-4 p-4 sm:p-5">
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
                        {tenant.systemName || tenant.businessName}
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
                className={cn("btn mt-auto min-h-11 w-full justify-center", greenActionButton)}
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

          <SimpleCard className="flex h-full flex-col overflow-hidden">
            <CardHeader
              icon={LuCalendarClock}
              title={t("backup.schedule.title")}
              tone="amber"
            />
            <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text1)]">
                    {t("backup.schedule.enable")}
                  </p>
                </div>
                <label className="backup-switch shrink-0">
                  <input
                    type="checkbox"
                    checked={scheduleForm.enabled}
                    onChange={(event) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        enabled: event.target.checked,
                      }))
                    }
                  />
                  <span aria-hidden="true" />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  ["DAILY", t("backup.schedule.daily")],
                  ["WEEKLY", t("backup.schedule.weekly")],
                  ["MONTHLY", t("backup.schedule.monthly")],
                ].map(([frequency, label]) => (
                  <button
                    key={frequency}
                    type="button"
                    className={cn(
                      "superadmin-option flex min-h-12 items-center justify-center rounded-xl border px-3 py-3 text-sm font-semibold transition",
                      scheduleForm.frequency === frequency
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/10 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-200"
                        : "border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)]",
                    )}
                    onClick={() =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        frequency,
                        enabled: true,
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
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
                  className={cn("btn min-h-11 self-end justify-center px-5", greenActionButton)}
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
          </SimpleCard>
        </div>

        <SimpleCard className="overflow-hidden">
          <CardHeader
            icon={LuCalendarCheck}
            title={t("backup.history.title")}
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
                    onDelete={setBackupPendingDelete}
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
                            onClick={() => setBackupPendingDelete(row)}
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

      <ConfirmDeleteModal
        open={Boolean(backupPendingDelete)}
        onClose={() => setBackupPendingDelete(null)}
        onConfirm={() =>
          backupPendingDelete && deleteMutation.mutate(backupPendingDelete)
        }
        title={t("backup.delete.title")}
        message={t("backup.delete.message")}
        itemName={
          backupPendingDelete?.fileName ||
          backupPendingDelete?.backupId ||
          backupPendingDelete?.scopeName
        }
        confirmLabel={t("backup.delete.confirm")}
        cancelLabel={t("common.cancel")}
        isPending={deleteMutation.isPending}
      />

      <Modal
        open={restoreModalOpen}
        onClose={() => (restoreBusy ? null : resetRestoreFlow({ close: true }))}
        title={t("backup.restore.title")}
        maxW={720}
        boxClassName="superadmin-modal backup-restore-modal"
        bodyClassName="backup-restore-modal__body"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {restoreStage === "success" ? (
          <div className="flex flex-col items-center px-2 py-6 text-center sm:px-8 sm:py-8">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
              <LuCircleCheck size={32} />
            </span>
            <h3 className="mt-5 text-xl font-bold text-[var(--text1)]">
              {t("backup.restore.successTitle")}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text3)]">
              {t("backup.restore.successBody")}
            </p>
            <button
              className={cn("btn mt-6 min-h-11 min-w-36 justify-center", greenActionButton)}
              onClick={() => resetRestoreFlow({ close: true })}
            >
              <LuCircleCheck size={16} />
              {t("backup.restore.done", "Done")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div
                className={cn(
                  "backup-restore-dropzone group relative flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition",
                  isDraggingRestoreFile
                    ? "border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/10 dark:bg-indigo-500/10"
                    : restoreFile
                      ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-500/5"
                      : "border-[var(--border2)] bg-[var(--surface2)] hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10",
                )}
                role="button"
                tabIndex={0}
                onClick={() => !restoreBusy && restoreInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (!restoreBusy && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    restoreInputRef.current?.click();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  if (!restoreBusy) setIsDraggingRestoreFile(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) setIsDraggingRestoreFile(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingRestoreFile(false);
                  if (!restoreBusy) selectRestoreFile(event.dataTransfer.files?.[0] || null);
                }}
              >
                <input
                  ref={restoreInputRef}
                  className="sr-only"
                  type="file"
                  accept={restoreAcceptedTypes}
                  disabled={restoreBusy}
                  onChange={(event) => selectRestoreFile(event.target.files?.[0] || null)}
                />
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition",
                    restoreFile
                      ? "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30"
                      : "bg-[var(--surface)] text-indigo-600 ring-[var(--border)] group-hover:-translate-y-0.5 dark:text-indigo-300",
                  )}
                >
                  {restoreFile ? <LuFileCheck size={26} /> : <LuUpload size={26} />}
                </span>
                <p className="mt-4 max-w-full break-words text-sm font-bold text-[var(--text1)]">
                  {restoreFile ? restoreFile.name : t("backup.restore.dropTitle")}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--text3)]">
                  {restoreFile
                    ? `${formatBytes(restoreFile.size)} · ${restoreFile.type || t("backup.restore.backupFile")}`
                    : t("backup.restore.dropHint")}
                </p>
                <span className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--text2)] shadow-sm">
                  {restoreFile ? t("backup.restore.changeFile") : t("backup.restore.browseFile")}
                </span>
              </div>

              {restoreFile && !restoreBusy ? (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 transition hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRestoreFile(null);
                      setRestoreStage("idle");
                      setRestoreError("");
                      if (restoreInputRef.current) restoreInputRef.current.value = "";
                    }}
                  >
                    <LuX size={14} />
                    {t("backup.restore.clearFile")}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("backup.fields.restoreType")}>
                <select
                  className="inp"
                  value={restoreType}
                  disabled={restoreBusy}
                  onChange={(event) => {
                    setRestoreType(event.target.value);
                    if (event.target.value === "SYSTEM") setRestoreTenantId("");
                  }}
                >
                  <option value="TENANT">{t("backup.restore.tenant")}</option>
                  <option value="SYSTEM">{t("backup.restore.system")}</option>
                </select>
              </Field>
              <Field label={t("backup.fields.tenant")}>
                <select
                  className="inp"
                  value={restoreTenantId}
                  disabled={restoreType === "SYSTEM" || tenantsLoading || restoreBusy}
                  onChange={(event) => setRestoreTenantId(event.target.value)}
                >
                  <option value="">
                    {tenantsLoading ? t("common.loading") : t("backup.placeholders.tenant")}
                  </option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.systemName || tenant.businessName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {restoreBusy ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-bold text-indigo-800 dark:text-indigo-100">
                    <LuRefreshCw size={16} className="animate-spin" />
                    {t(`backup.restore.progress.${restoreStage}`)}
                  </span>
                  <span className="font-bold tabular-nums text-indigo-700 dark:text-indigo-200">
                    {restoreProgress}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-950/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-sky-500 transition-[width] duration-500"
                    style={{ width: `${restoreProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-indigo-700 dark:text-indigo-200">
                  {t("backup.restore.progress.keepOpen")}
                </p>
              </div>
            ) : null}

            {restoreStage === "error" && restoreError ? (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
                <LuShieldAlert size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm leading-6">{restoreError}</p>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-[var(--border)] pt-4 sm:flex-row sm:justify-end">
              <button
                className="btn btn-outline min-h-11 justify-center px-5"
                disabled={restoreBusy}
                onClick={() => resetRestoreFlow({ close: true })}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn superadmin-primary-action min-h-11 justify-center border px-5 text-white"
                disabled={!restoreCanStart}
                onClick={requestRestoreConfirmation}
              >
                <LuPlay size={16} />
                {t("backup.restore.start")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={confirmRestore}
        onClose={() => (restoreMutation.isPending ? null : setConfirmRestore(false))}
        title={t("backup.restore.confirmTitle")}
        maxW={520}
        boxClassName="superadmin-modal"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="space-y-4">
          <div className="superadmin-warning flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
            <LuShieldAlert size={22} className="shrink-0" />
            <p className="text-sm leading-6">{t("backup.restore.confirmBody")}</p>
          </div>
          <dl className="grid grid-cols-1 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold text-[var(--text3)]">
                {t("backup.fields.restoreFile")}
              </dt>
              <dd className="mt-1 break-words font-bold text-[var(--text1)]">
                {restoreFile?.name || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-[var(--text3)]">
                {t("backup.fields.restoreType")}
              </dt>
              <dd className="mt-1 font-bold text-[var(--text1)]">
                {t(`backup.restore.${restoreType === "SYSTEM" ? "system" : "tenant"}`)}
              </dd>
            </div>
          </dl>
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
              onClick={() => {
                setConfirmRestore(false);
                restoreMutation.mutate();
              }}
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
