/**
 * Shared skeleton placeholders — same rough shape as final UI, no spinners.
 */

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function SkeletonPulse({ className = "", style, ...props }) {
  return (
    <div
      className={cx("sk sk-pulse", className)}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}

export function PageSkeleton({ variant = "default" }) {
  if (variant === "dashboard") {
    return <DashboardSkeleton />;
  }
  if (variant === "table") {
    return <TableSkeleton />;
  }
  if (variant === "form") {
    return <FormSkeleton />;
  }
  if (variant === "list") {
    return <ListSkeleton />;
  }

  return (
    <div className="page sk-page" aria-busy="true" aria-live="polite">
      <div className="sk-page-hd">
        <SkeletonPulse className="sk-line sk-line--lg" style={{ width: "42%" }} />
        <SkeletonPulse className="sk-line sk-line--sm" style={{ width: "28%", marginTop: 10 }} />
      </div>
      <div className="sk-card-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonPulse key={i} className="sk-stat" />
        ))}
      </div>
      <SkeletonPulse className="sk-block" style={{ height: 220, marginTop: 16 }} />
      <TableSkeleton rows={5} compact />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page sk-page" aria-busy="true">
      <div className="sk-page-hd">
        <SkeletonPulse className="sk-line sk-line--lg" style={{ width: "36%" }} />
        <SkeletonPulse className="sk-line sk-line--sm" style={{ width: "22%", marginTop: 10 }} />
      </div>
      <SkeletonPulse className="sk-block" style={{ height: 88, marginBottom: 16 }} />
      <div className="sk-card-grid sk-card-grid--dense">
        {Array.from({ length: 8 }, (_, i) => (
          <SkeletonPulse key={i} className="sk-stat" />
        ))}
      </div>
      <div className="sk-chart-row">
        <SkeletonPulse className="sk-block" style={{ height: 280 }} />
        <SkeletonPulse className="sk-block" style={{ height: 280 }} />
      </div>
      <TableSkeleton rows={6} compact />
    </div>
  );
}

export function TableSkeleton({ rows = 8, cols = 5, compact = false }) {
  return (
    <div
      className={cx("sk-table", compact && "sk-table--compact")}
      aria-busy="true"
    >
      <div className="sk-table-hd">
        {Array.from({ length: cols }, (_, i) => (
          <SkeletonPulse
            key={i}
            className="sk-line sk-line--sm"
            style={{ width: `${70 - i * 8}%` }}
          />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div className="sk-table-row" key={row}>
          {Array.from({ length: cols }, (_, col) => (
            <SkeletonPulse
              key={col}
              className="sk-line"
              style={{ width: `${55 + ((row + col) % 4) * 10}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="sk-card-grid" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonPulse key={i} className="sk-stat" />
      ))}
    </div>
  );
}

export function CardSkeleton({ height = 180 }) {
  return (
    <div className="sk-card-shell" aria-busy="true">
      <SkeletonPulse className="sk-line sk-line--md" style={{ width: "40%" }} />
      <SkeletonPulse
        className="sk-block"
        style={{ height, marginTop: 14 }}
      />
    </div>
  );
}

export function FormSkeleton({ fields = 6 }) {
  return (
    <div className="page sk-page" aria-busy="true">
      <div className="sk-page-hd">
        <SkeletonPulse className="sk-line sk-line--lg" style={{ width: "40%" }} />
      </div>
      <div className="sk-form">
        {Array.from({ length: fields }, (_, i) => (
          <div className="sk-form-field" key={i}>
            <SkeletonPulse className="sk-line sk-line--sm" style={{ width: "30%" }} />
            <SkeletonPulse className="sk-input" />
          </div>
        ))}
        <SkeletonPulse className="sk-btn" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="sk-list" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div className="sk-list-row" key={i}>
          <SkeletonPulse className="sk-avatar" />
          <div className="sk-list-copy">
            <SkeletonPulse className="sk-line" style={{ width: "55%" }} />
            <SkeletonPulse className="sk-line sk-line--sm" style={{ width: "35%", marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
