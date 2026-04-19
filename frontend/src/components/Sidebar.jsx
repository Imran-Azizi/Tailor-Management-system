import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LuLayoutDashboard,
  LuPackagePlus,
  LuList,
  LuArchive,
  LuPalette,
  LuBell,
  LuPrinter,
  LuScissors,
  LuChevronLeft,
  LuChevronRight,
  LuChevronDown,
  LuListTodo,
  LuListChecks,
  LuUserCheck,
  LuShieldCheck,
  LuArrowRightLeft,
  LuWalletCards,
  LuTruck,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";

// ─── Nav definitions ─────────────────────────────────────────────────────────
// Items with a `children` array render as collapsible dropdowns.

const ADMIN_NAV = [
  {
    section: "sidebar.overview",
    items: [
      {
        label: "common.dashboard",
        path: "/dashboard",
        Icon: LuLayoutDashboard,
        end: true,
      },
    ],
  },
  {
    section: "sidebar.orders",
    items: [
      {
        label: "common.createOrder",
        path: "/orders/create",
        Icon: LuPackagePlus,
      },
      { label: "common.allOrders", path: "/orders", Icon: LuList, end: true },
      {
        label: "common.pendingOrders",
        path: "/orders/pending",
        Icon: LuListTodo,
        end: true,
      },
      {
        label: "common.completedOrders",
        path: "/orders/completed",
        Icon: LuListChecks,
        end: true,
      },
      {
        key: "assignment-dropdown",
        label: "assignment.assignOrder",
        Icon: LuUserCheck,
        children: [
          {
            label: "assignment.clothesToWorkers",
            path: "/orders/assignments/clothes",
            Icon: LuScissors,
          },
          {
            label: "sidebar.report",
            path: "/orders/assignments/report",
            Icon: LuList,
          },
          {
            label: "sidebar.completedFromWorkers",
            path: "/orders/completed-workers",
            Icon: LuListChecks,
          },
        ],
      },
      {
        label: "sidebar.clothesDelivery",
        path: "/delivery",
        Icon: LuTruck,
        end: true,
      },
      { label: "orders.printBills", path: "/print-bills", Icon: LuPrinter },
    ],
  },
  {
    section: "sidebar.management",
    items: [
      { label: "users.title", path: "/users", Icon: LuShieldCheck },
      {
        key: "transactions-dropdown",
        label: "sidebar.transactions",
        Icon: LuWalletCards,
        children: [
          {
            label: "sidebar.makeTransaction",
            path: "/transactions/create",
            Icon: LuArrowRightLeft,
          },
          {
            label: "sidebar.allTransactions",
            path: "/transactions",
            Icon: LuList,
          },
        ],
      },
      { label: "common.boxManagement", path: "/boxes", Icon: LuArchive },
      { label: "common.designManagement", path: "/designs", Icon: LuPalette },
      { label: "common.notifications", path: "/notifications", Icon: LuBell },
    ],
  },
];

const DOKAN_NAV = [
  {
    section: "sidebar.overview",
    items: [
      {
        label: "common.dashboard",
        path: "/dashboard",
        Icon: LuLayoutDashboard,
        end: true,
      },
    ],
  },
  {
    section: "sidebar.orders",
    items: [
      {
        label: "common.createOrder",
        path: "/orders/create",
        Icon: LuPackagePlus,
      },
      { label: "common.allOrders", path: "/orders", Icon: LuList, end: true },
      {
        label: "common.pendingOrders",
        path: "/orders/pending",
        Icon: LuListTodo,
        end: true,
      },
      {
        label: "common.completedOrders",
        path: "/orders/completed",
        Icon: LuListChecks,
        end: true,
      },
      {
        label: "sidebar.clothesDelivery",
        path: "/delivery",
        Icon: LuTruck,
        end: true,
      },
      { label: "orders.printBills", path: "/print-bills", Icon: LuPrinter },
    ],
  },
  {
    section: "sidebar.management",
    items: [
      {
        key: "transactions-dropdown",
        label: "sidebar.transactions",
        Icon: LuWalletCards,
        children: [
          {
            label: "sidebar.makeTransaction",
            path: "/transactions/create",
            Icon: LuArrowRightLeft,
          },
          {
            label: "sidebar.allTransactions",
            path: "/transactions",
            Icon: LuList,
          },
        ],
      },
      { label: "common.boxManagement", path: "/boxes", Icon: LuArchive },
      { label: "common.designManagement", path: "/designs", Icon: LuPalette },
      { label: "common.notifications", path: "/notifications", Icon: LuBell },
    ],
  },
];

