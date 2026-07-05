import { useTranslation } from "react-i18next";
import { LuCalendarCheck } from "react-icons/lu";
import { useMonth } from "../../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../../lib/months.js";
import { isRtlLanguage } from "../../lib/locale.js";
import { PageHeader } from "../ui/index.jsx";
import "./reports.css";

/** Language + direction info shared by all report pages. */
export function useReportLocale() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isRtlLanguage(language);
  return { language, isRtl, dir: isRtl ? "rtl" : "ltr" };
}

/**
 * Standard report page wrapper: professional header block
 * (title + subtitle + actions) and consistent section spacing.
 */
export function ReportShell({ className = "", title, subtitle, actions, children }) {
  const { dir } = useReportLocale();
  return (
    <div
      className={`page report-root professional-report-page report-shell ${className}`.trim()}
      dir={dir}
    >
      <PageHeader title={title} subtitle={subtitle} action={actions} />
      {children}
    </div>
  );
}

/** Standard "Viewing data for <month year>" banner used by month-scoped reports. */
export function ReportMonthBanner({ isEmpty = false, className = "", style }) {
  const { t } = useTranslation();
  const { language } = useReportLocale();
  const { viewMonth, viewYear } = useMonth();
  return (
    <div
      className={`report-month-banner month-info-banner ${className}`.trim()}
      style={style}
    >
      <LuCalendarCheck size={14} />
      <span>
        {t("common.viewingMonth", "Viewing data for")}:{" "}
        <strong>{formatMonthYearLabel(viewMonth, viewYear, language)}</strong>
      </span>
      {isEmpty ? (
        <span className="report-month-banner__empty">
          {t("common.noDataThisMonth", "No data found for this month")}
        </span>
      ) : null}
    </div>
  );
}

/** Responsive grid for KPI StatCards. */
export function ReportKpiGrid({ children, className = "" }) {
  return <div className={`report-kpi-grid ${className}`.trim()}>{children}</div>;
}

/** Wrap numbers so digits stay LTR and tabular inside RTL text. */
export function ReportNum({ children, className = "" }) {
  return <span className={`report-num ${className}`.trim()}>{children}</span>;
}
