import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCalendarCheck,
  LuRefreshCcw,
  LuSearch,
  LuSquareCheckBig,
  LuUser,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
import { formatDateLocale } from "../lib/locale.js";
import { formatCurrency } from "../lib/currency.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../lib/months.js";
import {
  Badge,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
  StatCard,
  TableHorizontalScroll,
} from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import MobileFilterPanel from "../components/ui/MobileFilterPanel.jsx";

const LIMIT = 15;

function paymentBadge(status, t) {
  if (status === "PAID_TO_WORKER") {
    return (
      <Badge v="green">
        {t("completedWorkerOrders.paid", "Paid to worker")}
      </Badge>
    );
  }
  return <Badge v="amber">{t("completedWorkerOrders.unpaid", "Unpaid")}</Badge>;
}

function paymentStatusLabel(status, t) {
  if (status === "PAID_TO_WORKER") {
    return t("completedWorkerOrders.paid", "Paid to worker");
  }
  if (status === "UNPAID") {
    return t("completedWorkerOrders.unpaid", "Unpaid");
  }
  return status || "-";
}

function receiptBadge(status, t) {
  if (status === "RECEIVED") {
    return (
      <Badge v="green">{t("completedWorkerOrders.received", "Received")}</Badge>
    );
  }
  return (
    <Badge v="amber">
      {t("completedWorkerOrders.pendingReceipt", "Pending receipt")}
    </Badge>
  );
}

function workerRoleLabel(role, t) {
  if (role === "QICHIKAR") {
    return t("completedWorkerOrders.qichikarRole", "Qichikar");
  }
  if (role === "DOKHT") {
    return t("completedWorkerOrders.dokhtRole", "Dokht");
  }
  return role || "-";
}

function getPaymentRowKey(order) {
  return order?.rowId || `${order?.id}:${order?.workerRole || "WORKER"}`;
}

function getPaymentEditUiState(order) {
  const isAlreadyPaid = order?.workerPaymentStatus === "PAID_TO_WORKER";

  if (!isAlreadyPaid) {
    return {
      isAlreadyPaid,
      canEditWithinWindow: false,
      isExpired: false,
      canSubmit: true,
      canEditAmount: true,
      actionLabel: "save",
    };
  }

  return {
    isAlreadyPaid,
    canEditWithinWindow: true,
    isExpired: false,
    canSubmit: true,
    canEditAmount: true,
    actionLabel: "edit",
  };
}

