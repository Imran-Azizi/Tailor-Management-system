import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuHistory,
  LuPencil,
  LuRefreshCw,
  LuSearch,
  LuX,
} from "react-icons/lu";
import { Modal } from "../components/ui/index.jsx";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatSystemDateTime } from "../lib/locale.js";

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

function LimitBadge({ isAtLimit, t }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        isAtLimit
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
      )}
    >
      {isAtLimit
        ? t("tenantUserLimits.atLimit", "At limit")
        : t("tenantUserLimits.available", "Available")}
    </span>
  );
}

function EditLimitModal({ tenant, onClose, onSaved }) {
  const { t } = useTranslation();
  const [extraUserLimit, setExtraUserLimit] = useState(
    String(tenant?.extraUserLimit ?? 0),
  );
  const [note, setNote] = useState("");

  const saveMut = useMutation({
    mutationFn: (payload) =>
      api.put(`/tenants/${tenant.id}/user-limit`, payload).then((r) => r.data),
    onSuccess: (data) => {
      toast.success(t("tenantUserLimits.saved"));
      onSaved(data);
      onClose();
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("tenantUserLimits.saveFailed"))),
  });

  const parsedExtra = Number(extraUserLimit);
  const projectedTotal =
    Number.isFinite(parsedExtra) && parsedExtra >= 0
      ? tenant.defaultLimit + parsedExtra
      : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={t("tenantUserLimits.editTitle")}
      maxW={520}
    >
      <p className="mb-4 text-sm text-[var(--text3)]">
        {tenant.businessName || tenant.slug}
      </p>
      <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface2)] p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">
              {t("tenantUserLimits.defaultLimit")}
            </p>
            <p className="mt-1 text-lg font-bold text-[var(--text1)]">
              {tenant.defaultLimit}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">
              {t("tenantUserLimits.currentUsers")}
            </p>
            <p className="mt-1 text-lg font-bold text-[var(--text1)]">
              {tenant.currentUserCount}
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text2)]">
            {t("tenantUserLimits.extraUsers")}
          </label>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2.5 text-sm text-[var(--text1)] outline-none"
            value={extraUserLimit}
            onChange={(e) => setExtraUserLimit(e.target.value)}
          />
          <p className="mt-1.5 text-xs text-[var(--text3)]">
            {t("tenantUserLimits.extraUsersHelp")}
          </p>
        </div>

        {projectedTotal != null ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
            <span className="text-[var(--text2)]">
              {t("tenantUserLimits.projectedTotal")}:{" "}
            </span>
            <strong className="text-[var(--text1)]">{projectedTotal}</strong>
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--text2)]">
            {t("tenantUserLimits.note")}
          </label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2.5 text-sm text-[var(--text1)] outline-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("tenantUserLimits.notePlaceholder")}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-2.5 text-sm font-medium text-[var(--text2)]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={saveMut.isPending}
            onClick={() =>
              saveMut.mutate({
                extraUserLimit: parsedExtra,
                note: note.trim() || undefined,
              })
            }
            className="flex-[2] rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saveMut.isPending
              ? t("common.loading")
              : t("tenantUserLimits.saveLimit")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function HistoryPanel({ tenant, onClose, language }) {
  const { t } = useTranslation();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["tenant-user-limit-history", tenant.id],
    queryFn: () =>
      api.get(`/tenants/${tenant.id}/user-limit/history`).then((r) => r.data),
  });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--text1)]">
            {t("tenantUserLimits.historyTitle")}
          </h3>
          <p className="text-sm text-[var(--text3)]">
            {tenant.businessName || tenant.slug}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--border)] p-2 text-[var(--text3)]"
        >
          <LuX size={16} />
        </button>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[var(--text3)]">
          {t("common.loading")}
        </p>
      ) : history.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text3)]">
          {t("tenantUserLimits.noHistory")}
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[var(--text1)]">
                  {entry.previousExtraLimit} → {entry.newExtraLimit}{" "}
                  <span className="font-normal text-[var(--text3)]">
                    ({t("tenantUserLimits.extraUsers")})
                  </span>
                </p>
                <p className="text-xs text-[var(--text3)]">
                  {formatSystemDateTime(entry.createdAt, language, {
                    month: "short",
                  })}
                </p>
              </div>
              <p className="mt-1 text-[var(--text2)]">
                {t("tenantUserLimits.totalAfterChange", {
                  total: entry.defaultLimit + entry.newExtraLimit,
                })}
              </p>
              {entry.changedBy?.name ? (
                <p className="mt-1 text-xs text-[var(--text3)]">
                  {t("tenantUserLimits.changedBy", {
                    name: entry.changedBy.name,
                  })}
                </p>
              ) : null}
              {entry.note ? (
                <p className="mt-2 text-xs text-[var(--text2)]">{entry.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TenantUserLimitManagement() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = resolveIsRtl(i18n, language);
  const [search, setSearch] = useState("");
  const [editTenant, setEditTenant] = useState(null);
  const [historyTenant, setHistoryTenant] = useState(null);

  const { data: tenants = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["tenant-user-limits", search],
    queryFn: () =>
      api
        .get("/tenants/user-limits", { params: { search: search || undefined } })
        .then((r) => r.data),
  });

  const summary = useMemo(() => {
    const atLimitCount = tenants.filter((row) => row.isAtLimit).length;
    const totalUsers = tenants.reduce(
      (sum, row) => sum + (row.currentUserCount || 0),
      0,
    );
    return { atLimitCount, totalUsers };
  }, [tenants]);

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["tenant-user-limits"] });
    if (historyTenant) {
      qc.invalidateQueries({
        queryKey: ["tenant-user-limit-history", historyTenant.id],
      });
    }
  };

  return (
    <div
      className="superadmin-shell mx-auto max-w-7xl px-4 py-6 pb-16 sm:px-6"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500">
            {t("tenantUserLimits.badge")}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text1)] sm:text-3xl">
            {t("tenantUserLimits.title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text3)]">
            {t("tenantUserLimits.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--text2)]"
        >
          <LuRefreshCw size={15} className={isFetching ? "animate-spin" : ""} />
          {t("common.refresh", "Refresh")}
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">
            {t("tenantUserLimits.stats.tenants")}
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--text1)]">
            {tenants.length}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">
            {t("tenantUserLimits.stats.totalUsers")}
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--text1)]">
            {summary.totalUsers}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">
            {t("tenantUserLimits.stats.atLimit")}
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--text1)]">
            {summary.atLimitCount}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text1)]">
              {t("tenantUserLimits.tableTitle")}
            </h2>
            <p className="text-sm text-[var(--text3)]">
              {t("tenantUserLimits.tableSubtitle")}
            </p>
          </div>
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <LuSearch
              size={16}
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text3)]"
              style={{ insetInlineStart: 12 }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("tenantUserLimits.searchPlaceholder")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] py-2.5 text-sm text-[var(--text1)] outline-none"
              style={{ paddingInlineStart: 36, paddingInlineEnd: 12 }}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--text3)]">
            {t("common.loading")}
          </p>
        ) : tenants.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--text3)]">
            {t("tenantUserLimits.noTenants")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text3)]">
                  {[
                    t("tenantUserLimits.columns.tenant"),
                    t("tenantUserLimits.columns.defaultLimit"),
                    t("tenantUserLimits.columns.extraUsers"),
                    t("tenantUserLimits.columns.totalAllowed"),
                    t("tenantUserLimits.columns.currentUsers"),
                    t("tenantUserLimits.columns.remaining"),
                    t("tenantUserLimits.columns.status"),
                    t("common.actions"),
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-3 py-3 text-start text-xs font-semibold uppercase tracking-wide"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)] last:border-b-0"
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold text-[var(--text1)]">
                        {row.businessName || row.slug}
                      </div>
                      <div className="text-xs text-[var(--text3)]">
                        {row.slug}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[var(--text2)]">
                      {row.defaultLimit}
                    </td>
                    <td className="px-3 py-3 text-[var(--text2)]">
                      +{row.extraUserLimit}
                    </td>
                    <td className="px-3 py-3 font-semibold text-[var(--text1)]">
                      {row.totalAllowed}
                    </td>
                    <td className="px-3 py-3 text-[var(--text2)]">
                      {row.currentUserCount}
                    </td>
                    <td className="px-3 py-3 text-[var(--text2)]">
                      {row.remaining}
                    </td>
                    <td className="px-3 py-3">
                      <LimitBadge isAtLimit={row.isAtLimit} t={t} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditTenant(row);
                            setHistoryTenant(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text2)]"
                        >
                          <LuPencil size={13} />
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setHistoryTenant((current) =>
                              current?.id === row.id ? null : row,
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--text2)]"
                        >
                          <LuHistory size={13} />
                          {t("tenantUserLimits.history")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historyTenant ? (
        <div className="mt-5">
          <HistoryPanel
            tenant={historyTenant}
            language={language}
            onClose={() => setHistoryTenant(null)}
          />
        </div>
      ) : null}

      {editTenant ? (
        <EditLimitModal
          tenant={editTenant}
          onClose={() => setEditTenant(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
