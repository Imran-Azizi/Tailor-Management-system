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
      className={`stat-card ${isInteractive ? "stat-card--interactive" : ""} w-full text-start ${className}`.trim()}
      style={{
        "--stat-accent": accent,
        fontFamily: "inherit",
        appearance: isInteractive ? "none" : undefined,
      }}
    >
      <div className="stat-card__shell">
        <div className="stat-card__copy">
          <p className="stat-card__label">{label}</p>
          <p
            className={`stat-card__value ${emphasize ? "stat-card__value--emphasize" : ""}`}
            style={{ unicodeBidi: "plaintext" }}
          >
            {value}
          </p>
          {sub ? (
            <p
              className="stat-card__sub"
              style={{ unicodeBidi: "plaintext" }}
            >
              {sub}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <span className="stat-card__icon">
            <Icon size={20} />
          </span>
        ) : null}
      </div>
    </WrapperTag>
  );
}
