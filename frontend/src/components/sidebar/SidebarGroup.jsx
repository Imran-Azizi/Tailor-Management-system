import { LuChevronDown } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import SidebarItem from "./SidebarItem.jsx";
import { isRouteActive } from "./routeMatch.js";

function hasChildActive(children, pathname) {
  return children.some((child) =>
    isRouteActive(pathname, child.path, child.end ?? true),
  );
}

export default function SidebarGroup({
  group,
  pathname,
  collapsed,
  accent,
  isRtl,
  openDropdownId,
  onToggle,
  badges,
  onNavigate,
}) {
  const navigate = useNavigate();

  const parentButtonBase =
    "group flex h-10 w-full items-center gap-2.5 rounded-xl border border-transparent px-3 text-sm font-medium transition-all duration-200";
  const parentButtonInteractive =
    "text-[var(--sb-txt)] hover:-translate-y-[1px] hover:border-white/10 hover:bg-[var(--sb-hover)] hover:text-[var(--sb-hover-t)] hover:shadow-[0_12px_24px_-20px_rgba(0,0,0,.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)]";

  return (
    <section className="pt-1" aria-label={group.title}>
      <div className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--sb-section)]">
        {collapsed ? "" : group.title}
      </div>

      <div className="space-y-0.5 px-2">
        {group.items.map((item) => {
          if (!item.children?.length) {
            return (
              <SidebarItem
                key={item.key}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                accent={accent}
                isRtl={isRtl}
                badgeValue={item.badge ? badges?.[item.badge] : null}
                onNavigate={onNavigate}
              />
            );
          }

          const childActive = hasChildActive(item.children, pathname);
          const itemOpen = openDropdownId === item.key || childActive;

          if (collapsed) {
            return (
              <button
                key={item.key}
                type="button"
                title={item.text}
                aria-label={item.text}
                onClick={() => {
                  navigate(item.children[0].path);
                  onNavigate?.({ openDropdownId: item.key });
                }}
                className="group relative flex h-10 w-full items-center justify-center rounded-xl border border-transparent text-[var(--sb-txt)] transition-all duration-200 hover:-translate-y-[1px] hover:border-white/10 hover:bg-[var(--sb-hover)] hover:text-[var(--sb-hover-t)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)]"
              >
                <item.icon size={18} />
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--text1)] shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ${isRtl ? "right-[calc(100%+10px)]" : "left-[calc(100%+10px)]"}`}
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
                onClick={() => {
                  if (itemOpen && childActive) return;
                  onToggle(item.key);
                }}
                className={`${parentButtonBase} ${parentButtonInteractive} ${childActive ? "text-[var(--sb-hover-t)]" : ""}`}
                style={
                  childActive
                    ? {
                        background: "var(--sb-act)",
                        borderColor: `${accent}66`,
                        boxShadow: `${isRtl ? "inset -3px 0 0" : "inset 3px 0 0"} ${accent}, 0 16px 30px -24px rgba(0,0,0,.95)`,
                      }
                    : undefined
                }
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[18px] transition-transform duration-200 group-hover:scale-105">
                  <item.icon />
                </span>
                <span className="min-w-0 flex-1 truncate text-start">
                  {item.text}
                </span>
                <span
                  className="inline-flex h-4 w-4 items-center justify-center text-[var(--sb-txt)] transition-transform duration-300"
                  style={{
                    transform: itemOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <LuChevronDown size={14} />
                </span>
              </button>

              <div
                id={`group-${item.key}`}
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  itemOpen
                    ? "grid-rows-[1fr] opacity-100"
                    : "pointer-events-none grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="mx-1 mt-1">
                    {item.children.map((child) => (
                      <SidebarItem
                        key={child.key}
                        item={child}
                        pathname={pathname}
                        collapsed={false}
                        accent={accent}
                        isRtl={isRtl}
                        depth={1}
                        onNavigate={() =>
                          onNavigate?.({ openDropdownId: item.key })
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-4 mt-2.5 h-px bg-[var(--sb-bdr)]" />
    </section>
  );
}
