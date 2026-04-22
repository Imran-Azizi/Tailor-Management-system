import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  LuBadgeCheck,
  LuBadgeDollarSign,
  LuCalendarDays,
  LuChevronDown,
  LuClipboardList,
  LuEllipsisVertical,
  LuEye,
  LuFileText,
  LuHash,
  LuInbox,
  LuPencil,
  LuPlus,
  LuRefreshCcw,
  LuSave,
  LuSearch,
  LuUser,
  LuUsers,
  LuX,
  LuArrowUpRight,
  LuChevronRight,
  LuTrash2,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";
import {
  buildSelectStyles,
  downloadDailyTaskReportPdf,
  isDailyTaskEditable,
} from "../lib/dailyTasks.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import {
  ConfirmDeleteModal,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
} from "../components/ui/index.jsx";

function formatMoney(v) {
  return `$${Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isRtlTextLanguage(language = "") {
  const l = String(language).toLowerCase();
  return (
    l.startsWith("dari") ||
    l.startsWith("fa") ||
    l.startsWith("pashto") ||
    l.startsWith("ps")
  );
}

function Avatar({ name, size = 32, accent = "#2563EB" }) {
  const initials = name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "?";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(145deg, ${accent}22, ${accent}12)`,
        border: `1px solid ${accent}66`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: size * 0.35,
        fontWeight: 700,
        color: accent,
        letterSpacing: "-.02em",
      }}
    >
      {initials}
    </div>
  );
}

