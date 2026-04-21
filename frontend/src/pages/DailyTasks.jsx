import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuClipboardList,
  LuUsers,
  LuBadgeDollarSign,
  LuFileText,
  LuList,
  LuSend,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { Field, PageHeader } from "../components/ui/index.jsx";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  fromName: z.string().min(1, "Sender name is required"),
  recipientName: z.string().min(1, "Recipient name is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
      message: "Amount must be a positive number",
    }),
  taskDate: z.string().min(1, "Date & time is required"),
  note: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// ─── Section header inside form ───────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, accent = "var(--primary)" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: `${accent}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={15} style={{ color: accent }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Task creation form ───────────────────────────────────────────────────────
function DailyTaskForm({ onSuccess }) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { taskDate: nowLocalInput() },
  });

  const mutation = useMutation({
    mutationFn: (payload) =>
      api.post("/daily-tasks", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success(t("dailyTasks.created"));
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
      reset({ taskDate: nowLocalInput() });
      onSuccess?.();
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("dailyTasks.createFailed"))),
  });

  const onSubmit = (data) =>
    mutation.mutate({
      fromName: data.fromName.trim(),
      recipientName: data.recipientName.trim(),
      amount: Number(data.amount),
      taskDate: new Date(data.taskDate).toISOString(),
      note: data.note?.trim() || undefined,
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── Parties section ── */}
      <SectionHeader
        icon={LuUsers}
        label={t("dailyTasks.partiesSection", "Parties")}
        accent="#2563EB"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Field
          label={t("dailyTasks.fromName")}
          error={errors.fromName?.message}
          required
        >
          <input
            className={`inp${errors.fromName ? " inp-err" : ""}`}
            placeholder={t("dailyTasks.fromNamePlaceholder")}
            {...register("fromName")}
          />
        </Field>
        <Field
          label={t("dailyTasks.recipientName")}
          error={errors.recipientName?.message}
          required
        >
          <input
            className={`inp${errors.recipientName ? " inp-err" : ""}`}
            placeholder={t("dailyTasks.recipientNamePlaceholder")}
            {...register("recipientName")}
          />
        </Field>
      </div>

      {/* ── Transaction details section ── */}
      <SectionHeader
        icon={LuBadgeDollarSign}
        label={t("dailyTasks.transactionSection", "Transaction Details")}
        accent="#16A34A"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Field
          label={t("dailyTasks.amount")}
          error={errors.amount?.message}
          required
        >
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={`inp${errors.amount ? " inp-err" : ""}`}
            placeholder="0.00"
            {...register("amount")}
          />
        </Field>
        <Field
          label={t("dailyTasks.taskDate")}
          error={errors.taskDate?.message}
          required
        >
          <input
            type="datetime-local"
            className={`inp${errors.taskDate ? " inp-err" : ""}`}
            {...register("taskDate")}
          />
        </Field>
      </div>

      {/* ── Note section ── */}
      <SectionHeader
        icon={LuFileText}
        label={t("dailyTasks.note")}
        accent="#D97706"
      />
      <Field error={errors.note?.message}>
        <textarea
          className="inp"
          rows={3}
          style={{ resize: "vertical", paddingTop: 10, paddingBottom: 10 }}
          placeholder={t("dailyTasks.notePlaceholder")}
          {...register("note")}
        />
      </Field>

      {/* ── Actions ── */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        <button
          type="submit"
          disabled={mutation.isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minWidth: 160,
            height: 42,
            paddingInline: 28,
            borderRadius: 10,
            border: "none",
            cursor: mutation.isPending ? "not-allowed" : "pointer",
            background: mutation.isPending
              ? "#6b7280"
              : "linear-gradient(135deg, #2563EB 0%, #1d4ed8 60%, #1e40af 100%)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.03em",
            boxShadow: mutation.isPending
              ? "none"
              : "0 4px 14px rgba(37,99,235,.45), 0 1px 3px rgba(0,0,0,.12)",
            transition: "all .2s ease",
            opacity: mutation.isPending ? 0.75 : 1,
          }}
          onMouseEnter={(e) => {
            if (!mutation.isPending)
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(37,99,235,.55), 0 2px 6px rgba(0,0,0,.15)";
          }}
          onMouseLeave={(e) => {
            if (!mutation.isPending)
              e.currentTarget.style.boxShadow =
                "0 4px 14px rgba(37,99,235,.45), 0 1px 3px rgba(0,0,0,.12)";
          }}
        >
          {mutation.isPending ? (
            <>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,.35)",
                  borderTopColor: "#fff",
                  animation: "spin .7s linear infinite",
                  flexShrink: 0,
                }}
              />
              {t("common.loading")}
            </>
          ) : (
            <>
              <LuSend size={14} />
              {t("dailyTasks.submit")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DailyTasks() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      {/* ── Page header ── */}
      <PageHeader
        title={t("dailyTasks.title")}
        subtitle={t("dailyTasks.createSubtitle")}
        action={
          <button
            className="btn btn-outline"
            style={{ gap: 6, minWidth: 144 }}
            onClick={() => navigate("/daily-tasks/all")}
          >
            <LuList size={14} />
            {t("dailyTasks.allTitle")}
          </button>
        }
      />

      {/* ── Form layout ── */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--sh)",
            overflow: "hidden",
            width: "100%",
            maxWidth: 640,
          }}
        >
          {/* Card header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              background: "linear-gradient(90deg, #2563EB08, transparent)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <LuClipboardList size={17} style={{ color: "#fff" }} />
            </div>
            <div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 14.5,
                  color: "var(--text1)",
                }}
              >
                {t("dailyTasks.newTask")}
              </p>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>
                {t("dailyTasks.newTaskSub", "All fields marked * are required")}
              </p>
            </div>
          </div>
          <div style={{ padding: "20px" }}>
            <DailyTaskForm onSuccess={() => navigate("/daily-tasks/all")} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