export default function CompletedWorkerOrders() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = (i18n.dir?.() || "ltr") === "rtl";
  const { isAdmin } = useAuth();
  const { viewMonth, viewYear } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightOrderId = searchParams.get("orderId") || "";
  const workerRoleFilterRaw = (searchParams.get("workerRole") || "").trim();
  const workerRoleFilter = ["QICHIKAR", "DOKHT"].includes(workerRoleFilterRaw)
    ? workerRoleFilterRaw
    : "";

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [qichikarUserId, setQichikarUserId] = useState("");
  const [dokhtUserId, setDokhtUserId] = useState("");
  const [page, setPage] = useState(1);
  const [pendingPayments, setPendingPayments] = useState({});
  const [confirmPayment, setConfirmPayment] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState({});
  const [confirmReceipt, setConfirmReceipt] = useState(false);

  // When a specific order is linked from a notification, reset page to 1
  useEffect(() => {
    if (highlightOrderId) setPage(1);
  }, [highlightOrderId]);

  // Reset page when month/year changes
  useEffect(() => {
    setPage(1);
  }, [viewMonth, viewYear]);

  useEffect(() => {
    setSelectedRowKeys({});
  }, [page, paymentStatus, qichikarUserId, dokhtUserId, search]);

  // Refs for auto-scrolling to the highlighted row
  const rowRefs = useRef({});

  // After data loads, scroll the highlighted row into view
  useEffect(() => {
    if (!highlightOrderId) return;
    const node = rowRefs.current[highlightOrderId];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  const params = useMemo(() => {
    const next = { page, limit: LIMIT };
    if (search.trim()) next.search = search.trim();
    if (paymentStatus !== "ALL") next.paymentStatus = paymentStatus;
    if (qichikarUserId) next.qichikarUserId = qichikarUserId;
    if (dokhtUserId) next.dokhtUserId = dokhtUserId;
    if (highlightOrderId) next.orderId = highlightOrderId;
    if (workerRoleFilter) next.workerRole = workerRoleFilter;
    if (isAdmin) {
      next.month = viewMonth;
      next.year = viewYear;
    }
    return next;
  }, [
    dokhtUserId,
    highlightOrderId,
    isAdmin,
    page,
    paymentStatus,
    qichikarUserId,
    search,
    workerRoleFilter,
    viewMonth,
    viewYear,
  ]);

  const { data: workerOptions = [], isLoading: isWorkersLoading } = useQuery({
    queryKey: ["assignable-workers"],
    queryFn: () => api.get("/users/assignable").then((r) => r.data),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["completed-worker-orders", params],
    queryFn: () =>
      api.get("/orders/completed/from-workers", { params }).then((r) => r.data),
    keepPreviousData: true,
  });

  const payWorkerMut = useMutation({
    mutationFn: ({ id, paymentAmount, workerRole }) =>
      api
        .patch(`/orders/${id}/pay-worker`, { paymentAmount, workerRole })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["completed-worker-orders"] });
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      qc.invalidateQueries({ queryKey: ["worker-panel-transaction-summary"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-detail"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      setConfirmPayment(null);
      toast.success(
        t(
          "completedWorkerOrders.paymentSaved",
          "Worker payment saved successfully.",
        ),
      );
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          t(
            "completedWorkerOrders.paymentFailed",
            "Unable to save worker payment.",
          ),
        ),
      );
    },
  });

  const receiptMut = useMutation({
    mutationFn: ({ items }) =>
      api
        .patch("/orders/completed/from-workers/receipts", { items })
        .then((r) => r.data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["completed-worker-orders"] });
      qc.invalidateQueries({ queryKey: ["worker-payment-receipts"] });
      qc.invalidateQueries({ queryKey: ["worker-panel-transaction-summary"] });
      setSelectedRowKeys({});
      setConfirmReceipt(false);
      toast.success(
        t(
          "completedWorkerOrders.receiptSaved",
          "Receipt saved for {{count}} order(s).",
          { count: result?.totalCount || 0 },
        ),
      );
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          t("completedWorkerOrders.receiptFailed", "Unable to save receipt."),
        ),
      );
    },
  });

  const rows = data?.data || [];
  const total = Number(data?.total || 0);
  const stats = data?.stats || {
    totalOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0,
    totalPaidAmount: 0,
    totalReceiptAmount: 0,
    totalPendingReceiptAmount: 0,
  };

  const eligibleRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.workerPaymentStatus === "PAID_TO_WORKER" &&
          row.moneyReceiptStatus !== "RECEIVED",
      ),
    [rows],
  );

  const selectedItems = useMemo(
    () =>
      eligibleRows
        .filter((row) => selectedRowKeys[getPaymentRowKey(row)])
        .map((row) => ({
          rowKey: getPaymentRowKey(row),
          orderId: row.id,
          workerRole: row.workerRole,
          paidAmount: Number(row.workerPaymentAmount || 0),
        })),
    [eligibleRows, selectedRowKeys],
  );

  const selectedTotalAmount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.paidAmount, 0),
    [selectedItems],
  );

  const allEligibleSelected =
    eligibleRows.length > 0 && selectedItems.length === eligibleRows.length;
  const hasSelectedRows = selectedItems.length > 0;

  const toggleSelectAll = (checked) => {
    if (!checked) {
      setSelectedRowKeys({});
      return;
    }
    const next = {};
    eligibleRows.forEach((row) => {
      next[getPaymentRowKey(row)] = true;
    });
    setSelectedRowKeys(next);
  };

  const toggleSelectRow = (row, checked) => {
    const rowKey = getPaymentRowKey(row);
    setSelectedRowKeys((prev) => {
      if (!checked) {
        const clone = { ...prev };
        delete clone[rowKey];
        return clone;
      }
      return { ...prev, [rowKey]: true };
    });
  };

  const qichikarUsers = useMemo(
    () => workerOptions.filter((worker) => worker.accountType === "QICHIKAR"),
    [workerOptions],
  );

  const dokhtUsers = useMemo(
    () => workerOptions.filter((worker) => worker.accountType === "DOKHT"),
    [workerOptions],
  );

  const selectedQichikar = useMemo(
    () => qichikarUsers.find((worker) => worker.id === qichikarUserId) || null,
    [qichikarUserId, qichikarUsers],
  );

  const selectedDokht = useMemo(
    () => dokhtUsers.find((worker) => worker.id === dokhtUserId) || null,
    [dokhtUserId, dokhtUsers],
  );

  const tableColumns = useMemo(() => {
    const columns = [
      {
        key: "select",
        className: "completed-worker-orders-col--select",
        heading: t("common.select", "Select"),
      },
      {
        key: "actions",
        className: "completed-worker-orders-col--actions",
        heading: t("common.actions", "Actions"),
      },
      {
        key: "paymentAmount",
        className: "completed-worker-orders-col--paymentAmount",
        heading: t("completedWorkerOrders.paymentAmount", "Payment Amount"),
      },
      {
        key: "receiptStatus",
        className: "completed-worker-orders-col--receiptStatus",
        heading: t("completedWorkerOrders.receiptStatus", "Receipt Status"),
      },
      {
        key: "paymentStatus",
        className: "completed-worker-orders-col--paymentStatus",
        heading: t("completedWorkerOrders.paymentStatus", "Payment Status"),
      },
      {
        key: "status",
        className: "completed-worker-orders-col--status",
        heading: t("common.status", "Status"),
      },
      {
        key: "completionDate",
        className: "completed-worker-orders-col--completionDate",
        heading: t("completedWorkerOrders.completionDate", "Completion Date"),
      },
      {
        key: "orderType",
        className: "completed-worker-orders-col--orderType",
        heading: t("workerPanel.orderType", "Order Type"),
      },
      {
        key: "customer",
        className: "completed-worker-orders-col--customer",
        heading: t("common.customer", "Customer"),
      },
      {
        key: "billNumber",
        className: "completed-worker-orders-col--billNumber",
        heading: t("orders.billNumber", "Bill Number"),
      },
      {
        key: "workerRole",
        className: "completed-worker-orders-col--workerRole",
        heading: t("completedWorkerOrders.workerRole", "Worker Role"),
      },
      {
        key: "workerName",
        className: "completed-worker-orders-col--workerName",
        heading: t("completedWorkerOrders.workerName", "Worker Name"),
      },
    ];

    return isRtl ? [...columns].reverse() : columns;
  }, [isRtl, t]);

  const activeFilterCount = [
    Boolean(search.trim()),
    paymentStatus !== "ALL",
    Boolean(qichikarUserId),
    Boolean(dokhtUserId),
  ].filter(Boolean).length;

  const onSearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setSearch("");
    setSearchInput("");
    setPaymentStatus("ALL");
    setQichikarUserId("");
    setDokhtUserId("");
    setPage(1);
    setSelectedRowKeys({});
    if (highlightOrderId || workerRoleFilter) {
      const nextParams = new URLSearchParams();
      if (highlightOrderId) {
        nextParams.set("orderId", highlightOrderId);
      }
      setSearchParams(nextParams, { replace: true });
    }
  };

  const clearRoleFilter = () => {
    if (!workerRoleFilter) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("workerRole");
    setSearchParams(nextParams, { replace: true });
    setPage(1);
  };

  const handleSavePayment = (order) => {
    const editUiState = getPaymentEditUiState(order);
    if (!editUiState.canSubmit) {
      toast.error(
        t(
          "completedWorkerOrders.paymentLockedAfterReceipt",
          "This payment already has a confirmed receipt. Update the receipt amount from receipt history.",
        ),
      );
      return;
    }

    const rowKey = getPaymentRowKey(order);
    const rawValue = pendingPayments[rowKey];
    const parsedAmount = parseNumberLocale(String(rawValue ?? ""));

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(
        t(
          "completedWorkerOrders.invalidPayment",
          "Payment amount must be a valid positive number.",
        ),
      );
      return;
    }

    setConfirmPayment({
      order,
      amount: parsedAmount,
      mode: editUiState.canEditWithinWindow ? "edit" : "create",
    });
  };

  const submitConfirmedPayment = () => {
    if (!confirmPayment) return;
    payWorkerMut.mutate({
      id: confirmPayment.order.id,
      paymentAmount: confirmPayment.amount,
      workerRole: confirmPayment.order.workerRole,
    });
  };

  const submitReceipt = () => {
    if (!selectedItems.length) return;
    receiptMut.mutate({
      items: selectedItems.map((item) => ({
        orderId: item.orderId,
        workerRole: item.workerRole,
      })),
    });
  };

  const filterSummary = selectedQichikar
    ? t(
        "completedWorkerOrders.filteringQichikar",
        "Showing completed orders for Qichikar: {{name}}",
        { name: selectedQichikar.name },
      )
    : selectedDokht
      ? t(
          "completedWorkerOrders.filteringDokht",
          "Showing completed orders for Dokht: {{name}}",
          { name: selectedDokht.name },
        )
      : t(
          "completedWorkerOrders.filteringAllWorkers",
          "Showing completed orders for all workers",
        );

  return (
    <div className="page completed-worker-orders-page">
      <PageHeader
        title={t(
          "completedWorkerOrders.title",
          "Completed Orders (From Workers)",
        )}
        subtitle={t(
          "completedWorkerOrders.subtitle",
          "Review finished worker orders and register payment for each completion.",
        )}
      />

      {isAdmin && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            marginBottom: 4,
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
            {t("common.viewingMonth", "Viewing data for")}:{" "}
            <strong style={{ fontWeight: 700 }}>
              {formatMonthYearLabel(viewMonth, viewYear, language)}
            </strong>
          </span>
          {data?.total === 0 && !isLoading && (
            <span
              style={{ marginInlineStart: "auto", fontSize: 11, opacity: 0.75 }}
            >
              {t("common.noDataThisMonth", "No data found for this month")}
            </span>
          )}
        </div>
      )}

      {highlightOrderId && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px",
            borderRadius: 10,
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 13, color: "#1D4ED8", fontWeight: 500 }}>
            {t(
              "completedWorkerOrders.focusedOrder",
              "Showing order from notification — highlighted below.",
            )}
          </span>
          <button
            onClick={resetFilters}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#1D4ED8",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <LuX size={13} />
            {t("completedWorkerOrders.clearFocus", "Clear")}
          </button>
        </div>
      )}

      {workerRoleFilter && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px",
            borderRadius: 10,
            background: "#F5F3FF",
            border: "1px solid #DDD6FE",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 13, color: "#5B21B6", fontWeight: 500 }}>
            {t(
              "completedWorkerOrders.filteredByRole",
              "Showing only {{role}} worker payments.",
              {
                role: workerRoleLabel(workerRoleFilter, t),
              },
            )}
          </span>
          <button
            onClick={clearRoleFilter}
            className="inline-flex items-center gap-1 bg-transparent text-xs font-semibold text-violet-700 transition hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
          >
            <LuX size={13} />
            {t("common.clear", "Clear")}
          </button>
        </div>
      )}

      <section
        className="completed-worker-stats-grid"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <StatCard
          label={t("completedWorkerOrders.totalPaid", "Total Recorded")}
          value={formatCurrency(stats.totalPaidAmount || 0, "en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          Icon={AfCurrencyIcon}
          accent="#7C3AED"
        />
        <StatCard
          label={t("completedWorkerOrders.totalReceipt", "Total Receipt")}
          value={formatCurrency(stats.totalReceiptAmount || 0, "en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          Icon={AfCurrencyIcon}
          accent="#0F766E"
        />
        <StatCard
          label={t("completedWorkerOrders.pendingReceiptTotal", "Pending Receipt")}
          value={formatCurrency(stats.totalPendingReceiptAmount || 0, "en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          Icon={AfCurrencyIcon}
          accent="#B45309"
        />
        <StatCard
          label={t("completedWorkerOrders.unpaidOrders", "Unpaid Orders")}
          value={stats.unpaidOrders}
          Icon={LuUser}
          accent="#B45309"
        />
        <StatCard
          label={t("completedWorkerOrders.paidOrders", "Paid Orders")}
          value={stats.paidOrders}
          Icon={AfCurrencyIcon}
          accent="#15803D"
        />
        <StatCard
          label={t("completedWorkerOrders.totalOrders", "All Orders")}
          value={stats.totalOrders}
          Icon={LuSquareCheckBig}
          accent="#2563EB"
        />
      </section>

      <MobileFilterPanel
        activeCount={activeFilterCount}
        clearDisabled={activeFilterCount === 0}
        isApplying={isFetching}
        onApply={onSearch}
        onClear={resetFilters}
        title={t("common.filters", "Filters")}
      >
        <Card>
          <form
            onSubmit={onSearch}
            className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] items-end gap-3"
          >
          <div>
            <label className="lbl">{t("common.search", "Search")}</label>
            <div className="relative">
              <LuSearch
                size={14}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--text3)]"
                style={{ insetInlineStart: 10 }}
              />
              <input
                className="inp"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t(
                  "completedWorkerOrders.searchPlaceholder",
                  "Search by worker, customer, or bill number",
                )}
                style={{ paddingInlineStart: 32 }}
              />
            </div>
          </div>

          <div>
            <label className="lbl">{t("common.status", "Status")}</label>
            <select
              className="inp"
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">
                {t("completedWorkerOrders.allPayments", "All payments")}
              </option>
              <option value="UNPAID">
                {t("completedWorkerOrders.unpaid", "Unpaid")}
              </option>
              <option value="PAID_TO_WORKER">
                {t("completedWorkerOrders.paid", "Paid to worker")}
              </option>
            </select>
          </div>

          <div>
            <label className="lbl">
              {t("completedWorkerOrders.qichikarUser", "Qichikar User")}
            </label>
            <select
              className="inp"
              value={qichikarUserId}
              onChange={(e) => {
                const nextValue = e.target.value;
                setQichikarUserId(nextValue);
                if (nextValue) setDokhtUserId("");
                setPage(1);
              }}
              disabled={isWorkersLoading}
            >
              <option value="">
                {t(
                  "completedWorkerOrders.allQichikarUsers",
                  "All Qichikar users",
                )}
              </option>
              {qichikarUsers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">
              {t("completedWorkerOrders.dokhtUser", "Dokht User")}
            </label>
            <select
              className="inp"
              value={dokhtUserId}
              onChange={(e) => {
                const nextValue = e.target.value;
                setDokhtUserId(nextValue);
                if (nextValue) setQichikarUserId("");
                setPage(1);
              }}
              disabled={isWorkersLoading}
            >
              <option value="">
                {t("completedWorkerOrders.allDokhtUsers", "All Dokht users")}
              </option>
              {dokhtUsers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-outline"
            style={{ minWidth: 110, height: 40, gap: 8 }}
          >
            <LuSearch size={14} />
            {t("common.search", "Search")}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={resetFilters}
          >
            <LuRefreshCcw size={14} />
            {t("completedWorkerOrders.clearFilters", "Clear Filters")}
          </button>
          </form>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[var(--text3)]">
            {t("completedWorkerOrders.activeFilters", "Active Filters")}:{" "}
            {activeFilterCount}
          </span>
          {search.trim() ? (
            <span className="badge bg-gray">{search.trim()}</span>
          ) : null}
          {paymentStatus !== "ALL" ? (
            <span className="badge bg-gray">
              {paymentStatusLabel(paymentStatus, t)}
            </span>
          ) : null}
          {selectedQichikar ? (
            <span className="badge bg-amber">
              {t("completedWorkerOrders.qichikarRole", "Qichikar")}:{" "}
              {selectedQichikar.name}
            </span>
          ) : null}
          {selectedDokht ? (
            <span className="badge bg-red">
              {t("completedWorkerOrders.dokhtRole", "Dokht")}:{" "}
              {selectedDokht.name}
            </span>
          ) : null}
          </div>
        </Card>
      </MobileFilterPanel>

      <div
        className="completed-worker-orders-table-section"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <Card
          title={t(
            "completedWorkerOrders.tableTitle",
            "Completed Worker Orders",
          )}
          action={
            isFetching ? (
              <span className="text-xs text-[var(--text3)]">
                {t("common.loading", "Loading...")}
              </span>
            ) : null
          }
        >
          {isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <EmptyState
              Icon={LuSquareCheckBig}
              message={t(
                "completedWorkerOrders.empty",
                "No completed worker orders found.",
              )}
            />
          ) : (
            <>
            <div className="completed-worker-orders-selection-bar mb-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-slate-50 to-sky-50 px-4 py-3 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
              <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={allEligibleSelected}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  disabled={!eligibleRows.length || receiptMut.isPending}
                />
                {t("completedWorkerOrders.selectAll", "Select All")}
              </label>

              <div className="completed-worker-orders-selection-actions inline-flex flex-wrap items-center gap-3">
                <span className="text-[13px] text-[var(--text2)]">
                  {t("completedWorkerOrders.selectedOrders", "Selected")}:{" "}
                  <b>{selectedItems.length}</b>
                </span>
                <span className="rounded-full border border-sky-300/60 bg-sky-100/70 px-2.5 py-1.5 text-[13px] font-semibold text-slate-800 dark:border-sky-700/60 dark:bg-sky-900/30 dark:text-sky-200">
                  {t("completedWorkerOrders.selectedTotal", "Total")}:{" "}
                  <b>{formatCurrency(selectedTotalAmount, "en")}</b>
                </span>
                <button
                  type="button"
                  className="btn btn-gold btn-sm"
                  onClick={() => setConfirmReceipt(true)}
                  disabled={!hasSelectedRows || receiptMut.isPending}
                >
                  <AfCurrencyIcon size={14} />
                  {receiptMut.isPending
                    ? t("common.loading", "Loading...")
                    : t("completedWorkerOrders.receipt", "Receipt")}
                </button>
              </div>
            </div>

            <TableHorizontalScroll
              viewportClassName="completed-worker-orders-table-wrap"
              ariaLabel="Completed worker orders table horizontal scroll"
              minWidth="1100px"
            >
              <table className="tbl completed-worker-orders-table">
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th key={column.key} className={column.className}>
                        {column.heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => {
                    const orderLabel = getOrderLabelParts(order, language);
                    const rowKey = getPaymentRowKey(order);
                    const editUiState = getPaymentEditUiState(order);
                    const isAlreadyPaid = editUiState.isAlreadyPaid;
                    const paymentInputValue =
                      pendingPayments[rowKey] ??
                      (order.workerPaymentAmount != null
                        ? String(order.workerPaymentAmount)
                        : "");
                    const isHighlighted =
                      highlightOrderId && order.id === highlightOrderId;
                    const canSelectForReceipt =
                      order.workerPaymentStatus === "PAID_TO_WORKER" &&
                      order.moneyReceiptStatus !== "RECEIVED";
                    const isSelected = Boolean(selectedRowKeys[rowKey]);
                    const cells = {
                      select: (
                        <td
                          key="select"
                          className="completed-worker-orders-checkbox-cell"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={
                              !canSelectForReceipt || receiptMut.isPending
                            }
                            onChange={(e) =>
                              toggleSelectRow(order, e.target.checked)
                            }
                            aria-label={t(
                              "completedWorkerOrders.selectOrder",
                              "Select order",
                            )}
                          />
                        </td>
                      ),
                      actions: (
                        <td
                          key="actions"
                          className="completed-worker-orders-col--actions"
                        >
                          <button
                            type="button"
                            className="btn btn-gold btn-sm completed-worker-orders-row-action"
                            onClick={() => handleSavePayment(order)}
                            disabled={
                              payWorkerMut.isPending || !editUiState.canSubmit
                            }
                          >
                            <AfCurrencyIcon size={14} />
                            {!isAlreadyPaid
                              ? t(
                                  "completedWorkerOrders.savePayment",
                                  "Save Payment",
                                )
                              : t("common.edit", "Edit")}
                          </button>
                        </td>
                      ),
                      paymentAmount: (
                        <td
                          key="paymentAmount"
                          className="completed-worker-orders-col--paymentAmount"
                        >
                          <div className="completed-worker-orders-payment-field">
                            <input
                              className="inp completed-worker-orders-payment-input"
                              value={paymentInputValue}
                              onChange={(e) =>
                                setPendingPayments((prev) => ({
                                  ...prev,
                                  [rowKey]: e.target.value,
                                }))
                              }
                              placeholder={t(
                                "completedWorkerOrders.amountPlaceholder",
                                "Enter amount",
                              )}
                              inputMode="decimal"
                              disabled={!editUiState.canEditAmount}
                            />
                          </div>
                        </td>
                      ),
                      receiptStatus: (
                        <td
                          key="receiptStatus"
                          className="completed-worker-orders-col--receiptStatus"
                        >
                          {receiptBadge(order.moneyReceiptStatus, t)}
                        </td>
                      ),
                      paymentStatus: (
                        <td
                          key="paymentStatus"
                          className="completed-worker-orders-col--paymentStatus"
                        >
                          {paymentBadge(order.workerPaymentStatus, t)}
                        </td>
                      ),
                      status: (
                        <td
                          key="status"
                          className="completed-worker-orders-col--status"
                        >
                          <Badge v="green">
                            {t("common.completed", "Completed")}
                          </Badge>
                        </td>
                      ),
                      completionDate: (
                        <td
                          key="completionDate"
                          className="completed-worker-orders-col--completionDate completed-worker-orders-date-cell"
                        >
                          {formatDateLocale(
                            order.completedAt || order.updatedAt,
                            language,
                          )}
                        </td>
                      ),
                      orderType: (
                        <td
                          key="orderType"
                          className="completed-worker-orders-col--orderType"
                        >
                          {orderLabel.typeWithSequenceLabel}
                        </td>
                      ),
                      customer: (
                        <td
                          key="customer"
                          className="completed-worker-orders-col--customer"
                        >
                          <div className="completed-worker-orders-customer-cell grid gap-0.5">
                            <strong className="text-[var(--text1)]">
                              {getOrderPrimaryDisplayName(
                                order,
                                order.customer?.firstName,
                                language,
                              )}
                            </strong>
                            <span className="completed-worker-orders-phone text-xs text-[var(--text3)]">
                              {order.customer?.phoneNumber || "-"}
                            </span>
                          </div>
                        </td>
                      ),
                      billNumber: (
                        <td
                          key="billNumber"
                          className="completed-worker-orders-col--billNumber"
                        >
                          #{order.customer?.billNumber || "-"}
                        </td>
                      ),
                      workerRole: (
                        <td
                          key="workerRole"
                          className="completed-worker-orders-col--workerRole"
                        >
                          {workerRoleLabel(
                            order.workerRole || order.assignedTo?.accountType,
                            t,
                          )}
                        </td>
                      ),
                      workerName: (
                        <td
                          key="workerName"
                          className="completed-worker-orders-col--workerName"
                        >
                          {order.assignedTo?.name || "-"}
                        </td>
                      ),
                    };
                    return (
                      <tr
                        key={rowKey}
                        ref={
                          isHighlighted
                            ? (node) => {
                                rowRefs.current[highlightOrderId] = node;
                              }
                            : undefined
                        }
                        className={isHighlighted ? "row-highlight" : undefined}
                      >
                        {tableColumns.map((column) => cells[column.key])}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableHorizontalScroll>
            </>
          )}

          <Pagination
            page={page}
            total={total}
            limit={LIMIT}
            onChange={(nextPage) => setPage(nextPage)}
          />
        </Card>
      </div>

      <Modal
        open={confirmReceipt}
        onClose={() => {
          if (receiptMut.isPending) return;
          setConfirmReceipt(false);
        }}
        title={t(
          "completedWorkerOrders.confirmReceiptTitle",
          "Confirm Receipt",
        )}
        maxW={500}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <p
            style={{
              margin: 0,
              color: "var(--text2)",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            {t(
              "completedWorkerOrders.confirmReceiptMessage",
              "You are confirming receipt for the selected completed worker orders. This will mark them as received and move them to receipt history.",
              { count: selectedItems.length },
            )}
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: isRtl ? "flex-start" : "flex-end",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setConfirmReceipt(false)}
              disabled={receiptMut.isPending}
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              type="button"
              className="btn btn-gold"
              onClick={submitReceipt}
              disabled={receiptMut.isPending || !hasSelectedRows}
            >
              <AfCurrencyIcon size={14} />
              {receiptMut.isPending
                ? t("common.loading", "Loading...")
                : t("completedWorkerOrders.receipt", "Receipt")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!confirmPayment}
        onClose={() => {
          if (payWorkerMut.isPending) return;
          setConfirmPayment(null);
        }}
        title={t(
          confirmPayment?.mode === "edit"
            ? "completedWorkerOrders.confirmEditPaymentTitle"
            : "completedWorkerOrders.confirmPaymentTitle",
          confirmPayment?.mode === "edit"
            ? "Confirm Payment Update"
            : "Confirm Payment",
        )}
        maxW={500}
      >
        {confirmPayment && (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0, color: "var(--text2)", fontSize: 13 }}>
              {t(
                confirmPayment.mode === "edit"
                  ? "completedWorkerOrders.confirmEditPaymentMessage"
                  : "completedWorkerOrders.confirmPaymentMessage",
                confirmPayment.mode === "edit"
                  ? "This updates the worker payment while it is still waiting for receipt confirmation."
                  : "After receipt confirmation, receipt amount corrections will be available for 24 hours from the receipt time.",
              )}
            </p>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--surface2)",
                padding: 12,
                display: "grid",
                gap: 6,
                fontSize: 13,
              }}
            >
              <div>
                <b>{t("completedWorkerOrders.workerName", "Worker Name")}:</b>{" "}
                {confirmPayment.order.assignedTo?.name || "-"}
              </div>
              <div>
                <b>{t("completedWorkerOrders.workerRole", "Worker Role")}:</b>{" "}
                {workerRoleLabel(confirmPayment.order.workerRole, t)}
              </div>
              <div>
                <b>{t("orders.billNumber", "Bill Number")}:</b> #
                {confirmPayment.order.customer?.billNumber || "-"}
              </div>
              <div>
                <b>{t("common.customer", "Customer")}:</b>{" "}
                {getOrderPrimaryDisplayName(
                  confirmPayment.order,
                  confirmPayment.order.customer?.firstName,
                  language,
                )}
              </div>
              <div>
                <b>{t("workerPanel.orderType", "Order Type")}:</b>{" "}
                {
                  getOrderLabelParts(confirmPayment.order, language)
                    .typeWithSequenceLabel
                }
              </div>
              <div>
                <b>
                  {t("completedWorkerOrders.paymentAmount", "Payment Amount")}:
                </b>{" "}
                {formatCurrency(confirmPayment.amount || 0, "en")}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: isRtl ? "flex-start" : "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setConfirmPayment(null)}
                disabled={payWorkerMut.isPending}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={submitConfirmedPayment}
                disabled={payWorkerMut.isPending}
              >
                <AfCurrencyIcon size={14} />
                {payWorkerMut.isPending
                  ? t("common.loading", "Loading...")
                  : t(
                      confirmPayment.mode === "edit"
                        ? "completedWorkerOrders.confirmEditPayment"
                        : "completedWorkerOrders.confirmPayment",
                      confirmPayment.mode === "edit"
                        ? "Confirm Update"
                        : "Confirm Payment",
                    )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
