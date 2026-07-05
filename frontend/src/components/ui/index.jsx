import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LuInbox, LuSearch, LuTriangleAlert, LuTrash2 } from "react-icons/lu";
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

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) => {
  const variantClass =
    variant === "outline"
      ? "btn btn-outline"
      : variant === "ghost"
        ? "btn btn-ghost"
        : variant === "danger"
          ? "btn btn-danger"
          : "btn btn-gold";
  const sizeClass = size === "sm" ? "btn-sm" : "";
  return (
    <button
      {...props}
      className={`${variantClass} ${sizeClass} ${className}`.trim()}
    >
      {children}
    </button>
  );
};

export const AppCard = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}) => (
  <section className={`card ${className}`.trim()}>
    {(title || action) && (
      <header className="card-hd">
        <div>
          {title ? <h3>{title}</h3> : null}
          {subtitle ? <p className="small muted">{subtitle}</p> : null}
        </div>
        {action ? <div className="card-hd-actions">{action}</div> : null}
      </header>
    )}
    <div className="card-body">{children}</div>
  </section>
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
      style={{
        "--stat-accent": accent,
        width: isInteractive ? "100%" : undefined,
        textAlign: "start",
        fontFamily: "inherit",
        appearance: isInteractive ? "none" : undefined,
      }}
    >
      <div className="stat-card__shell">
        <div className="stat-card__copy">
          <p className="stat-card__label">{label}</p>
          <p className="stat-card__value" style={{ unicodeBidi: "plaintext" }}>
            {value}
          </p>
          {sub ? (
            <p className="stat-card__sub" style={{ unicodeBidi: "plaintext" }}>
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

export const LoadingState = ({ message }) => {
  const { t } = useTranslation();
  return (
    <div
      className="vstack center"
      style={{ padding: "48px 12px", color: "var(--text3)" }}
    >
      <Spinner />
      <p className="small">{message || t("common.loading", "Loading...")}</p>
    </div>
  );
};

export const ErrorState = ({ message, action }) => {
  const { t } = useTranslation();
  return (
    <div
      className="vstack center"
      style={{ padding: "40px 16px", textAlign: "center" }}
    >
      <LuTriangleAlert size={30} style={{ color: "var(--danger)" }} />
      <p
        style={{ color: "var(--danger-strong)", fontWeight: 600, marginTop: 6 }}
      >
        {message || t("common.error", "Something went wrong")}
      </p>
      {action ? <div style={{ marginTop: 10 }}>{action}</div> : null}
    </div>
  );
};

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
      dir={rtl ? "rtl" : "ltr"}
      style={{
        direction: rtl ? "rtl" : "ltr",
        textAlign: rtl ? "right" : "left",
        unicodeBidi: "plaintext",
        whiteSpace: "pre-line",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        lineHeight: 1.7,
        display: "block",
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
  blue: "bg-blue",
  orange: "bg-orange",
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
  overlayClassName = "",
  boxClassName = "",
  bodyClassName = "",
  dir,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const docDir =
    typeof document !== "undefined"
      ? document.documentElement.getAttribute("dir") || "ltr"
      : "ltr";
  const resolvedDir = dir || docDir;
  const modalMarkup = (
    <div
      className={`modal-bg ${overlayClassName}`.trim()}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className={`modal-box w-[95vw] sm:w-full ${boxClassName}`.trim()}
        dir={resolvedDir}
        style={{ maxWidth: maxW }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
      >
        <div className="modal-hd">
          <h2 id="app-modal-title">{title}</h2>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
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

  if (typeof document === "undefined") return modalMarkup;
  return createPortal(modalMarkup, document.body);
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

export const SearchInput = ({
  value,
  onChange,
  placeholder,
  onKeyDown,
  className = "",
  ...props
}) => (
  <div className={`iw ${className}`.trim()}>
    <LuSearch size={15} className="ico" />
    <input
      className="inp"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      {...props}
    />
  </div>
);

export const SelectField = ({ className = "", children, ...props }) => (
  <select className={`inp ${className}`.trim()} {...props}>
    {children}
  </select>
);

export const DataTable = ({
  columns = [],
  rows = [],
  rowKey = "id",
  emptyText,
  renderCell,
}) => {
  const { t } = useTranslation();
  if (!columns.length) return null;

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col}>{col.label || col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!rows.length ? (
            <tr>
              <td
                colSpan={columns.length}
                className="center"
                style={{ padding: 24 }}
              >
                <span className="muted">
                  {emptyText || t("common.noData", "No data")}
                </span>
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={
                  typeof rowKey === "function"
                    ? rowKey(row, idx)
                    : row?.[rowKey] || idx
                }
              >
                {columns.map((col) => (
                  <td key={`${col.key || col}-${idx}`}>
                    {renderCell
                      ? renderCell(row, col, idx)
                      : row?.[col.key || col]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

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
    {error && (
      <p className="err-msg" role="alert" aria-live="polite">
        {error}
      </p>
    )}
  </div>
);

export const Pagination = ({ page, total, limit, onChange }) => {
  const { t } = useTranslation();
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;

  return (
    <div
      className="pagination"
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
