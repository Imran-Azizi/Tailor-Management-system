export default function StatCard({
  label,
  value,
  sub,
  Icon,
  accent = "#2563EB",
  className = "",
  emphasize = false,
  onClick,
}) {
  const isInteractive = typeof onClick === "function";
  const WrapperTag = isInteractive ? "button" : "div";

  return (
    <WrapperTag
      type={isInteractive ? "button" : undefined}
      onClick={onClick}
      className={`w-full rounded-2xl border border-slate-200 bg-white p-4 text-start shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900 sm:p-5 border-s-4 ${isInteractive ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/35" : ""} ${className}`.trim()}
      style={{
        borderInlineStartColor: accent,
        fontFamily: "inherit",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p
            className={`${emphasize ? "text-2xl sm:text-3xl" : "text-2xl"} font-bold leading-tight text-gray-900 dark:text-slate-100`}
            style={{ unicodeBidi: "plaintext" }}
          >
            {value}
          </p>
          {sub ? (
            <p
              className="mt-2 text-xs text-slate-500 dark:text-slate-400 sm:text-sm"
              style={{ unicodeBidi: "plaintext" }}
            >
              {sub}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              color: accent,
              backgroundColor: `${accent}1A`,
            }}
          >
            <Icon size={20} />
          </span>
        ) : null}
      </div>
    </WrapperTag>
  );
}