function StatBanner({ label, value, Icon, accent, sub }) {
  return (
    <div
      className="dt-summary-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "18px",
        boxShadow: "var(--sh)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 3,
          height: "100%",
          background: accent,
          borderRadius: "var(--r-lg) 0 0 var(--r-lg)",
        }}
      />
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${accent}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={22} style={{ color: accent }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 4,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 25,
            fontWeight: 700,
            color: accent,
            letterSpacing: "-.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        {sub && (
          <p style={{ fontSize: 11.5, color: "var(--text3)", marginTop: 5 }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionMenu({
  open,
  setOpen,
  onView,
  onEdit,
  onDelete,
  t,
  compact,
  canManage,
  isEditable,
  disabledReason,
}) {
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const placeMenu = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 148;
    const left = Math.max(
      8,
      Math.min(window.innerWidth - width - 8, rect.right - width),
    );
    const top = Math.min(window.innerHeight - 12, rect.bottom + 6);
    setMenuPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();

    const handleClickOutside = (event) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) setOpen(false);
    };

    const handleViewportChange = () => placeMenu();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, setOpen]);

  return (
    <div
      ref={menuRef}
      style={{ position: "relative" }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        ref={triggerRef}
        className="btn btn-sm dt-action-toggle"
        style={{
          minWidth: compact ? 34 : 38,
          height: 34,
          paddingInline: compact ? 0 : 4,
          display: "inline-flex",
          justifyContent: "center",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label={t("dailyTasks.actionsMenu", "Task actions")}
      >
        <LuEllipsisVertical size={14} />
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            minWidth: 148,
            borderRadius: "var(--r)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--sh-lg)",
            zIndex: 999,
            overflow: "hidden",
            animation: "fadeUp .12s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="dt-action-item"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onView();
            }}
          >
            <LuEye size={13} />
            {t("common.view")}
          </button>
          {canManage && (
            <>
              <button
                type="button"
                className="dt-action-item"
                aria-disabled={!isEditable}
                title={isEditable ? undefined : disabledReason}
                style={
                  isEditable
                    ? undefined
                    : { opacity: 0.55, cursor: "not-allowed" }
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditable) return;
                  setOpen(false);
                  onEdit();
                }}
              >
                <LuPencil size={13} />
                {t("dailyTasks.update", "Update")}
              </button>
              <button
                type="button"
                className="dt-action-item dt-action-item-danger"
                aria-disabled={!isEditable}
                title={isEditable ? undefined : disabledReason}
                style={
                  isEditable
                    ? undefined
                    : { opacity: 0.55, cursor: "not-allowed" }
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditable) return;
                  setOpen(false);
                  onDelete();
                }}
              >
                <LuTrash2 size={13} />
                {t("common.delete")}
              </button>
              {!isEditable && (
                <div
                  style={{
                    padding: "8px 12px 10px",
                    borderTop: "1px solid var(--border)",
                    fontSize: 11.5,
                    color: "var(--text3)",
                  }}
                >
                  {disabledReason}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="tbl-wrap dt-desktop-table" style={{ padding: "10px 0" }}>
      <table className="tbl">
        <tbody>
          {[...Array(7)].map((_, i) => (
            <tr key={i}>
              <td colSpan={7} style={{ padding: "10px 14px" }}>
                <div
                  style={{
                    height: 52,
                    borderRadius: 12,
                    background:
                      "linear-gradient(90deg, var(--surface2) 25%, rgba(203,213,225,.55) 37%, var(--surface2) 63%)",
                    backgroundSize: "400% 100%",
                    animation: "dtShimmer 1.2s ease infinite",
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyTasksState({ t }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "54px 20px",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: "linear-gradient(145deg, #EFF6FF, #F0FDF4)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LuInbox size={26} style={{ color: "var(--text3)" }} />
      </div>
      <h3 style={{ fontSize: 16, color: "var(--text1)" }}>
        {t("dailyTasks.noTasksTitle", "No tasks found")}
      </h3>
      <p style={{ fontSize: 13, color: "var(--text3)", maxWidth: 340 }}>
        {t(
          "dailyTasks.noTasksHint",
          "Try adjusting your search or create a new daily task to get started.",
        )}
      </p>
    </div>
  );
}

function TaskRow({
  task,
  onClick,
  onEdit,
  onDelete,
  index,
  isRtlNote,
  openMenu,
  setOpenMenu,
  canManage,
  disabledReason,
}) {
  const { t } = useTranslation();
  const isEditable = isDailyTaskEditable(task);

  return (
    <tr
      className="tr-hover dt-row"
      style={{ cursor: "pointer", transition: "all .16s ease" }}
      onClick={() => onClick(task.id)}
    >
      <td style={{ width: 44, color: "var(--text3)", fontSize: 12 }}>
        {index + 1}
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={task.fromName} size={30} accent="#2563EB" />
          <span style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.2 }}>
            {task.fromName}
          </span>
        </div>
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={task.recipientName} size={30} accent="#7C3AED" />
          <span style={{ fontSize: 13.5, lineHeight: 1.2 }}>
            {task.recipientName}
          </span>
        </div>
      </td>
      <td style={{ textAlign: "center" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 12px",
            borderRadius: 999,
            background: "linear-gradient(180deg, #F0FDF4, #DCFCE7)",
            border: "1px solid #86EFAC",
            fontSize: 12.5,
            fontWeight: 700,
            color: "#166534",
            letterSpacing: ".01em",
          }}
        >
          <LuBadgeCheck size={12} />
          {formatMoney(task.amount)}
        </span>
      </td>
      <td style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text1)", fontWeight: 600 }}>
          {formatDateTime(task.taskDate)}
        </p>
      </td>
      <td
        style={{
          maxWidth: 210,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--text3)",
          fontSize: 13,
          textAlign: isRtlNote ? "right" : "left",
          direction: isRtlNote ? "rtl" : "ltr",
          unicodeBidi: "plaintext",
          fontFamily: isRtlNote
            ? "'Noto Naskh Arabic','Noto Sans Arabic','Inter',sans-serif"
            : undefined,
        }}
      >
        {task.note || <span style={{ opacity: 0.35 }}>—</span>}
      </td>
      <td
        style={{ textAlign: "right", width: 72 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ActionMenu
          open={openMenu === task.id}
          setOpen={(value) => setOpenMenu(value ? task.id : null)}
          onView={() => onClick(task.id)}
          onEdit={() => onEdit(task)}
          onDelete={() => onDelete(task)}
          canManage={canManage}
          isEditable={isEditable}
          disabledReason={disabledReason}
          t={t}
        />
      </td>
    </tr>
  );
}

function TaskCard({
  task,
  onClick,
  onEdit,
  onDelete,
  openMenu,
  setOpenMenu,
  canManage,
  disabledReason,
}) {
  const { t } = useTranslation();
  const isEditable = isDailyTaskEditable(task);

  return (
    <div
      className="dt-mobile-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all .15s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      onClick={() => onClick(task.id)}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}
        >
          <Avatar name={task.fromName} size={28} accent="#2563EB" />
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: "var(--text1)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.fromName}
          </span>
          <LuArrowUpRight
            size={13}
            style={{ color: "var(--text3)", flexShrink: 0 }}
          />
          <Avatar name={task.recipientName} size={28} accent="#7C3AED" />
          <span
            style={{
              fontSize: 13,
              color: "var(--text2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.recipientName}
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "3px 10px",
            borderRadius: 20,
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            fontSize: 13,
            fontWeight: 700,
            color: "#16A34A",
            flexShrink: 0,
          }}
        >
          <LuBadgeCheck size={12} style={{ marginRight: 4 }} />
          {formatMoney(task.amount)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "var(--text3)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <LuCalendarDays size={12} />
          {formatDateTime(task.taskDate)}
        </span>
        <LuChevronRight
          size={14}
          style={{ color: "var(--text3)", flexShrink: 0 }}
        />
      </div>

      {task.note && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            paddingTop: 8,
            borderTop: "1px solid var(--border)",
          }}
        >
          {task.note}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 2,
          justifyContent: "space-between",
          alignItems: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-outline btn-sm"
          style={{ gap: 4, justifyContent: "center" }}
          onClick={(e) => {
            e.stopPropagation();
            onClick(task.id);
          }}
        >
          <LuEye size={12} />
          {t("common.view")}
        </button>
        {canManage && (
          <ActionMenu
            compact
            open={openMenu === task.id}
            setOpen={(value) => setOpenMenu(value ? task.id : null)}
            onView={() => onClick(task.id)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
            canManage={canManage}
            isEditable={isEditable}
            disabledReason={disabledReason}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

export default function AllDailyTasks() {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [reportDate, setReportDate] = useState("");
  const reportMenuRef = useRef(null);
  const [editForm, setEditForm] = useState({
    fromName: "",
    recipientName: "",
    amount: "",
    taskDate: "",
    note: "",
  });
  const expiredActionMessage = t(
    "dailyTasks.editExpired",
    "Editing time expired",
  );

  const toLocalInput = (iso) => {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const openEdit = (task) => {
    if (!isAdmin) return;
    if (!isDailyTaskEditable(task)) {
      toast.error(expiredActionMessage);
      return;
    }

    setEditTask(task);
    setEditForm({
      fromName: task.fromName || "",
      recipientName: task.recipientName || "",
      amount: String(task.amount ?? ""),
      taskDate: task.taskDate ? toLocalInput(task.taskDate) : "",
      note: task.note || "",
    });
  };

  const requestDelete = (task) => {
    if (!isAdmin) return;
    if (!isDailyTaskEditable(task)) {
      toast.error(expiredActionMessage);
      return;
    }

    setDeleteTask(task);
  };

  const { data: dokanUsers = [], isLoading: loadingDokanUsers } = useQuery({
    queryKey: ["daily-task-senders"],
    queryFn: () => api.get("/users/dokan").then((r) => r.data),
  });

  const senderOptions = useMemo(
    () =>
      dokanUsers.map((user) => ({
        value: user.name,
        label: user.name,
      })),
    [dokanUsers],
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      api.put(`/daily-tasks/${id}`, payload).then((r) => r.data),
    onSuccess: (_, vars) => {
      toast.success(t("dailyTasks.updated", "Task updated successfully."));
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
      qc.invalidateQueries({ queryKey: ["daily-task", vars.id] });
      setEditTask(null);
    },
    onError: (err) =>
      toast.error(
        getApiErrorMessage(
          err,
          t("dailyTasks.updateFailed", "Failed to update task."),
        ),
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/daily-tasks/${id}`),
    onSuccess: () => {
      toast.success(t("dailyTasks.deleted"));
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
      setDeleteTask(null);
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("dailyTasks.deleteFailed"))),
  });

  const submitEdit = (e) => {
    e.preventDefault();
    if (!editTask) return;
    updateMutation.mutate({
      id: editTask.id,
      payload: {
        fromName: editForm.fromName.trim(),
        recipientName: editForm.recipientName.trim(),
        amount: Number(editForm.amount),
        taskDate: new Date(editForm.taskDate).toISOString(),
        note: editForm.note?.trim() || undefined,
      },
    });
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["daily-tasks", page, search],
    queryFn: () =>
      api
        .get("/daily-tasks", { params: { page, limit: 20, search } })
        .then((r) => r.data),
  });

  const tasks = data?.data || [];
  const total = data?.total || 0;
  const totalAmount = useMemo(
    () => tasks.reduce((sum, task) => sum + Number(task.amount), 0),
    [tasks],
  );
  const isRtlNote = isRtlTextLanguage(i18n.language);
  const summaryTotalTasks = total;
  const summaryTotalAmount = totalAmount;
  const reportTypeOptions = [
    { value: "daily", label: t("dailyTasks.reportDailyFull", "Daily Report") },
    { value: "weekly", label: t("dailyTasks.reportWeeklyFull", "Weekly Report") },
    { value: "monthly", label: t("dailyTasks.reportMonthlyFull", "Monthly Report") },
    { value: "yearly", label: t("dailyTasks.reportYearlyFull", "Yearly Report") },
  ];

  const reportMutation = useMutation({
    mutationFn: ({ reportType }) =>
      downloadDailyTaskReportPdf({ reportType, date: reportDate }),
    onSuccess: (_, vars) => {
      toast.success(
        t("dailyTasks.reportGenerated", "Report PDF generated successfully."),
      );
      setReportMenuOpen(false);
    },
    onError: (err) => {
      toast.error(
        getApiErrorMessage(
          err,
          t("dailyTasks.reportFailed", "Failed to generate report PDF."),
        ),
      );
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const handleReportDownload = (reportType) => {
    reportMutation.mutate({ reportType });
  };

  useEffect(() => {
    if (!openMenu && !reportMenuOpen) return;
    const close = () => {
      setOpenMenu(null);
      setReportMenuOpen(false);
    };
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [openMenu, reportMenuOpen]);

  useEffect(() => {
    if (!reportMenuOpen) return;

    const handleClickOutside = (event) => {
      if (!reportMenuRef.current?.contains(event.target)) {
        setReportMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [reportMenuOpen]);

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <PageHeader
        title={t("dailyTasks.allTitle")}
        subtitle={t("dailyTasks.allSubtitle")}
        action={
          <div ref={reportMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm dt-toolbar-btn"
              style={{ gap: 6, minWidth: 136, height: 38 }}
              onClick={() => setReportMenuOpen((prev) => !prev)}
              disabled={!isAdmin || reportMutation.isPending}
            >
              <LuFileText size={14} />
              {t("dailyTasks.report", "Report")}
              <LuChevronDown size={14} />
            </button>

            {reportMenuOpen && isAdmin && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  minWidth: 248,
                  borderRadius: "var(--r)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  boxShadow: "var(--sh-lg)",
                  zIndex: 30,
                  padding: 10,
                  display: "grid",
                  gap: 8,
                }}
              >
                <Field
                  label={t(
                    "dailyTasks.selectedDate",
                    "Selected Date (optional)",
                  )}
                >
                  <input
                    type="date"
                    className="inp"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    style={{ height: 36 }}
                  />
                </Field>

                {reportTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ justifyContent: "flex-start", gap: 6, height: 36 }}
                    disabled={reportMutation.isPending}
                    onClick={() => handleReportDownload(option.value)}
                  >
                    <LuFileText size={13} />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      <div
        className="dt-summary-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <StatBanner
          label={t("dailyTasks.totalTasks")}
          value={summaryTotalTasks}
          Icon={LuClipboardList}
          accent="#2563EB"
          sub={
            search
              ? t("dailyTasks.filtered", "Filtered results")
              : t("dailyTasks.allRecords", "All records")
          }
        />
        <StatBanner
          label={t("dailyTasks.totalAmount")}
          value={formatMoney(summaryTotalAmount)}
          Icon={LuBadgeDollarSign}
          accent="#16A34A"
          sub={`${tasks.length} ${t("dailyTasks.taskCount", "tasks on page")}`}
        />
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--sh)",
          marginBottom: 14,
          overflow: "visible",
          transition: "box-shadow .18s ease, border-color .18s ease",
        }}
      >
        <div
          className="dt-toolbar"
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <form
            onSubmit={handleSearch}
            className="dt-search-form"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flex: 1,
              minWidth: 220,
            }}
          >
            <div style={{ flex: 1 }}>
              <input
                className="inp dt-search-input"
                style={{ height: 38, paddingInline: 12 }}
                placeholder={t("dailyTasks.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-outline btn-sm dt-toolbar-btn"
              style={{ gap: 4, minWidth: 98, height: 38 }}
            >
              <LuSearch size={13} />
              {t("common.search")}
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={clearSearch}
                title={t("common.clear", "Clear")}
                style={{
                  minWidth: 38,
                  width: 38,
                  height: 38,
                  paddingInline: 0,
                }}
              >
                <LuX size={13} />
              </button>
            )}
          </form>

          <button
            type="button"
            className="btn btn-outline btn-sm dt-toolbar-btn"
            style={{ gap: 6, minWidth: 132, height: 38 }}
            onClick={() => navigate("/daily-tasks")}
          >
            <LuPlus size={14} />
            {t("dailyTasks.newTask", "New Expense")}
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ gap: 4, flexShrink: 0, minWidth: 104, height: 38 }}
          >
            <LuRefreshCcw
              size={13}
              style={{
                animation: isFetching ? "spin .7s linear infinite" : "none",
              }}
            />
            {t("dailyTasks.refresh")}
          </button>
        </div>

        {isLoading ? (
          <>
            <TableSkeleton />
            <div
              className="dt-mobile-cards"
              style={{ display: "none", padding: "14px" }}
            >
              <Spinner />
            </div>
          </>
        ) : tasks.length === 0 ? (
          <EmptyTasksState t={t} />
        ) : (
          <>
            <div className="tbl-wrap dt-desktop-table">
              <table className="tbl dt-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>
                      <LuHash size={12} />
                    </th>
                    <th>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <LuUser size={12} />
                        {t("dailyTasks.fromName")}
                      </div>
                    </th>
                    <th>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <LuUsers size={12} />
                        {t("dailyTasks.recipientName")}
                      </div>
                    </th>
                    <th style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <LuBadgeDollarSign size={12} />
                        {t("dailyTasks.amount")}
                      </div>
                    </th>
                    <th style={{ textAlign: "center" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <LuCalendarDays size={12} />
                        {t("dailyTasks.taskDate")}
                      </div>
                    </th>
                    <th>{t("dailyTasks.note")}</th>
                    <th style={{ width: 72, textAlign: "right" }}>
                      {t("common.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, i) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      index={(page - 1) * 20 + i}
                      isRtlNote={isRtlNote}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                      canManage={isAdmin}
                      disabledReason={expiredActionMessage}
                      onEdit={openEdit}
                      onDelete={requestDelete}
                      onClick={(id) => navigate(`/daily-tasks/${id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className="dt-mobile-cards"
              style={{
                display: "none",
                flexDirection: "column",
                gap: 10,
                padding: "12px 14px",
              }}
            >
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  openMenu={openMenu}
                  setOpenMenu={setOpenMenu}
                  canManage={isAdmin}
                  disabledReason={expiredActionMessage}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                  onClick={(id) => navigate(`/daily-tasks/${id}`)}
                />
              ))}
            </div>
          </>
        )}

        <div
          style={{
            borderTop: tasks.length > 0 ? "1px solid var(--border)" : "none",
          }}
        >
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </div>
      </div>

      <Modal
        open={Boolean(editTask)}
        onClose={() => setEditTask(null)}
        title={t("dailyTasks.updateTitle", "Update Daily Task")}
        maxW={620}
      >
        <form onSubmit={submitEdit}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <Field label={t("dailyTasks.fromName")} required>
              <Select
                value={
                  senderOptions.find(
                    (option) => option.value === editForm.fromName,
                  ) || null
                }
                options={senderOptions}
                isSearchable
                isClearable
                isLoading={loadingDokanUsers}
                placeholder={t(
                  "dailyTasks.senderPlaceholder",
                  "Select a Dokan sender",
                )}
                noOptionsMessage={() =>
                  t("dailyTasks.noSenders", "No Dokan users found")
                }
                styles={buildSelectStyles(false)}
                onChange={(option) =>
                  setEditForm((s) => ({ ...s, fromName: option?.value || "" }))
                }
              />
            </Field>
            <Field label={t("dailyTasks.recipientName")} required>
              <input
                className="inp"
                value={editForm.recipientName}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, recipientName: e.target.value }))
                }
              />
            </Field>
            <Field label={t("dailyTasks.amount")} required>
              <input
                type="number"
                className="inp"
                min="1"
                step="1"
                value={editForm.amount}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, amount: e.target.value }))
                }
              />
            </Field>
            <Field label={t("dailyTasks.taskDate")} required>
              <input
                type="datetime-local"
                className="inp"
                value={editForm.taskDate}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, taskDate: e.target.value }))
                }
              />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label={t("dailyTasks.note")}>
              <textarea
                className="inp"
                rows={3}
                value={editForm.note}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, note: e.target.value }))
                }
                style={{ resize: "vertical" }}
              />
            </Field>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 16,
              borderTop: "1px solid var(--border)",
              paddingTop: 14,
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setEditTask(null)}
              disabled={updateMutation.isPending}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ gap: 6, minWidth: 132 }}
              disabled={updateMutation.isPending || !editForm.fromName}
            >
              <LuSave size={13} />
              {updateMutation.isPending
                ? t("common.loading")
                : t("dailyTasks.update", "Update")}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleteTask)}
        onClose={() => setDeleteTask(null)}
        onConfirm={() => deleteTask && deleteMutation.mutate(deleteTask.id)}
        isPending={deleteMutation.isPending}
        title={t("dailyTasks.deleteTitle")}
        message={t("dailyTasks.deleteMessage")}
        itemName={
          deleteTask
            ? `${deleteTask.fromName} → ${deleteTask.recipientName}`
            : ""
        }
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dtShimmer {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }

        .dt-summary-card {
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .dt-summary-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--sh-md);
          border-color: var(--border2);
        }

        .dt-toolbar-btn {
          border-radius: 10px;
          padding-inline: 16px;
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
        }
        .dt-toolbar-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--sh-md);
        }

        .dt-search-input {
          border-radius: 10px;
          border-color: var(--border2);
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .dt-search-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,.12);
        }

        .dt-table thead th {
          font-size: 12px;
          font-weight: 700;
          color: var(--text2);
          background: linear-gradient(180deg, var(--surface), var(--surface2));
          border-bottom: 1px solid var(--border);
          padding-top: 12px;
          padding-bottom: 12px;
        }
        .dt-table tbody tr td {
          padding-top: 13px;
          padding-bottom: 13px;
          vertical-align: middle;
        }
        .dt-table tbody tr:nth-child(2n) {
          background: #f8fafc;
        }
        .dark .dt-table tbody tr:nth-child(2n) {
          background: rgba(148,163,184,.06);
        }
        .dt-table tbody tr.dt-row:hover {
          background: #eff6ff;
        }
        .dark .dt-table tbody tr.dt-row:hover {
          background: rgba(37,99,235,.16);
        }

        .dt-action-item {
          width: 100%;
          border: none;
          background: transparent;
          color: var(--text2);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          padding: 9px 12px;
          cursor: pointer;
          transition: background .14s ease, color .14s ease;
        }
        .dt-action-item:hover {
          background: var(--surface2);
          color: var(--text1);
        }
        .dt-action-item-danger {
          color: #B91C1C;
        }
        .dt-action-item-danger:hover {
          background: #FEF2F2;
          color: #991B1B;
        }

        .dt-action-toggle {
          border: 1px solid var(--border2);
          background: var(--surface2);
          color: var(--text1);
          border-radius: 10px;
          transition: all .14s ease;
        }
        .dt-action-toggle:hover {
          background: var(--surface);
          border-color: var(--primary-200);
          color: var(--primary);
        }

        .dt-mobile-card {
          transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
        }
        .dt-mobile-card:active {
          transform: translateY(1px);
        }
        .dt-mobile-card:hover {
          border-color: var(--border2);
          box-shadow: var(--sh-md);
        }

        @media (max-width: 680px) {
          .dt-desktop-table { display: none !important; }
          .dt-mobile-cards { display: flex !important; }
          .dt-toolbar { gap: 10px !important; }
          .dt-search-form { min-width: 100% !important; }
        }

        @media (max-width: 460px) {
          .dt-summary-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
