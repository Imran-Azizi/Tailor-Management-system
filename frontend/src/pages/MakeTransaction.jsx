import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Select from "react-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuArrowRightLeft, LuCheck } from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { Field } from "../components/ui/index.jsx";

const schema = z.object({
  accountType: z
    .object({ value: z.string(), label: z.string() })
    .nullable()
    .refine((v) => v !== null, { message: "Account type is required" }),
  user: z
    .object({ value: z.string(), label: z.string() })
    .nullable()
    .refine((v) => v !== null, { message: "User is required" }),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
      message: "Amount must be a positive number",
    }),
  transactionDate: z.string().min(1, "Transaction date is required"),
  orderId: z.string().optional(),
  note: z.string().optional(),
});

function buildSelectStyles(hasError) {
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

const today = () => new Date().toISOString().split("T")[0];

export default function MakeTransaction() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedAccountType, setSelectedAccountType] = useState(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      accountType: null,
      user: null,
      amount: "",
      transactionDate: today(),
      orderId: "",
      note: "",
    },
  });

  const watchedAccountType = watch("accountType");
  useEffect(() => {
    setSelectedAccountType(watchedAccountType?.value || null);
  }, [watchedAccountType]);

  const { data: accountTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ["transaction-account-types"],
    queryFn: () => api.get("/transactions/account-types").then((r) => r.data),
  });

  const accountTypeOptions = accountTypes.map((item) => ({
    value: item,
    label: item,
  }));

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["transaction-users", selectedAccountType],
    queryFn: () =>
      api.get(`/transactions/users/${selectedAccountType}`).then((r) => r.data),
    enabled: !!selectedAccountType,
  });

  const userOptions = users.map((worker) => ({
    value: worker.id,
    label: `${worker.name} - ${worker.phoneNumber}`,
  }));

  const mutation = useMutation({
    mutationFn: (body) => api.post("/transactions", body),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["transactions"] }),
        qc.invalidateQueries({
          queryKey: ["worker-panel-transaction-summary"],
        }),
      ]);

      toast.success(t("transaction.success"));
      reset({
        accountType: null,
        user: null,
        amount: "",
        transactionDate: today(),
        note: "",
        orderId: "",
      });
      setSelectedAccountType(null);
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("transaction.failed"))),
  });

  const onSubmit = (values) => {
    mutation.mutate({
      accountType: values.accountType.value,
      userId: values.user.value,
      amount: Number(values.amount),
      transactionDate: values.transactionDate,
      orderId: values.orderId?.trim() || undefined,
      note: values.note || undefined,
    });
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", paddingBottom: 40 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: "#2563EB18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <LuArrowRightLeft size={20} style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            {t("transaction.title")}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text3)" }}>
            {t("transaction.subtitle")}
          </p>
        </div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "28px 32px",
          boxShadow: "var(--sh)",
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ display: "grid", gap: 20 }}>
            <Field
              label={t("transaction.accountType")}
              required
              error={errors.accountType?.message}
            >
              <Controller
                name="accountType"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={accountTypeOptions}
                    isLoading={loadingTypes}
                    placeholder={t("transaction.selectAccountType")}
                    styles={buildSelectStyles(!!errors.accountType)}
                  />
                )}
              />
            </Field>

            <Field
              label={t("transaction.userName")}
              required
              error={errors.user?.message}
            >
              <Controller
                name="user"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={userOptions}
                    isLoading={loadingUsers}
                    isDisabled={!selectedAccountType}
                    placeholder={
                      selectedAccountType
                        ? t("transaction.selectUser")
                        : t("transaction.selectAccountTypeFirst")
                    }
                    noOptionsMessage={() =>
                      loadingUsers ? t("common.loading") : t("common.noData")
                    }
                    styles={buildSelectStyles(!!errors.user)}
                  />
                )}
              />
            </Field>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <Field
                label={t("transaction.value")}
                required
                error={errors.amount?.message}
              >
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="inp"
                  placeholder="0.00"
                  style={errors.amount ? { borderColor: "#DC2626" } : {}}
                  {...register("amount")}
                />
              </Field>

              <Field
                label={t("transaction.transactionDate")}
                required
                error={errors.transactionDate?.message}
              >
                <input
                  type="date"
                  className="inp"
                  style={
                    errors.transactionDate ? { borderColor: "#DC2626" } : {}
                  }
                  {...register("transactionDate")}
                />
              </Field>
            </div>

            <Field
              label={`${t("transaction.orderId", "Order ID")} (${t("common.optional")})`}
              error={errors.orderId?.message}
            >
              <input
                type="text"
                className="inp"
                placeholder={t(
                  "transaction.orderIdPlaceholder",
                  "Link this payment to a specific order (optional)",
                )}
                {...register("orderId")}
              />
            </Field>

            <Field
              label={`${t("transaction.note")} (${t("common.optional")})`}
              error={errors.note?.message}
            >
              <textarea
                className="inp"
                rows={3}
                placeholder={t("transaction.notePlaceholder")}
                style={{ resize: "vertical", lineHeight: 1.6 }}
                {...register("note")}
              />
            </Field>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: 12,
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                disabled={mutation.isPending}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 160,
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: "linear-gradient(90deg, var(--primary), #7C3AED)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 8px 24px rgba(37,99,235,0.12)",
                  cursor: mutation.isPending ? "default" : "pointer",
                  fontWeight: 700,
                  justifyContent: "center",
                  transition: "transform .12s ease, box-shadow .12s ease",
                  opacity: mutation.isPending ? 0.7 : 1,
                }}
              >
                {mutation.isPending ? (
                  <>
                    <span
                      style={{
                        width: 15,
                        height: 15,
                        border: "2px solid rgba(255,255,255,.4)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin .7s linear infinite",
                        flexShrink: 0,
                      }}
                    />
                    {t("transaction.submitting")}
                  </>
                ) : (
                  <>
                    <LuCheck size={15} />
                    {t("transaction.submit")}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
