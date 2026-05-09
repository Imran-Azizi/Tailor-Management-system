export default function AfCurrencyIcon({
  size = 16,
  className,
  style,
  ...props
}) {
  const iconSize = Number(size) || 16;
  const borderRadius = Math.max(3, Math.round(iconSize * 0.22));
  const fontPx = Math.max(8, Math.round(iconSize * 0.52));

  return (
    <span
      role="img"
      aria-label="AF currency"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: iconSize,
        height: iconSize,
        border: "1px solid currentColor",
        borderRadius,
        fontSize: fontPx,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "0.02em",
        fontFamily: "'Segoe UI', 'Noto Sans', sans-serif",
        color: "currentColor",
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    >
      AF
    </span>
  );
}
