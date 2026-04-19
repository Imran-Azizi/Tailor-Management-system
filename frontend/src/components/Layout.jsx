import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "./Sidebar.jsx";
import Navbar from "./Navbar.jsx";

const TITLES = {
  "/dashboard": "common.dashboard",
  "/orders/create": "common.createOrder",
  "/orders": "common.allOrders",
  "/orders/pending": "common.pendingOrders",
  "/orders/completed": "common.completedOrders",
  "/orders/assignments": "assignment.assignOrder",
  "/orders/assignments/clothes": "assignment.assignOrder",
  "/orders/assignments/report": "sidebar.report",
  "/delivery": "sidebar.clothesDelivery",
  "/customers": "common.customers",
  "/boxes": "common.boxManagement",
  "/designs": "common.designManagement",
  "/print-bills": "orders.printBills",
  "/notifications": "common.notifications",
  "/users": "users.title",
  "/my-tasks": "myTasks.title",
  "/customers/create": "sidebar.createNewAccount",
  "/customers/transactions": "sidebar.dadAndStud",
  "/customers/report": "sidebar.report",
};

export default function Layout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  const titleKey =
    Object.entries(TITLES)
      .sort((a, b) => b[0].length - a[0].length)
      .find(
      ([p]) => loc.pathname === p || loc.pathname.startsWith(`${p}/`),
    )?.[1] || "appName";

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        open={mobileOpen}
      />
      <div
        className={`sb-overlay${mobileOpen ? " on" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
        <Navbar
          onHamburger={() => setMobileOpen((o) => !o)}
          pageTitle={t(titleKey)}
        />
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
