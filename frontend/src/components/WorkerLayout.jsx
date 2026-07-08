import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuScissors,
  LuRuler,
  LuBell,
  LuCheck,
  LuCalendarCheck,
  LuMenu,
  LuX,
  LuLogOut,
  LuUser,
  LuSun,
  LuMoon,
  LuLanguages,
  LuChevronDown,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";
import toast from "react-hot-toast";
import { useTheme } from "../context/ThemeContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { WorkerPanelProvider, useWorkerPanel } from "../context/WorkerPanelContext.jsx";
import WorkerSidebar from "./WorkerSidebar.jsx";
import api from "../lib/api.js";
import { formatUserNotificationMessage } from "../lib/notifications.js";
import { getNotificationSummary } from "../lib/notificationGrouping.js";
import {
  formatDateTimeLocale,
  formatRelativeTimeLocale,
  isRtlLanguage,
  normalizeLanguage,
} from "../lib/locale.js";
import {
  getLatestNotificationTimestamp,
  playNotificationChime,
} from "../lib/notificationSound.js";
import {
  MONTHS,
  getDisplayMonthLabelForLanguage,
  getDisplayYearForLanguage,
} from "../lib/months.js";
import AfCurrencyIcon from "./ui/AfCurrencyIcon.jsx";
import { NotificationText } from "./ui/index.jsx";

const ROLE_CONFIG = {
  DOKHT: {
    color: "#DB2777",
    labelKey: "workerLayout.dokhtPanel",
    Icon: LuScissors,
  },
  QICHIKAR: {
    color: "#D97706",
    labelKey: "workerLayout.qichikarPanel",
    Icon: LuRuler,
  },
};

function useOutside(ref, fn) {
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) fn();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, fn]);
}

