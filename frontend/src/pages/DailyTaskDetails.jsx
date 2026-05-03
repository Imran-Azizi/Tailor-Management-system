import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuArrowLeft,
  LuUser,
  LuUsers,
  LuCalendarDays,
  LuFileText,
  LuClipboardList,
  LuTrash2,
  LuArrowUpRight,
} from "react-icons/lu";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../lib/api.js";
import { isDailyTaskEditable } from "../lib/dailyTasks.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatSystemDate, formatSystemDateTime } from "../lib/locale.js";
import { formatCurrency } from "../lib/currency.js";
import {
  ConfirmDeleteModal,
  PageHeader,
  Spinner,
} from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import { useState } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatMoney(v) {
  return formatCurrency(v, "en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(iso, language) {
  return formatSystemDateTime(iso, language);
}

function formatDateShort(iso, language) {
  return formatSystemDate(iso, language);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 40, accent = "#2563EB" }) {
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
        background: `${accent}22`,
        border: `2px solid ${accent}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize: size * 0.34,
        fontWeight: 700,
        color: accent,
        letterSpacing: "-.02em",
      }}
    >
      {initials}
    </div>
  );
}

// ─── Detail field row ─────────────────────────────────────────────────────────
function DetailField({
  Icon,
  label,
  value,
  accent = "var(--primary)",
  mono,
  large,
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: `${accent}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text3)",
            textTransform: "uppercase",
            letterSpacing: ".07em",
            marginBottom: 3,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: large ? 20 : 14,
            fontWeight: large ? 700 : 500,
            color: large ? accent : "var(--text1)",
            fontVariantNumeric: mono ? "tabular-nums" : undefined,
            wordBreak: "break-word",
          }}
        >
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
  title,
  icon: Icon,
  accent = "var(--primary)",
  children,
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "13px 18px",
          borderBottom: "1px solid var(--border)",
          background: `${accent}06`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `${accent}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={14} style={{ color: accent }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "0 18px 4px" }}>{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DailyTaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const expiredActionMessage = t(
    "dailyTasks.editExpired",
    "Editing time expired",
  );

  const {
    data: task,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["daily-task", id],
    queryFn: () => api.get(`/daily-tasks/${id}`).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/daily-tasks/${id}`),
    onSuccess: () => {
      toast.success(t("dailyTasks.deleted"));
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
      navigate("/daily-tasks/all");
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("dailyTasks.deleteFailed"))),
  });

  if (isLoading)
    return (
      <div className="page">
        <Spinner />
      </div>
    );

  if (isError || !task)
    return (
      <div className="page">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            gap: 12,
            color: "var(--text3)",
          }}
        >
          <LuClipboardList size={40} style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>{t("dailyTasks.notFound")}</p>
          <button
            className="btn btn-outline btn-sm"
            style={{ gap: 6, marginTop: 4 }}
            onClick={() => navigate("/daily-tasks/all")}
          >
            <LuArrowLeft size={13} />
            {t("common.back")}
          </button>
        </div>
      </div>
    );

  const canDeleteTask = isAdmin && isDailyTaskEditable(task);

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      {/* ── Header ── */}
      <PageHeader
        title={t("dailyTasks.detailTitle")}
        subtitle={t("dailyTasks.detailSubtitle")}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn btn-outline"
              style={{ gap: 6 }}
              onClick={() => navigate("/daily-tasks/all")}
            >
              <LuArrowLeft size={14} />
              {t("common.back")}
            </button>
            {isAdmin && (
              <div title={canDeleteTask ? undefined : expiredActionMessage}>
                <button
                  className="btn btn-danger"
                  style={{ gap: 6 }}
                  disabled={!canDeleteTask}
                  onClick={() => {
                    if (!canDeleteTask) return;
                    setConfirmDelete(true);
                  }}
                >
                  <LuTrash2 size={14} />
                  {t("common.delete")}
                </button>
              </div>
            )}
          </div>
        }
      />

      {isAdmin && !canDeleteTask && (
        <div
          title={expiredActionMessage}
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: "var(--r)",
            border: "1px solid #FCD34D",
            background: "#FFFBEB",
            color: "#92400E",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <LuClock size={14} />
          {expiredActionMessage}
        </div>
      )}

      {/* ── Hero banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #1a4731 100%)",
          borderRadius: "var(--r-lg)",
          padding: "24px 24px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(37,99,235,.2)",
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: "absolute",
            top: -40,
            insetInlineEnd: -40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,.04)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -20,
            insetInlineEnd: 80,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "rgba(255,255,255,.03)",
            pointerEvents: "none",
          }}
        />

        {/* Transfer visual */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}
        >
          <div style={{ textAlign: "center" }}>
            <Avatar name={task.fromName} size={48} accent="#93C5FD" />
            <p
              style={{
                fontSize: 11.5,
                color: "rgba(255,255,255,.55)",
                marginTop: 4,
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {task.fromName}
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <LuArrowUpRight size={20} style={{ color: "#6EE7B7" }} />
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#6EE7B7",
                letterSpacing: "-.02em",
              }}
            >
              {formatMoney(task.amount)}
            </span>
          </div>
          <div style={{ textAlign: "center" }}>
            <Avatar name={task.recipientName} size={48} accent="#C4B5FD" />
            <p
              style={{
                fontSize: 11.5,
                color: "rgba(255,255,255,.55)",
                marginTop: 4,
                maxWidth: 80,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {task.recipientName}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div style={{ flex: 1, minWidth: 180, zIndex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <LuCalendarDays
              size={13}
              style={{ color: "rgba(255,255,255,.5)" }}
            />
            <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)" }}>
              {formatDateTime(task.taskDate, language)}
            </span>
          </div>
          {task.note && (
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,.75)",
                lineHeight: 1.6,
                fontStyle: "italic",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              "{task.note}"
            </p>
          )}
        </div>
      </div>

      {/* ── Detail grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {/* Task info */}
        <SectionCard
          title={t("dailyTasks.taskInfo")}
          icon={LuClipboardList}
          accent="#2563EB"
        >
          <DetailField
            Icon={LuUser}
            label={t("dailyTasks.fromName")}
            value={task.fromName}
            accent="#2563EB"
          />
          <DetailField
            Icon={LuUsers}
            label={t("dailyTasks.recipientName")}
            value={task.recipientName}
            accent="#7C3AED"
          />
          <DetailField
            Icon={AfCurrencyIcon}
            label={t("dailyTasks.amount")}
            value={formatMoney(task.amount)}
            accent="#16A34A"
            mono
            large
          />
          <DetailField
            Icon={LuCalendarDays}
            label={t("dailyTasks.taskDate")}
            value={formatDateTime(task.taskDate, language)}
            accent="#D97706"
          />
        </SectionCard>

        {/* Note */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SectionCard
            title={t("dailyTasks.note")}
            icon={LuFileText}
            accent="#D97706"
          >
            <div
              style={{
                padding: "16px 0 14px",
                fontSize: 15,
                color: task.note ? "var(--text1)" : "var(--text3)",
                lineHeight: 1.9,
                minHeight: 180,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {task.note || (
                <span style={{ opacity: 0.5 }}>{t("dailyTasks.noNote")}</span>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      <ConfirmDeleteModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        isPending={deleteMutation.isPending}
        title={t("dailyTasks.deleteTitle")}
        message={t("dailyTasks.deleteMessage")}
        itemName={`${task.fromName} → ${task.recipientName}`}
      />
    </div>
  );
}
