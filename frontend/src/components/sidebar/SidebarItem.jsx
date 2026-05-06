import { NavLink, useLocation } from "react-router-dom";
import { LuDot } from "react-icons/lu";
import { isRouteActive } from "./routeMatch.js";

function badgeText(value) {
  if (value == null || value <= 0) return null;
  return value > 99 ? "99+" : String(value);
}

export default function SidebarItem({
  item,
  collapsed,
  accent,
  isRtl,
  onNavigate,
  badgeValue,
  depth = 0,
}) {
  const location = useLocation();
  const Icon = item.icon;
  const badge = badgeText(badgeValue);
  const isChild = depth > 0;
  const paddingClass = isChild ? "ps-3 pe-2" : "px-3";
  const linkEnd = item.end ?? isChild;
  const active = isRouteActive(location.pathname, item.path, linkEnd);

  const groupClass = "group";
  const baseClass = isChild
    ? "group relative flex h-9 items-center gap-2 overflow-visible rounded-lg border border-transparent text-[13px] font-medium transition-all duration-200"
    : "group relative flex h-10 items-center gap-2.5 overflow-visible rounded-xl border border-transparent text-sm font-medium transition-all duration-200";

  const interactiveClass = isChild
    ? "text-[var(--sb-txt)] hover:border-white/10 hover:bg-[var(--sb-hover)] hover:text-[var(--sb-hover-t)]"
    : "text-[var(--sb-txt)] hover:-translate-y-[1px] hover:border-white/10 hover:bg-[var(--sb-hover)] hover:text-[var(--sb-hover-t)] hover:shadow-[0_12px_24px_-20px_rgba(0,0,0,.9)]";

  return (
    <NavLink
      to={item.path}
      end={linkEnd}
      role="menuitem"
      aria-label={item.text}
      title={collapsed ? item.text : undefined}
      onClick={() => onNavigate?.()}
      className={() =>
        [
          groupClass,
          baseClass,
          interactiveClass,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)]",
          collapsed ? "justify-center px-0" : paddingClass,
          active
            ? isChild
              ? "text-[var(--sb-hover-t)]"
              : "text-[var(--sb-act-t)] shadow-[0_16px_32px_-24px_rgba(0,0,0,.9)]"
            : "",
        ].join(" ")
      }
      style={() =>
        active
          ? {
              background: isChild ? "rgba(255,255,255,.07)" : "var(--sb-act)",
              borderColor: isChild ? "rgba(255,255,255,.10)" : `${accent}66`,
              boxShadow: isChild
                ? "none"
                : `${isRtl ? "inset -3px 0 0" : "inset 3px 0 0"} ${accent}, 0 16px 30px -24px rgba(0,0,0,.95)`,
            }
          : undefined
      }
    >
      <span
        className={`relative flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105 ${isChild ? "h-4.5 w-4.5 text-[15px]" : "h-5 w-5 text-[18px]"}`}
      >
        <Icon />
      </span>

      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate text-start">
            {item.text}
          </span>
          {badge && (
            <span
              className="inline-flex min-w-[1.3rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
              style={{
                background: `${accent}30`,
                color: "var(--sb-act-t)",
              }}
              aria-label={`${item.text} ${badge}`}
            >
              {badge}
            </span>
          )}
        </>
      )}

      {collapsed && badge && (
        <span
          className="absolute top-1.5 end-2 inline-flex min-w-[0.9rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4"
          style={{ background: accent, color: "white" }}
          aria-hidden="true"
        >
          <LuDot size={10} />
        </span>
      )}

      {collapsed && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--text1)] shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"}`}
        >
          {item.text}
        </span>
      )}
    </NavLink>
  );
}
