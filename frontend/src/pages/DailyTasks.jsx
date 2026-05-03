import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  LuClipboardList,
  LuUsers,
  LuFileText,
  LuList,
  LuSend,
} from "react-icons/lu";
import api from "../lib/api.js";
import { buildSelectStyles } from "../lib/dailyTasks.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
import { Field, PageHeader } from "../components/ui/index.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const schema = z
  .object({
    fromName: z
      .object({ value: z.string(), label: z.string() })
      .nullable()
      .refine((value) => value !== null, { message: "Sender is required" }),
    recipientName: z.string().min(1, "Recipient name is required"),
    amount: z.string().optional(),
    taskDate: z.string().min(1, "Date & time is required"),
    forRakht: z.enum(["NO", "YES"]).default("NO"),
    note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.forRakht === "NO") {
      const amount = Number(value.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "Amount must be a positive number",
        });
      }
    }
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
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { taskDate: nowLocalInput(), forRakht: "NO" },
  });

  const [orderBillSearch, setOrderBillSearch] = useState("");
  const [orderSearchError, setOrderSearchError] = useState("");
  const [lookupCustomer, setLookupCustomer] = useState(null);
  const [foundOrders, setFoundOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderTypeAmounts, setOrderTypeAmounts] = useState({});
  const [allocationError, setAllocationError] = useState("");
  const [searchingOrder, setSearchingOrder] = useState(false);
  const forRakhtValue = watch("forRakht") || "NO";

  const { data: dokanUsers = [], isLoading: loadingDokanUsers } = useQuery({
    queryKey: ["daily-task-senders"],
    queryFn: () =>
      api
        .get("/users/dokan", { params: { includeAdmins: true } })
        .then((r) => r.data),
  });

  const senderOptions = dokanUsers.map((user) => ({
    value: user.name,
    label: user.name,
  }));

  const defaultSender =
    isAdmin && user?.name
      ? senderOptions.find((option) => option.value === user.name) || null
      : null;

  const fromNameValue = watch("fromName");

  useEffect(() => {
    if (!defaultSender || fromNameValue) return;
    setValue("fromName", defaultSender, {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [defaultSender, fromNameValue, setValue]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      api.post("/daily-tasks", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success(t("dailyTasks.created"));
      qc.invalidateQueries({ queryKey: ["daily-tasks"] });
      reset({
        fromName: null,
        recipientName: "",
        amount: "",
        taskDate: nowLocalInput(),
        forRakht: "NO",
        note: "",
      });
      setOrderBillSearch("");
      setOrderSearchError("");
      setLookupCustomer(null);
      setFoundOrders([]);
      setSelectedOrderIds([]);
      setOrderTypeAmounts({});
      setAllocationError("");
      onSuccess?.();
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("dailyTasks.createFailed"))),
  });

  const searchOrderByBill = async () => {
    const raw = String(orderBillSearch || "").trim();
    if (!raw) {
      setOrderSearchError(
        t("dailyTasks.billSearchRequired", "Please enter a bill number."),
      );
      setLookupCustomer(null);
      setFoundOrders([]);
      setSelectedOrderIds([]);
      setOrderTypeAmounts({});
      setAllocationError("");
      return;
    }

    setSearchingOrder(true);
    setOrderSearchError("");
    setAllocationError("");
    setLookupCustomer(null);
    setFoundOrders([]);
    setSelectedOrderIds([]);
    setOrderTypeAmounts({});
    try {
      const { data: lookup } = await api.get("/orders/lookup", {
        params: { billNumber: raw },
      });

      const orders = Array.isArray(lookup?.orders) ? lookup.orders : [];

      if (!orders.length) {
        setOrderSearchError("Order not found with this billNumber");
        return;
      }

      setLookupCustomer({
        billNumber: lookup?.customer?.billNumber,
        customerName: lookup?.customer?.firstName || "-",
      });
      setFoundOrders(orders);
    } catch {
      setOrderSearchError("Order not found with this billNumber");
    } finally {
      setSearchingOrder(false);
    }
  };

  const toggleOrderSelection = (orderId, checked) => {
    setAllocationError("");
    setSelectedOrderIds((prev) => {
      if (checked) {
        if (prev.includes(orderId)) return prev;
        return [...prev, orderId];
      }
      return prev.filter((id) => id !== orderId);
    });

    if (!checked) {
      setOrderTypeAmounts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const onSubmit = (data) => {
    if (data.forRakht === "YES") {
      if (!foundOrders.length) {
        setOrderSearchError("Order not found with this billNumber");
        toast.error(
          t(
            "dailyTasks.selectOrderForRakht",
            "Please select an order for Rakht expense.",
          ),
        );
        return;
      }

      if (!selectedOrderIds.length) {
        const message = t(
          "dailyTasks.selectAtLeastOneOrderType",
          "Please select at least one order type.",
        );
        setAllocationError(message);
        toast.error(message);
        return;
      }

      const invalid = selectedOrderIds.some((orderId) => {
        const amount = Number(orderTypeAmounts[orderId]);
        return !Number.isFinite(amount) || amount <= 0;
      });

      if (invalid) {
        const message = t(
          "dailyTasks.invalidOrderTypeAmount",
          "Enter a valid amount for each selected order type.",
        );
        setAllocationError(message);
        toast.error(message);
        return;
      }

      const allocations = selectedOrderIds.map((orderId) => ({
        orderId,
        amount: Number(orderTypeAmounts[orderId]),
      }));

      mutation.mutate({
        fromName: data.fromName.value,
        recipientName: data.recipientName.trim(),
        taskDate: new Date(data.taskDate).toISOString(),
        allocations,
        note: data.note?.trim() || undefined,
      });
      return;
    }

    mutation.mutate({
      fromName: data.fromName.value,
      recipientName: data.recipientName.trim(),
      amount: Number(data.amount || 0),
      taskDate: new Date(data.taskDate).toISOString(),
      note: data.note?.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
          <Controller
            name="fromName"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
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
                styles={buildSelectStyles(Boolean(errors.fromName))}
              />
            )}
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

      <div style={{ marginBottom: 20 }}>
        <Field
          label={t("dailyTasks.forRakht", "For Rakht")}
          error={errors.forRakht?.message}
          required
        >
          <Controller
            name="forRakht"
            control={control}
            render={({ field }) => (
              <Select
                classNamePrefix="rs"
                isSearchable={false}
                options={[
                  { value: "NO", label: t("common.no", "No") },
                  { value: "YES", label: t("common.yes", "Yes") },
                ]}
                value={
                  [
                    { value: "NO", label: t("common.no", "No") },
                    { value: "YES", label: t("common.yes", "Yes") },
                  ].find((option) => option.value === field.value) || null
                }
                onChange={(option) => {
                  const next = option?.value || "NO";
                  field.onChange(next);
                  setValue("forRakht", next, { shouldValidate: true });
                  if (next !== "YES") {
                    setOrderBillSearch("");
                    setOrderSearchError("");
                    setLookupCustomer(null);
                    setFoundOrders([]);
                    setSelectedOrderIds([]);
                    setOrderTypeAmounts({});
                    setAllocationError("");
                  }
                }}
              />
            )}
          />
        </Field>

        {forRakhtValue === "YES" && (
          <div style={{ marginTop: 10 }}>
            <Field
              label={t("dailyTasks.searchByBillNumber", "Search by billNumber")}
              error={orderSearchError || undefined}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="inp"
                  placeholder={t(
                    "dailyTasks.billNumberPlaceholder",
                    "Enter bill number",
                  )}
                  value={orderBillSearch}
                  onChange={(event) => {
                    setOrderBillSearch(event.target.value);
                    setOrderSearchError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      searchOrderByBill();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={searchOrderByBill}
                  disabled={searchingOrder}
                >
                  {searchingOrder
                    ? t("common.loading", "Loading...")
                    : t("common.search", "Search")}
                </button>
              </div>
            </Field>

            {lookupCustomer && foundOrders.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 10,
                  background: "var(--surface2)",
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: "var(--text3)" }}>
                  {t("dailyTasks.billNumber", "Bill")}: #
                  {lookupCustomer.billNumber} |{" "}
                  {t("common.customer", "Customer")}:{" "}
                  {lookupCustomer.customerName}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  {foundOrders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    const orderLabel = getOrderLabelParts(order, language);
                    const primaryName = getOrderPrimaryDisplayName(
                      order,
                      lookupCustomer?.customerName,
                      language,
                    );
                    return (
                      <label
                        key={order.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          background: isSelected
                            ? "var(--primary-soft, rgba(37,99,235,.08))"
                            : "var(--surface)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(event) =>
                            toggleOrderSelection(order.id, event.target.checked)
                          }
                        />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {orderLabel.baseTypeLabel} - {primaryName}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selectedOrderIds.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {selectedOrderIds.map((orderId) => {
                        const order = foundOrders.find(
                          (item) => item.id === orderId,
                        );
                        const typeLabel = order
                          ? (() => {
                              const orderLabel = getOrderLabelParts(
                                order,
                                language,
                              );
                              const primaryName = getOrderPrimaryDisplayName(
                                order,
                                lookupCustomer?.customerName,
                                language,
                              );
                              return `${orderLabel.baseTypeLabel} - ${primaryName}`;
                            })()
                          : t("common.type", "Type");
                        return (
                          <Field
                            key={orderId}
                            label={`${typeLabel} - ${t("dailyTasks.amount", "Amount")}`}
                            required
                          >
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="inp"
                              placeholder="0.00"
                              value={orderTypeAmounts[orderId] || ""}
                              onChange={(event) => {
                                setAllocationError("");
                                setOrderTypeAmounts((prev) => ({
                                  ...prev,
                                  [orderId]: event.target.value,
                                }));
                              }}
                            />
                          </Field>
                        );
                      })}
                    </div>
                    {allocationError ? (
                      <p
                        style={{ color: "#DC2626", marginTop: 8, fontSize: 12 }}
                      >
                        {allocationError}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {forRakhtValue !== "YES" ? (
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
        ) : null}
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
