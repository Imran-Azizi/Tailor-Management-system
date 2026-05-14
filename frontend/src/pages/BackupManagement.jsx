import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuDatabase,
  LuDownload,
  LuTrash2,
  LuRefreshCw,
  LuShieldCheck,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuCloudUpload,
  LuFlaskConical,
  LuCalendar,
  LuHardDrive,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatSystemDateTime } from "../lib/locale.js";
import {
  PageHeader,
  Spinner,
  Card,
  ConfirmDeleteModal,
} from "../components/ui/index.jsx";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso, language = "en") {
  if (!iso) return "-";
  return formatSystemDateTime(iso, language, {
    month: "short",
  });
}

function readableKey(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function translateBackupStatus(t, status) {
  if (!status) return "-";
  const key = String(status).toLowerCase();
  return t(`backup.status.${key}`, { defaultValue: readableKey(status) });
}

function translateBackupType(t, type) {
  if (!type) return "-";
  const key = String(type).toLowerCase();
  return t(`backup.types.${key}`, { defaultValue: readableKey(type) });
}

function translateBackupMessage(t, message) {
  if (!message) return "";

  if (message === "No backups have run yet.") {
    return t("backup.messages.none", {
      defaultValue: "No backups have run yet.",
    });
  }

  const started = message.match(/^Backup started \(([^)]+)\)\.$/);
  if (started) {
    return t("backup.messages.started", {
      trigger: translateBackupType(t, started[1]),
      defaultValue: "Backup started ({{trigger}}).",
    });
  }

  const completed = message.match(/^Backup completed successfully \(([^)]+)\)\.$/);
  if (completed) {
    const types = completed[1]
      .split(",")
      .map((type) => translateBackupType(t, type.trim()))
      .join(", ");
    return t("backup.messages.completed", {
      types,
      defaultValue: "Backup completed successfully ({{types}}).",
    });
  }

  return message;
}

function translateRestoreChecks(t, checks) {
  if (!checks) return null;
  return Object.entries(checks)
    .map(([key, passed]) => {
      const label = t(`backup.checks.${key}`, {
        defaultValue: readableKey(key),
      });
      const result = passed
        ? t("backup.checkPassed", { defaultValue: "Passed" })
        : t("backup.checkFailed", { defaultValue: "Failed" });
      return `${label}: ${result}`;
    })
    .join("  ");
}

function StatusDot({ status }) {
  const colors = {
    success: "#16A34A",
    failed: "#DC2626",
    running: "#D97706",
    never: "#6B7280",
    passed: "#16A34A",
  };
  const color = colors[status] || "#6B7280";
  const Icon =
    status === "success" || status === "passed"
      ? LuCircleCheck
      : status === "failed"
        ? LuCircleX
        : LuClock;
  return <Icon size={15} style={{ color, flexShrink: 0 }} />;
}

function TypeBadge({ type }) {
  const { t } = useTranslation();
  const colors = {
    daily: { bg: "#EFF6FF", color: "#2563EB", border: "#BFDBFE" },
    weekly: { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
    monthly: { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" },
    manual: { bg: "#F5F3FF", color: "#7C3AED", border: "#DDD6FE" },
  };
  const c = colors[type] || {
    bg: "#F3F4F6",
    color: "#374151",
    border: "#E5E7EB",
  };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 99,
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
      }}
    >
      {translateBackupType(t, type)}
    </span>
  );
}

// ─── Status Card ─────────────────────────────────────────────────────────────

function StatusCard({
  status,
  onRunBackup,
  onRunRestoreTest,
  running,
  testing,
  language = "en",
  isRtl = false,
}) {
  const { t } = useTranslation();

  return (
    <Card title={t("backup.statusTitle", "System Status")}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <div style={infoBlock}>
            <span style={infoLabel}>
              {t("backup.overallStatus", "Overall Status")}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexDirection: isRtl ? "row-reverse" : "row",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <StatusDot status={status?.latestStatus} />
              {translateBackupStatus(t, status?.latestStatus)}
            </span>
          </div>
          <div style={infoBlock}>
            <span style={infoLabel}>{t("backup.lastRun", "Last Run")}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {formatDate(status?.lastRunAt, language)}
            </span>
          </div>
          <div style={infoBlock}>
            <span style={infoLabel}>
              {t("backup.lastSuccess", "Last Success")}
            </span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {formatDate(status?.lastSuccessAt, language)}
            </span>
          </div>
          <div style={infoBlock}>
            <span style={infoLabel}>
              {t("backup.totalBackups", "Total Backups")}
            </span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {status?.totalBackups ?? "-"}
            </span>
          </div>
        </div>

        {status?.latestMessage && (
          <p style={{ fontSize: 13, color: "var(--text2)", margin: 0 }}>
            {translateBackupMessage(t, status.latestMessage)}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: isRtl ? "flex-end" : "flex-start",
          }}
        >
          <button
            className="btn btn-gold"
            onClick={onRunBackup}
            disabled={running}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexDirection: isRtl ? "row-reverse" : "row",
            }}
          >
            {running ? (
              <LuRefreshCw
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <LuCloudUpload size={14} />
            )}
            {running
              ? t("backup.running", "Running…")
              : t("backup.runNow", "Run Backup Now")}
          </button>
          <button
            className="btn btn-outline"
            onClick={onRunRestoreTest}
            disabled={testing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexDirection: isRtl ? "row-reverse" : "row",
            }}
          >
            {testing ? (
              <LuRefreshCw
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
            ) : (
              <LuFlaskConical size={14} />
            )}
            {testing
              ? t("backup.testing", "Testing…")
              : t("backup.testRestore", "Test Restore")}
          </button>
        </div>
      </div>
    </Card>
  );
}

