import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCalendarCheck,
  LuCircleDollarSign,
  LuRefreshCcw,
  LuSearch,
  LuSquareCheckBig,
  LuUser,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { getOrderDisplayName } from "../lib/orderType.js";
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
} from "../components/ui/index.jsx";

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

function getPaymentRowKey(order) {
  return order?.rowId || `${order?.id}:${order?.workerRole || "WORKER"}`;
}

export default function CompletedWorkerOrders() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const { isAdmin } = useAuth();
  const { viewMonth, viewYear } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightOrderId = searchParams.get("orderId") || "";

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [qichikarUserId, setQichikarUserId] = useState("");
  const [dokhtUserId, setDokhtUserId] = useState("");
  const [page, setPage] = useState(1);
  const [pendingPayments, setPendingPayments] = useState({});
  const [confirmPayment, setConfirmPayment] = useState(null);

  // When a specific order is linked from a notification, reset page to 1
  useEffect(() => {
    if (highlightOrderId) setPage(1);
  }, [highlightOrderId]);

  // Reset page when month/year changes
  useEffect(() => {
    setPage(1);
  }, [viewMonth, viewYear]);

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

  const rows = data?.data || [];
  const total = Number(data?.total || 0);
  const stats = data?.stats || {
    totalOrders: 0,
    paidOrders: 0,
    unpaidOrders: 0,
    totalPaidAmount: 0,
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

  const activeFilterCount = [
    Boolean(search.trim()),
    paymentStatus !== "ALL",
    Boolean(qichikarUserId),
    Boolean(dokhtUserId),
  ].filter(Boolean).length;

  const onSearch = (e) => {
    e.preventDefault();
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
    if (highlightOrderId) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSavePayment = (order) => {
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

    setConfirmPayment({ order, amount: parsedAmount });
  };

  const submitConfirmedPayment = () => {
    if (!confirmPayment) return;
    payWorkerMut.mutate({
      id: confirmPayment.order.id,
      paymentAmount: confirmPayment.amount,
      workerRole: confirmPayment.order.workerRole,
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
    <div className="page">
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard
          label={t("completedWorkerOrders.totalOrders", "Matching Orders")}
          value={stats.totalOrders}
          Icon={LuSquareCheckBig}
          accent="#2563EB"
        />
        <StatCard
          label={t("completedWorkerOrders.paidOrders", "Paid Orders")}
          value={stats.paidOrders}
          Icon={LuCircleDollarSign}
          accent="#15803D"
        />
        <StatCard
          label={t("completedWorkerOrders.unpaidOrders", "Unpaid Orders")}
          value={stats.unpaidOrders}
          Icon={LuUser}
          accent="#B45309"
        />
        <StatCard
          label={t("completedWorkerOrders.totalPaid", "Total Paid")}
          value={formatCurrency(stats.totalPaidAmount || 0, "en", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          Icon={LuCircleDollarSign}
          accent="#7C3AED"
        />
      </div>

      <Card>
        <form
          onSubmit={onSearch}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          <div>
            <label className="lbl">{t("common.search", "Search")}</label>
            <div style={{ position: "relative" }}>
              <LuSearch
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                className="inp"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t(
                  "completedWorkerOrders.searchPlaceholder",
                  "Search by worker, customer, or bill number",
                )}
                style={{ paddingLeft: 32 }}
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
            style={{ minWidth: 110, height: 40, fontWeight: 600, gap: 8 }}
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

        <div
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700 }}
          >
            {t("completedWorkerOrders.activeFilters", "Active Filters")}:{" "}
            {activeFilterCount}
          </span>
          {search.trim() ? (
            <span className="badge bg-gray">{search.trim()}</span>
          ) : null}
          {paymentStatus !== "ALL" ? (
            <span className="badge bg-gray">{paymentStatus}</span>
          ) : null}
          {selectedQichikar ? (
            <span className="badge bg-amber">
              Qichikar: {selectedQichikar.name}
            </span>
          ) : null}
          {selectedDokht ? (
            <span className="badge bg-red">Dokht: {selectedDokht.name}</span>
          ) : null}
        </div>
      </Card>

      <Card
        title={t("completedWorkerOrders.tableTitle", "Completed Worker Orders")}
        action={
          isFetching ? (
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
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
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>
                    {t("completedWorkerOrders.workerName", "Worker Name")}
                  </th>
                  <th>
                    {t("completedWorkerOrders.workerRole", "Worker Role")}
                  </th>
                  <th>{t("orders.billNumber", "Bill Number")}</th>
                  <th>{t("common.customer", "Customer")}</th>
                  <th>{t("workerPanel.orderType", "Order Type")}</th>
                  <th>
                    {t(
                      "completedWorkerOrders.completionDate",
                      "Completion Date",
                    )}
                  </th>
                  <th>{t("common.status", "Status")}</th>
                  <th>
                    {t("completedWorkerOrders.paymentStatus", "Payment Status")}
                  </th>
                  <th>
                    {t("completedWorkerOrders.paymentAmount", "Payment Amount")}
                  </th>
                  <th>{t("common.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => {
                  const rowKey = getPaymentRowKey(order);
                  const isAlreadyPaid =
                    order.workerPaymentStatus === "PAID_TO_WORKER";
                  const paymentInputValue =
                    pendingPayments[rowKey] ??
                    (order.workerPaymentAmount != null
                      ? String(order.workerPaymentAmount)
                      : "");
                  const isHighlighted =
                    highlightOrderId && order.id === highlightOrderId;
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
                      <td>{order.assignedTo?.name || "-"}</td>
                      <td>
                        {order.workerRole ||
                          order.assignedTo?.accountType ||
                          "-"}
                      </td>
                      <td>#{order.customer?.billNumber || "-"}</td>
                      <td>
                        <div style={{ display: "grid", gap: 3 }}>
                          <strong style={{ color: "var(--text1)" }}>
                            {order.customer?.firstName || "-"}
                          </strong>
                          <span style={{ fontSize: 12, color: "var(--text3)" }}>
                            {order.customer?.phoneNumber || "-"}
                          </span>
                        </div>
                      </td>
                      <td>{getOrderDisplayName(order, language)}</td>
                      <td>
                        {formatDateLocale(
                          order.completedAt || order.updatedAt,
                          language,
                        )}
                      </td>
                      <td>
                        <Badge v="green">
                          {t("common.completed", "Completed")}
                        </Badge>
                      </td>
                      <td>{paymentBadge(order.workerPaymentStatus, t)}</td>
                      <td>
                        <div style={{ minWidth: 160 }}>
                          <input
                            className="inp"
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
                            disabled={isAlreadyPaid}
                            style={{ minWidth: 140 }}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-primary btn-sm payment-btn ${isAlreadyPaid ? "is-paid" : ""}`}
                          onClick={() => handleSavePayment(order)}
                          disabled={payWorkerMut.isPending || isAlreadyPaid}
                        >
                          <LuCircleDollarSign size={14} />
                          {isAlreadyPaid
                            ? t("completedWorkerOrders.paymentLocked", "Paid")
                            : t(
                                "completedWorkerOrders.savePayment",
                                "Save Payment",
                              )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          total={total}
          limit={LIMIT}
          onChange={(nextPage) => setPage(nextPage)}
        />
      </Card>

      <Modal
        open={!!confirmPayment}
        onClose={() => {
          if (payWorkerMut.isPending) return;
          setConfirmPayment(null);
        }}
        title={t(
          "completedWorkerOrders.confirmPaymentTitle",
          "Confirm Payment",
        )}
        maxW={500}
      >
        {confirmPayment && (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0, color: "var(--text2)", fontSize: 13 }}>
              {t(
                "completedWorkerOrders.confirmPaymentMessage",
                "This payment will be locked after confirmation and cannot be updated.",
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
                {confirmPayment.order.workerRole || "-"}
              </div>
              <div>
                <b>{t("orders.billNumber", "Bill Number")}:</b> #
                {confirmPayment.order.customer?.billNumber || "-"}
              </div>
              <div>
                <b>{t("common.customer", "Customer")}:</b>{" "}
                {confirmPayment.order.customer?.firstName || "-"}
              </div>
              <div>
                <b>{t("workerPanel.orderType", "Order Type")}:</b>{" "}
                {getOrderDisplayName(confirmPayment.order, language)}
              </div>
              <div>
                <b>
                  {t("completedWorkerOrders.paymentAmount", "Payment Amount")}:
                </b>{" "}
                {formatCurrency(confirmPayment.amount || 0, "en")}
              </div>
            </div>

            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
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
                className="btn btn-primary payment-btn-confirm"
                onClick={submitConfirmedPayment}
                disabled={payWorkerMut.isPending}
              >
                <LuCircleDollarSign size={14} />
                {payWorkerMut.isPending
                  ? t("common.loading", "Loading...")
                  : t(
                      "completedWorkerOrders.confirmPayment",
                      "Confirm Payment",
                    )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
