import { useMemo, useState } from "react";
import Select from "react-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuClipboardList,
  LuFilter,
  LuRefreshCw,
  LuSearch,
  LuShieldAlert,
  LuUser,
  LuUsers,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatCurrency } from "../lib/currency.js";
import {
  formatDateLocale,
  formatNumberLocale,
  isRtlLanguage,
} from "../lib/locale.js";
import { Modal, PageHeader } from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";

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
        ? "var(--danger)"
        : state.isFocused
          ? "var(--primary)"
          : "var(--border)",
      boxShadow: state.isFocused ? "0 0 0 3px var(--focus-ring)" : "none",
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
      boxShadow: "var(--sh-lg)",
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

const DAMAGED_TONES = {
  neutral: {
    bg: "var(--surface2)",
    text: "var(--text1)",
    border: "var(--border)",
  },
  red: {
    bg: "var(--danger-soft)",
    text: "var(--danger-strong)",
    border: "var(--danger-soft-border)",
  },
  green: {
    bg: "var(--success-soft)",
    text: "var(--success-strong)",
    border: "var(--success-soft-border)",
  },
  blue: {
    bg: "var(--info-soft)",
    text: "var(--info)",
    border: "var(--info-soft-border)",
  },
  amber: {
    bg: "var(--warning-soft)",
    text: "var(--warning-strong)",
    border: "var(--warning-soft-border)",
  },
  orange: {
    bg: "var(--warning-soft)",
    text: "var(--warning-strong)",
    border: "var(--warning-soft-border)",
  },
  primary: {
    bg: "color-mix(in srgb,var(--primary) 12%,var(--surface))",
    text: "var(--primary)",
    border: "color-mix(in srgb,var(--primary) 30%,var(--border))",
  },
};

