export default function AfCurrencyIcon({
  size = 16,
  className,
  style,
  ...props
}) {
  const iconSize = Number(size) || 16;

  return (
    <span
      role="img"
      aria-label="Afghani currency"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: iconSize,
        height: iconSize,
        fontSize: Math.max(12, iconSize * 0.95),
        fontWeight: 800,
        lineHeight: 1,
        fontFamily: "'Noto Naskh Arabic', 'Noto Sans Arabic', sans-serif",
        color: "currentColor",
        ...style,
      }}
      {...props}
    >
      ؋
    </span>
  );
}
