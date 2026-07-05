import api from "./api.js";

export const DAILY_TASK_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isDailyTaskEditable(task) {
  if (!task?.createdAt) return false;

  const createdAt = new Date(task.createdAt).getTime();
  if (Number.isNaN(createdAt)) return false;

  return Date.now() - createdAt <= DAILY_TASK_EDIT_WINDOW_MS;
}

export function buildSelectStyles(optionsOrHasError = false) {
  const hasError =
    typeof optionsOrHasError === "object"
      ? Boolean(optionsOrHasError?.hasError)
      : Boolean(optionsOrHasError);
  const isRtl =
    typeof optionsOrHasError === "object"
      ? Boolean(optionsOrHasError?.isRtl)
      : typeof document !== "undefined"
        ? document.dir === "rtl"
        : false;
  const fontFamily = isRtl
    ? "var(--font-rtl)"
    : "'Inter', 'Segoe UI', Arial, sans-serif";

  return {
    control: (base, state) => ({
      ...base,
      background: "var(--surface)",
      borderColor: hasError
        ? "#DC2626"
        : state.isFocused
          ? "var(--primary)"
          : "var(--border)",
      borderRadius: 12,
      minHeight: 42,
      fontSize: 14,
      color: "var(--text1)",
      fontFamily,
      direction: isRtl ? "rtl" : "ltr",
      textAlign: isRtl ? "right" : "left",
      boxShadow: state.isFocused ? "0 0 0 3px var(--focus-ring)" : "none",
      transition: "border-color .15s ease, box-shadow .15s ease, background-color .15s ease",
      "&:hover": { borderColor: "var(--border2)" },
    }),
    menu: (base) => ({
      ...base,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      boxShadow: "var(--sh-md)",
      zIndex: 9999,
      overflow: "hidden",
      fontFamily,
      direction: isRtl ? "rtl" : "ltr",
    }),
    option: (base, state) => ({
      ...base,
      background: state.isSelected
        ? "var(--primary)"
        : state.isFocused
          ? "var(--surface2)"
          : "transparent",
      color: state.isSelected ? "#fff" : "var(--text1)",
      fontSize: 14,
      direction: isRtl ? "rtl" : "ltr",
      textAlign: isRtl ? "right" : "left",
      cursor: "pointer",
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--text1)",
      fontFamily,
      textAlign: isRtl ? "right" : "left",
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--text3)",
      fontSize: 14,
      fontFamily,
      textAlign: isRtl ? "right" : "left",
    }),
    input: (base) => ({
      ...base,
      color: "var(--text1)",
      fontFamily,
      textAlign: isRtl ? "right" : "left",
    }),
    indicatorSeparator: () => ({ display: "none" }),
  };
}

export async function downloadDailyTaskReportPdf({
  reportType,
  date,
  language,
  month,
  year,
}) {
  const params = { reportType, _ts: Date.now() };
  if (date) params.date = date;
  if (language) params.lang = language;
  if (month != null) params.month = month;
  if (year != null) params.year = year;

  const response = await api.get("/daily-tasks/report/pdf", {
    params,
    responseType: "blob",
  });

  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const safeType = String(reportType || "daily").toLowerCase();
  const fileDate = date || new Date().toISOString().slice(0, 10);
  const filename = `daily-task-${safeType}-report-${fileDate}.pdf`;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
