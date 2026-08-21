import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import {
  LuBadgeCheck,
  LuCalendarCheck,
  LuCalendarDays,
  LuChevronDown,
  LuClipboardList,
  LuEllipsisVertical,
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
  LuEye,
} from "react-icons/lu";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import api from "../lib/api.js";
import {
  buildSelectStyles,
  downloadDailyTaskReportPdf,
  isDailyTaskEditable,
} from "../lib/dailyTasks.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { formatCurrency } from "../lib/currency.js";
import { formatMonthYearLabel } from "../lib/months.js";
import { formatSystemDateTime } from "../lib/locale.js";
import {
  ConfirmDeleteModal,
  Field,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
  TableHorizontalScroll,
} from "../components/ui/index.jsx";

function formatMoney(v, language = "en") {
  return formatCurrency(v, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDateTime(iso, language) {
  return formatSystemDateTime(iso, language);
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
        className="dt-summary-card__accent"
        style={{
          position: "absolute",
          top: 0,
          insetInlineStart: 0,
          width: 3,
          height: "100%",
          background: accent,
        }}
      />
      <div
        className="dt-summary-card__icon"
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
      <div className="dt-summary-card__body" style={{ flex: 1, minWidth: 0 }}>
        <p
          className="dt-summary-card__label"
          style={{
            textAlign: "start",
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
          className="dt-summary-card__value"
          style={{
            fontSize: 25,
            fontWeight: 700,
            color: accent,
            letterSpacing: "-.03em",
            lineHeight: 1,
            textAlign: "start",
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            className="dt-summary-card__sub"
            style={{
              fontSize: 11.5,
              color: "var(--text3)",
              marginTop: 5,
              textAlign: "start",
            }}
          >
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
  const isRtl =
    typeof document !== "undefined" ? document.dir === "rtl" : false;

  const placeMenu = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 164;
    const menuItemHeight = 36;
    const itemsCount = canManage ? 2 : 0;
    const menuHeight =
      itemsCount * menuItemHeight + (!isEditable && canManage ? 42 : 8);

    const minLeft = 8;
    const maxLeft = Math.max(minLeft, window.innerWidth - menuWidth - 8);
    const desiredLeft = isRtl ? rect.left : rect.right - menuWidth;
    const left = Math.max(minLeft, Math.min(maxLeft, desiredLeft));

    const preferredTop = rect.bottom + 6;
    const maxTop = window.innerHeight - menuHeight - 8;
    const top =
      preferredTop <= maxTop
        ? preferredTop
        : Math.max(8, rect.top - menuHeight - 6);

    setMenuPos({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    placeMenu();

    const handleClickOutside = (event) => {
      if (
        !menuRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
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
          className="dt-action-dropdown"
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 999,
            animation: "fadeUp .12s ease",
            direction: isRtl ? "rtl" : "ltr",
          }}
          onClick={(e) => e.stopPropagation()}
        >
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
    <div
      className="tbl-wrap dt-table-scroll-wrap"
      style={{ padding: "10px 0" }}
    >
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

function DailyTaskDetailsModal({
  open,
  task,
  isLoading,
  onClose,
  t,
  language,
}) {
  const infoCardStyle = {
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--surface)",
    padding: "12px 14px",
    display: "grid",
    gap: 4,
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text3)",
    textTransform: isRtlTextLanguage(language) ? "none" : "uppercase",
    letterSpacing: isRtlTextLanguage(language) ? 0 : ".05em",
    textAlign: "start",
  };

  const valueStyle = {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text1)",
    lineHeight: 1.5,
    wordBreak: "break-word",
    textAlign: "start",
    unicodeBidi: "plaintext",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("dailyTasks.detailTitle", "Expense Details")}
      maxW={720}
    >
      {isLoading ? (
        <div
          style={{
            padding: "28px 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Spinner />
        </div>
      ) : !task ? (
        <div
          style={{
            padding: "22px 4px",
            textAlign: "center",
            color: "var(--text3)",
            fontSize: 14,
          }}
        >
          {t("dailyTasks.notFound", "Expense not found.")}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, direction: "inherit" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div style={infoCardStyle}>
              <span style={labelStyle}>{t("dailyTasks.fromName")}</span>
              <span style={valueStyle}>{task.fromName || "-"}</span>
            </div>
            <div style={infoCardStyle}>
              <span style={labelStyle}>{t("dailyTasks.recipientName")}</span>
              <span style={valueStyle}>{task.recipientName || "-"}</span>
            </div>
            <div style={infoCardStyle}>
              <span style={labelStyle}>{t("dailyTasks.amount")}</span>
              <span style={{ ...valueStyle, color: "#166534" }}>
                {formatMoney(task.amount, language)}
              </span>
            </div>
            <div style={infoCardStyle}>
              <span style={labelStyle}>{t("dailyTasks.taskDate")}</span>
              <span style={valueStyle}>
                {formatDateTime(task.taskDate, language)}
              </span>
            </div>
          </div>

          <div style={infoCardStyle}>
            <span style={labelStyle}>{t("dailyTasks.note")}</span>
            <span
              style={{
                ...valueStyle,
                fontWeight: 500,
                color: task.note ? "var(--text1)" : "var(--text3)",
                whiteSpace: "pre-wrap",
              }}
            >
              {task.note || t("dailyTasks.noNote", "No note added.")}
            </span>
          </div>

          <div style={infoCardStyle}>
            <span style={labelStyle}>
              {t("dailyTasks.orderInfo", "Linked Order")}
            </span>
            {task.order ? (
              <div style={{ display: "grid", gap: 6 }}>
                <span style={valueStyle}>
                  {t("orders.billNumber", "Bill Number")}: #
                  {task.order.customer?.billNumber || "-"}
                </span>
                <span style={valueStyle}>
                  {t("common.customer", "Customer")}:{" "}
                  {task.order.customer?.firstName || "-"}
                </span>
                <span style={valueStyle}>
                  {t("common.type", "Type")}: {task.order.type || "-"}
                </span>
              </div>
            ) : (
              <span
                style={{
                  ...valueStyle,
                  fontWeight: 500,
                  color: "var(--text3)",
                }}
              >
                {t("dailyTasks.noLinkedOrder", "No linked order.")}
              </span>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div style={infoCardStyle}>
              <span style={labelStyle}>{t("dailyTasks.createdBy")}</span>
              <span style={valueStyle}>{task.createdBy?.name || "-"}</span>
            </div>
            <div style={infoCardStyle}>
              <span style={labelStyle}>{t("dailyTasks.createdAt")}</span>
              <span style={valueStyle}>
                {formatDateTime(task.createdAt, language)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TaskRow({
  task,
  onView,
  onEdit,
  onDelete,
  index,
  isRtlNote,
  openMenu,
  setOpenMenu,
  canManage,
  isMonthEditable = true,
  disabledReason,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isEditable = isMonthEditable && isDailyTaskEditable(task);

  return (
    <tr className="tr-hover dt-row" style={{ transition: "all .16s ease" }}>
      <td
        className="dt-cell-index"
        style={{ width: 44, color: "var(--text3)", fontSize: 12 }}
      >
        {index + 1}
      </td>
      <td>
        <div className="dt-person-cell">
          <Avatar name={task.fromName} size={30} accent="#2563EB" />
          <span
            style={{
              fontWeight: 600,
              fontSize: 13.5,
              lineHeight: 1.2,
              minWidth: 0,
            }}
          >
            {task.fromName}
          </span>
        </div>
      </td>
      <td>
        <div className="dt-person-cell">
          <Avatar name={task.recipientName} size={30} accent="#7C3AED" />
          <span style={{ fontSize: 13.5, lineHeight: 1.2, minWidth: 0 }}>
            {task.recipientName}
          </span>
        </div>
      </td>
      <td className="dt-cell-center" style={{ textAlign: "center" }}>
        <span
          className="dt-money-pill"
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
          <AfCurrencyIcon size={12} />
          {formatMoney(task.amount, language)}
        </span>
      </td>
      <td className="dt-cell-center" style={{ textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text1)", fontWeight: 600 }}>
          {formatDateTime(task.taskDate, language)}
        </p>
      </td>
      <td
        className="dt-note-cell"
        style={{
          maxWidth: 210,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: "var(--text3)",
          fontSize: 13,
          textAlign: "start",
          direction: isRtlNote ? "rtl" : "ltr",
          unicodeBidi: "plaintext",
          fontFamily: isRtlNote ? "var(--font-rtl)" : undefined,
        }}
      >
        {task.note || <span style={{ opacity: 0.35 }}>—</span>}
      </td>
      <td
        className="dt-cell-actions"
        style={{ textAlign: "end", width: 148 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dt-row-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            style={{ gap: 5, minWidth: 84, height: 34 }}
            onClick={() => onView(task)}
          >
            <LuEye size={13} />
            {t("common.view", "View")}
          </button>
          {canManage ? (
            <ActionMenu
              open={openMenu === task.id}
              setOpen={(value) => setOpenMenu(value ? task.id : null)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
              canManage={canManage}
              isEditable={isEditable}
              disabledReason={disabledReason}
              t={t}
            />
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function TaskCard({
  task,
  onView,
  onEdit,
  onDelete,
  openMenu,
  setOpenMenu,
  canManage,
  isMonthEditable = true,
  disabledReason,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isEditable = isMonthEditable && isDailyTaskEditable(task);

  return (
    <div
      className="dt-mobile-card"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "14px 16px",
        transition: "all .15s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        className="dt-mobile-card__head"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          className="dt-mobile-party-flow"
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
            className="dt-mobile-party-arrow"
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
          className="dt-mobile-amount"
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
          <LuBadgeCheck size={12} style={{ marginInlineEnd: 4 }} />
          {formatMoney(task.amount, language)}
        </span>
      </div>

      <div
        className="dt-mobile-meta-row"
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
            minWidth: 0,
          }}
        >
          <LuCalendarDays size={12} />
          {formatDateTime(task.taskDate, language)}
        </span>
        <span style={{ width: 14, height: 14, display: "inline-block" }} />
      </div>

      {task.note && (
        <p
          className="dt-mobile-note"
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
        className="dt-mobile-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
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
          style={{ gap: 5, minWidth: 92, height: 34 }}
          onClick={() => onView(task)}
        >
          <LuEye size={13} />
          {t("common.view", "View")}
        </button>
        {canManage ? (
          <ActionMenu
            compact
            open={openMenu === task.id}
            setOpen={(value) => setOpenMenu(value ? task.id : null)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
            canManage={canManage}
            isEditable={isEditable}
            disabledReason={disabledReason}
            t={t}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function AllDailyTasks() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = isRtlTextLanguage(language);
  const { hasPermission } = useAuth();
  const { viewMonth, viewYear, getMonthAccessMode } = useMonth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [viewTaskId, setViewTaskId] = useState(null);
  const reportMenuRef = useRef(null);
  const reportMenuButtonRef = useRef(null);
  const [reportMenuPos, setReportMenuPos] = useState({
    top: 0,
    left: 8,
    width: 268,
  });
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

  const isMonthEditable =
    getMonthAccessMode(viewMonth, viewYear) === "editable";
  const monthReadOnlyReason = t(
    "navbar.pastMonthReadOnly",
    "Past months are read-only. No editing allowed.",
  );
  const effectiveDisabledReason = isMonthEditable
    ? expiredActionMessage
    : monthReadOnlyReason;

  const toLocalInput = (iso) => {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const canViewExpenses = hasPermission(PERMISSIONS.FINANCE_VIEW);
  const canAddExpenses = hasPermission(PERMISSIONS.FINANCE_EXPENSES_ADD);
  const canEditExpenses = hasPermission(PERMISSIONS.FINANCE_EXPENSES_EDIT);
  const canDeleteExpenses = hasPermission(PERMISSIONS.FINANCE_EXPENSES_DELETE);
  const canPrintReports = hasPermission(PERMISSIONS.REPORTS_PRINT);
  const canManageExpenses = canEditExpenses || canDeleteExpenses;

  const openEdit = (task) => {
    if (!canEditExpenses) return;
    if (!isMonthEditable) {
      toast.error(monthReadOnlyReason);
      return;
    }
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
    if (!canDeleteExpenses) return;
    if (!isMonthEditable) {
      toast.error(monthReadOnlyReason);
      return;
    }
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
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["design-contributors"] });
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
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["design-contributors"] });
      setDeleteTask(null);
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("dailyTasks.deleteFailed"))),
  });

  const { data: viewTask, isLoading: viewTaskLoading } = useQuery({
    queryKey: ["daily-task", viewTaskId],
    queryFn: () => api.get(`/daily-tasks/${viewTaskId}`).then((r) => r.data),
    enabled: Boolean(viewTaskId),
  });

  const openView = (task) => {
    setViewTaskId(task.id);
    setOpenMenu(null);
  };

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

  // Reset to page 1 when the selected month/year changes
  useEffect(() => {
    setPage(1);
  }, [viewMonth, viewYear]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["daily-tasks", page, search, viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/daily-tasks", {
          params: {
            page,
            limit: 20,
            search,
            month: canViewExpenses ? viewMonth : undefined,
            year: canViewExpenses ? viewYear : undefined,
          },
        })
        .then((r) => r.data),
  });

  const tasks = data?.data || [];
  const total = data?.total || 0;
  const pageTotalAmount = useMemo(
    () => tasks.reduce((sum, task) => sum + Number(task.amount), 0),
    [tasks],
  );
  const isRtlNote = isRtl;
  const summary = data?.summary || {};
  const summaryTotalTasks = summary.totalTasks ?? total;
  const summaryTotalAmount = summary.totalAmount ?? pageTotalAmount;
  const summaryOrderExpenses = summary.orderExpenses ?? 0;
  const summaryOtherExpenses = summary.otherExpenses ?? 0;

  // Derive the anchor date for monthly/yearly reports from the currently viewed month
  const reportMonthDate = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
  const reportMonthLabel = formatMonthYearLabel(viewMonth, viewYear, language);

  const reportTypeOptions = [
    {
      value: "daily",
      label: t("dailyTasks.reportDailyFull", "Daily Report"),
      date: undefined,
    },
    {
      value: "weekly",
      label: t("dailyTasks.reportWeeklyFull", "Weekly Report"),
      date: undefined,
    },
    {
      value: "monthly",
      label: `${t("dailyTasks.reportMonthlyFull", "Monthly Report")} — ${reportMonthLabel}`,
      date: reportMonthDate,
    },
    {
      value: "yearly",
      label: `${t("dailyTasks.reportYearlyFull", "Yearly Report")} — ${viewYear}`,
      date: `${viewYear}-01-01`,
    },
  ];

  const reportMutation = useMutation({
    mutationFn: ({ reportType, date }) =>
      downloadDailyTaskReportPdf({
        reportType,
        date,
        language,
        month: viewMonth,
        year: viewYear,
      }),
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

  const handleReportDownload = (reportType, date) => {
    reportMutation.mutate({ reportType, date });
  };

  const placeReportMenu = () => {
    if (!reportMenuButtonRef.current || typeof window === "undefined") return;

    const rect = reportMenuButtonRef.current.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const gutter = 8;
    const width = Math.min(292, Math.max(220, viewportWidth - gutter * 2));
    const desiredLeft = isRtl ? rect.right - width : rect.left;
    const maxLeft = Math.max(gutter, viewportWidth - width - gutter);
    const left = Math.max(gutter, Math.min(maxLeft, desiredLeft));
    const top = Math.max(gutter, rect.bottom + 6);

    setReportMenuPos({ top, left, width });
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

  useEffect(() => {
    if (!reportMenuOpen) return;

    placeReportMenu();
    const handleViewportChange = () => placeReportMenu();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [reportMenuOpen, isRtl]);

  return (
    <div
      className="page report-root professional-report-page daily-tasks-report-page"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ paddingBottom: 40 }}
    >
      <PageHeader
        title={t("dailyTasks.allTitle")}
        subtitle={t("dailyTasks.allSubtitle")}
        action={
          <div
            ref={reportMenuRef}
            className="dt-page-header-action"
            style={{ position: "relative" }}
          >
            <button
              ref={reportMenuButtonRef}
              type="button"
              className="btn btn-outline btn-sm dt-toolbar-btn dt-report-trigger"
              style={{ gap: 6, minWidth: 136, height: 38 }}
              onClick={() => {
                setReportMenuOpen((prev) => {
                  const next = !prev;
                  if (next) placeReportMenu();
                  return next;
                });
              }}
              disabled={!canPrintReports || reportMutation.isPending}
            >
              <LuFileText size={14} />
              {t("dailyTasks.report", "Report")}
              <LuChevronDown size={14} />
            </button>

            {reportMenuOpen && canPrintReports && (
              <div
                className="dt-report-dropdown"
                style={{
                  position: "fixed",
                  top: reportMenuPos.top,
                  left: reportMenuPos.left,
                  width: reportMenuPos.width,
                  direction: isRtl ? "rtl" : "ltr",
                  textAlign: isRtl ? "right" : "left",
                }}
              >
                <div
                  className="dt-report-month"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    borderRadius: "var(--r)",
                    background: "var(--success-soft, #F0FDF4)",
                    border: "1px solid var(--success-soft-border, #BBF7D0)",
                    fontSize: 12.5,
                    color: "var(--success, #16A34A)",
                    fontWeight: 500,
                  }}
                >
                  <LuCalendarCheck size={13} />
                  <span>
                    {t("dailyTasks.viewingMonth", "Viewing")}:{" "}
                    <strong>{reportMonthLabel}</strong>
                  </span>
                </div>

                {reportTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{
                      justifyContent: "flex-start",
                      gap: 6,
                      height: 36,
                      fontSize: 13,
                      width: "100%",
                    }}
                    disabled={reportMutation.isPending}
                    onClick={() =>
                      handleReportDownload(option.value, option.date)
                    }
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

      {canViewExpenses && (
        <div
          className="dt-month-banner"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            marginBottom: 16,
            borderRadius: "var(--r)",
            background: "var(--success-soft, #F0FDF4)",
            border: "1px solid var(--success-soft-border, #BBF7D0)",
            fontSize: 13,
            color: "var(--success, #16A34A)",
            fontWeight: 500,
          }}
        >
          <LuCalendarCheck size={14} />
          <span>
            {t("dailyTasks.viewingMonth", "Viewing data for")}:{" "}
            <strong style={{ fontWeight: 700 }}>
              {formatMonthYearLabel(viewMonth, viewYear, language)}
            </strong>
          </span>
          {data?.total === 0 && !isLoading && (
            <span
              className="dt-month-banner__empty"
              style={{
                marginInlineStart: "auto",
                fontSize: 11,
                opacity: 0.75,
              }}
            >
              {t(
                "dailyTasks.noDataThisMonth",
                "No expenses found for this month",
              )}
            </span>
          )}
        </div>
      )}

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
          value={formatMoney(summaryTotalAmount, language)}
          Icon={AfCurrencyIcon}
          accent="#16A34A"
          sub={`${tasks.length} ${t("dailyTasks.taskCount", "tasks on page")}`}
        />
        <StatBanner
          label={t("dailyTasks.orderExpenses", "Order Expenses")}
          value={formatMoney(summaryOrderExpenses, language)}
          Icon={AfCurrencyIcon}
          accent="#2563EB"
          sub={t("dailyTasks.linkedToOrders", "Linked to orders")}
        />
        <StatBanner
          label={t("dailyTasks.otherExpenses", "Other Expenses")}
          value={formatMoney(summaryOtherExpenses, language)}
          Icon={AfCurrencyIcon}
          accent="#64748B"
          sub={t("dailyTasks.notLinkedToOrders", "Not linked to orders")}
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

          {canAddExpenses ? (
            <button
              type="button"
              className="btn btn-outline btn-sm dt-toolbar-btn"
              style={{ gap: 6, minWidth: 132, height: 38 }}
              disabled={!isMonthEditable}
              title={isMonthEditable ? undefined : monthReadOnlyReason}
              onClick={() => navigate("/daily-tasks")}
            >
              <LuPlus size={14} />
              {t("dailyTasks.newTask", "New Expense")}
            </button>
          ) : null}

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
          <TableSkeleton />
        ) : tasks.length === 0 ? (
          <EmptyTasksState t={t} />
        ) : (
          <>
            <TableHorizontalScroll
              viewportClassName="professional-report-table-wrap dt-table-scroll-wrap"
              ariaLabel="Daily tasks table horizontal scroll"
              minWidth="980px"
            >
              <table className="tbl professional-report-table dt-table">
                <thead>
                  <tr>
                    <th className="dt-cell-index" style={{ width: 44 }}>
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
                    <th
                      className="dt-cell-center"
                      style={{ textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <AfCurrencyIcon size={12} />
                        {t("dailyTasks.amount")}
                      </div>
                    </th>
                    <th
                      className="dt-cell-center"
                      style={{ textAlign: "center" }}
                    >
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
                    <th
                      className="dt-cell-actions"
                      style={{ width: 72, textAlign: "end" }}
                    >
                      {t("common.actions", "Actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, i) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onView={openView}
                      index={(page - 1) * 20 + i}
                      isRtlNote={isRtlNote}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                      canManage={canManageExpenses}
                      isMonthEditable={isMonthEditable}
                      disabledReason={effectiveDisabledReason}
                      onEdit={openEdit}
                      onDelete={requestDelete}
                    />
                  ))}
                </tbody>
              </table>
            </TableHorizontalScroll>
          </>
        )}

        <div
          className="dt-pagination-wrap"
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
                classNamePrefix="rs"
                isRtl={isRtlTextLanguage(language)}
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
                style={{ textAlign: isRtl ? "right" : "left" }}
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
                style={{
                  direction: "ltr",
                  textAlign: isRtl ? "right" : "left",
                }}
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
                style={{
                  direction: "ltr",
                  textAlign: isRtl ? "right" : "left",
                }}
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
                style={{
                  resize: "vertical",
                  textAlign: isRtl ? "right" : "left",
                }}
              />
            </Field>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "end",
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

      <DailyTaskDetailsModal
        open={Boolean(viewTaskId)}
        task={viewTask}
        isLoading={viewTaskLoading}
        onClose={() => setViewTaskId(null)}
        t={t}
        language={language}
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
        .daily-tasks-report-page {
          direction: ltr;
          text-align: start;
        }
        .daily-tasks-report-page[dir="rtl"] {
          direction: rtl !important;
          font-family: var(--font-rtl);
        }
        .daily-tasks-report-page[dir="ltr"] {
          direction: ltr !important;
        }
        .daily-tasks-report-page[dir="rtl"] .page-hd,
        .daily-tasks-report-page[dir="rtl"] .page-hd > div:first-child {
          direction: rtl;
          text-align: right;
        }
        .daily-tasks-report-page[dir="rtl"] .page-hd {
          flex-direction: row !important;
        }
        .daily-tasks-report-page[dir="rtl"] .page-hd h1,
        .daily-tasks-report-page[dir="rtl"] .page-hd p,
        .daily-tasks-report-page[dir="rtl"] .dt-summary-card__label {
          letter-spacing: 0 !important;
          text-transform: none !important;
        }
        .daily-tasks-report-page[dir="rtl"] .page-hd-action {
          direction: rtl;
          flex-direction: row !important;
          justify-content: flex-start;
        }
        .daily-tasks-report-page[dir="rtl"] .tbl-wrap,
        .daily-tasks-report-page[dir="rtl"] .dt-table {
          direction: rtl !important;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-table th,
        .daily-tasks-report-page[dir="rtl"] .dt-table td {
          text-align: right !important;
        }
        .dt-summary-card {
          direction: inherit;
          text-align: start;
        }
        .dt-summary-card__accent {
          border-start-start-radius: var(--r-lg);
          border-end-start-radius: var(--r-lg);
        }
        .dt-summary-card__body {
          display: grid;
          justify-items: start;
        }
        .dt-summary-card__value,
        .dt-summary-card__sub {
          width: 100%;
          unicode-bidi: plaintext;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-summary-card__value {
          letter-spacing: 0 !important;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-month-banner,
        .daily-tasks-report-page[dir="rtl"] .dt-report-month {
          direction: rtl;
          text-align: right;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-month-banner {
          justify-content: flex-start;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-month-banner__empty {
          margin-inline-start: auto;
          text-align: left;
        }
        .dt-toolbar {
          direction: inherit;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-toolbar {
          flex-direction: row !important;
          justify-content: flex-start;
        }
        .dt-search-form {
          direction: inherit;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-search-form {
          flex-direction: row !important;
        }
        .dt-search-input {
          text-align: start;
          unicode-bidi: plaintext;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-toolbar .btn,
        .daily-tasks-report-page[dir="rtl"] .dt-search-form .btn,
        .daily-tasks-report-page[dir="rtl"] .dt-report-dropdown .btn {
          direction: rtl;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-report-dropdown {
          font-family: var(--font-rtl);
        }
        .daily-tasks-report-page[dir="rtl"] .dt-report-dropdown .btn {
          justify-content: flex-start !important;
          text-align: right;
        }
        .dt-person-cell,
        .dt-row-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-person-cell,
        .daily-tasks-report-page[dir="rtl"] .dt-row-actions {
          direction: rtl;
          flex-direction: row;
        }
        .dt-person-cell > span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dt-row-actions {
          justify-content: flex-end;
          gap: 8px;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-row-actions {
          justify-content: flex-start;
        }
        .dt-table th.dt-cell-center,
        .dt-table td.dt-cell-center {
          text-align: center !important;
        }
        .dt-table th.dt-cell-actions,
        .dt-table td.dt-cell-actions {
          text-align: end !important;
        }
        .dt-table th.dt-cell-index,
        .dt-table td.dt-cell-index {
          text-align: center !important;
        }
        .dt-table thead th > div {
          justify-content: flex-start;
          min-width: 0;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-table thead th > div {
          direction: rtl;
          flex-direction: row;
          justify-content: flex-start;
          text-align: right;
        }
        .dt-note-cell {
          text-align: start !important;
        }
        .dt-money-pill,
        .dt-mobile-amount {
          direction: ltr;
          gap: 4px;
          unicode-bidi: isolate;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-money-pill,
        .daily-tasks-report-page[dir="rtl"] .dt-mobile-amount {
          flex-direction: row-reverse;
        }
        .dt-action-dropdown {
          min-width: 164px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface);
          box-shadow: 0 18px 40px -22px rgba(15,23,42,.42), 0 8px 18px -16px rgba(15,23,42,.28);
          overflow: hidden;
          text-align: start;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-action-dropdown,
        .daily-tasks-report-page[dir="rtl"] .dt-action-item {
          direction: rtl;
          text-align: right;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-action-item {
          flex-direction: row;
          justify-content: flex-start;
        }
        .dt-mobile-card {
          direction: inherit;
          text-align: start;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-mobile-card {
          direction: rtl;
          text-align: right;
        }
        .dt-mobile-party-flow {
          flex: 1 1 auto;
          overflow: hidden;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-mobile-party-flow,
        .daily-tasks-report-page[dir="rtl"] .dt-mobile-meta-row,
        .daily-tasks-report-page[dir="rtl"] .dt-mobile-actions {
          direction: rtl;
          flex-direction: row;
        }
        .dt-mobile-party-flow > span {
          min-width: 0;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-mobile-party-arrow {
          transform: scaleX(-1);
        }
        .dt-mobile-meta-row,
        .dt-mobile-actions {
          direction: inherit;
        }
        .dt-mobile-note {
          text-align: start;
          direction: inherit;
          unicode-bidi: plaintext;
        }
        .dt-pagination-wrap {
          direction: inherit;
        }
        .dt-pagination-wrap > div {
          direction: inherit;
          padding: 14px 16px 16px !important;
          margin-top: 0 !important;
          border-top: 0 !important;
        }
        .dt-pagination-wrap > div > span {
          text-align: start;
        }
        .daily-tasks-report-page[dir="rtl"] .dt-pagination-wrap .btn {
          direction: rtl;
        }
        .modal-box[dir="rtl"] {
          direction: rtl;
          text-align: right;
        }
        .modal-box[dir="rtl"] .lbl,
        .modal-box[dir="rtl"] .modal-body,
        .modal-box[dir="rtl"] .modal-content {
          text-align: right;
        }
        .modal-box[dir="rtl"] .btn {
          direction: rtl;
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

        @media (max-width: 767px) {
          .dt-table-scroll-wrap {
            display: block !important;
            width: 100%;
            max-width: 100%;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .dt-table {
            min-width: 860px;
          }
          .dt-toolbar { gap: 10px !important; }
          .dt-search-form { min-width: 100% !important; }
          .dt-toolbar > .btn,
          .dt-search-form .dt-toolbar-btn {
            flex: 1 1 140px;
          }
          .dt-search-form {
            flex-wrap: wrap;
          }
          .daily-tasks-report-page[dir="rtl"] .dt-search-form {
            flex-direction: row !important;
          }
          .dt-search-form > div {
            flex-basis: 100% !important;
          }
        }

        @media (max-width: 460px) {
          .dt-summary-grid { grid-template-columns: 1fr !important; }
          .dt-summary-card {
            padding: 14px !important;
          }
          .dt-mobile-card {
            padding: 12px !important;
          }
          .dt-mobile-card__head,
          .dt-mobile-actions,
          .dt-month-banner {
            flex-direction: column;
            align-items: stretch !important;
          }
          .daily-tasks-report-page[dir="rtl"] .dt-mobile-card__head,
          .daily-tasks-report-page[dir="rtl"] .dt-mobile-actions,
          .daily-tasks-report-page[dir="rtl"] .dt-month-banner {
            flex-direction: column !important;
          }
          .dt-mobile-actions .btn {
            width: 100%;
          }
          .dt-mobile-actions > div {
            align-self: flex-end;
          }
          .daily-tasks-report-page[dir="rtl"] .dt-mobile-actions > div {
            align-self: flex-start;
          }
          .daily-tasks-report-page[dir="rtl"] .dt-month-banner__empty {
            margin-inline-start: 0;
            text-align: right;
          }
          .dt-pagination-wrap > div {
            align-items: stretch !important;
          }
          .dt-pagination-wrap > div > div {
            width: 100%;
            justify-content: stretch;
          }
          .dt-pagination-wrap .btn {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}