function StatPill({ label, value, color = "neutral" }) {
  const c = DAMAGED_TONES[color] || DAMAGED_TONES.neutral;
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

function getRoleLabel(role, t) {
  if (role === "DOKHT") return t("damagedClothes.roles.dokht", "Dokht");
  if (role === "QICHIKAR")
    return t("damagedClothes.roles.qichikar", "Qichikar");
  return role || "-";
}

function buildDuplicateMessage(existingPenalty, t) {
  return t("damagedClothes.duplicateAssignedMessage", {
    worker: existingPenalty?.workerName || "-",
    role: getRoleLabel(existingPenalty?.roleType, t),
  });
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
  const [damageReason, setDamageReason] = useState("");
  const [recordsSearch, setRecordsSearch] = useState("");
  const [recordsRole, setRecordsRole] = useState(null);
  const [recordsPage, setRecordsPage] = useState(1);

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
  const recordsLimit = 10;

  const {
    data: recordsPayload,
    isFetching: recordsLoading,
    refetch: refetchRecords,
  } = useQuery({
    queryKey: [
      "damaged-clothes-penalties",
      recordsSearch,
      recordsRole?.value,
      recordsPage,
    ],
    queryFn: () =>
      api
        .get("/damaged-clothes/penalties", {
          params: {
            search: recordsSearch,
            roleType: recordsRole?.value || undefined,
            page: recordsPage,
            limit: recordsLimit,
          },
        })
        .then((r) => r.data),
  });

  const records = recordsPayload?.data || [];
  const recordsTotal = Number(recordsPayload?.total || 0);
  const recordsTotalPages = Math.max(1, Math.ceil(recordsTotal / recordsLimit));

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
        qc.invalidateQueries({ queryKey: ["analytics"] }),
        qc.invalidateQueries({ queryKey: ["worker-panel-orders"] }),
        qc.invalidateQueries({ queryKey: ["damaged-clothes-order-search"] }),
        qc.invalidateQueries({ queryKey: ["damaged-clothes-penalties"] }),
        qc.invalidateQueries({ queryKey: ["worker-panel-damaged-penalties"] }),
        qc.invalidateQueries({ queryKey: ["user-notifications"] }),
      ]);
      setConfirmOpen(false);
      setSelectedOrder(null);
      setDamageReason("");
      toast.success(
        t("damagedClothes.createSuccess", {
          amount: formatCurrency(data?.penalty?.totalExpense || 0, language),
        }),
      );
    },
    onError: (error) => {
      const apiCode = error?.response?.data?.code;
      if (apiCode === "DUPLICATE_DAMAGED_CLOTHES_PENALTY") {
        toast.error(
          buildDuplicateMessage(error?.response?.data?.existingPenalty, t),
        );
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
    if (order?.isDamageOrder) {
      toast.error(
        buildDuplicateMessage(
          {
            workerName: order?.damagedAssignedTo?.name,
            roleType: order?.damagedAssignedRole,
          },
          t,
        ),
      );
      return;
    }
    setDamageReason(t("damagedClothes.defaultReason", "Damaged Clothes"));
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
      reason: damageReason.trim() || t("damagedClothes.defaultReason"),
    });
  };

  return (
    <div className="page" dir={isRtl ? "rtl" : "ltr"} style={{ paddingBottom: 40 }}>
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
                classNamePrefix="rs"
                isRtl={isRtl}
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
                classNamePrefix="rs"
                isRtl={isRtl}
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
            display: searchTriggered ? "block" : "none",
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
              <AfCurrencyIcon size={16} style={{ color: "var(--primary)" }} />
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
                  background: DAMAGED_TONES.primary.bg,
                  color: DAMAGED_TONES.primary.text,
                  border: `1px solid ${DAMAGED_TONES.primary.border}`,
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
                    selectedRole={selectedRole}
                    selectedWorker={selectedWorker}
                    onApply={() => openConfirm(order)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <RecordsPanel
          t={t}
          language={language}
          isRtl={isRtl}
          roleOptions={roleOptions}
          records={records}
          recordsSearch={recordsSearch}
          recordsRole={recordsRole}
          recordsPage={recordsPage}
          recordsTotal={recordsTotal}
          recordsTotalPages={recordsTotalPages}
          recordsLoading={recordsLoading}
          onSearchChange={(value) => {
            setRecordsSearch(value);
            setRecordsPage(1);
          }}
          onRoleChange={(value) => {
            setRecordsRole(value);
            setRecordsPage(1);
          }}
          onPageChange={setRecordsPage}
          onRefresh={refetchRecords}
        />
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

            <div style={{ display: "grid", gap: 6 }}>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text2)",
                }}
              >
                {t("damagedClothes.reasonLabel", "Damage reason")}
              </label>
              <textarea
                className="inp"
                rows={3}
                value={damageReason}
                onChange={(event) => setDamageReason(event.target.value)}
                placeholder={t(
                  "damagedClothes.reasonPlaceholder",
                  "Write the damage reason or short description",
                )}
                style={{ resize: "vertical", minHeight: 88 }}
              />
            </div>

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
function OrderCard({
  order,
  language,
  t,
  selectedRole,
  selectedWorker,
  onApply,
}) {
  const isDamageOrder = Boolean(order?.isDamageOrder);
  const selectedRoleValue = selectedRole?.value;
  const dokhtExpenseValue =
    selectedRoleValue === "DOKHT" ? 0 : Number(order.dokhtExpense || 0);
  const qichikarExpenseValue =
    selectedRoleValue === "QICHIKAR" ? 0 : Number(order.qichikarExpense || 0);

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
                background: DAMAGED_TONES.red.bg,
                border: `1px solid ${DAMAGED_TONES.red.border}`,
                color: DAMAGED_TONES.red.text,
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
              background: DAMAGED_TONES.primary.bg,
              border: `1px solid ${DAMAGED_TONES.primary.border}`,
              color: DAMAGED_TONES.primary.text,
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
            value={formatCurrency(dokhtExpenseValue, language)}
            color="neutral"
          />
          <StatPill
            label={t("damagedClothes.details.qichikarExpense")}
            value={formatCurrency(qichikarExpenseValue, language)}
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
        {isDamageOrder && (
          <div
            style={{
              border: `1px solid ${DAMAGED_TONES.red.border}`,
              background: DAMAGED_TONES.red.bg,
              color: DAMAGED_TONES.red.text,
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.6,
            }}
          >
            {buildDuplicateMessage(
              {
                workerName: order?.damagedAssignedTo?.name,
                roleType: order?.damagedAssignedRole,
              },
              t,
            )}
          </div>
        )}

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

function RecordsPanel({
  t,
  language,
  isRtl,
  roleOptions,
  records,
  recordsSearch,
  recordsRole,
  recordsPage,
  recordsTotal,
  recordsTotalPages,
  recordsLoading,
  onSearchChange,
  onRoleChange,
  onPageChange,
  onRefresh,
}) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const pagePenaltyTotal = records.reduce(
    (sum, record) => sum + Number(record?.penaltyAmount || 0),
    0,
  );
  const hasActiveFilters = Boolean(recordsSearch?.trim() || recordsRole?.value);

  const mobileFilterApply = () => setFilterModalOpen(false);
  const mobileFilterClear = () => {
    onSearchChange("");
    onRoleChange(null);
    setFilterModalOpen(false);
  };

  const filterSearchInput = (
    <div style={{ position: "relative" }}>
      <LuSearch
        size={15}
        style={{
          position: "absolute",
          insetInlineStart: 13,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text3)",
        }}
      />
      <input
        className="inp"
        value={recordsSearch}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t(
          "damagedClothes.recordsSearchPlaceholder",
          "Search bill, worker, customer, or reason",
        )}
        style={{
          height: 42,
          paddingInlineStart: 38,
          borderRadius: 10,
          background: "var(--surface)",
        }}
      />
    </div>
  );

  const filterRoleSelect = (
    <Select
      classNamePrefix="rs"
      isRtl={isRtl}
      isClearable
      options={roleOptions}
      value={recordsRole}
      onChange={onRoleChange}
      placeholder={t("damagedClothes.filterByRole", "Filter by role")}
      styles={buildSelectStyles({ isRtl })}
    />
  );

  const filterStatusBadge = (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: "var(--text2)",
        fontSize: 12,
        fontWeight: 700,
        justifyContent: "center",
        minHeight: 42,
        paddingInline: 12,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        whiteSpace: "nowrap",
      }}
    >
      <LuFilter size={14} />
      {hasActiveFilters
        ? t("common.filtered", "Filtered")
        : t("common.all", "All")}
    </div>
  );

  return (
    <section
      style={{
        background: "var(--surface)",
        borderRadius: 18,
        border: "1px solid var(--border)",
        boxShadow: "0 14px 34px rgba(15,23,42,.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: DAMAGED_TONES.red.bg,
              border: `1px solid ${DAMAGED_TONES.red.border}`,
              color: DAMAGED_TONES.red.text,
              flexShrink: 0,
            }}
          >
            <LuShieldAlert size={19} />
          </span>
          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
            <strong style={{ color: "var(--text1)", fontSize: 16 }}>
              {t(
                "damagedClothes.recordsTitle",
                "Saved damaged clothes records",
              )}
            </strong>
            <span style={{ color: "var(--text3)", fontSize: 12 }}>
              {t("damagedClothes.totalRecords", {
                count: formatNumberLocale(recordsTotal, language),
              })}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={onRefresh}
          disabled={recordsLoading}
          style={{ height: 36, borderRadius: 10, gap: 6 }}
        >
          <LuRefreshCw size={13} />
          {t("common.refresh", "Refresh")}
        </button>
      </div>

      <div style={{ padding: 20, display: "grid", gap: 16 }}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <RecordSummaryTile
            label={t("damagedClothes.totalRecords", {
              count: formatNumberLocale(recordsTotal, language),
            })}
            value={formatNumberLocale(recordsTotal, language)}
            tone="red"
          />
          <RecordSummaryTile
            label={t("damagedClothes.details.totalPenalty", "Penalty")}
            value={formatCurrency(pagePenaltyTotal, language)}
            tone="amber"
          />
        </div>

        <div
          className="hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_240px_auto]"
          style={{
            alignItems: "center",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 12,
            background: "var(--surface2)",
          }}
        >
          {filterSearchInput}
          {filterRoleSelect}
          {filterStatusBadge}
        </div>

        <div className="lg:hidden">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFilterModalOpen(true)}
            style={{ height: 42, borderRadius: 10, gap: 6, width: "100%" }}
          >
            <LuFilter size={14} />
            {hasActiveFilters
              ? t("common.filtered", "Filtered")
              : t("common.filters", "Filters")}
          </button>
        </div>

        <Modal
          open={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          title={t("damagedClothes.recordsTitle", "Filters")}
          maxW={420}
        >
          <div style={{ display: "grid", gap: 16 }}>
            {filterSearchInput}
            {filterRoleSelect}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={mobileFilterClear}
                style={{ height: 40, borderRadius: 10, gap: 6 }}
              >
                {t("common.clear", "Clear")}
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={mobileFilterApply}
                style={{ height: 40, borderRadius: 10, gap: 6, minWidth: 90 }}
              >
                {t("common.apply", "Apply")}
              </button>
            </div>
          </div>
        </Modal>

        <div
          className="order-scroll-x"
          style={{
            overflowX: "auto",
            border: "1px solid var(--border)",
            borderRadius: 14,
            background: "var(--surface)",
          }}
        >
          <table
            className="min-w-full"
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                {[
                  t("orders.billNumber", "Bill #"),
                  t("damagedClothes.workerLabel", "Worker"),
                  t("damagedClothes.roleLabel", "Role"),
                  t("damagedClothes.reasonLabel", "Reason"),
                  t("damagedClothes.details.totalPenalty", "Penalty"),
                  t("common.date", "Date"),
                  t("damagedClothes.createdBy", "Created by"),
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: "12px 14px",
                      textAlign: "start",
                      color: "var(--text3)",
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0,
                      borderBottom: "1px solid var(--border)",
                      background: "var(--surface2)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recordsLoading ? (
                <RecordsLoadingRow t={t} />
              ) : records.length === 0 ? (
                <RecordsEmptyRow t={t} />
              ) : (
                records.map((record) => (
                  <RecordTableRow
                    key={record.id}
                    record={record}
                    t={t}
                    language={language}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:hidden">
          {recordsLoading ? (
            <RecordMobileSkeleton t={t} />
          ) : records.length === 0 ? (
            <RecordMobileEmpty t={t} />
          ) : (
            records.map((record) => (
              <RecordMobileCard
                key={record.id}
                record={record}
                t={t}
                language={language}
              />
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            color: "var(--text2)",
            fontSize: 13,
            borderTop: "1px solid var(--border)",
            paddingTop: 14,
          }}
        >
          <span>
            <LuFilter
              size={13}
              style={{ display: "inline", marginInlineEnd: 4 }}
            />
            {t("damagedClothes.totalRecords", {
              count: formatNumberLocale(recordsTotal, language),
            })}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={recordsPage <= 1}
              onClick={() => onPageChange(Math.max(1, recordsPage - 1))}
              style={{ width: 36, height: 34, padding: 0 }}
            >
              {isRtl ? (
                <LuChevronRight size={15} />
              ) : (
                <LuChevronLeft size={15} />
              )}
            </button>
            <strong
              style={{
                minWidth: 74,
                textAlign: "center",
                color: "var(--text1)",
              }}
            >
              {formatNumberLocale(recordsPage, language)} /{" "}
              {formatNumberLocale(recordsTotalPages, language)}
            </strong>
            <button
              type="button"
              className="btn btn-outline"
              disabled={recordsPage >= recordsTotalPages}
              onClick={() =>
                onPageChange(Math.min(recordsTotalPages, recordsPage + 1))
              }
              style={{ width: 36, height: 34, padding: 0 }}
            >
              {isRtl ? (
                <LuChevronLeft size={15} />
              ) : (
                <LuChevronRight size={15} />
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecordSummaryTile({ label, value, tone }) {
  const c = DAMAGED_TONES[tone] || DAMAGED_TONES.blue;
  return (
    <div
      style={{
        border: `1px solid ${c.border}`,
        background: c.bg,
        borderRadius: 14,
        padding: "12px 14px",
        minHeight: 74,
        display: "grid",
        alignContent: "center",
        gap: 5,
      }}
    >
      <span style={{ color: "var(--text3)", fontSize: 11, fontWeight: 700 }}>
        {label}
      </span>
      <strong
        style={{
          color: c.text,
          fontSize: 18,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StatusBadge({ children, tone = "blue" }) {
  const c = DAMAGED_TONES[tone] || DAMAGED_TONES.blue;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.text,
        padding: "4px 9px",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function formatRecordDate(record, language) {
  return formatDateLocale(record.createdAt, language, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function RecordTableCell({ children, strong = false, mono = false }) {
  return (
    <td
      style={{
        padding: "13px 14px",
        borderBottom: "1px solid var(--border)",
        color: strong ? "var(--text1)" : "var(--text2)",
        fontWeight: strong ? 800 : 500,
        verticalAlign: "middle",
        whiteSpace: mono ? "nowrap" : undefined,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
      }}
    >
      {children}
    </td>
  );
}

function RecordTableRow({ record, t, language }) {
  return (
    <tr>
      <RecordTableCell mono strong>
        #{record.billNumber || "-"}
      </RecordTableCell>
      <RecordTableCell strong>{record.workerName || "-"}</RecordTableCell>
      <RecordTableCell>
        <StatusBadge tone="blue">{getRoleLabel(record.workerType, t)}</StatusBadge>
      </RecordTableCell>
      <RecordTableCell>
        <span
          style={{
            display: "block",
            minWidth: 220,
            maxWidth: 360,
            whiteSpace: "normal",
            lineHeight: 1.6,
          }}
        >
          {record.reason || "-"}
        </span>
      </RecordTableCell>
      <RecordTableCell strong>
        {formatCurrency(record.penaltyAmount || 0, language)}
      </RecordTableCell>
      <RecordTableCell>{formatRecordDate(record, language)}</RecordTableCell>
      <RecordTableCell>{record.createdBy?.name || "-"}</RecordTableCell>
    </tr>
  );
}

function RecordsLoadingRow({ t }) {
  return (
    <tr>
      <td colSpan={7} style={{ padding: 24, color: "var(--text3)" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <strong style={{ color: "var(--text2)" }}>
            {t("common.loading", "Loading...")}
          </strong>
          <div style={{ display: "grid", gap: 8 }}>
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                style={{
                  height: 42,
                  borderRadius: 10,
                  background: "var(--surface2)",
                  animation: "pulse 1.6s cubic-bezier(.4,0,.6,1) infinite",
                }}
              />
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

function RecordsEmptyRow({ t }) {
  return (
    <tr>
      <td colSpan={7} style={{ padding: 34, textAlign: "center" }}>
        <RecordMobileEmpty t={t} />
      </td>
    </tr>
  );
}

function RecordMobileSkeleton({ t }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <strong style={{ color: "var(--text2)" }}>
        {t("common.loading", "Loading...")}
      </strong>
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          style={{
            height: 38,
            borderRadius: 10,
            background: "var(--surface2)",
            animation: "pulse 1.6s cubic-bezier(.4,0,.6,1) infinite",
          }}
        />
      ))}
    </div>
  );
}

function RecordMobileEmpty({ t }) {
  return (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 10,
        padding: 28,
        color: "var(--text3)",
      }}
    >
      <span
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
        }}
      >
        <LuShieldAlert size={21} />
      </span>
      <strong style={{ color: "var(--text2)", textAlign: "center" }}>
        {t("damagedClothes.noRecords", "No damaged clothes records found.")}
      </strong>
    </div>
  );
}

function RecordMobileCard({ record, t, language }) {
  return (
    <article
      style={{
        border: "1px solid var(--border)",
        borderRadius: 14,
        background: "var(--surface)",
        padding: 14,
        display: "grid",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <strong
            style={{
              color: "var(--primary)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            #{record.billNumber || "-"}
          </strong>
          <span style={{ color: "var(--text1)", fontWeight: 800 }}>
            {record.workerName || "-"}
          </span>
        </div>
        <StatusBadge tone="blue">{getRoleLabel(record.workerType, t)}</StatusBadge>
      </div>

      <div style={{ color: "var(--text2)", fontSize: 13, lineHeight: 1.7 }}>
        {record.reason || "-"}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatPill
          label={t("damagedClothes.details.totalPenalty", "Penalty")}
          value={formatCurrency(record.penaltyAmount || 0, language)}
          color="red"
        />
        <StatPill
          label={t("common.date", "Date")}
          value={formatRecordDate(record, language)}
          color="neutral"
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          paddingTop: 2,
        }}
      >
        <span style={{ color: "var(--text3)", fontSize: 12, fontWeight: 700 }}>
          {t("damagedClothes.createdBy", "Created by")}:{" "}
          {record.createdBy?.name || "-"}
        </span>
      </div>
    </article>
  );
}
