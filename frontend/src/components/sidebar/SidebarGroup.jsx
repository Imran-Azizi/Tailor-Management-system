import { useMemo } from "react";
import { LuChevronDown } from "react-icons/lu";
import { useLocation, useNavigate } from "react-router-dom";
import SidebarItem from "./SidebarItem.jsx";
import { isRouteActive } from "./routeMatch.js";

function hasChildActive(children, pathname) {
  return children.some((child) =>
    isRouteActive(pathname, child.path, child.end ?? true),
  );
}

export default function SidebarGroup({
  group,
  collapsed,
  accent,
  isRtl,
  expanded,
  onToggle,
  badges,
  onNavigate,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const normalizedItems = useMemo(
    () =>
      group.items.map((item) => ({
        ...item,
        text: item.text,
        children: item.children?.map((child) => ({
          ...child,
          text: child.text,
        })),
      })),
    [group.items],
  );

  const parentButtonBase =
    "group flex h-10 w-full items-center gap-2.5 rounded-xl border border-transparent px-3 text-sm font-medium transition-all duration-200";
  const parentButtonInteractive =
    "text-slate-300 hover:border-white/10 hover:bg-white/6 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  return (
    <section className="pt-1" aria-label={group.title}>
      <div className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400/70">
        {collapsed ? "" : group.title}
      </div>

      <div className="space-y-0.5 px-2">
        {normalizedItems.map((item) => {
          if (!item.children?.length) {
            return (
              <SidebarItem
                key={item.key}
                item={item}
                collapsed={collapsed}
                accent={accent}
                isRtl={isRtl}
                badgeValue={item.badge ? badges?.[item.badge] : null}
                onNavigate={onNavigate}
              />
            );
          }

          const childActive = hasChildActive(item.children, location.pathname);
          const explicitlyOpened = expanded[item.key] === true;
          const explicitlyClosed = expanded[item.key] === false;
          const itemOpen =
            explicitlyOpened || (!explicitlyClosed && childActive);

          if (collapsed) {
            return (
              <button
                key={item.key}
                type="button"
                title={item.text}
                aria-label={item.text}
                onClick={() => {
                  navigate(item.children[0].path);
                  onNavigate?.();
                }}
                className="group relative flex h-10 w-full items-center justify-center rounded-xl border border-transparent text-slate-300 transition-all duration-200 hover:border-white/10 hover:bg-white/6 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <item.icon size={18} />
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"}`}
                >
                  {item.text}
                </span>
              </button>
            );
          }

          return (
            <div key={item.key}>
              <button
                type="button"
                role="menuitem"
                aria-expanded={itemOpen}
                aria-controls={`group-${item.key}`}
                onClick={() => onToggle(item.key, itemOpen)}
                className={`${parentButtonBase} ${parentButtonInteractive} ${childActive ? "text-white" : ""}`}
                style={
                  childActive
                    ? {
                        background: `${accent}22`,
                        borderColor: `${accent}52`,
                      }
                    : undefined
                }
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[18px]">
                  <item.icon />
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${isRtl ? "text-right" : "text-left"}`}
                >
                  {item.text}
                </span>
                <span
                  className="inline-flex h-4 w-4 items-center justify-center text-slate-300 transition-transform duration-300"
                  style={{
                    transform: itemOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <LuChevronDown size={14} />
                </span>
              </button>

              <div
                id={`group-${item.key}`}
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  itemOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="mx-1 mt-1">
                  {item.children.map((child) => (
                    <SidebarItem
                      key={child.key}
                      item={child}
                      collapsed={false}
                      accent={accent}
                      isRtl={isRtl}
                      depth={1}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-4 mt-2.5 h-px bg-white/10" />
    </section>
  );
}
