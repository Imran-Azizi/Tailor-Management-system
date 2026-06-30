import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCircleAlert,
  LuClipboardList,
  LuInbox,
  LuLayoutDashboard,
  LuPanelLeftClose,
  LuPlay,
  LuSquareCheck,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";
import { useWorkerPanel } from "../context/WorkerPanelContext.jsx";
import { isRtlLanguage, normalizeLanguage } from "../lib/locale.js";

const TAB_ICONS = {
  all: LuClipboardList,
  assigned: LuInbox,
  inProgress: LuPlay,
  completed: LuSquareCheck,
  penalties: LuCircleAlert,
};

const ROLE_LABEL_KEYS = {
  DOKHT: "workerLayout.dokhtPanel",
  QICHIKAR: "workerLayout.qichikarPanel",
};

export default function WorkerSidebar({ roleColor, RoleIcon }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeTab,
    setActiveTab,
    tabs,
    collapsed,
    toggleCollapsed,
    mobileOpen,
    closeMobileSidebar,
  } = useWorkerPanel();

  const normalizedLang = normalizeLanguage(
    i18n.resolvedLanguage || i18n.language,
  );
  const isRtl = isRtlLanguage(normalizedLang);
  const roleLabelKey =
    ROLE_LABEL_KEYS[user?.accountType] || ROLE_LABEL_KEYS.QICHIKAR;
  const roleLabel = t(roleLabelKey);

  const isDashboardView = location.pathname === "/panel/dashboard";

  const handleDashboardClick = () => {
    navigate("/panel/dashboard");
    closeMobileSidebar();
  };

  const handleTabClick = (key) => {
    setActiveTab(key);
    navigate("/panel/orders");
    closeMobileSidebar();
  };

  return (
    <aside
      className={`worker-sidebar no-print ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}
      style={{ "--worker-accent": roleColor }}
      aria-label={t("workerLayout.tailorSystem")}
    >
      <div className="worker-sidebar__glow" aria-hidden="true" />

      <header className="worker-sidebar__head">
        <div
          className="worker-sidebar__brand-icon"
          style={{ background: roleColor }}
        >
          <RoleIcon size={18} color="#fff" />
        </div>
        {!collapsed && (
          <div className="worker-sidebar__brand-copy">
            <p className="worker-sidebar__brand-title">
              {t("workerLayout.tailorSystem")}
            </p>
            <p
              className="worker-sidebar__brand-sub"
              style={{ color: roleColor }}
            >
              {roleLabel}
            </p>
          </div>
        )}
        <button
          type="button"
          className="worker-sidebar__toggle worker-sidebar__toggle--desktop"
          onClick={toggleCollapsed}
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {collapsed ? (
            isRtl ? (
              <LuChevronLeft size={14} />
            ) : (
              <LuChevronRight size={14} />
            )
          ) : isRtl ? (
            <LuChevronRight size={14} />
          ) : (
            <LuChevronLeft size={14} />
          )}
        </button>
        <button
          type="button"
          className="worker-sidebar__toggle worker-sidebar__toggle--mobile"
          onClick={closeMobileSidebar}
          aria-label={t("common.close")}
        >
          <LuPanelLeftClose size={15} />
        </button>
      </header>

      <nav
        className="worker-sidebar__nav"
        role="navigation"
        aria-label={t("workerSidebar.mainNav", "Main Navigation")}
      >
        {!collapsed && (
          <p className="worker-sidebar__section-label">
            {t("workerSidebar.navigation", "Navigation")}
          </p>
        )}
        <ul className="worker-sidebar__nav-list" role="menu">
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className={`worker-sidebar__nav-item${isDashboardView ? " active" : ""}`}
              onClick={handleDashboardClick}
              title={collapsed ? t("workerSidebar.dashboard", "Dashboard") : undefined}
              aria-current={isDashboardView ? "page" : undefined}
            >
              <span className="worker-sidebar__nav-icon">
                <LuLayoutDashboard size={16} />
              </span>
              {!collapsed && (
                <span className="worker-sidebar__nav-label">
                  {t("workerSidebar.dashboard", "Dashboard")}
                </span>
              )}
            </button>
          </li>
        </ul>

        {!collapsed && (
          <p className="worker-sidebar__section-label" style={{ marginTop: 12 }}>
            {t("workerPanel.ordersNav", "Orders")}
          </p>
        )}
        <ul className="worker-sidebar__nav-list" role="menu">
          {tabs.map((tab) => {
            const Icon = TAB_ICONS[tab.key] || LuClipboardList;
            const isActive = !isDashboardView && activeTab === tab.key;
            return (
              <li key={tab.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`worker-sidebar__nav-item${isActive ? " active" : ""}`}
                  onClick={() => handleTabClick(tab.key)}
                  title={collapsed ? tab.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="worker-sidebar__nav-icon">
                    <Icon size={16} />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="worker-sidebar__nav-label">
                        {tab.label}
                      </span>
                      <span
                        className={`worker-sidebar__nav-count${isActive ? " active" : ""}`}
                      >
                        {tab.count}
                      </span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
