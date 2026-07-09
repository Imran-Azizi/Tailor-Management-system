import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuSearch,
  LuBell,
  LuSun,
  LuMoon,
  LuLanguages,
  LuCheck,
  LuMenu,
  LuTriangleAlert,
  LuUser,
  LuLogOut,
  LuShieldCheck,
  LuChevronDown,
  LuX,
  LuArrowLeft,
  LuArrowRight,
  LuFileText,
  LuCircleCheck,
  LuEye,
  LuPencil,
  LuTrash2,
  LuCalendarCheck,
  LuDownload,
  LuLock,
  LuSettings,
} from "react-icons/lu";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import {
  formatSystemNotificationMessage,
  formatUserNotificationMessage,
} from "../lib/notifications.js";
import {
  formatDateTimeLocale,
  formatRelativeTimeLocale,
  formatSystemDateTime,
  isRtlLanguage,
  normalizeLanguage,
} from "../lib/locale.js";
import {
  getNotificationSummary,
  groupNotificationsByDay,
} from "../lib/notificationGrouping.js";
import {
  EMERGENCY_SOUND_MUTED_KEY,
  EMERGENCY_SOUND_LAST_SEEN_KEY,
  playEmergencyAlertSound,
  shouldPlayEmergencyAlertCycle,
} from "../lib/emergencyAlert.js";
import {
  getLatestNotificationTimestamp,
  playNotificationChime,
} from "../lib/notificationSound.js";
import { deleteOrderDraft, listOrderDrafts } from "../lib/orderDraftApi.js";
import {
  getMonthLabel,
  getDisplayYearForLanguage,
  getDisplayMonthLabelForLanguage,
  formatMonthYearLabel,
  MONTHS,
} from "../lib/months.js";
import AfCurrencyIcon from "./ui/AfCurrencyIcon.jsx";
import { EmptyState, Modal, NotificationText, Spinner } from "./ui/index.jsx";

function useOutside(ref, fn) {
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) fn();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, fn]);
}

const ROLE_COLORS = {
  SUPER_ADMIN: "#4F46E5",
  ADMIN: "#2563EB",
  DOKAN: "#7C3AED",
  DOKHT: "#DB2777",
  QICHIKAR: "#D97706",
};

