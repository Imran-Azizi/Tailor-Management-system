import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LuChevronLeft,
  LuChevronRight,
  LuPanelLeftClose,
  LuScissors,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";
import SidebarGroup from "./sidebar/SidebarGroup.jsx";
import { isRouteActive } from "./sidebar/routeMatch.js";
import { getRoleAccent, getSidebarSections } from "./sidebar/sidebarConfig.js";

function loadExpandedState(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function isChildActive(pathname, children) {
  return children.some((child) =>
    isRouteActive(pathname, child.path, child.end ?? true),
  );
}

function withLocalizedLabels(sections, t) {
  return sections.map((section) => ({
    ...section,
    title: t(section.label, section.fallback),
    items: section.items.map((item) => ({
      ...item,
      text: t(item.label, item.fallback),
      children: item.children?.map((child) => ({
        ...child,
        text: t(child.label, child.fallback),
      })),
    })),
  }));
}

function withActiveDefaults(stored, sections, pathname) {
  const next = { ...stored };

  sections.forEach((section) => {
    section.items.forEach((item) => {
      if (!item.children?.length) return;
      if (next[item.key] != null) return;
      next[item.key] = isChildActive(pathname, item.children);
    });
  });

  return next;
}

export default function Sidebar({ collapsed, onToggle, open, onNavigate }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.accountType || "ADMIN";
  const accent = getRoleAccent(role);
  const isRtl = (i18n.dir?.() || "ltr") === "rtl";
  const expandedStorageKey = `sidebar:expanded:${role}`;

  const sections = useMemo(
    () => withLocalizedLabels(getSidebarSections(role), t),
    [role, t],
  );

  const [expandedGroups, setExpandedGroups] = useState(() =>
    withActiveDefaults(
      loadExpandedState(expandedStorageKey),
      sections,
      location.pathname,
    ),
  );

  useEffect(() => {
    setExpandedGroups(
      (prev) =>
        withActiveDefaults(
          loadExpandedState(expandedStorageKey),
          sections,
          location.pathname,
        ) || prev,
    );
  }, [expandedStorageKey, sections, location.pathname]);

  useEffect(() => {
    localStorage.setItem(expandedStorageKey, JSON.stringify(expandedGroups));
  }, [expandedGroups, expandedStorageKey]);

  const { data: pendingOrdersData } = useQuery({
    queryKey: ["orders-sidebar-pending-count", role],
    queryFn: () =>
      api
        .get("/orders", {
          params: {
            status: "pending",
            page: 1,
            limit: 1,
          },
        })
        .then((r) => r.data),
    enabled: Boolean(user?.id),
    refetchInterval: 30_000,
  });

  const pendingCount =
    pendingOrdersData?.total ?? pendingOrdersData?.data?.length ?? 0;

  const badges = useMemo(
    () => ({
      pendingOrders: pendingCount,
    }),
    [pendingCount],
  );

  const toggleGroup = (groupKey, currentlyOpen) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !currentlyOpen,
    }));
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${open ? "open" : ""} no-print`}
      style={{
        background:
          "radial-gradient(900px 420px at -20% -10%, rgba(59,130,246,0.22), transparent), radial-gradient(700px 300px at 120% 10%, rgba(16,185,129,0.12), transparent), linear-gradient(180deg, #081224 0%, #0C172B 34%, #0F172A 100%)",
        borderRight: isRtl ? undefined : "1px solid rgba(148,163,184,.2)",
        borderLeft: isRtl ? "1px solid rgba(148,163,184,.2)" : undefined,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_26%,transparent)]" />

      <header className="flex h-[var(--nav-h)] shrink-0 items-center gap-2 border-b border-white/10 px-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-md"
          style={{ background: accent }}
          aria-hidden="true"
        >
          <LuScissors size={18} color="white" />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold tracking-tight text-white">
              {t("appName")}
            </h1>
            <p className="truncate text-[11px] text-slate-300/70">
              {t("appSubtitle")}
            </p>
          </div>
        )}

        <button
          type="button"
          className="hidden h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white md:inline-flex"
          onClick={onToggle}
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white md:hidden"
          onClick={onNavigate}
          aria-label={t("common.close", "Close")}
          title={t("common.close", "Close")}
        >
          <LuPanelLeftClose size={15} />
        </button>
      </header>

      {!collapsed && user && (
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-slate-300/80">
              {user.accountType}
            </p>
            <p className="truncate text-xs text-slate-400">{user.name}</p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-emerald-200">
            <span
              className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300"
              aria-hidden="true"
            />
            {t("common.active", "Active")}
          </div>
        </div>
      )}

      <nav
        className="relative z-[1] flex-1 overflow-y-auto overflow-x-visible px-0 pb-4 pt-2 scroll-smooth"
        role="navigation"
        aria-label={t("sidebar.overview", "Sidebar")}
      >
        <div role="menu" aria-orientation="vertical">
          {sections.map((group) => (
            <SidebarGroup
              key={group.key}
              group={group}
              collapsed={collapsed}
              accent={accent}
              isRtl={isRtl}
              expanded={expandedGroups}
              onToggle={toggleGroup}
              badges={badges}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      {!collapsed && (
        <footer className="relative z-[1] shrink-0 border-t border-white/10 px-3 py-2 text-center text-[11px] text-slate-400">
          {t("sidebar.copyright")}
        </footer>
      )}
    </aside>
  );
}