// ─── Restore Tests panel ─────────────────────────────────────────────────────

function RestoreTestsCard({ tests, language = "en", isRtl = false }) {
  const { t } = useTranslation();
  if (!tests?.length) return null;
  return (
    <Card title={t("backup.restoreTestsTitle", "Recent Restore Tests")}>
      <div style={{ overflowX: "auto" }}>
        <table
          className="tbl"
          style={{ direction: isRtl ? "rtl" : "ltr", textAlign: "start" }}
        >
          <thead>
            <tr>
              <th>{t("backup.colStatus", "Status")}</th>
              <th>{t("backup.colStarted", "Started")}</th>
              <th>{t("backup.colFinished", "Finished")}</th>
              <th>{t("backup.colBy", "By")}</th>
              <th>{t("backup.colChecks", "Checks")}</th>
            </tr>
          </thead>
          <tbody>
            {tests.slice(0, 10).map((test) => (
              <tr key={test.id}>
                <td>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      flexDirection: isRtl ? "row-reverse" : "row",
                    }}
                  >
                    <StatusDot status={test.status} />
                    <span>{translateBackupStatus(t, test.status)}</span>
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {formatDate(test.startedAt, language)}
                </td>
                <td style={{ fontSize: 12 }}>
                  {formatDate(test.finishedAt, language)}
                </td>
                <td style={{ fontSize: 12 }}>{test.initiatedBy || "-"}</td>
                <td style={{ fontSize: 11 }}>
                  {translateRestoreChecks(t, test.checks) || test.error || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Backup List ──────────────────────────────────────────────────────────────

function BackupListCard({
  backups,
  onDownload,
  onDelete,
  downloading,
  deleting = false,
  language = "en",
  isRtl = false,
}) {
  const { t } = useTranslation();
  const [pendingDelete, setPendingDelete] = useState(null);

  if (!backups?.length) {
    return (
      <Card title={t("backup.listTitle", "All Backups")}>
        <p style={{ color: "var(--text2)", fontSize: 14, margin: 0 }}>
          {t("backup.noBackups", "No backups found.")}
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card
        title={`${t("backup.listTitle", "All Backups")} (${backups.length})`}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            className="tbl"
            style={{ direction: isRtl ? "rtl" : "ltr", textAlign: "start" }}
          >
            <thead>
              <tr>
                <th>{t("backup.colFilename", "Filename")}</th>
                <th>{t("backup.colType", "Type")}</th>
                <th>{t("backup.colSize", "Size")}</th>
                <th>{t("backup.colCreated", "Created")}</th>
                <th>{t("backup.colActions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.key}>
                  <td>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        flexDirection: isRtl ? "row-reverse" : "row",
                        textAlign: "start",
                      }}
                    >
                      <LuHardDrive
                        size={12}
                        style={{ color: "var(--text2)", flexShrink: 0 }}
                      />
                      {b.filename || b.key}
                    </span>
                  </td>
                  <td>
                    <TypeBadge type={b.type} />
                  </td>
                  <td style={{ fontSize: 12 }}>{formatBytes(b.size)}</td>
                  <td style={{ fontSize: 12 }}>
                    {formatDate(b.createdAt, language)}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: isRtl ? "flex-end" : "flex-start",
                        flexDirection: isRtl ? "row-reverse" : "row",
                      }}
                    >
                      <button
                        className="btn btn-icon"
                        title={t("backup.download", "Download")}
                        onClick={() => onDownload(b.key, b.filename)}
                        disabled={downloading === b.key}
                        style={{ color: "#2563EB" }}
                      >
                        {downloading === b.key ? (
                          <LuRefreshCw
                            size={14}
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                        ) : (
                          <LuDownload size={14} />
                        )}
                      </button>
                      <button
                        className="btn btn-icon"
                        title={t("backup.delete", "Delete")}
                        onClick={() => setPendingDelete(b)}
                        style={{ color: "#DC2626" }}
                      >
                        <LuTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDeleteModal
        open={Boolean(pendingDelete)}
        title={t("backup.deleteTitle", "Delete Backup")}
        message={t(
          "backup.deleteConfirm",
          "Delete this backup permanently? This cannot be undone.",
        )}
        onConfirm={() => {
          if (!pendingDelete?.key) return;
          onDelete(pendingDelete.key);
          setPendingDelete(null);
        }}
        onClose={() => setPendingDelete(null)}
        isPending={deleting}
      />
    </>
  );
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const infoBlock = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 14px",
  borderRadius: "var(--r)",
  background: "var(--surface2, #F9FAFB)",
  border: "1px solid var(--border, #E5E7EB)",
};

const infoLabel = {
  fontSize: 11,
  fontWeight: 500,
  color: "var(--text2)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BackupManagement() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = (i18n.dir?.() || "ltr") === "rtl";
  const qc = useQueryClient();
  const [downloadingKey, setDownloadingKey] = useState(null);

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["backup-status"],
    queryFn: () => api.get("/backups/status").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: backupList, isLoading: listLoading } = useQuery({
    queryKey: ["backup-list"],
    queryFn: () => api.get("/backups/").then((r) => r.data?.data || []),
    refetchInterval: 60_000,
  });

  const runMutation = useMutation({
    mutationFn: () => api.post("/backups/run"),
    onSuccess: () => {
      toast.success(t("backup.runSuccess", "Backup completed successfully."));
      qc.invalidateQueries({ queryKey: ["backup-status"] });
      qc.invalidateQueries({ queryKey: ["backup-list"] });
    },
    onError: (err) =>
      toast.error(
        getApiErrorMessage(err, t("backup.runFailed", "Backup failed.")),
      ),
  });

  const restoreMutation = useMutation({
    mutationFn: () => api.post("/backups/test-restore"),
    onSuccess: () => {
      toast.success(t("backup.restoreSuccess", "Restore test passed."));
      qc.invalidateQueries({ queryKey: ["backup-status"] });
    },
    onError: (err) =>
      toast.error(
        getApiErrorMessage(
          err,
          t("backup.restoreFailed", "Restore test failed."),
        ),
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (key) => api.delete("/backups", { params: { key } }),
    onSuccess: () => {
      toast.success(t("backup.deleted", "Backup deleted."));
      qc.invalidateQueries({ queryKey: ["backup-list"] });
      qc.invalidateQueries({ queryKey: ["backup-status"] });
    },
    onError: (err) =>
      toast.error(
        getApiErrorMessage(
          err,
          t("backup.deleteFailed", "Failed to delete backup."),
        ),
      ),
  });

  async function handleDownload(key, filename) {
    setDownloadingKey(key);
    try {
      const response = await api.get("/backups/download", {
        params: { key },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "backup.dump.enc";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, t("backup.downloadFailed", "Download failed.")),
      );
    } finally {
      setDownloadingKey(null);
    }
  }

  if (statusLoading) {
    return (
      <div className="page">
        <Spinner />
      </div>
    );
  }

  return (
    <div
      className="page backup-management-page"
      style={{ direction: isRtl ? "rtl" : "ltr" }}
    >
      <PageHeader
        title={t("backup.title", "Backup Management")}
        subtitle={t(
          "backup.subtitle",
          "Automated encrypted backups delivered by email.",
        )}
        action={
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: isRtl ? "flex-end" : "flex-start",
              flexDirection: isRtl ? "row-reverse" : "row",
              gap: 6,
              fontSize: 12,
              color: "var(--text2)",
            }}
          >
            <LuShieldCheck size={14} style={{ color: "#16A34A" }} />
            {t("backup.encrypted", "AES-256-GCM encrypted")}
          </span>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StatusCard
          status={status}
          onRunBackup={() => runMutation.mutate()}
          onRunRestoreTest={() => restoreMutation.mutate()}
          running={runMutation.isPending}
          testing={restoreMutation.isPending}
          isRtl={isRtl}
          language={language}
        />

        {listLoading ? (
          <Card title={t("backup.listTitle", "All Backups")}>
            <Spinner />
          </Card>
        ) : (
          <BackupListCard
            backups={backupList}
            onDownload={handleDownload}
            onDelete={(key) => deleteMutation.mutate(key)}
            downloading={downloadingKey}
            deleting={deleteMutation.isPending}
            language={language}
            isRtl={isRtl}
          />
        )}

        {status?.restoreTests?.length > 0 && (
          <RestoreTestsCard
            tests={status.restoreTests}
            language={language}
            isRtl={isRtl}
          />
        )}
      </div>
    </div>
  );
}