// Emergency + worker-status notifications (for Admin)
function SystemNotifPanel({
  onClose,
  emergencyAlarmMuted,
  onToggleEmergencyAlarmMuted,
}) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { viewMonth, viewYear } = useMonth();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isRtlLanguage(i18n.resolvedLanguage || i18n.language);

  // Emergency order alerts (Notification model)
  const { data: emergency = [] } = useQuery({
    queryKey: ["notifs-nav", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/notifications", {
          params: { unread: true, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
  });
  const readEmergencyMut = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifs-nav"] });
      qc.invalidateQueries({ queryKey: ["notifs-count"] });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t(
            "notificationsPage.markReadFailed",
            "Unable to mark notification as read.",
          ),
        ),
      ),
  });

  // Worker status notifications (UserNotification sent to this admin)
  const { data: workerNotifs = [] } = useQuery({
    queryKey: ["admin-worker-notifs-nav", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/users/me/notifications", {
          params: { unread: true, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
  });
  const readWorkerMut = useMutation({
    mutationFn: (id) => api.patch(`/users/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-worker-notifs-nav"] });
      qc.invalidateQueries({ queryKey: ["admin-worker-notifs-count"] });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t(
            "notificationsPage.markReadFailed",
            "Unable to mark notification as read.",
          ),
        ),
      ),
  });

  const readAllWorkerMut = useMutation({
    mutationFn: () => api.patch("/users/me/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-worker-notifs-nav"] });
      qc.invalidateQueries({ queryKey: ["admin-worker-notifs-count"] });
    },
  });

  const merged = [
    ...workerNotifs.map((entry) => ({ kind: "worker", entry })),
    ...emergency.map((entry) => ({ kind: "emergency", entry })),
  ]
    .sort(
      (a, b) =>
        new Date(b.entry?.createdAt || 0).getTime() -
        new Date(a.entry?.createdAt || 0).getTime(),
    )
    .slice(0, 14)
    .map(({ kind, entry }) => {
      const message =
        kind === "emergency"
        ? formatSystemNotificationMessage(entry, t, language)
        : formatUserNotificationMessage(entry, t, language);
      return {
        kind,
        entry,
        message,
        summary: getNotificationSummary(message),
      };
    });

  const grouped = groupNotificationsByDay(merged, {
    language,
    t,
    getDate: (item) => item?.entry?.createdAt,
  });

  const hasAny = grouped.length > 0;

  return (
    <>
      <div className="notif-panel-head">
        <span className="notif-panel-title">{t("navbar.notifications")}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {workerNotifs.length > 0 && (
            <button
              onClick={() => readAllWorkerMut.mutate()}
              disabled={readAllWorkerMut.isPending}
              className="notif-panel-link-btn"
            >
              {t("navbar.markAllRead")}
            </button>
          )}
          {emergency.length > 0 && (
            <button
              onClick={() => {
                navigate("/notifications");
                onClose();
              }}
              className="notif-panel-link-btn"
            >
              {t("navbar.viewAll")}
            </button>
          )}
          <button
            onClick={onToggleEmergencyAlarmMuted}
            className="notif-panel-link-btn"
            title={
              emergencyAlarmMuted
                ? t("navbar.unmuteEmergencyAlarm", "Unmute emergency alarm")
                : t("navbar.muteEmergencyAlarm", "Mute emergency alarm")
            }
          >
            {emergencyAlarmMuted
              ? t("navbar.unmute", "Unmute")
              : t("navbar.mute", "Mute")}
          </button>
          <button
            onClick={onClose}
            className="notif-panel-close-btn"
            aria-label={t("common.close")}
          >
            <LuX size={16} />
          </button>
        </div>
      </div>

      {hasAny ? (
        <div className="notif-panel-scroll">
          {grouped.map((group) => (
            <section key={group.dayKey} className="notif-day-group">
              <div className="notif-day-heading">{group.heading}</div>
              {group.items.map(({ kind, entry, summary }) => {
                const isEmergency = kind === "emergency";
                const isActionable =
                  kind === "worker" &&
                  entry.orderId &&
                  (entry.type === "WORK_COMPLETED" ||
                    entry.type === "QICHIKAR_READY_FOR_DOKHT");

                const onRowClick = () => {
                  if (isEmergency && entry.orderId) {
                    readEmergencyMut.mutate(entry.id);
                    navigate(`/orders/${entry.orderId}/edit`);
                    onClose();
                    return;
                  }
                  if (isActionable) {
                    readWorkerMut.mutate(entry.id);
                    navigate(
                      `/orders/completed-workers?orderId=${encodeURIComponent(entry.orderId)}`,
                    );
                    onClose();
                  }
                };

                return (
                  <article
                    key={`${kind}-${entry.id}`}
                    className={`notif-feed-item notif-feed-item--drawer ${
                      isEmergency ? "notif-feed-item--emergency" : ""
                    }`}
                    onClick={
                      isEmergency || isActionable ? onRowClick : undefined
                    }
                    style={
                      isEmergency || isActionable
                        ? { cursor: "pointer" }
                        : undefined
                    }
                  >
                    <span className="notif-feed-item__icon" aria-hidden="true">
                      {isEmergency ? (
                        <LuTriangleAlert
                          size={14}
                          style={{ color: "var(--danger)" }}
                        />
                      ) : (
                        <LuBell size={14} style={{ color: "var(--primary)" }} />
                      )}
                    </span>
                    <div className="notif-feed-item__copy">
                      <p className="notif-feed-item__title">{summary.title}</p>
                      {summary.message && (
                        <NotificationText
                          language={language}
                          className="notif-feed-item__message"
                        >
                          {summary.message}
                        </NotificationText>
                      )}
                      <div className="notif-feed-item__meta">
                        <span title={formatDateTimeLocale(entry.createdAt, language)}>
                          {formatRelativeTimeLocale(entry.createdAt, language)}
                        </span>
                        {isActionable && (
                          <span className="notif-feed-item__hint">
                            {t("navbar.viewOrder", "View & Pay")}
                            {isRtl ? (
                              <LuArrowLeft size={11} />
                            ) : (
                              <LuArrowRight size={11} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEmergency) {
                          readEmergencyMut.mutate(entry.id);
                        } else {
                          readWorkerMut.mutate(entry.id);
                        }
                      }}
                      title={t("navbar.markAsRead")}
                      className="notif-panel-close-btn"
                      style={{ width: 26, height: 26, borderRadius: 6 }}
                    >
                      <LuCheck size={12} />
                    </button>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      ) : (
        <div className="notif-panel-empty">{t("navbar.allCaughtUp")}</div>
      )}
    </>
  );
}

// Assignment notifications (for Qichikar/Dokht)
function UserNotifPanel({ onClose }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { viewMonth, viewYear } = useMonth();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const roleColor = ROLE_COLORS[user?.accountType] || "#888";

  const { data: notifsRaw = [] } = useQuery({
    queryKey: ["my-notifs-nav", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/users/me/notifications", {
          params: { unread: true, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
  });
  const notifs = Array.isArray(notifsRaw) ? notifsRaw : [];

  const readAllMut = useMutation({
    mutationFn: () => api.patch("/users/me/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifs-nav"] });
      qc.invalidateQueries({ queryKey: ["my-notifs-count"] });
    },
  });

  const readOneMut = useMutation({
    mutationFn: (id) => api.patch(`/users/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifs-nav"] });
      qc.invalidateQueries({ queryKey: ["my-notifs-count"] });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t(
            "notificationsPage.markReadFailed",
            "Unable to mark notification as read.",
          ),
        ),
      ),
  });

  const grouped = groupNotificationsByDay(notifs, {
    language,
    t,
    getDate: (item) => item?.createdAt,
  });

  return (
    <>
      <div className="notif-panel-head">
        <span className="notif-panel-title">{t("navbar.notifications")}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {notifs.length > 0 && (
            <button
              onClick={() => readAllMut.mutate()}
              disabled={readAllMut.isPending}
              className="notif-panel-link-btn"
            >
              {t("workerLayout.markAllRead")}
            </button>
          )}
          <button
            onClick={onClose}
            className="notif-panel-close-btn"
            aria-label={t("common.close")}
          >
            <LuX size={16} />
          </button>
        </div>
      </div>

      {notifs.length === 0 ? (
        <div className="notif-panel-empty">{t("navbar.allCaughtUp")}</div>
      ) : (
        <div className="notif-panel-scroll">
          {grouped.map((group) => (
            <section key={group.dayKey} className="notif-day-group">
              <div className="notif-day-heading">{group.heading}</div>
              {group.items.map((n) => {
                const isPayment = n.type === "ADMIN_PAYMENT";
                const message = formatUserNotificationMessage(n, t, language);
                const summary = getNotificationSummary(message);

                return (
                  <article
                    key={n.id}
                    className="notif-feed-item notif-feed-item--drawer"
                  >
                    <span className="notif-feed-item__icon" aria-hidden="true">
                      {isPayment ? (
                        <AfCurrencyIcon
                          size={14}
                          style={{ color: "var(--success)" }}
                        />
                      ) : (
                        <LuBell size={14} style={{ color: roleColor }} />
                      )}
                    </span>
                    <div className="notif-feed-item__copy">
                      <p className="notif-feed-item__title">{summary.title}</p>
                      {summary.message && (
                        <NotificationText
                          language={language}
                          className="notif-feed-item__message"
                        >
                          {summary.message}
                        </NotificationText>
                      )}
                      <div className="notif-feed-item__meta">
                        <span title={formatDateTimeLocale(n.createdAt, language)}>
                          {formatRelativeTimeLocale(n.createdAt, language)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => readOneMut.mutate(n.id)}
                      title={t("navbar.markAsRead")}
                      className="notif-panel-close-btn"
                      style={{ width: 26, height: 26, borderRadius: 6 }}
                    >
                      <LuCheck size={12} />
                    </button>
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function NotificationSidebar({
  open,
  onClose,
  isWorker,
  emergencyAlarmMuted,
  onToggleEmergencyAlarmMuted,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return undefined;
    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      className={`notif-drawer no-print${open ? " open" : ""}`}
      aria-hidden={!open}
    >
      <button
        className="notif-drawer-backdrop"
        onClick={onClose}
        aria-label={t("common.close")}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className="notif-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("navbar.notifications")}
        aria-hidden={!open}
      >
        {isWorker ? (
          <UserNotifPanel onClose={onClose} />
        ) : (
          <SystemNotifPanel
            onClose={onClose}
            emergencyAlarmMuted={emergencyAlarmMuted}
            onToggleEmergencyAlarmMuted={onToggleEmergencyAlarmMuted}
          />
        )}
      </aside>
    </div>
  );
}

// ─── Month Selection ──────────────────────────────────────────────────────────

function MonthDropdown({ onClose }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const normalizedLanguage = normalizeLanguage(language);
  const isRtl = isRtlLanguage(normalizedLanguage);
  const languageBadge =
    normalizedLanguage === "dari"
      ? "DR"
      : normalizedLanguage === "pashto"
        ? "PS"
        : "EN";
  const {
    viewMonth,
    viewYear,
    setViewMonth,
    setViewYear,
    monthPolicy,
    isSelectableMonth,
    getMonthDisabledReason,
    getMonthAccessMode,
    currentGregorianMonth,
    currentGregorianYear,
  } = useMonth();
  const { isAdmin } = useAuth();

  const [reportLoading, setReportLoading] = useState(false);

  const activeMonth = viewMonth;
  const activeYear = viewYear;
  const setMonth = setViewMonth;
  const setYear = setViewYear;
  const futureMonthDisabledText = t(
    "navbar.futureMonthDisabled",
    "Future months are locked until the current month is fully completed.",
  );
  const pastMonthReadOnlyText = t(
    "navbar.pastMonthReadOnly",
    "Past months are read-only. No editing allowed.",
  );
  const currentMonthText = t("navbar.currentMonth", "Current month");

  const baseYear = Number(
    monthPolicy.currentYear || viewYear || new Date().getFullYear(),
  );
  const years = [baseYear - 1, baseYear, baseYear + 1];

  const handleGenerateReport = async () => {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      const response = await api.get("/orders/report/monthly", {
        params: {
          month: viewMonth,
          year: viewYear,
          lang: language,
          _ts: Date.now(),
        },
        responseType: "blob",
      });
      const monthLabel = formatMonthYearLabel(viewMonth, viewYear, language);
      const filename = `Monthly_Report_${monthLabel}.pdf`;
      const url = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      toast.error(t("report.generateFailed", "Failed to generate report"));
    } finally {
      setReportLoading(false);
    }
  };

  const selectedAccessMode = getMonthAccessMode(activeMonth, activeYear);
  const modeConfig = {
    editable: {
      Icon: LuCircleCheck,
      label: currentMonthText,
      cls: "month-mode-badge month-mode-badge--editable",
    },
    readonly: {
      Icon: LuEye,
      label: pastMonthReadOnlyText,
      cls: "month-mode-badge month-mode-badge--readonly",
    },
    disabled: {
      Icon: LuLock,
      label: futureMonthDisabledText,
      cls: "month-mode-badge month-mode-badge--locked",
    },
  };
  const mode = modeConfig[selectedAccessMode] || modeConfig.disabled;

  return (
    <div
      className={`dd-menu month-dd absolute z-50 ${isRtl ? "left-0 right-auto" : "right-0 left-auto"} min-w-[270px]`}
      style={{
        minWidth: "min(270px, 92vw)",
        width: "min(320px, 92vw)",
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "min(70vh, 520px)",
        overflowY: "auto",
      }}
    >
      <div className="month-dd-header">
        <LuCalendarCheck size={13} />
        <span>{t("navbar.viewDataByMonth", "View Data by Month")}</span>
      </div>

      <div className={mode.cls}>
        <mode.Icon size={11} />
        <span>{mode.label}</span>
      </div>

      <div className="month-year-row">
        {years.map((y) => {
          const yearEnabled = MONTHS.some((m) => isSelectableMonth(m.value, y));
          const isCurrentYear = y === currentGregorianYear;
          return (
            <button
              key={y}
              type="button"
              className={`month-year-btn${activeYear === y ? " on" : ""}${isCurrentYear ? " current-year" : ""}`}
              disabled={!yearEnabled}
              title={
                yearEnabled
                  ? isCurrentYear
                    ? currentMonthText
                    : ""
                  : futureMonthDisabledText
              }
              onClick={() => setYear(y)}
            >
              {getDisplayYearForLanguage(y, activeMonth, language)}
            </button>
          );
        })}
      </div>

      <div className="month-grid">
        {MONTHS.map((m) => {
          const disabled = !isSelectableMonth(m.value, activeYear);
          const reason = getMonthDisabledReason(m.value, activeYear);
          const accessMode = getMonthAccessMode(m.value, activeYear);
          const isCurrentMonth =
            m.value === currentGregorianMonth &&
            activeYear === currentGregorianYear;

          let tooltip = "";
          if (isCurrentMonth) {
            tooltip = currentMonthText;
          } else if (reason === "past_month_readonly") {
            tooltip = pastMonthReadOnlyText;
          } else if (reason === "future_month_locked") {
            tooltip = futureMonthDisabledText;
          }

          return (
            <button
              key={m.value}
              type="button"
              className={`month-cell${activeMonth === m.value ? " on" : ""}${isCurrentMonth ? " current" : ""}${accessMode === "readonly" ? " readonly" : ""}`}
              disabled={disabled}
              title={tooltip}
              aria-label={tooltip}
              onClick={() => {
                if (disabled) return;
                setMonth(m.value);
                onClose();
              }}
            >
              {getDisplayMonthLabelForLanguage(m.value, activeYear, language)}
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="month-dd-footer">
          <div className="month-footer-actions">
            <button
              type="button"
              className="month-report-btn"
              disabled={reportLoading}
              onClick={handleGenerateReport}
            >
              {reportLoading ? <Spinner size={12} /> : <LuDownload size={12} />}
              {reportLoading
                ? t("report.generating", "Generating...")
                : t("report.generate", "Generate Report")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthSelector() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const { viewMonth, viewYear } = useMonth();

  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef();

  useOutside(viewRef, () => setViewOpen(false));

  const viewLabel = formatMonthYearLabel(viewMonth, viewYear, language);

  return (
    <div className="month-selector-wrap">
      <div className="dd-wrap" ref={viewRef}>
        <button
          type="button"
          className="month-pill view-pill"
          onClick={() => {
            setViewOpen((o) => !o);
          }}
          title={t("navbar.viewDataByMonth", "View Data by Month")}
        >
          <LuCalendarCheck size={13} />
          <span className="month-pill-label">{viewLabel}</span>
          <LuChevronDown
            size={11}
            className={`month-chevron${viewOpen ? " open" : ""}`}
          />
        </button>
        {viewOpen && <MonthDropdown onClose={() => setViewOpen(false)} />}
      </div>
    </div>
  );
}

function LangDropdown({ onClose }) {
  const { t, i18n } = useTranslation();
  const langs = [
    { code: "en", label: t("common.english"), flag: "EN" },
    { code: "dari", label: t("common.dari"), flag: "DR" },
    { code: "pashto", label: t("common.pashto"), flag: "PS" },
  ];
  const current = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const pageRtl =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("dir") === "rtl";

  return (
    <div
      className={`dd-menu language-dd-menu app-language-dd-menu ${
        pageRtl ? "language-dd-menu--rtl" : "language-dd-menu--ltr"
      }`}
      dir="ltr"
    >
      {langs.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`dd-item language-dd-item${current === lang.code ? " on" : ""}`}
          onClick={() => {
            i18n.changeLanguage(lang.code);
            localStorage.setItem("lang", lang.code);
            onClose();
          }}
        >
          <span className="language-dd-item__code">{lang.flag}</span>
          <span className="language-dd-item__label">{lang.label}</span>
        </button>
      ))}
    </div>
  );
}

function UserDropdown({ onClose }) {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const roleColor = ROLE_COLORS[user?.accountType] || "var(--text3)";
  const isRtl = (i18n.dir?.() || "ltr") === "rtl";

  const handleLogout = async () => {
    await logout();
    onClose();
    toast.success(t("auth.loggedOut", t("feedback.loggedOut")));
    navigate("/login");
  };

  return (
    <div
      className="dd-menu user-dd-menu absolute z-50 min-w-[210px]"
      style={{
        width: "min(240px, calc(100vw - 16px))",
        maxHeight: "min(70vh, 420px)",
        overflowY: "auto",
        maxWidth: "calc(100vw - 16px)",
        direction: isRtl ? "rtl" : "ltr",
      }}
    >
      <div
        className="user-dd-head"
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text1)",
            textAlign: "start",
          }}
        >
          {user?.name}
        </p>
        <p
          style={{
            fontSize: 11,
            color: "var(--text3)",
            marginTop: 2,
            textAlign: "start",
          }}
        >
          {user?.phoneNumber}
        </p>
        <span
          className="user-dd-role"
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 99,
            background: roleColor + "18",
            color: roleColor,
            marginTop: 6,
            display: "inline-block",
          }}
        >
          {user?.accountType}
        </span>
      </div>
      {isAdmin && (
        <div
          className="dd-item user-dd-item"
          onClick={() => {
            navigate("/users");
            onClose();
          }}
        >
          <LuShieldCheck size={14} />
          <span>{t("users.title")}</span>
        </div>
      )}
      {isSuperAdmin && (
        <div
          className="dd-item user-dd-item"
          onClick={() => {
            navigate("/super-admin/settings");
            onClose();
          }}
        >
          <LuSettings size={14} />
          <span>{t("superAdminSettings.title")}</span>
        </div>
      )}
      <div
        className="dd-item user-dd-item"
        onClick={handleLogout}
        style={{ color: "var(--danger)" }}
      >
        <LuLogOut size={14} />
        <span>{t("auth.logout")}</span>
      </div>
    </div>
  );
}

export default function Navbar({ onHamburger, pageTitle }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const normalizedLanguage = normalizeLanguage(language);
  const isRtl = isRtlLanguage(normalizedLanguage);
  const languageBadge =
    normalizedLanguage === "dari"
      ? "DR"
      : normalizedLanguage === "pashto"
        ? "PS"
        : "EN";
  const { dark, toggle } = useTheme();
  const { user, isWorker, isAdmin, isFinance, canManageOrders } =
    useAuth();
  const { viewMonth, viewYear } = useMonth();
  const canViewAdminNotifications = isAdmin;
  const showNotifications = isWorker || canViewAdminNotifications;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [draftListOpen, setDraftListOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [emergencyAlarmMuted, setEmergencyAlarmMuted] = useState(() => {
    try {
      return localStorage.getItem(EMERGENCY_SOUND_MUTED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const langRef = useRef();
  const userRef = useRef();
  useOutside(langRef, () => setLangOpen(false));
  useOutside(userRef, () => setUserOpen(false));
  const location = useLocation();
  const navigate = useNavigate();

  // Emergency order alerts for Admin/Dokan
  const { data: unreadSystem = [] } = useQuery({
    queryKey: ["notifs-count", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/notifications", {
          params: { unread: true, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
    refetchInterval: 60_000,
    enabled: canViewAdminNotifications,
  });

  // Worker status notifications sent to this admin (work-started, work-completed)
  const { data: unreadAdminWorker = [] } = useQuery({
    queryKey: ["admin-worker-notifs-count", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/users/me/notifications", {
          params: { unread: true, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
    refetchInterval: 30_000,
    enabled: isAdmin,
  });

  // Assignment notifications for workers (Dokht / Qichikar)
  const { data: unreadUser = [] } = useQuery({
    queryKey: ["my-notifs-count", viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/users/me/notifications", {
          params: { unread: true, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !!isWorker,
  });

  const {
    data: drafts = [],
    isLoading: isDraftsLoading,
    refetch: refetchDrafts,
  } = useQuery({
    queryKey: ["order-drafts-navbar", user?.id],
    queryFn: listOrderDrafts,
    enabled: canManageOrders,
  });

  const deleteDraftMut = useMutation({
    mutationFn: (draftId) => deleteOrderDraft(draftId),
    onSuccess: () => {
      toast.success(t("orders.draftDeleted", "Draft deleted"));
      qc.invalidateQueries({ queryKey: ["order-drafts"] });
      qc.invalidateQueries({ queryKey: ["order-drafts-navbar"] });
      refetchDrafts();
      setSelectedDraft(null);
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("orders.draftDeleteFailed", "Failed to delete draft"),
        ),
      ),
  });

  const unreadCount = isWorker
    ? unreadUser.length
    : canViewAdminNotifications
      ? unreadSystem.length + (isAdmin ? unreadAdminWorker.length : 0)
      : 0;
  const lastAdminWorkerSoundTs = useRef(0);
  const lastWorkerSoundTs = useRef(0);

  useEffect(() => {
    if (!canViewAdminNotifications || emergencyAlarmMuted) return;
    if (!Array.isArray(unreadSystem) || unreadSystem.length === 0) return;

    if (shouldPlayEmergencyAlertCycle(unreadSystem)) {
      playEmergencyAlertSound();
    }
  }, [canViewAdminNotifications, emergencyAlarmMuted, unreadSystem]);

  useEffect(() => {
    if (!isAdmin) return;

    const latestTimestamp = getLatestNotificationTimestamp(unreadAdminWorker);
    if (!latestTimestamp) return;

    if (!lastAdminWorkerSoundTs.current) {
      lastAdminWorkerSoundTs.current = latestTimestamp;
      return;
    }

    if (latestTimestamp > lastAdminWorkerSoundTs.current) {
      playNotificationChime();
      lastAdminWorkerSoundTs.current = latestTimestamp;
    }
  }, [isAdmin, unreadAdminWorker]);

  useEffect(() => {
    if (!isWorker) return;

    const latestTimestamp = getLatestNotificationTimestamp(unreadUser);
    if (!latestTimestamp) return;

    if (!lastWorkerSoundTs.current) {
      lastWorkerSoundTs.current = latestTimestamp;
      return;
    }

    if (latestTimestamp > lastWorkerSoundTs.current) {
      playNotificationChime();
      lastWorkerSoundTs.current = latestTimestamp;
    }
  }, [isWorker, unreadUser]);

  useEffect(() => {
    setSearch("");
  }, [location.pathname]);

  const toggleEmergencyAlarmMuted = () => {
    setEmergencyAlarmMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(EMERGENCY_SOUND_MUTED_KEY, next ? "1" : "0");
      } catch {
        // ignore storage write failures
      }
      return next;
    });
  };

  const canUseGlobalSearch = isAdmin || isFinance;

  const submitTopbarSearch = () => {
    const term = search.trim();
    if (!term) return;

    if (canUseGlobalSearch) {
      navigate(`/orders/global-search?q=${encodeURIComponent(term)}`);
    } else {
      navigate("/orders", { state: { search: term } });
    }

    setSearch("");
  };

  const onSearch = (e) => {
    if (e.key === "Enter") {
      submitTopbarSearch();
    }
  };

  const resumeDraft = (draftId) => {
    navigate(`/orders/create?draft=${draftId}`);
    setDraftListOpen(false);
    setSelectedDraft(null);
  };

  const roleColor = ROLE_COLORS[user?.accountType] || "var(--text3)";

  return (
    <>
      <header
        className={`navbar no-print${
          user?.accountType === "SUPER_ADMIN" ? " superadmin-navbar" : ""
        }`}
      >
        <button
          className="nav-btn nav-ham-btn"
          onClick={onHamburger}
          aria-label={t("common.menu", "Menu")}
        >
          <LuMenu size={20} />
        </button>

        <span className="nav-title">{pageTitle}</span>
        <div className="nav-spacer" />

        {(isAdmin || isFinance || isWorker) && <MonthSelector />}

        <div className="nav-search">
          <LuSearch size={14} className="ns-ico" />
          <input
            type="text"
            placeholder={
              canUseGlobalSearch
                ? t(
                    "globalSearch.placeholder",
                    "Search by name, phone, or bill number...",
                  )
                : t("navbar.searchPlaceholder")
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearch}
          />
          <button
            type="button"
            className="ns-go"
            onClick={submitTopbarSearch}
            disabled={!search.trim()}
            aria-label={t("common.search", "Search")}
            title={t("common.search", "Search")}
          >
            <LuArrowRight size={14} />
          </button>
        </div>

        {canManageOrders && (
          <button
            type="button"
            className="nav-btn"
            onClick={() => {
              setDraftListOpen(true);
              setNotifOpen(false);
              setLangOpen(false);
              setUserOpen(false);
            }}
            disabled={isDraftsLoading}
            title={t("orders.drafts", "Drafts")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingInline: 10,
              minWidth: 86,
            }}
          >
            <LuFileText size={16} />
            <span className="nbl">{drafts.length}</span>
          </button>
        )}

        <div className="dd-wrap navbar-lang-wrap" ref={langRef}>
          <button
            className="nav-btn"
            onClick={() => {
              setLangOpen((o) => !o);
              setNotifOpen(false);
              setUserOpen(false);
            }}
          >
            <LuLanguages size={17} />
            <span className="nbl">{languageBadge}</span>
          </button>
          {langOpen && <LangDropdown onClose={() => setLangOpen(false)} />}
        </div>

        <button
          className="nav-btn"
          onClick={toggle}
          title={dark ? t("common.lightMode") : t("common.darkMode")}
        >
          {dark ? <LuSun size={17} /> : <LuMoon size={17} />}
        </button>

        {showNotifications && (
          <div className="dd-wrap">
            <button
              className="nav-btn"
              style={{ position: "relative" }}
              onClick={() => {
                setNotifOpen((o) => !o);
                setLangOpen(false);
                setUserOpen(false);
              }}
            >
              <LuBell size={18} />
              {unreadCount > 0 && (
                <span className="notif-dot">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount > 9
                      ? "9+"
                      : unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* User avatar + dropdown */}
        <div className="dd-wrap" ref={userRef}>
          <button
            className="nav-btn user-dd-trigger"
            onClick={() => {
              setUserOpen((o) => !o);
              setNotifOpen(false);
              setLangOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 8px",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: roleColor + "28",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LuUser size={14} style={{ color: roleColor }} />
            </div>
            <span
              className="nav-user-name"
              style={{
                fontSize: 13,
                fontWeight: 600,
                maxWidth: 90,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.name}
            </span>
            <LuChevronDown size={12} style={{ color: "var(--text3)" }} />
          </button>
          {userOpen && <UserDropdown onClose={() => setUserOpen(false)} />}
        </div>
      </header>
      {showNotifications && (
        <NotificationSidebar
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
          isWorker={isWorker}
          emergencyAlarmMuted={emergencyAlarmMuted}
          onToggleEmergencyAlarmMuted={toggleEmergencyAlarmMuted}
        />
      )}

      <Modal
        open={draftListOpen}
        onClose={() => setDraftListOpen(false)}
        title={t("orders.drafts", "Drafts")}
        maxW={920}
      >
        {isDraftsLoading ? (
          <Spinner />
        ) : drafts.length === 0 ? (
          <EmptyState message={t("orders.noDrafts", "No saved drafts")} />
        ) : (
          <div className="tbl-wrap order-scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("common.customer", "Customer")}</th>
                  <th>{t("orders.orderTypes", "Order Types")}</th>
                  <th>{t("common.status", "Status")}</th>
                  <th>{t("orders.lastUpdated", "Last Updated")}</th>
                  <th>{t("common.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={draft.id}>
                    <td>
                      {draft.customerName ||
                        t("orders.unknownCustomer", "Unnamed")}
                    </td>
                    <td>{(draft.orderTypes || []).join(", ") || "-"}</td>
                    <td>
                      {draft.status === "WAITING_FOR_BOX" ? (
                        <span className="badge bg-amber">
                          {t(
                            "orders.waitingForBoxDesign",
                            "Waiting for box design",
                          )}
                        </span>
                      ) : (
                        <span className="badge bg-gray">
                          {t("orders.draftStatusSaved", "Draft")}
                        </span>
                      )}
                    </td>
                    <td>{formatSystemDateTime(draft.updatedAt, language)}</td>
                    <td>
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedDraft(draft)}
                        >
                          <LuEye size={13} />
                          {t("common.view", "View")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => resumeDraft(draft.id)}
                        >
                          <LuArrowRight size={13} />
                          {t("orders.resume", "Resume")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => resumeDraft(draft.id)}
                        >
                          <LuPencil size={13} />
                          {t("common.edit", "Edit")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{
                            color: "var(--danger)",
                            borderColor: "var(--danger-soft-border)",
                          }}
                          onClick={() => deleteDraftMut.mutate(draft.id)}
                          disabled={deleteDraftMut.isPending}
                        >
                          <LuTrash2 size={13} />
                          {t("common.delete", "Delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        open={!!selectedDraft}
        onClose={() => setSelectedDraft(null)}
        title={t("orders.draftDetails", "Draft Details")}
        maxW={700}
      >
        {selectedDraft && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>
              <b>{t("common.customer", "Customer")}:</b>{" "}
              {selectedDraft.customerName || "-"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>
              <b>{t("orders.orderTypes", "Order Types")}:</b>{" "}
              {(selectedDraft.orderTypes || []).join(", ") || "-"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>
              <b>{t("common.status", "Status")}:</b>{" "}
              {selectedDraft.status === "WAITING_FOR_BOX"
                ? t("orders.waitingForBoxDesign", "Waiting for box design")
                : t("orders.draftStatusSaved", "Draft")}
            </div>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>
              <b>{t("orders.lastUpdated", "Last Updated")}:</b>{" "}
              {formatSystemDateTime(selectedDraft.updatedAt, language)}
            </div>
            <div
              className="modal-actions"
              style={{
                justifyContent: isRtl ? "flex-start" : "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedDraft(null)}
              >
                <LuX size={14} />
                {t("common.close", "Close")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  resumeDraft(selectedDraft.id);
                }}
              >
                <LuArrowRight size={14} />
                {t("orders.resume", "Resume")}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  color: "var(--danger)",
                  borderColor: "var(--danger-soft-border)",
                }}
                onClick={() => deleteDraftMut.mutate(selectedDraft.id)}
                disabled={deleteDraftMut.isPending}
              >
                <LuTrash2 size={14} />
                {t("common.delete", "Delete")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
