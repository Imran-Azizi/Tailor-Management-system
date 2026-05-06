import { useMemo, useState } from "react";
import Select from "react-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCheck,
  LuClipboardList,
  LuSearch,
  LuShieldAlert,
  LuUser,
  LuUsers,
  LuReceiptText,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatCurrency } from "../lib/currency.js";
import { isRtlLanguage } from "../lib/locale.js";
import { Modal, PageHeader } from "../components/ui/index.jsx";

function SmallSpinner() {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        border: "2px solid rgba(255,255,255,.4)",
        borderTopColor: "#fff",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

const ROLE_OPTIONS = [
  { value: "DOKHT", labelKey: "damagedClothes.roles.dokht" },
  { value: "QICHIKAR", labelKey: "damagedClothes.roles.qichikar" },
];

function buildSelectStyles({ hasError = false, isRtl = false } = {}) {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      borderRadius: 10,
      borderColor: hasError
        ? "#DC2626"
        : state.isFocused
          ? "var(--primary)"
          : "var(--border)",
      boxShadow: state.isFocused ? "0 0 0 3px var(--primary-100)" : "none",
      background: "var(--surface)",
      direction: isRtl ? "rtl" : "ltr",
      textAlign: "start",
      transition: "border-color .15s, box-shadow .15s",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 80,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      overflow: "hidden",
      direction: isRtl ? "rtl" : "ltr",
      boxShadow: "0 8px 24px rgba(0,0,0,.12)",
    }),
    option: (base, state) => ({
      ...base,
      textAlign: "start",
      background: state.isSelected
        ? "var(--primary)"
        : state.isFocused
          ? "var(--surface2)"
          : "transparent",
      color: state.isSelected ? "#fff" : "var(--text1)",
      cursor: "pointer",
    }),
    singleValue: (base) => ({
      ...base,
      color: "var(--text1)",
      textAlign: "start",
    }),
    placeholder: (base) => ({
      ...base,
      color: "var(--text3)",
      textAlign: "start",
    }),
    input: (base) => ({ ...base, color: "var(--text1)", textAlign: "start" }),
    indicatorSeparator: () => ({ display: "none" }),
  };
}

function StatPill({ label, value, color = "neutral" }) {
  const colorMap = {
    neutral: {
      bg: "var(--surface2)",
      text: "var(--text1)",
      border: "var(--border)",
    },
    red: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3" },
    green: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
    blue: {
      bg: "var(--primary-50)",
      text: "var(--primary-800)",
      border: "var(--primary-200)",
    },
    amber: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  };
  const c = colorMap[color] || colorMap.neutral;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "8px 12px",
        borderRadius: 10,
        background: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>
        {value}
      </span>
    </div>
  );
}

