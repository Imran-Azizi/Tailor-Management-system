import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  LuArrowRight,
  LuCircleDollarSign,
  LuFileText,
  LuEye,
  LuPencil,
  LuTrash2,
  LuCalendarCheck,
  LuDownload,
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
import { formatDateTimeLocale } from "../lib/locale.js";
import { deleteOrderDraft, listOrderDrafts } from "../lib/orderDraftApi.js";
import { getMonthLabel, MONTHS } from "../lib/months.js";
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
  ADMIN: "#2563EB",
  DOKAN: "#7C3AED",
  DOKHT: "#DB2777",
  QICHIKAR: "#D97706",
};

// Emergency + worker-status notifications (for Admin)
function SystemNotifPanel({ onClose }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const language = i18n.resolvedLanguage || i18n.language || "en";

  // Emergency order alerts (Notification model)
  const { data: emergency = [] } = useQuery({
    queryKey: ["notifs-nav"],
    queryFn: () => api.get("/notifications?unread=true").then((r) => r.data),
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
    queryKey: ["admin-worker-notifs-nav"],
    queryFn: () =>
      api
        .get("/users/me/notifications", { params: { unread: true } })
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

  const hasAny = emergency.length > 0 || workerNotifs.length > 0;

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
          {/* Worker status updates */}
          {workerNotifs.length > 0 && (
            <>
              <div
                style={{
                  padding: "8px 14px 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <LuBell size={12} style={{ color: "var(--primary)" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text3)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {t("navbar.workUpdates")}
                </span>
              </div>
              {workerNotifs.slice(0, 6).map((n) => {
                const isActionable =
                  n.orderId &&
                  (n.type === "WORK_COMPLETED" ||
                    n.type === "QICHIKAR_READY_FOR_DOKHT");
                const handleRowClick = () => {
                  if (!isActionable) return;
                  readWorkerMut.mutate(n.id);
                  navigate(
                    `/orders/completed-workers?orderId=${encodeURIComponent(n.orderId)}`,
                  );
                  onClose();
                };
                return (
                  <div
                    key={n.id}
                    className="notif-panel-item"
                    onClick={isActionable ? handleRowClick : undefined}
                    style={isActionable ? { cursor: "pointer" } : undefined}
                  >
                    <LuBell
                      size={13}
                      style={{
                        color: "var(--primary)",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <NotificationText
                        language={language}
                        style={{
                          fontSize: 12,
                          lineHeight: 1.4,
                          color: "var(--text1)",
                        }}
                      >
                        {formatUserNotificationMessage(n, t, language)}
                      </NotificationText>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          marginTop: 2,
                        }}
                      >
                        {formatDateTimeLocale(n.createdAt, language)}
                      </p>
                      {isActionable && (
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--primary)",
                            marginTop: 3,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {t("navbar.viewOrder", "View & Pay")}
                          <LuArrowRight size={11} />
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        readWorkerMut.mutate(n.id);
                      }}
                      title={t("navbar.markAsRead")}
                      className="notif-panel-close-btn"
                      style={{ width: 26, height: 26, borderRadius: 6 }}
                    >
                      <LuCheck size={12} />
                    </button>
                  </div>
                );
              })}
            </>
          )}

          {/* Emergency order alerts */}
          {emergency.length > 0 && (
            <>
              <div
                style={{
                  padding: "8px 14px 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <LuTriangleAlert size={12} style={{ color: "var(--danger)" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--danger)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {t("navbar.emergencyAlerts")}
                </span>
              </div>
              {emergency.slice(0, 6).map((n) => (
                <div
                  key={n.id}
                  className="notif-panel-item"
                  style={{ cursor: "default" }}
                >
                  <LuTriangleAlert
                    size={14}
                    style={{
                      color: "var(--danger)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <NotificationText
                      language={language}
                      style={{
                        fontSize: 13,
                        lineHeight: 1.4,
                        color: "var(--text1)",
                      }}
                    >
                      {formatSystemNotificationMessage(n, t, language)}
                    </NotificationText>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text3)",
                        marginTop: 2,
                      }}
                    >
                      {formatDateTimeLocale(n.createdAt, language)}
                    </p>
                  </div>
                  <button
                    onClick={() => readEmergencyMut.mutate(n.id)}
                    title={t("navbar.markAsRead")}
                    className="notif-panel-close-btn"
                    style={{ width: 26, height: 26, borderRadius: 6 }}
                  >
                    <LuCheck size={12} />
                  </button>
                </div>
              ))}
            </>
          )}
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
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const roleColor = ROLE_COLORS[user?.accountType] || "#888";

  const { data: notifsRaw = [] } = useQuery({
    queryKey: ["my-notifs-nav"],
    queryFn: () =>
      api.get("/users/me/notifications?unread=true").then((r) => r.data),
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

  const paymentNotifs = notifs.filter((n) => n.type === "ADMIN_PAYMENT");
  const otherNotifs = notifs.filter((n) => n.type !== "ADMIN_PAYMENT");

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
          {paymentNotifs.length > 0 && (
            <>
              <div
                style={{
                  padding: "8px 14px 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <LuCircleDollarSign
                  size={12}
                  style={{ color: "var(--success)" }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--success)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {t("workerLayout.paymentsFromAdmin", "Payments from Admin")}
                </span>
              </div>
              {paymentNotifs.map((n) => (
                <div key={n.id} className="notif-panel-item">
                  <LuCircleDollarSign
                    size={14}
                    style={{
                      color: "var(--success)",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <NotificationText
                      language={language}
                      style={{
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "var(--text1)",
                      }}
                    >
                      {formatUserNotificationMessage(n, t, language)}
                    </NotificationText>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text3)",
                        marginTop: 3,
                      }}
                    >
                      {formatDateTimeLocale(n.createdAt, language)}
                    </p>
                  </div>
                  <button
                    onClick={() => readOneMut.mutate(n.id)}
                    title={t("navbar.markAsRead")}
                    className="notif-panel-close-btn"
                    style={{ width: 26, height: 26, borderRadius: 6 }}
                  >
                    <LuCheck size={12} />
                  </button>
                </div>
              ))}
            </>
          )}

          {otherNotifs.length > 0 && (
            <>
              <div
                style={{
                  padding: "8px 14px 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--surface2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <LuBell size={12} style={{ color: roleColor }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--text3)",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                  }}
                >
                  {t("navbar.workUpdates", "Work Updates")}
                </span>
              </div>
              {otherNotifs.slice(0, 8).map((n) => (
                <div key={n.id} className="notif-panel-item">
                  <LuBell
                    size={13}
                    style={{ color: roleColor, flexShrink: 0, marginTop: 3 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <NotificationText
                      language={language}
                      style={{
                        fontSize: 12,
                        lineHeight: 1.45,
                        color: "var(--text1)",
                      }}
                    >
                      {formatUserNotificationMessage(n, t, language)}
                    </NotificationText>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text3)",
                        marginTop: 3,
                      }}
                    >
                      {formatDateTimeLocale(n.createdAt, language)}
                    </p>
                  </div>
                  <button
                    onClick={() => readOneMut.mutate(n.id)}
                    title={t("navbar.markAsRead")}
                    className="notif-panel-close-btn"
                    style={{ width: 26, height: 26, borderRadius: 6 }}
                  >
                    <LuCheck size={12} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  );
}

function NotificationSidebar({ open, onClose, isWorker }) {
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
          <SystemNotifPanel onClose={onClose} />
        )}
      </aside>
    </div>
  );
}

// ─── Month Selection ──────────────────────────────────────────────────────────

function MonthDropdown({ onClose }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const { viewMonth, viewYear, setViewMonth, setViewYear } = useMonth();
  const { isAdmin } = useAuth();

  const [reportLoading, setReportLoading] = useState(false);

  const activeMonth = viewMonth;
  const activeYear = viewYear;
  const setMonth = setViewMonth;
  const setYear = setViewYear;

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const handleGenerateReport = async () => {
    if (reportLoading) return;
    setReportLoading(true);
    try {
      const response = await api.get("/orders/report/monthly", {
        params: { month: viewMonth, year: viewYear },
        responseType: "blob",
      });
      const MONTH_NAMES = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      const monthLabel = MONTH_NAMES[(viewMonth - 1) % 12] || String(viewMonth);
      const filename = `Monthly_Report_${monthLabel}_${viewYear}.pdf`;
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

  return (
    <div
      className="dd-menu month-dd"
      style={{ minWidth: 230, insetInlineStart: 0, insetInlineEnd: "auto" }}
    >
      <div
        className="dd-hd"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        <LuCalendarCheck size={12} />
        {t("navbar.viewDataByMonth", "View Data by Month")}
      </div>

      <div className="month-year-row">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className={`month-year-btn${activeYear === y ? " on" : ""}`}
            onClick={() => setYear(y)}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="month-grid">
        {MONTHS.map((m) => (
          <button
            key={m.value}
            type="button"
            className={`month-cell${activeMonth === m.value ? " on" : ""}`}
            onClick={() => {
              setMonth(m.value);
              onClose();
            }}
          >
            {getMonthLabel(m.value, language)}
          </button>
        ))}
      </div>

      <div style={{ padding: "8px 10px 4px" }}>
        {isAdmin && (
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
        )}
      </div>
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

  const viewLabel = `${getMonthLabel(viewMonth, language)} ${viewYear}`;

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
  const current = i18n.resolvedLanguage || i18n.language || "en";

  return (
    <div className="dd-menu">
      <div className="dd-hd">{t("common.language")}</div>
      {langs.map((lang) => (
        <div
          key={lang.code}
          className={`dd-item${current === lang.code ? " on" : ""}`}
          onClick={() => {
            i18n.changeLanguage(lang.code);
            localStorage.setItem("lang", lang.code);
            onClose();
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 800 }}>{lang.flag}</span>
          <span>{lang.label}</span>
          {current === lang.code && (
            <LuCheck size={13} style={{ marginInlineStart: "auto" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function UserDropdown({ onClose }) {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const roleColor = ROLE_COLORS[user?.accountType] || "var(--text3)";

  const handleLogout = async () => {
    await logout();
    onClose();
    navigate("/login");
  };

  return (
    <div className="dd-menu" style={{ width: 210, insetInlineEnd: 0 }}>
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>
          {user?.name}
        </p>
        <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
          {user?.phoneNumber}
        </p>
        <span
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
          className="dd-item"
          onClick={() => {
            navigate("/users");
            onClose();
          }}
        >
          <LuShieldCheck size={14} />
          <span>{t("users.title")}</span>
        </div>
      )}
      <div
        className="dd-item"
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
  const { dark, toggle } = useTheme();
  const { user, isWorker, isAdmin, isDokan, isFinance, canManageOrders } =
    useAuth();
  const canViewAdminNotifications = isAdmin || isDokan;
  const showNotifications = isWorker || canViewAdminNotifications;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [draftListOpen, setDraftListOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const langRef = useRef();
  const userRef = useRef();
  useOutside(langRef, () => setLangOpen(false));
  useOutside(userRef, () => setUserOpen(false));
  const navigate = useNavigate();

  // Emergency order alerts for Admin/Dokan
  const { data: unreadSystem = [] } = useQuery({
    queryKey: ["notifs-count"],
    queryFn: () => api.get("/notifications?unread=true").then((r) => r.data),
    refetchInterval: 60_000,
    enabled: canViewAdminNotifications,
  });

  // Worker status notifications sent to this admin (work-started, work-completed)
  const { data: unreadAdminWorker = [] } = useQuery({
    queryKey: ["admin-worker-notifs-count"],
    queryFn: () =>
      api
        .get("/users/me/notifications", { params: { unread: true } })
        .then((r) => r.data),
    refetchInterval: 30_000,
    enabled: isAdmin,
  });

  // Assignment notifications for workers (Dokht / Qichikar)
  const { data: unreadUser = [] } = useQuery({
    queryKey: ["my-notifs-count"],
    queryFn: () =>
      api.get("/users/me/notifications?unread=true").then((r) => r.data),
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

  const onSearch = (e) => {
    if (e.key === "Enter" && search.trim()) {
      navigate("/orders", { state: { search: search.trim() } });
      setSearch("");
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
      <header className="navbar no-print">
        <button
          className="nav-btn nav-ham-btn"
          onClick={onHamburger}
          aria-label={t("common.menu", "Menu")}
        >
          <LuMenu size={20} />
        </button>

        <span className="nav-title">{pageTitle}</span>
        <div className="nav-spacer" />

        {(isAdmin || isFinance) && <MonthSelector />}

        <div className="nav-search">
          <LuSearch size={14} className="ns-ico" />
          <input
            type="text"
            placeholder={t("navbar.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearch}
          />
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

        <div className="dd-wrap" ref={langRef}>
          <button
            className="nav-btn"
            onClick={() => {
              setLangOpen((o) => !o);
              setNotifOpen(false);
              setUserOpen(false);
            }}
          >
            <LuLanguages size={17} />
            <span className="nbl">
              {(i18n.resolvedLanguage || "en").slice(0, 2).toUpperCase()}
            </span>
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
            className="nav-btn"
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
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("common.customer", "Customer")}</th>
                  <th>{t("orders.orderTypes", "Order Types")}</th>
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
                    <td>{new Date(draft.updatedAt).toLocaleString()}</td>
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
                          <LuFileText size={13} />
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
              <b>{t("orders.lastUpdated", "Last Updated")}:</b>{" "}
              {new Date(selectedDraft.updatedAt).toLocaleString()}
            </div>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedDraft(null)}
              >
                <LuEye size={14} />
                {t("common.close", "Close")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  resumeDraft(selectedDraft.id);
                }}
              >
                <LuFileText size={14} />
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
