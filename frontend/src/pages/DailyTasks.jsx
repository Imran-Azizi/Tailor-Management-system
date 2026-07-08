import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { LuClipboardList, LuFileText, LuSend } from "react-icons/lu";
import api from "../lib/api.js";
import { buildSelectStyles } from "../lib/dailyTasks.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale, toAsciiDigits } from "../lib/normalize.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
import { Field, PageHeader } from "../components/ui/index.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const MAX_SENDER_NAME_LENGTH = 100;

const normalizeSenderName = (option) =>
  String(option?.value || option?.label || "").trim();

const normalizeSenderOption = (option) => {
  const name = normalizeSenderName(option);
  return name ? { ...option, value: name, label: name } : null;
};

// ─── Zod schema ───────────────────────────────────────────────────────────────
const createSchema = (t) =>
  z
    .object({
      fromName: z
        .object({ value: z.string(), label: z.string() })
        .passthrough()
        .nullable()
        .refine((value) => normalizeSenderName(value).length > 0, {
          message: t("dailyTasks.senderRequired"),
        })
        .refine(
          (value) =>
            normalizeSenderName(value).length <= MAX_SENDER_NAME_LENGTH,
          {
            message: t("dailyTasks.senderTooLong"),
          },
        ),
      recipientName: z.string().min(1, t("dailyTasks.recipientRequired")),
      amount: z.string().optional(),
      taskDate: z.string().min(1, t("dailyTasks.taskDateRequired")),
      forRakht: z.enum(["NO", "YES"]).default("NO"),
      note: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.forRakht === "NO") {
        const amount = parseNumberLocale(value.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["amount"],
            message: t("dailyTasks.amountPositive"),
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
  const isRtl = i18n.dir?.(language) === "rtl";
  const schema = createSchema(t);

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
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const [orderBillSearch, setOrderBillSearch] = useState("");
  const [orderSearchError, setOrderSearchError] = useState("");
  const [lookupCustomer, setLookupCustomer] = useState(null);
  const [foundOrders, setFoundOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [orderTypeAmounts, setOrderTypeAmounts] = useState({});
  const [allocationError, setAllocationError] = useState("");
  const [searchingOrder, setSearchingOrder] = useState(false);
  const billSearchInputRef = useRef(null);
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

  const senderExists = (inputValue) => {
    const normalized = inputValue.trim().toLocaleLowerCase();
    return senderOptions.some(
      (option) =>
        normalizeSenderName(option).toLocaleLowerCase() === normalized,
    );
  };

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
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["design-contributors"] });
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
    const latestInput = billSearchInputRef.current?.value;
    const raw = String(latestInput ?? orderBillSearch ?? "").trim();
    const normalizedBill = toAsciiDigits(raw).replace(/\s+/g, "");
    const billNumber = normalizedBill.replace(/[^0-9]/g, "");

    if (!billNumber) {
      setOrderSearchError(t("dailyTasks.billSearchRequired"));
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
        params: { billNumber },
      });

      const orders = Array.isArray(lookup?.orders) ? lookup.orders : [];

      if (!orders.length) {
        setOrderSearchError(t("dailyTasks.orderNotFound"));
        return;
      }

      setLookupCustomer({
        billNumber: lookup?.customer?.billNumber,
        customerName: lookup?.customer?.firstName || "-",
      });
      setFoundOrders(orders);
    } catch {
      setOrderSearchError(t("dailyTasks.orderNotFound"));
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
        setOrderSearchError(t("dailyTasks.selectOrderForRakht"));
        return;
      }

      if (!selectedOrderIds.length) {
        setAllocationError(t("dailyTasks.selectAtLeastOneOrderType"));
        return;
      }

      const invalid = selectedOrderIds.some((orderId) => {
        const amount = parseNumberLocale(orderTypeAmounts[orderId]);
        return !Number.isFinite(amount) || amount <= 0;
      });

      if (invalid) {
        setAllocationError(t("dailyTasks.invalidOrderTypeAmount"));
        return;
      }

      const allocations = selectedOrderIds.map((orderId) => ({
        orderId,
        amount: parseNumberLocale(orderTypeAmounts[orderId]),
      }));

      mutation.mutate({
        fromName: normalizeSenderName(data.fromName),
        recipientName: data.recipientName.trim(),
        taskDate: new Date(data.taskDate).toISOString(),
        allocations,
        note: data.note?.trim() || undefined,
      });
      return;
    }

    mutation.mutate({
      fromName: normalizeSenderName(data.fromName),
      recipientName: data.recipientName.trim(),
      amount: parseNumberLocale(data.amount || 0),
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
              <CreatableSelect
                {...field}
                classNamePrefix="rs"
                isRtl={isRtl}
                options={senderOptions}
                isSearchable
                isClearable
                isLoading={loadingDokanUsers}
                placeholder={t("dailyTasks.senderPlaceholder")}
                noOptionsMessage={() => t("dailyTasks.noSendersCustom")}
                formatCreateLabel={(inputValue) =>
                  t("dailyTasks.createSenderOption", {
                    name: inputValue.trim(),
                  })
                }
                isValidNewOption={(inputValue) => {
                  const name = inputValue.trim();
                  return (
                    name.length > 0 &&
                    name.length <= MAX_SENDER_NAME_LENGTH &&
                    !senderExists(name)
                  );
                }}
                onChange={(option) =>
                  field.onChange(normalizeSenderOption(option))
                }
                onCreateOption={(inputValue) => {
                  const name = inputValue.trim();
                  if (!name || name.length > MAX_SENDER_NAME_LENGTH) return;
                  field.onChange({ value: name, label: name });
                }}
                styles={buildSelectStyles({
                  hasError: Boolean(errors.fromName),
                  isRtl,
                })}
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
          label={t("dailyTasks.forRakht")}
          error={errors.forRakht?.message}
          required
        >
          <Controller
            name="forRakht"
            control={control}
            render={({ field }) => (
              <Select
                classNamePrefix="rs"
                isRtl={isRtl}
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
              label={t("dailyTasks.searchByBillNumber")}
              error={orderSearchError || undefined}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={billSearchInputRef}
                  className="inp"
                  inputMode="numeric"
                  placeholder={t("dailyTasks.billNumberPlaceholder")}
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
                  {t("dailyTasks.billNumber")}: #{lookupCustomer.billNumber} |{" "}
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
                          {orderLabel.typeWithSequenceLabel} - {primaryName}
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
                              return `${orderLabel.typeWithSequenceLabel} - ${primaryName}`;
                            })()
                          : t("common.type", "Type");
                        return (
                          <Field
                            key={orderId}
                            label={`${typeLabel} - ${t("dailyTasks.amount", "Amount")}`}
                            required
                          >
                            <input
                              type="text"
                              inputMode="decimal"
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
              type="text"
              inputMode="decimal"
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
          className="btn btn-gold"
          disabled={mutation.isPending}
          style={{
            minWidth: 160,
          }}
        >
          {mutation.isPending ? (
            t("common.loading")
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
      />

      {/* ── Form layout ── */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ width: "100%", maxWidth: 640 }}>
          {/* Card header */}
          <div className="card-hd">
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
          <div className="card-body" style={{ padding: 20 }}>
            <DailyTaskForm onSuccess={() => navigate("/daily-tasks/all")} />
          </div>
        </div>
      </div>
    </div>
  );
}