function LangMenu({ onClose }) {
  const { i18n, t } = useTranslation();
  const langs = [
    { code: "en", label: t("common.english"), flag: "EN" },
    { code: "dari", label: t("common.dari"), flag: "DR" },
    { code: "pashto", label: t("common.pashto"), flag: "PS" },
  ];
  const current = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const isRtl = isRtlLanguage(current);

  return (
    <div
      className={`language-dd-menu worker-language-dd-menu ${
        isRtl ? "language-dd-menu--rtl" : "language-dd-menu--ltr"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {langs.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`language-dd-item${current === l.code ? " on" : ""}`}
          onClick={() => {
            i18n.changeLanguage(l.code);
            localStorage.setItem("lang", l.code);
            onClose();
          }}
        >
          <span className="language-dd-item__code">{l.flag}</span>
          <span className="language-dd-item__label">{l.label}</span>
        </button>
      ))}
    </div>
  );
}

function UserMenu({ roleColor, onClose }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    onClose();
    toast.success(t("auth.loggedOut", t("feedback.loggedOut")));
    navigate("/login");
  };

  return (
    <div
      className="absolute top-[110%] z-[300] w-[min(90vw,210px)] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
      style={{ insetInlineEnd: 0 }}
    >
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
      <div
        onClick={handleLogout}
        style={{
          padding: "11px 14px",
          display: "flex",
          alignItems: "center",
          gap: 9,
          cursor: "pointer",
          color: "var(--danger)",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <LuLogOut size={14} />
        <span>{t("workerLayout.logout")}</span>
      </div>
    </div>
  );
}

function WorkerNotifDrawer({ open, roleColor, onClose }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const workerScope = [user?.id, user?.accountType];

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

  const { data: notifsRaw = [] } = useQuery({
    queryKey: ["worker-notifs-drawer", ...workerScope],
    queryFn: () =>
      api
        .get("/users/me/notifications", { params: { unread: true } })
        .then((r) => r.data),
    enabled: Boolean(user?.id && user?.accountType) && open,
    refetchInterval: open ? 20_000 : false,
  });

  const notifs = Array.isArray(notifsRaw) ? notifsRaw : [];

  const readAllMut = useMutation({
    mutationFn: () => api.patch("/users/me/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-notifs-drawer"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
    },
  });

  const readOneMut = useMutation({
    mutationFn: (id) => api.patch(`/users/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-notifs-drawer"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
    },
  });

  const paymentNotifs = notifs.filter((n) => n.type === "ADMIN_PAYMENT");
  const otherNotifs = notifs.filter((n) => n.type !== "ADMIN_PAYMENT");

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
        aria-label={t("workerLayout.notifications")}
        aria-hidden={!open}
      >
        <div className="notif-panel-head">
          <span className="notif-panel-title">
            {t("workerLayout.notifications")}
          </span>
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
          <div className="notif-panel-empty">
            {t("workerLayout.noNewAssignments")}
          </div>
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
                  <AfCurrencyIcon
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
                {paymentNotifs.map((n) => {
                  const summary = getNotificationSummary(
                    formatUserNotificationMessage(n, t, language),
                  );
                  return (
                    <div key={n.id} className="notif-panel-item">
                      <AfCurrencyIcon
                        size={14}
                        style={{
                          color: "var(--success)",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="notif-feed-item__title">
                          {summary.title}
                        </p>
                        {summary.message && (
                          <NotificationText
                            language={language}
                            className="notif-feed-item__message"
                          >
                            {summary.message}
                          </NotificationText>
                        )}
                        <p
                          className="notif-feed-item__meta"
                          title={formatDateTimeLocale(n.createdAt, language)}
                        >
                          {formatRelativeTimeLocale(n.createdAt, language)}
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
                  );
                })}
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
                {otherNotifs.map((n) => {
                  const summary = getNotificationSummary(
                    formatUserNotificationMessage(n, t, language),
                  );
                  return (
                    <div key={n.id} className="notif-panel-item">
                      <LuBell
                        size={13}
                        style={{ color: roleColor, flexShrink: 0, marginTop: 3 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="notif-feed-item__title">
                          {summary.title}
                        </p>
                        {summary.message && (
                          <NotificationText
                            language={language}
                            className="notif-feed-item__message"
                          >
                            {summary.message}
                          </NotificationText>
                        )}
                        <p
                          className="notif-feed-item__meta"
                          title={formatDateTimeLocale(n.createdAt, language)}
                        >
                          {formatRelativeTimeLocale(n.createdAt, language)}
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
                  );
                })}
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function WorkerLayoutInner() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const workerScope = [user?.id, user?.accountType];
  const {
    collapsed,
    toggleMobileSidebar,
    closeMobileSidebar,
    mobileOpen,
    activeTab,
    tabs,
  } = useWorkerPanel();

  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const langRef = useRef();
  const userRef = useRef();

  useOutside(langRef, () => setLangOpen(false));
  useOutside(userRef, () => setUserOpen(false));

  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;
  const { color: roleColor, labelKey, Icon: RoleIcon } = cfg;
  const roleLabel = t(labelKey);
  const {
    viewMonth,
    viewYear,
    setViewMonth,
    setViewYear,
    monthPolicy,
    isSelectableMonth,
  } = useMonth();
  const baseYear = Number(
    monthPolicy.currentYear || viewYear || new Date().getFullYear(),
  );
  const selectableYears = [baseYear - 1, baseYear, baseYear + 1].filter((y) =>
    MONTHS.some((m) => isSelectableMonth(m.value, y)),
  );

  const language = i18n.resolvedLanguage || i18n.language || "en";
  const normalizedLang = normalizeLanguage(language);
  const isRtl = isRtlLanguage(normalizedLang);
  const currentLang =
    normalizedLang === "dari" ? "DR" : normalizedLang === "pashto" ? "PS" : "EN";

  const { data: unreadNotifsRaw = [] } = useQuery({
    queryKey: ["worker-notifs-count", ...workerScope],
    queryFn: () =>
      api
        .get("/users/me/notifications", { params: { unread: true } })
        .then((r) => r.data),
    enabled: Boolean(user?.id && user?.accountType),
    refetchInterval: 30_000,
  });

  const unreadNotifs = Array.isArray(unreadNotifsRaw) ? unreadNotifsRaw : [];
  const lastWorkerSoundTs = useRef(0);

  useEffect(() => {
    const latestTimestamp = getLatestNotificationTimestamp(unreadNotifs);
    if (!latestTimestamp) return;

    if (!lastWorkerSoundTs.current) {
      lastWorkerSoundTs.current = latestTimestamp;
      return;
    }

    if (latestTimestamp > lastWorkerSoundTs.current) {
      playNotificationChime();
      lastWorkerSoundTs.current = latestTimestamp;
    }
  }, [unreadNotifs]);

  const isDashboardView = location.pathname === "/panel/dashboard";

  const activeTabLabel = isDashboardView
    ? t("workerSidebar.dashboard", "Dashboard")
    : tabs.find((tab) => tab.key === activeTab)?.label ||
      t("workerPanel.allOrders", "All Orders");

  return (
    <div className="worker-shell" style={{ minHeight: "100vh" }}>
      <WorkerSidebar roleColor={roleColor} RoleIcon={RoleIcon} />

      <button
        type="button"
        className={`worker-sidebar-overlay no-print${mobileOpen ? " on" : ""}`}
        onClick={closeMobileSidebar}
        aria-label={t("common.close")}
        tabIndex={mobileOpen ? 0 : -1}
      />

      <div
        className={`worker-app-shell${collapsed ? " collapsed" : ""}`}
      >
        <header className="worker-navbar">
          <button
            type="button"
            className="worker-navbar__menu-btn no-print"
            onClick={toggleMobileSidebar}
            aria-label={t("sidebar.expand", "Open menu")}
          >
            <LuMenu size={18} />
          </button>

          <div className="worker-navbar__title-wrap">
            <div
              className="worker-navbar__icon"
              style={{ background: roleColor }}
            >
              <RoleIcon size={15} color="#fff" />
            </div>
            <div className="worker-navbar__title-copy">
              <p className="worker-navbar__page-title">{activeTabLabel}</p>
              <p className="worker-navbar__page-sub" style={{ color: roleColor }}>
                {roleLabel}
              </p>
            </div>
          </div>

          <div
            className="worker-month-wrap"
            title={t("navbar.viewDataByMonth", "View Data by Month")}
          >
            <LuCalendarCheck size={14} style={{ color: "var(--text2)" }} />
            <select
              className="worker-month-select"
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
            >
              {MONTHS.map((month) => (
                <option
                  key={month.value}
                  value={month.value}
                  disabled={!isSelectableMonth(month.value, viewYear)}
                >
                  {getDisplayMonthLabelForLanguage(
                    month.value,
                    viewYear,
                    language,
                  )}
                </option>
              ))}
            </select>
            <select
              className="worker-month-select"
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
            >
              {selectableYears.map((year) => (
                <option key={year} value={year}>
                  {getDisplayYearForLanguage(year, viewMonth, language)}
                </option>
              ))}
            </select>
          </div>

          <div className="worker-controls ms-auto flex flex-wrap items-center justify-end gap-2">
            <div
              style={{ position: "relative" }}
              ref={langRef}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setLangOpen((o) => !o);
                  setUserOpen(false);
                }}
                className="worker-nav-btn"
              >
                <LuLanguages size={14} />
                <span style={{ fontWeight: 700, fontSize: 12 }}>
                  {currentLang}
                </span>
              </button>
              {langOpen && <LangMenu onClose={() => setLangOpen(false)} />}
            </div>

            <button type="button" onClick={toggle} className="worker-nav-btn">
              {dark ? <LuSun size={15} /> : <LuMoon size={15} />}
            </button>

            <button
              type="button"
              onClick={() => {
                setNotifOpen(true);
                setLangOpen(false);
                setUserOpen(false);
              }}
              className="worker-nav-btn relative"
            >
              <LuBell size={17} />
              {unreadNotifs.length > 0 && (
                <span className="worker-navbar__notif-badge">
                  {unreadNotifs.length > 9 ? "9+" : unreadNotifs.length}
                </span>
              )}
            </button>

            <div
              style={{ position: "relative" }}
              ref={userRef}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setUserOpen((o) => !o);
                  setNotifOpen(false);
                  setLangOpen(false);
                }}
                className="worker-nav-btn gap-2 px-2.5 py-1.5"
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
                  className="worker-user-name"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    maxWidth: 100,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--text1)",
                  }}
                >
                  {user?.name}
                </span>
                <LuChevronDown size={12} style={{ color: "var(--text3)" }} />
              </button>
              {userOpen && (
                <UserMenu
                  roleColor={roleColor}
                  onClose={() => setUserOpen(false)}
                />
              )}
            </div>
          </div>
        </header>

        <main
          className="worker-main"
          style={{ textAlign: isRtl ? "right" : "left" }}
        >
          <Outlet key={location.pathname} />
        </main>
      </div>

      <WorkerNotifDrawer
        open={notifOpen}
        roleColor={roleColor}
        onClose={() => setNotifOpen(false)}
      />
    </div>
  );
}

export default function WorkerLayout() {
  const { user } = useAuth();
  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;

  return (
    <WorkerPanelProvider roleColor={cfg.color}>
      <WorkerLayoutInner />
    </WorkerPanelProvider>
  );
}
