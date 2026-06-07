import { useCallback, useEffect, useMemo, useState } from "react";
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
import SidebarItem from "./sidebar/SidebarItem.jsx";
import { isRouteActive } from "./sidebar/routeMatch.js";
import {
  getRoleAccent,
  getSidebarFooterItems,
  getSidebarSections,
} from "./sidebar/sidebarConfig.js";

function getDropdownKeys(sections) {
  return new Set(
    sections.flatMap((section) =>
      section.items
        .filter((item) => item.children?.length)
        .map((item) => item.key),
    ),
  );
}

function getDefaultOpenGroupKey(sections, pathname) {
  for (const section of sections) {
    for (const item of section.items) {
      if (!item.children?.length) continue;
      if (isChildActive(pathname, item.children)) {
        return item.key;
      }
    }
  }

  return null;
}

function loadOpenGroupKey(storageKey, sections, pathname, validKeysOverride) {
  try {
    const raw = localStorage.getItem(storageKey);
    const validKeys = validKeysOverride || getDropdownKeys(sections);
    const activeGroupKey = getDefaultOpenGroupKey(sections, pathname);

    if (activeGroupKey) {
      return activeGroupKey;
    }

    if (raw === null) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (typeof parsed === "string") {
      return validKeys.has(parsed) ? parsed : null;
    }

    if (parsed && typeof parsed === "object") {
      for (const key of validKeys) {
        if (parsed[key] === true) {
          return key;
        }
      }
    }

    return null;
  } catch {
    return getDefaultOpenGroupKey(sections, pathname);
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

function withLocalizedItems(items, t) {
  return items.map((item) => ({
    ...item,
    text: t(item.label, item.fallback),
  }));
}

export default function Sidebar({ collapsed, onToggle, open, onNavigate }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  const role = user?.accountType || "ADMIN";
  const systemName = user?.tenant?.systemName || t("appName");
  const businessName = user?.tenant?.businessName || t("appSubtitle");
  const accent = getRoleAccent(role);
  const isRtl = (i18n.dir?.() || "ltr") === "rtl";
  const expandedStorageKey = `sidebar:expanded:${role}`;

  const sections = useMemo(
    () => withLocalizedLabels(getSidebarSections(role), t),
    [role, t],
  );
  const footerItems = useMemo(
    () => withLocalizedItems(getSidebarFooterItems(role), t),
    [role, t],
  );
  const validDropdownKeys = useMemo(
    () => getDropdownKeys(sections),
    [sections],
  );
  const activeDropdownId = useMemo(
    () => getDefaultOpenGroupKey(sections, location.pathname),
    [sections, location.pathname],
  );

  const [openDropdownId, setOpenDropdownId] = useState(() =>
    loadOpenGroupKey(
      expandedStorageKey,
      sections,
      location.pathname,
      validDropdownKeys,
    ),
  );

  useEffect(() => {
    setOpenDropdownId(
      loadOpenGroupKey(
        expandedStorageKey,
        sections,
        location.pathname,
        validDropdownKeys,
      ),
    );
  }, [expandedStorageKey, sections, location.pathname, validDropdownKeys]);

  useEffect(() => {
    if (!activeDropdownId) return;

    setOpenDropdownId((currentDropdownId) =>
      currentDropdownId === activeDropdownId
        ? currentDropdownId
        : activeDropdownId,
    );
  }, [activeDropdownId]);

  useEffect(() => {
    localStorage.setItem(expandedStorageKey, JSON.stringify(openDropdownId));
  }, [expandedStorageKey, openDropdownId]);

  const { data: pendingOrdersData } = useQuery({
    queryKey: ["orders-sidebar-pending-count", role, user?.id],
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

  const handleNavigate = useCallback(
    ({ openDropdownId: nextOpenDropdownId = null } = {}) => {
      setOpenDropdownId(nextOpenDropdownId);
      onNavigate?.();
    },
    [onNavigate],
  );

  const toggleGroup = useCallback((groupKey) => {
    setOpenDropdownId((currentDropdownId) =>
      currentDropdownId === groupKey ? null : groupKey,
    );
  }, []);

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${open ? "open" : ""} no-print`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_30%,transparent)]" />

      <header className="relative z-[1] flex h-[var(--nav-h)] shrink-0 items-center gap-2 border-b border-[var(--sb-bdr)] px-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 shadow-[0_12px_26px_-14px_rgba(0,0,0,.85)] ring-1 ring-white/10"
          style={{
            background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,.16))`,
          }}
          aria-hidden="true"
        >
          <LuScissors size={18} color="white" />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold tracking-tight text-[var(--sb-title)]">
              {systemName}
            </h1>
            <p className="truncate text-[11px] text-[var(--sb-subtitle)]">
              {businessName}
            </p>
          </div>
        )}

        <button
          type="button"
          className="hidden h-8 w-8 items-center justify-center rounded-lg border border-[var(--sb-toggle-border)] bg-[var(--sb-toggle-bg)] text-[var(--sb-toggle-text)] transition hover:bg-[var(--sb-toggle-hover-bg)] hover:text-[var(--sb-toggle-hover-text)] md:inline-flex"
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sb-toggle-border)] bg-[var(--sb-toggle-bg)] text-[var(--sb-toggle-text)] transition hover:bg-[var(--sb-toggle-hover-bg)] hover:text-[var(--sb-toggle-hover-text)] md:hidden"
          onClick={onNavigate}
          aria-label={t("common.close", "Close")}
          title={t("common.close", "Close")}
        >
          <LuPanelLeftClose size={15} />
        </button>
      </header>

      {!collapsed && user && (
        <div className="relative z-[1] mx-3 mt-3 flex shrink-0 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 shadow-[0_14px_30px_-24px_rgba(0,0,0,.85)]">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-[var(--sb-title)]">
              {user.accountType}
            </p>
            <p className="truncate text-xs text-[var(--sb-subtitle)]">
              {user.name}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-emerald-200">
            <span
              className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.85)]"
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
              pathname={location.pathname}
              collapsed={collapsed}
              accent={accent}
              isRtl={isRtl}
              openDropdownId={openDropdownId}
              onToggle={toggleGroup}
              badges={badges}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </nav>

      {footerItems.length > 0 && (
        <div className="relative z-[1] shrink-0 border-t border-[var(--sb-bdr)] px-2 py-3">
          {!collapsed && (
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sb-section)]">
              {t("supportTeam.title", "Support Team")}
            </div>
          )}
          <div className="space-y-0.5">
            {footerItems.map((item) => (
              <SidebarItem
                key={item.key}
                item={item}
                pathname={location.pathname}
                collapsed={collapsed}
                accent={accent}
                isRtl={isRtl}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {!collapsed && (
        <footer className="relative z-[1] shrink-0 border-t border-[var(--sb-bdr)] px-3 py-2 text-center text-[11px] text-[var(--sb-subtitle)]">
          {t("sidebar.copyright")}
        </footer>
      )}
    </aside>
  );
}
