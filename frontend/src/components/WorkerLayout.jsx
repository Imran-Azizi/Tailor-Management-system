import { useRef, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuScissors,
  LuBell,
  LuLogOut,
  LuUser,
  LuCheck,
  LuSun,
  LuMoon,
  LuLanguages,
  LuCalendarCheck,
  LuChevronDown,
  LuX,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import api from "../lib/api.js";
import { formatUserNotificationMessage } from "../lib/notifications.js";
import { formatDateTimeLocale } from "../lib/locale.js";
import {
  MONTHS,
  getDisplayMonthLabelForLanguage,
  getDisplayYearForLanguage,
} from "../lib/months.js";
import AfCurrencyIcon from "./ui/AfCurrencyIcon.jsx";
import { NotificationText } from "./ui/index.jsx";

const ROLE_CONFIG = {
  DOKHT: { color: "#DB2777", labelKey: "workerLayout.dokhtPanel" },
  QICHIKAR: { color: "#D97706", labelKey: "workerLayout.qichikarPanel" },
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

function WorkerNotifDrawer({ open, roleColor, onClose }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const workerScope = [user?.id, user?.accountType];

  // Lock body scroll and handle Escape key when open
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
      qc.invalidateQueries({ queryKey: ["worker-panel-notifs"] });
    },
  });

  const readOneMut = useMutation({
    mutationFn: (id) => api.patch(`/users/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-notifs-drawer"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
      qc.invalidateQueries({ queryKey: ["worker-panel-notifs"] });
    },
  });

  // Classify: payment notifications vs assignment/status notifications
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
        {/* Header */}
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

        {/* Body */}
        {notifs.length === 0 ? (
          <div className="notif-panel-empty">
            {t("workerLayout.noNewAssignments")}
          </div>
        ) : (
          <div className="notif-panel-scroll">
            {/* Payment notifications from Admin */}
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
                {paymentNotifs.map((n) => (
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

            {/* Assignment / status notifications */}
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
                {otherNotifs.map((n) => (
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
      </aside>
    </div>
  );
}

function LangMenu({ onClose }) {
  const { i18n, t } = useTranslation();
  const langs = [
    { code: "en", label: t("common.english"), flag: "EN" },
    { code: "dari", label: t("common.dari"), flag: "DR" },
    { code: "pashto", label: t("common.pashto"), flag: "PS" },
  ];
  const current = i18n.resolvedLanguage || "en";

  return (
    <div
      className="absolute top-[110%] z-[300] min-w-[150px] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] shadow-md"
      style={{ insetInlineEnd: 0 }}
    >
      {langs.map((l) => (
        <div
          key={l.code}
          onClick={() => {
            i18n.changeLanguage(l.code);
            localStorage.setItem("lang", l.code);
            onClose();
          }}
          style={{
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 9,
            cursor: "pointer",
            fontSize: 13,
            color: current === l.code ? "var(--primary)" : "var(--text1)",
            fontWeight: current === l.code ? 600 : 400,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 800 }}>{l.flag}</span>
          {l.label}
          {current === l.code && (
            <LuCheck size={12} style={{ marginInlineStart: "auto" }} />
          )}
        </div>
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

export default function WorkerLayout() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const workerScope = [user?.id, user?.accountType];

  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const langRef = useRef();
  const userRef = useRef();

  useOutside(langRef, () => setLangOpen(false));
  useOutside(userRef, () => setUserOpen(false));

  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;
  const { color: roleColor, labelKey } = cfg;
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

  const currentLang = (i18n.resolvedLanguage || "en").slice(0, 2).toUpperCase();
  const isRtl = (i18n.dir?.() || "ltr") === "rtl";

  return (
    <div
      className="worker-shell"
      style={{ minHeight: "100vh", background: "var(--bg)" }}
    >
      <header
        className="worker-navbar sticky top-0 z-[100] flex min-h-[60px] flex-wrap items-center gap-2 px-3 py-2 sm:px-4 lg:flex-nowrap lg:px-6"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          className="worker-brand flex min-w-0 flex-1 items-center gap-2.5"
          style={{ marginInlineEnd: "auto" }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: roleColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LuScissors size={18} color="#fff" />
          </div>
          <div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.1,
                color: "var(--text1)",
              }}
            >
              {t("workerLayout.tailorSystem")}
            </p>
            <p style={{ fontSize: 11, color: roleColor, fontWeight: 600 }}>
              {roleLabel}
            </p>
          </div>
        </div>

        <div
          className="worker-month-wrap order-3 flex w-full items-center gap-2 overflow-x-auto rounded-xl px-2 py-1.5 lg:order-none lg:w-auto"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface2)",
          }}
          title={t("navbar.viewDataByMonth", "View Data by Month")}
        >
          <LuCalendarCheck size={14} style={{ color: "var(--text2)" }} />
          <select
            className="min-w-[120px]"
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            style={workerMonthSelectStyle}
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
            className="min-w-[100px]"
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            style={workerMonthSelectStyle}
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

          <button onClick={toggle} className="worker-nav-btn">
            {dark ? <LuSun size={15} /> : <LuMoon size={15} />}
          </button>

          <button
            onClick={() => {
              setNotifOpen(true);
              setLangOpen(false);
              setUserOpen(false);
            }}
            className="worker-nav-btn relative"
          >
            <LuBell size={17} />
            {unreadNotifs.length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -5,
                  insetInlineEnd: -5,
                  minWidth: 17,
                  height: 17,
                  borderRadius: 99,
                  background: "var(--notif-dot-bg)",
                  color: "var(--notif-dot-text)",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                }}
              >
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
        className="worker-main mx-auto w-full max-w-[1140px] min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-5 lg:py-7"
        style={{ textAlign: isRtl ? "right" : "left" }}
      >
        <Outlet key={location.pathname} />
      </main>

      <WorkerNotifDrawer
        open={notifOpen}
        roleColor={roleColor}
        onClose={() => setNotifOpen(false)}
      />
    </div>
  );
}

const workerMonthSelectStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
  color: "var(--text1)",
  fontSize: 12,
  fontWeight: 600,
  padding: "5px 8px",
  outline: "none",
};