const WORKER_NAV = [
  {
    section: "sidebar.overview",
    items: [
      {
        label: "myTasks.title",
        path: "/my-tasks",
        Icon: LuListTodo,
        end: true,
      },
      { label: "common.allOrders", path: "/orders", Icon: LuList, end: true },
      {
        label: "common.pendingOrders",
        path: "/orders/pending",
        Icon: LuListTodo,
        end: true,
      },
      {
        label: "common.completedOrders",
        path: "/orders/completed",
        Icon: LuListChecks,
        end: true,
      },
    ],
  },
];

const ROLE_NAV = {
  ADMIN: ADMIN_NAV,
  DOKAN: DOKAN_NAV,
  QICHIKAR: WORKER_NAV,
  DOKHT: WORKER_NAV,
};

const ROLE_ACCENT = {
  ADMIN: "#2563EB",
  DOKAN: "#7C3AED",
  QICHIKAR: "#D97706",
  DOKHT: "#DB2777",
};

// ─── Dropdown nav item ────────────────────────────────────────────────────────
function SidebarDropdown({ item, collapsed, accent }) {
  const { t } = useTranslation();
  const location = useLocation();

  // Auto-open when any child is active
  const anyChildActive = item.children.some((c) =>
    location.pathname.startsWith(c.path),
  );
  const [open, setOpen] = useState(anyChildActive);

  const { Icon } = item;

  if (collapsed) {
    // In collapsed mode just show the icon without sub-items
    return (
      <button
        className="sb-item"
        title={t(item.label)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "start",
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="si">
          <Icon size={16} />
        </span>
      </button>
    );
  }

  return (
    <div>
      {/* Parent trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`sb-item${anyChildActive ? " active" : ""}`}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "start",
        }}
      >
        <span className="si">
          <Icon size={16} />
        </span>
        <span className="sl" style={{ flex: 1 }}>
          {t(item.label)}
        </span>
        <span
          style={{
            marginInlineStart: "auto",
            color: "rgba(255,255,255,.35)",
            display: "flex",
            transition: "transform .2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <LuChevronDown size={13} />
        </span>
      </button>

      {/* Children */}
      {open && (
        <div
          style={{
            paddingInlineStart: 10,
            borderInlineStart: `2px solid ${accent}40`,
            marginInlineStart: 22,
            marginTop: 2,
            marginBottom: 4,
          }}
        >
          {item.children.map((child) => (
            <NavLink
              key={child.path}
              to={child.path}
              end
              className={({ isActive }) =>
                `sb-item${isActive ? " active" : ""}`
              }
              style={{ paddingInlineStart: 10, fontSize: 13 }}
            >
              <span className="si">
                <child.Icon size={14} />
              </span>
              <span className="sl">{t(child.label)}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggle, open }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isRtl = false;

  const nav = ROLE_NAV[user?.accountType] || ADMIN_NAV;
  const accent = ROLE_ACCENT[user?.accountType] || "#2563EB";

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${open ? "open" : ""}`}
    >
      <div className="sb-logo">
        <div className="sb-icon-box" style={{ background: accent }}>
          <LuScissors size={17} color="#fff" />
        </div>
        <div className="sb-brand">
          <h1>{t("appName")}</h1>
          <p>{t("appSubtitle")}</p>
        </div>
        <button
          className="sb-toggle"
          onClick={onToggle}
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          {collapsed ? (
            isRtl ? (
              <LuChevronLeft size={13} />
            ) : (
              <LuChevronRight size={13} />
            )
          ) : isRtl ? (
            <LuChevronRight size={13} />
          ) : (
            <LuChevronLeft size={13} />
          )}
        </button>
      </div>

      {/* Role badge */}
      {!collapsed && user && (
        <div
          style={{
            padding: "8px 16px",
            borderBottom: "1px solid var(--sb-bdr)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 9px",
              borderRadius: 99,
              background: accent + "28",
              color: accent,
              letterSpacing: ".04em",
            }}
          >
            {user.accountType}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,.3)",
              marginInlineStart: 7,
            }}
          >
            {user.name}
          </span>
        </div>
      )}

      <nav className="sb-nav">
        {nav.map(({ section, items }) => (
          <div key={section}>
            <div className="sb-section">{t(section)}</div>
            {items.map((item) =>
              item.children ? (
                <SidebarDropdown
                  key={item.key || item.label}
                  item={item}
                  collapsed={collapsed}
                  accent={accent}
                />
              ) : (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `sb-item${isActive ? " active" : ""}`
                  }
                  title={collapsed ? t(item.label) : undefined}
                >
                  <span className="si">
                    <item.Icon size={16} />
                  </span>
                  <span className="sl">{t(item.label)}</span>
                </NavLink>
              ),
            )}
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--sb-bdr)",
            fontSize: 11,
            color: "rgba(255,255,255,.18)",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {t("sidebar.copyright")}
        </div>
      )}
    </aside>
  );
}
