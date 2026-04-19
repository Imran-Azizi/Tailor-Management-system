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
} from "react-icons/lu";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import {
  formatSystemNotificationMessage,
  formatUserNotificationMessage,
} from "../lib/notifications.js";
import { formatDateTimeLocale } from "../lib/locale.js";
import { NotificationText } from "./ui/index.jsx";

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

      {!hasAny ? (
        <div className="notif-panel-empty">{t("navbar.allCaughtUp")}</div>
      ) : (
        <div className="notif-panel-scroll">
          {/* Worker status updates */}
          {workerNotifs.length > 0 && (
            <>
              <div
                style={{
                  padding: "8px 14px 6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--surface2)",
                }}
              >
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
                <button
                  onClick={() => readAllWorkerMut.mutate()}
                  disabled={readAllWorkerMut.isPending}
                  style={{
                    fontSize: 11,
                    color: "var(--text3)",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    fontWeight: 500,
                  }}
                >
                  {t("navbar.markAllRead")}
                </button>
              </div>
              {workerNotifs.slice(0, 6).map((n) => (
                <div key={n.id} className="notif-panel-item">
                  <LuBell
                    size={13}
                    style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }}
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
                  </div>
                  <button
                    onClick={() => readWorkerMut.mutate(n.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text3)",
                      display: "flex",
                    }}
                  >
                    <LuCheck size={13} />
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Emergency order alerts */}
          {emergency.length > 0 && (
            <>
              <div
                style={{
                  padding: "8px 14px 6px",
                  background: "var(--surface2)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#EF4444",
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
                    style={{ color: "#EF4444", flexShrink: 0, marginTop: 2 }}
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
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text3)",
                      display: "flex",
                    }}
                  >
                    <LuCheck size={13} />
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

// Assignment notifications (for Qichikar/Dokht)
function UserNotifPanel({ onClose }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const { data: notifs = [] } = useQuery({
    queryKey: ["my-notifs-nav"],
    queryFn: () =>
      api.get("/users/me/notifications?unread=true").then((r) => r.data),
  });

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

  return (
    <>
      <div className="notif-panel-head">
        <span className="notif-panel-title">{t("navbar.notifications")}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {notifs.length > 0 && (
            <>
              <button
                onClick={() => {
                  navigate("/my-tasks");
                  onClose();
                }}
                className="notif-panel-link-btn"
              >
                {t("navbar.viewAll")}
              </button>
              <button
                onClick={() => readAllMut.mutate()}
                disabled={readAllMut.isPending}
                style={{
                  fontSize: 12,
                  color: "var(--text3)",
                  fontWeight: 500,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                {t("navbar.markAllRead")}
              </button>
            </>
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
          {notifs.slice(0, 8).map((n) => (
            <div
              key={n.id}
              className="notif-panel-item"
              style={{ cursor: "default" }}
            >
              <LuBell
                size={13}
                style={{ color: "#2563EB", flexShrink: 0, marginTop: 3 }}
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
                  style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}
                >
                  {formatDateTimeLocale(n.createdAt, language)}
                </p>
              </div>
              <button
                onClick={() => readOneMut.mutate(n.id)}
                title={t("navbar.markAsRead")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text3)",
                  display: "flex",
                  padding: "3px 4px",
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              >
                <LuCheck size={13} />
              </button>
            </div>
          ))}
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

function LangDropdown({ onClose }) {
  const { i18n, t } = useTranslation();
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
  const roleColor = ROLE_COLORS[user?.accountType] || "#888";

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
        style={{ color: "#EF4444" }}
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
  const { user, isWorker } = useAuth();
  const [search, setSearch] = useState("");
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
    enabled: !isWorker,
  });

  // Worker status notifications sent to this admin (work-started, work-completed)
  const { data: unreadAdminWorker = [] } = useQuery({
    queryKey: ["admin-worker-notifs-count"],
    queryFn: () =>
      api
        .get("/users/me/notifications", { params: { unread: true } })
        .then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !isWorker,
  });

  // Assignment notifications for workers (Dokht / Qichikar)
  const { data: unreadUser = [] } = useQuery({
    queryKey: ["my-notifs-count"],
    queryFn: () =>
      api.get("/users/me/notifications?unread=true").then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !!isWorker,
  });

  const unreadCount = isWorker
    ? unreadUser.length
    : unreadSystem.length + unreadAdminWorker.length;

  const onSearch = (e) => {
    if (e.key === "Enter" && search.trim()) {
      navigate("/orders", { state: { search: search.trim() } });
      setSearch("");
    }
  };

  const roleColor = ROLE_COLORS[user?.accountType] || "#888";

  return (
    <>
      <header className="navbar no-print">
        <button
          className="nav-btn"
          onClick={onHamburger}
          style={{ display: "none" }}
          id="ham-btn"
        >
          <LuMenu size={20} />
        </button>

        <span className="nav-title">{pageTitle}</span>
        <div className="nav-spacer" />

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
              <span
                className="notif-dot"
                style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 99,
                  background: "#EF4444",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "absolute",
                  top: -4,
                  insetInlineEnd: -4,
                  padding: "0 4px",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>

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

        <style>{`#ham-btn{display:flex!important}@media(min-width:769px){#ham-btn{display:none!important}}`}</style>
      </header>
      <NotificationSidebar
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        isWorker={isWorker}
      />
    </>
  );
}
