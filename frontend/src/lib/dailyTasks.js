import api from "./api.js";

export const DAILY_TASK_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isDailyTaskEditable(task) {
  if (!task?.createdAt) return false;

  const createdAt = new Date(task.createdAt).getTime();
  if (Number.isNaN(createdAt)) return false;

  return Date.now() - createdAt <= DAILY_TASK_EDIT_WINDOW_MS;
}

export function buildSelectStyles(hasError = false) {
  return {
    control: (base, state) => ({
      ...base,
      background: "var(--surface2)",
      borderColor: hasError
        ? "#DC2626"
        : state.isFocused
          ? "var(--primary)"
          : "var(--border)",
      borderRadius: 8,
      minHeight: 40,
      fontSize: 14,
      color: "var(--text1)",
      boxShadow: state.isFocused ? "0 0 0 2px var(--primary-100)" : "none",
      "&:hover": { borderColor: "var(--border2)" },
    }),
    menu: (base) => ({
      ...base,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      boxShadow: "var(--sh-md)",
      zIndex: 9999,
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
      cursor: "pointer",
    }),
    singleValue: (base) => ({ ...base, color: "var(--text1)" }),
    placeholder: (base) => ({ ...base, color: "var(--text3)", fontSize: 14 }),
    input: (base) => ({ ...base, color: "var(--text1)" }),
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
