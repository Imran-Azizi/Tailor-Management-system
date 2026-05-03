import { LuInbox, LuTriangleAlert, LuTrash2 } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { isRtlLanguage } from "../../lib/locale.js";

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="page-hd">
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {action && <div className="page-hd-action">{action}</div>}
  </div>
);

export const StatCard = ({
  label,
  value,
  sub,
  Icon,
  accent = "var(--primary)",
  onClick,
}) => {
  const isInteractive = typeof onClick === "function";
  const WrapperTag = isInteractive ? "button" : "div";

  return (
    <WrapperTag
      className={`stat-card${isInteractive ? " stat-card--interactive" : ""}`}
      onClick={onClick}
      type={isInteractive ? "button" : undefined}
      style={
        isInteractive
          ? {
              width: "100%",
              textAlign: "start",
              fontFamily: "inherit",
              appearance: "none",
            }
          : undefined
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--text3)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: 8,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: accent,
              letterSpacing: "-.02em",
              lineHeight: 1,
            }}
          >
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 6 }}>
              {sub}
            </p>
          )}
        </div>
        {Icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "var(--surface2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={20} style={{ color: accent }} />
          </div>
        )}
      </div>
    </WrapperTag>
  );
};

export const Spinner = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "60px 0",
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        border: "2.5px solid var(--border)",
        borderTopColor: "var(--primary)",
        borderRadius: "50%",
        animation: "spin .7s linear infinite",
      }}
    />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

export const EmptyState = ({ message, Icon: I = LuInbox }) => {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "52px 24px",
        gap: 10,
        color: "var(--text3)",
      }}
    >
      <I size={34} style={{ opacity: 0.4 }} />
      <p style={{ fontSize: 14 }}>{message || t("common.noData")}</p>
    </div>
  );
};

export const NotificationText = ({
  as: Tag = "p",
  language = "en",
  style,
  children,
  ...props
}) => {
  const rtl = isRtlLanguage(language);
  return (
    <Tag
      {...props}
      style={{
        direction: rtl ? "rtl" : "ltr",
        textAlign: "start",
        unicodeBidi: "plaintext",
        ...style,
      }}
    >
      {children}
    </Tag>
  );
};

const BV = {
  gold: "bg-gold",
  teal: "bg-teal",
  red: "bg-red",
  green: "bg-green",
  amber: "bg-amber",
  gray: "bg-gray",
};
export const Badge = ({ children, v = "gold" }) => (
  <span className={`badge ${BV[v] || "bg-gold"}`}>{children}</span>
);

export const Modal = ({
  open,
  onClose,
  title,
  children,
  maxW = 480,
  boxClassName = "",
  bodyClassName = "",
}) => {
  if (!open) return null;
  const docDir =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("dir") || "ltr"
      : "ltr";
  return (
    <div
      className="modal-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`modal-box w-[95vw] sm:w-full ${boxClassName}`.trim()}
        dir={docDir}
        style={{ maxWidth: maxW }}
      >
        <div className="modal-hd">
          <h2>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text3)",
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div className={`modal-body modal-content ${bodyClassName}`.trim()}>
          {children}
        </div>
      </div>
    </div>
  );
};

export const ConfirmDeleteModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmLabel,
  cancelLabel,
  isPending = false,
}) => {
  const { t } = useTranslation();
  const resolvedTitle = title || t("common.delete");
  const resolvedMessage =
    message ||
    t("common.deletePrompt", {
      defaultValue:
        "Are you sure you want to delete this item? This action cannot be undone.",
    });
  const resolvedConfirmLabel = confirmLabel || t("common.delete");
  const resolvedCancelLabel = cancelLabel || t("common.cancel");

  const handleClose = () => {
    if (isPending) return;
    onClose?.();
  };

  return (
    <Modal open={open} onClose={handleClose} title={resolvedTitle} maxW={520}>
      <div className="delete-confirm">
        <div className="delete-confirm-icon">
          <LuTriangleAlert size={20} />
        </div>
        <div className="delete-confirm-copy">
          <p className="delete-confirm-message">{resolvedMessage}</p>
          {itemName && <p className="delete-confirm-item">{itemName}</p>}
        </div>
        <div className="delete-confirm-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleClose}
            disabled={isPending}
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isPending}
          >
            <LuTrash2 size={14} />
            {isPending ? t("common.loading") : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export const Card = ({ title, action, children, noPad, style }) => (
  <div className="card" style={style}>
    {(title || action) && (
      <div className="card-hd">
        {title && <h3>{title}</h3>}
        {action && <div>{action}</div>}
      </div>
    )}
    <div className={noPad ? "" : "card-body"}>{children}</div>
  </div>
);

export const Field = ({ label, error, children, required, hint }) => (
  <div>
    {label && (
      <label className={`lbl${required ? " lbl-r" : ""}`}>{label}</label>
    )}
    {children}
    {hint && (
      <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 4 }}>
        {hint}
      </p>
    )}
    {error && <p className="err-msg">{error}</p>}
  </div>
);

export const Pagination = ({ page, total, limit, onChange }) => {
  const { t } = useTranslation();
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px solid var(--border)",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 13, color: "var(--text3)" }}>
        {t("ui.pageSummary", { page, pages, total })}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="btn btn-outline btn-sm"
        >
          {t("ui.prev")}
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="btn btn-outline btn-sm"
        >
          {t("ui.next")}
        </button>
      </div>
    </div>
  );
};

export const ProgBar = ({ value, max }) => {
  const { t } = useTranslation();
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color =
    pct >= 90
      ? "var(--danger)"
      : pct >= 70
        ? "var(--warning)"
        : "var(--success)";
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "var(--text3)",
          marginBottom: 5,
        }}
      >
        <span>{t("ui.ordersFraction", { value, max })}</span>
        <span style={{ fontWeight: 600, color }}>{pct}%</span>
      </div>
      <div className="prog-track">
        <div
          className="prog-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
};
