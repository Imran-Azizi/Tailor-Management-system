import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LuFilter, LuRefreshCcw, LuX } from "react-icons/lu";

export default function MobileFilterPanel({
  activeCount = 0,
  children,
  className = "",
  clearDisabled = false,
  isApplying = false,
  onApply,
  onClear,
  title,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const resolvedTitle = title || t("common.filters", "Filters");

  const handleApply = () => {
    onApply?.();
    setOpen(false);
  };

  const handleClear = () => {
    onClear?.();
  };

  return (
    <section
      className={`mobile-filter-panel ${
        open ? "mobile-filter-panel--open" : ""
      } ${className}`.trim()}
    >
      <button
        type="button"
        className="mobile-filter-panel__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <LuFilter size={16} />
        <span>{resolvedTitle}</span>
        {activeCount > 0 ? (
          <strong className="mobile-filter-panel__count">{activeCount}</strong>
        ) : null}
      </button>

      {open ? (
        <button
          type="button"
          className="mobile-filter-panel__backdrop"
          aria-label={t("common.close", "Close")}
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="mobile-filter-panel__content">
        <div className="mobile-filter-panel__mobile-head">
          <strong>{resolvedTitle}</strong>
          <button
            type="button"
            className="mobile-filter-panel__close"
            onClick={() => setOpen(false)}
            aria-label={t("common.close", "Close")}
          >
            <LuX size={16} />
          </button>
        </div>

        {children}

        <div className="mobile-filter-panel__actions">
          <button
            type="button"
            className="btn btn-gold"
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplying ? <LuRefreshCcw size={14} /> : <LuFilter size={14} />}
            {isApplying
              ? t("common.loading", "Loading...")
              : t("common.applyFilters", "Apply Filters")}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleClear}
            disabled={clearDisabled || isApplying}
          >
            {t("common.clearFilters", "Clear Filters")}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setOpen(false)}
          >
            {t("common.close", "Close")}
          </button>
        </div>
      </div>
    </section>
  );
}