export default function DamagedClothes() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isRtlLanguage(language);

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const roleOptions = useMemo(
    () =>
      ROLE_OPTIONS.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
      })),
    [t],
  );

  const { data: workers = [], isLoading: workersLoading } = useQuery({
    queryKey: ["damaged-clothes-workers", selectedRole?.value],
    queryFn: () =>
      api
        .get("/damaged-clothes/workers", {
          params: { roleType: selectedRole.value },
        })
        .then((r) => r.data),
    enabled: Boolean(selectedRole?.value),
  });

  const workerOptions = workers.map((user) => ({
    value: user.id,
    label: `${user.name} - ${user.phoneNumber}`,
    raw: user,
  }));

  const { data: searchResult, isFetching: searchLoading } = useQuery({
    queryKey: [
      "damaged-clothes-order-search",
      selectedRole?.value,
      selectedWorker?.value,
      submittedSearch,
      searchTriggered,
    ],
    queryFn: () =>
      api
        .get("/damaged-clothes/orders/search", {
          params: {
            roleType: selectedRole.value,
            userId: selectedWorker.value,
            query: submittedSearch,
            page: 1,
            limit: 30,
          },
        })
        .then((r) => r.data),
    enabled:
      searchTriggered &&
      Boolean(selectedRole?.value) &&
      Boolean(selectedWorker?.value) &&
      String(submittedSearch || "").trim().length > 0,
  });

  const orders = searchResult?.data || [];
  const emptyStateCode = searchResult?.emptyStateCode || null;

  const penaltyMutation = useMutation({
    mutationFn: (payload) => api.post("/damaged-clothes/penalties", payload),
    onSuccess: async (response) => {
      const data = response?.data || {};
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["transactions"] }),
        qc.invalidateQueries({
          queryKey: ["worker-panel-transaction-summary"],
        }),
        qc.invalidateQueries({ queryKey: ["orders"] }),
        qc.invalidateQueries({ queryKey: ["worker-panel-orders"] }),
        qc.invalidateQueries({ queryKey: ["damaged-clothes-order-search"] }),
      ]);
      setConfirmOpen(false);
      setSelectedOrder(null);
      toast.success(
        t("damagedClothes.createSuccess", {
          amount: formatCurrency(data?.penalty?.totalExpense || 0, language),
        }),
      );
    },
    onError: (error) => {
      const apiCode = error?.response?.data?.code;
      if (apiCode === "DUPLICATE_DAMAGED_CLOTHES_PENALTY") {
        toast.error(t("damagedClothes.duplicateError"));
        setConfirmOpen(false);
        return;
      }
      if (apiCode === "WORKER_NOT_ON_ORDER") {
        toast.error(t("damagedClothes.userDidNotWorkOnOrder"));
        setConfirmOpen(false);
        return;
      }
      if (apiCode === "ORDER_NOT_FOUND") {
        toast.error(t("damagedClothes.orderNotFound"));
        setConfirmOpen(false);
        return;
      }
      toast.error(getApiErrorMessage(error, t("damagedClothes.createFailed")));
    },
  });

  const onSearch = () => {
    if (!selectedRole?.value) {
      toast.error(t("damagedClothes.validation.roleRequired"));
      return;
    }
    if (!selectedWorker?.value) {
      toast.error(t("damagedClothes.validation.workerRequired"));
      return;
    }
    if (!searchText.trim()) {
      toast.error(t("damagedClothes.validation.searchRequired"));
      return;
    }
    setSubmittedSearch(searchText.trim());
    setSearchTriggered(true);
  };

  const openConfirm = (order) => {
    if (!selectedWorker?.value) {
      toast.error(t("damagedClothes.validation.workerRequired"));
      return;
    }
    setSelectedOrder(order);
    setConfirmOpen(true);
  };

  const submitPenalty = () => {
    if (!selectedOrder || !selectedWorker?.value || !selectedRole?.value)
      return;
    penaltyMutation.mutate({
      userId: selectedWorker.value,
      orderId: selectedOrder.id,
      roleType: selectedRole.value,
    });
  };

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div
        style={{
          maxWidth: 1024,
          width: "100%",
          margin: "0 auto",
          display: "grid",
          gap: 20,
        }}
      >
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <PageHeader
          title={t("damagedClothes.title")}
          subtitle={t("damagedClothes.subtitle")}
        />

        {/* ── Filter / Search Card ─────────────────────────────────────── */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 20px rgba(15,23,42,.06)",
            padding: "20px 20px 18px",
            display: "grid",
            gap: 16,
          }}
        >
          {/* Role + Worker selects */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Role */}
            <div style={{ display: "grid", gap: 6 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <LuUsers size={14} style={{ color: "var(--primary)" }} />
                {t("damagedClothes.roleLabel")}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <Select
                options={roleOptions}
                value={selectedRole}
                onChange={(value) => {
                  setSelectedRole(value);
                  setSelectedWorker(null);
                  setSearchTriggered(false);
                  setSubmittedSearch("");
                  setSearchText("");
                  setSelectedOrder(null);
                }}
                placeholder={t("damagedClothes.rolePlaceholder")}
                styles={buildSelectStyles({ isRtl })}
              />
            </div>

            {/* Worker */}
            <div style={{ display: "grid", gap: 6 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <LuUser size={14} style={{ color: "var(--primary)" }} />
                {t("damagedClothes.workerLabel")}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <Select
                options={workerOptions}
                value={selectedWorker}
                onChange={(value) => {
                  setSelectedWorker(value);
                  setSearchTriggered(false);
                  setSubmittedSearch("");
                  setSelectedOrder(null);
                }}
                isLoading={workersLoading}
                isDisabled={!selectedRole?.value}
                placeholder={t("damagedClothes.workerPlaceholder")}
                noOptionsMessage={() =>
                  workersLoading
                    ? t("common.loading", "Loading...")
                    : t("common.noData", "No data found")
                }
                styles={buildSelectStyles({ isRtl })}
              />
              {selectedRole?.value ? (
                <p style={{ margin: 0, fontSize: 11, color: "var(--text3)" }}>
                  {t("damagedClothes.workerHint")}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 11, color: "var(--text3)" }}>
                  {t("damagedClothes.workerHintSelectRole")}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div
            style={{ height: 1, background: "var(--border)", margin: "0 -4px" }}
          />

          {/* Search bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div style={{ position: "relative" }}>
              <LuSearch
                size={15}
                style={{
                  position: "absolute",
                  insetInlineStart: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                  pointerEvents: "none",
                }}
              />
              <input
                className="inp"
                style={{
                  height: 44,
                  paddingInlineStart: 38,
                  paddingInlineEnd: 14,
                  borderRadius: 10,
                  fontSize: 14,
                }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t("damagedClothes.searchPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-gold"
              onClick={onSearch}
              disabled={searchLoading}
              style={{
                height: 44,
                minWidth: 120,
                borderRadius: 10,
                gap: 6,
                fontWeight: 600,
              }}
            >
              {searchLoading ? <SmallSpinner /> : <LuSearch size={14} />}
              {searchLoading
                ? t("common.loading", "Loading...")
                : t("common.search", "Search")}
            </button>
          </div>
        </div>

        {/* ── Orders Results Card ──────────────────────────────────────── */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 20px rgba(15,23,42,.06)",
            overflow: "hidden",
          }}
        >
          {/* Card header */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LuReceiptText size={16} style={{ color: "var(--primary)" }} />
              <span
                style={{ fontSize: 15, fontWeight: 700, color: "var(--text1)" }}
              >
                {t("damagedClothes.ordersTitle")}
              </span>
            </div>
            {searchTriggered && !searchLoading && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "var(--primary-50)",
                  color: "var(--primary-800)",
                  border: "1px solid var(--primary-200)",
                }}
              >
                {t("damagedClothes.totalFound", { count: orders.length })}
              </span>
            )}
          </div>

          {/* Card body */}
          <div style={{ padding: "16px 20px" }}>
            {!searchTriggered ? (
              /* Initial empty state */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "40px 0",
                  color: "var(--text3)",
                }}
              >
                <LuClipboardList size={36} style={{ opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 14 }}>
                  {t("damagedClothes.searchHelp")}
                </p>
              </div>
            ) : searchLoading ? (
              /* Loading skeleton */
              <div style={{ display: "grid", gap: 10 }}>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      padding: 16,
                      background: "var(--surface2)",
                      height: 120,
                      animation: "pulse 1.6s cubic-bezier(.4,0,.6,1) infinite",
                    }}
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              /* No results */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  padding: "40px 0",
                  color: "var(--text3)",
                }}
              >
                <LuSearch size={36} style={{ opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                  {emptyStateCode === "ORDER_NOT_FOUND"
                    ? t("damagedClothes.orderNotFound")
                    : emptyStateCode === "WORKER_NOT_ON_ORDER"
                      ? t("damagedClothes.userDidNotWorkOnOrder")
                      : t("damagedClothes.noOrders")}
                </p>
                {submittedSearch && (
                  <p style={{ margin: 0, fontSize: 12 }}>
                    {t("common.search", "Search")}:{" "}
                    <strong>{submittedSearch}</strong>
                  </p>
                )}
              </div>
            ) : (
              /* Order cards */
              <div style={{ display: "grid", gap: 12 }}>
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    language={language}
                    isRtl={isRtl}
                    t={t}
                    selectedWorker={selectedWorker}
                    onApply={() => openConfirm(order)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ────────────────────────────────────────────── */}
      <Modal
        open={confirmOpen}
        onClose={() => {
          if (penaltyMutation.isPending) return;
          setConfirmOpen(false);
        }}
        title={t("damagedClothes.confirmTitle")}
        maxW={480}
      >
        {!selectedOrder ? null : (
          <div style={{ display: "grid", gap: 20 }}>
            {/* Confirmation message */}
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--text1)",
              }}
            >
              {t("damagedClothes.confirmMessage", {
                worker: selectedWorker?.label || "-",
                billNumber: selectedOrder.billNumber || "-",
                customerName: selectedOrder.customerName || "-",
              })}
            </p>

            {/* Action buttons */}
            <div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmOpen(false)}
                disabled={penaltyMutation.isPending}
                style={{ minWidth: 100 }}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={submitPenalty}
                disabled={penaltyMutation.isPending}
                style={{ minWidth: 180, gap: 6 }}
              >
                {penaltyMutation.isPending ? (
                  <>{t("damagedClothes.applying", "Applying...")}</>
                ) : (
                  <>
                    <LuCheck size={14} />
                    {t(
                      "damagedClothes.confirmApply",
                      "Confirm and Apply Penalty",
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Order Card sub-component ─────────────────────────────────────────── */
function OrderCard({ order, language, t, selectedWorker, onApply }) {
  const isDamageOrder = Boolean(order?.isDamageOrder);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(15,23,42,.05)",
        transition: "box-shadow .15s",
      }}
    >
      {/* Card header row */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          background: "var(--surface2)",
        }}
      >
        <span
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: "var(--primary)",
            letterSpacing: -0.4,
            lineHeight: 1,
          }}
        >
          #{order.billNumber || "-"}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text1)" }}>
          {order.customerName || "-"}
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--text3)",
            fontWeight: 500,
          }}
        >
          {order.phoneNumber || ""}
        </span>
        <div
          style={{
            marginInlineStart: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {isDamageOrder && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 20,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#B91C1C",
              }}
            >
              {t("orders.damageOrderStatus", "Damage Order")}
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
              background: "var(--primary-50)",
              border: "1px solid var(--primary-200)",
              color: "var(--primary-800)",
            }}
          >
            {order.orderType || "-"}
          </span>
        </div>
      </div>

      {/* Financial stats */}
      <div style={{ padding: "12px 16px", display: "grid", gap: 10 }}>
        {/* Expense breakdown: 4 columns */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            label={t("damagedClothes.details.totalOrderAmount")}
            value={formatCurrency(order.totalOrderAmount || 0, language)}
            color="green"
          />
          <StatPill
            label={t("damagedClothes.details.rakhtExpense")}
            value={formatCurrency(order.rakhtExpense || 0, language)}
            color="neutral"
          />
          <StatPill
            label={t("damagedClothes.details.dokhtExpense")}
            value={formatCurrency(order.dokhtExpense || 0, language)}
            color="neutral"
          />
          <StatPill
            label={t("damagedClothes.details.qichikarExpense")}
            value={formatCurrency(order.qichikarExpense || 0, language)}
            color="neutral"
          />
        </div>

        {/* Daily task + total penalty (last, full-width highlight) */}
        <div className="grid grid-cols-2 gap-3">
          <StatPill
            label={t("damagedClothes.details.dailyTaskExpense")}
            value={formatCurrency(order.dailyTaskExpense || 0, language)}
            color="neutral"
          />
          <StatPill
            label={t("damagedClothes.details.totalPenalty")}
            value={formatCurrency(order.totalExpense || 0, language)}
            color="red"
          />
        </div>

        {/* Apply Penalty button */}
        <div
          style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}
        >
          <button
            type="button"
            className="btn btn-danger"
            onClick={onApply}
            disabled={!selectedWorker?.value || isDamageOrder}
            style={{
              width: "100%",
              maxWidth: 240,
              gap: 7,
              borderRadius: 10,
              fontWeight: 600,
              opacity: selectedWorker?.value && !isDamageOrder ? 1 : 0.5,
              cursor:
                selectedWorker?.value && !isDamageOrder
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            <LuShieldAlert size={14} />
            {isDamageOrder
              ? t("orders.damageOrderStatus", "Damage Order")
              : t("damagedClothes.applyPenalty")}
          </button>
        </div>
      </div>
    </div>
  );
}
