import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "./Sidebar.jsx";
import Navbar from "./Navbar.jsx";

const SIDEBAR_COLLAPSED_KEY = "layout:sidebar-collapsed";

function getInitialCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

const TITLES = {
  "/dashboard": "common.dashboard",
  "/orders/create": "common.createOrder",
  "/orders/global-search": "globalSearch.title",
  "/orders": "common.allOrders",
  "/orders/pending": "common.pendingOrders",
  "/orders/completed": "common.completedOrders",
  "/orders/assignments": "assignment.assignOrder",
  "/orders/assignments/clothes": "assignment.assignOrder",
  "/orders/assignments/report": "sidebar.clothesStatus",
  "/delivery": "sidebar.clothesDelivery",
  "/customers": "common.customers",
  "/boxes": "common.boxManagement",
  "/designs": "common.designManagement",
  "/print-bills": "orders.printBills",
  "/notifications": "common.notifications",
  "/users": "users.title",
  "/damaged-clothes": "damagedClothes.title",
  "/super-admin/backups": "backup.title",
  "/my-tasks": "myTasks.title",
  "/customers/create": "sidebar.createNewAccount",
  "/customers/transactions": "sidebar.dadAndStud",
  "/customers/report": "report.title",
  "/transactions/create": "transaction.title",
  "/transactions": "transaction.allTitle",
  "/support-team": "supportTeam.title",
};
const SORTED_TITLE_ENTRIES = Object.entries(TITLES).sort(
  (a, b) => b[0].length - a[0].length,
);

export default function Layout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const closeMobileSidebar = useCallback(() => setMobileOpen(false), []);
  const toggleMobileSidebar = useCallback(() => setMobileOpen((o) => !o), []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const prevOverflow = document.body.style.overflow;
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen]);

  const titleKey =
    SORTED_TITLE_ENTRIES.find(
      ([p]) => loc.pathname === p || loc.pathname.startsWith(`${p}/`),
    )?.[1] || "appName";

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        open={mobileOpen}
        onNavigate={closeMobileSidebar}
      />
      <div
        className={`sb-overlay${mobileOpen ? " on" : ""}`}
        onClick={closeMobileSidebar}
      />
      <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
        <Navbar
          onHamburger={toggleMobileSidebar}
          pageTitle={t(titleKey)}
        />
        <main className="min-w-0" style={{ flex: 1 }}>
          <Outlet key={loc.pathname} />
        </main>
      </div>
    </>
  );
}
