import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuWallet,
  LuReceipt,
  LuTrendingUp,
  LuCircleAlert,
  LuClipboardList,
  LuInbox,
  LuPlay,
  LuSquareCheck,
  LuBanknote,
  LuCalendarCheck,
  LuCheck,
  LuX,
  LuBell,
} from "react-icons/lu";
import api from "../lib/api.js";
import { formatCurrency } from "../lib/currency.js";
import { visiblePollInterval } from "../lib/queryPoll.js";
import {
  formatSystemDate,
  isRtlLanguage,
  normalizeLanguage,
} from "../lib/locale.js";
import { formatMonthYearLabel } from "../lib/months.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { useWorkerPanel } from "../context/WorkerPanelContext.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";

const ROLE_CONFIG = {
  DOKHT: {
    color: "#DB2777",
    labelKey: "workerPanel.dokhtLabel",
  },
  QICHIKAR: {
    color: "#D97706",
    labelKey: "workerPanel.qichikarLabel",
  },
};

function isWorkerCompletedForRole(order, accountType) {
  if (order?.isCompleted) return true;
  if (accountType === "QICHIKAR") {
    return Boolean(order?.qichikarCompletedAt || order?.dokhtCompletedAt);
  }
  if (accountType === "DOKHT") {
    return Boolean(order?.dokhtCompletedAt);
  }
  return Boolean(order?.dokhtCompletedAt || order?.qichikarCompletedAt);
}

function getRoleKeys(accountType) {
  if (accountType === "QICHIKAR") {
    return {
      assignedToId: "qichikarAssignedToId",
      assignedAt: "qichikarAssignedAt",
      receivedById: "qichikarReceivedById",
      inProgress: "qichikarInProgress",
    };
  }
  if (accountType === "DOKHT") {
    return {
      assignedToId: "dokhtAssignedToId",
      assignedAt: "dokhtAssignedAt",
      receivedById: "dokhtReceivedById",
      inProgress: "dokhtInProgress",
    };
  }
  return null;
}

function getRoleOrderState(order, accountType) {
  const keys = getRoleKeys(accountType);
  const assignedFallback =
    order?.assignedTo?.accountType === accountType ? order?.assignedToId : null;
  const receivedFallback =
    order?.receivedBy?.accountType === accountType ? order?.receivedById : null;

  return {
    assignedToId: keys
      ? (order?.[keys.assignedToId] ?? assignedFallback)
      : order?.assignedToId,
    assignedAt: keys
      ? (order?.[keys.assignedAt] ??
        (order?.assignedTo?.accountType === accountType
          ? order?.assignedAt
          : null))
      : order?.assignedAt,
    receivedById: keys
      ? (order?.[keys.receivedById] ?? receivedFallback)
      : order?.receivedById,
    inProgress: Boolean(
      keys
        ? (order?.[keys.inProgress] ?? order?.inProgress)
        : order?.inProgress,
    ),
  };
}

function removeOrderFromWorkerPayload(prev, orderId) {
  if (!prev) return prev;
  if (Array.isArray(prev)) {
    return prev.filter((order) => order?.id !== orderId);
  }
  if (Array.isArray(prev?.data)) {
    return {
      ...prev,
      data: prev.data.filter((order) => order?.id !== orderId),
    };
  }
  return prev;
}

function upsertOrderInWorkerPayload(prev, updatedOrder) {
  if (!prev || !updatedOrder?.id) return prev;
  if (Array.isArray(prev)) {
    const idx = prev.findIndex((order) => order?.id === updatedOrder.id);
    if (idx === -1) return [updatedOrder, ...prev];
    const next = [...prev];
    next[idx] = { ...next[idx], ...updatedOrder };
    return next;
  }
  if (Array.isArray(prev?.data)) {
    const idx = prev.data.findIndex((order) => order?.id === updatedOrder.id);
    if (idx === -1) {
      return { ...prev, data: [updatedOrder, ...prev.data] };
    }
    const nextData = [...prev.data];
    nextData[idx] = { ...nextData[idx], ...updatedOrder };
    return { ...prev, data: nextData };
  }
  return prev;
}

export default function WorkerDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { viewMonth, viewYear, setViewMonth, setViewYear } = useMonth();
  const { setTabs } = useWorkerPanel();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const normalizedLang = normalizeLanguage(language);
  const isRtl = isRtlLanguage(normalizedLang);
  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;
  const roleLabel = t(cfg.labelKey, {
    defaultValue: user?.accountType === "DOKHT" ? "Dokht" : "Qichikar",
  });
  const workerScope = [user?.id, user?.accountType];
  const [actionOrderId, setActionOrderId] = useState("");

  const { data: orderPayload, isLoading: ordersLoading } = useQuery({
    queryKey: ["worker-panel-orders", ...workerScope, viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/orders", {
          params: { limit: 100, month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
    enabled: Boolean(user?.id && user?.accountType),
    staleTime: 20_000,
    refetchInterval: visiblePollInterval(60_000),
  });

  const orders = Array.isArray(orderPayload)
    ? orderPayload
    : orderPayload?.data || [];

  const { data: workerMoneySummary } = useQuery({
    queryKey: [
      "worker-panel-transaction-summary",
      ...workerScope,
      viewMonth,
      viewYear,
    ],
    queryFn: () =>
      api
        .get("/transactions/me/summary", {
          params: { month: viewMonth, year: viewYear },
        })
        .then((r) => r.data),
    enabled: Boolean(user?.id && user?.accountType),
    staleTime: 15_000,
    refetchInterval: visiblePollInterval(45_000),
    refetchOnWindowFocus: true,
  });

  const { data: damagedPenaltyPayload } = useQuery({
    queryKey: ["worker-panel-damaged-penalties", ...workerScope],
    queryFn: () =>
      api
        .get("/damaged-clothes/my-penalties", {
          params: { page: 1, limit: 50 },
        })
        .then((r) => r.data),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    refetchInterval: visiblePollInterval(90_000),
  });

  const pendingAssignedOrders = useMemo(() => {
    const accountType = user?.accountType;
    const userId = user?.id;

    return orders.filter((order) => {
      if (isWorkerCompletedForRole(order, accountType)) return false;

      const roleState = getRoleOrderState(order, accountType);
      const assignedToCurrentUser = roleState.assignedToId === userId;
      const receivedByCurrentUser = roleState.receivedById === userId;
      const receivedByOtherUser =
        roleState.receivedById && roleState.receivedById !== userId;

      if (
        !assignedToCurrentUser ||
        receivedByCurrentUser ||
        receivedByOtherUser ||
        roleState.inProgress
      ) {
        return false;
      }

      return true;
    });
  }, [orders, user?.accountType, user?.id]);

  const stats = useMemo(() => {
    const accountType = user?.accountType;
    const userId = user?.id;
    return {
      all: orders.filter((order) => {
        const roleState = getRoleOrderState(order, accountType);
        return (
          isWorkerCompletedForRole(order, accountType) ||
          roleState.receivedById === userId
        );
      }).length,
      assigned: orders.filter((order) => {
        const roleState = getRoleOrderState(order, accountType);
        return (
          !isWorkerCompletedForRole(order, accountType) &&
          !roleState.inProgress &&
          roleState.receivedById === userId
        );
      }).length,
      inProgress: orders.filter((order) => {
        const roleState = getRoleOrderState(order, accountType);
        return (
          !isWorkerCompletedForRole(order, accountType) && roleState.inProgress
        );
      }).length,
      completed: orders.filter((order) =>
        isWorkerCompletedForRole(order, accountType),
      ).length,
    };
  }, [orders, user?.accountType, user?.id]);

  useEffect(() => {
    setTabs([
      {
        key: "all",
        label: t("workerPanel.allOrders", "All Orders"),
        count: stats.all,
      },
      {
        key: "assigned",
        label: t("workerPanel.statusAssigned", "Received"),
        count: stats.assigned,
      },
      {
        key: "inProgress",
        label: t("workerPanel.statusInProgress", "In Progress"),
        count: stats.inProgress,
      },
      {
        key: "completed",
        label: t("workerPanel.statusCompleted", "Completed"),
        count: stats.completed,
      },
      {
        key: "penalties",
        label: t("workerPanel.penaltyTab", "Penalty History"),
        count: damagedPenaltyPayload?.total || 0,
      },
    ]);
  }, [
    setTabs,
    stats.all,
    stats.assigned,
    stats.inProgress,
    stats.completed,
    damagedPenaltyPayload?.total,
    language,
  ]);

  const acceptMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/receive`).then((r) => r.data),
    onMutate: (id) => setActionOrderId(id),
    onSuccess: (updatedOrder) => {
      const receivedOrderMonth = Number(updatedOrder?.entryMonth);
      const receivedOrderYear = Number(updatedOrder?.entryYear);
      const hasOrderMonthContext =
        Number.isFinite(receivedOrderMonth) &&
        Number.isFinite(receivedOrderYear) &&
        receivedOrderMonth >= 1 &&
        receivedOrderMonth <= 12;

      if (
        hasOrderMonthContext &&
        (receivedOrderMonth !== Number(viewMonth) ||
          receivedOrderYear !== Number(viewYear))
      ) {
        setViewMonth(receivedOrderMonth);
        setViewYear(receivedOrderYear);
      }

      qc.setQueryData(
        ["worker-panel-orders", ...workerScope, viewMonth, viewYear],
        (prev) => upsertOrderInWorkerPayload(prev, updatedOrder),
      );
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
      toast.success(
        t(
          "workerPanel.orderReceivedAdminNotified",
          "Order received - Admin notified",
        ),
      );
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          t("workerPanel.failedReceiveOrder", "Failed to receive order"),
        ),
      );
    },
    onSettled: () => setActionOrderId(""),
  });

  const declineMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/decline`).then((r) => r.data),
    onMutate: (id) => setActionOrderId(id),
    onSuccess: (_data, orderId) => {
      qc.setQueryData(
        ["worker-panel-orders", ...workerScope, viewMonth, viewYear],
        (prev) => removeOrderFromWorkerPayload(prev, orderId),
      );
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
      toast.success(
        t(
          "workerPanel.orderDeclinedAdminNotified",
          "Order declined - Admin notified",
        ),
      );
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          t("workerPanel.failedDeclineOrder", "Failed to decline order"),
        ),
      );
    },
    onSettled: () => setActionOrderId(""),
  });

  const actionPending = acceptMut.isPending || declineMut.isPending;

  const totalLoanAmount = Number(workerMoneySummary?.loanTotal || 0);
  const damagePenaltyTotal = Number(
    workerMoneySummary?.damagePenaltyTotal || 0,
  );
  const totalCompletedPayments = Number(
    workerMoneySummary?.totalCompletedPaymentsGross ??
      workerMoneySummary?.totalCompletedPayments ??
      0,
  );
  const moneyReceiptTotal = Number(workerMoneySummary?.moneyReceiptTotal || 0);
  const currentMoney =
    moneyReceiptTotal - totalLoanAmount - damagePenaltyTotal;
  const penaltyCount = damagedPenaltyPayload?.total || 0;

  const monthLabel = formatMonthYearLabel(viewMonth, viewYear, language);

  return (
    <div
      className="worker-panel-page"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ textAlign: isRtl ? "right" : "left" }}
    >
      {pendingAssignedOrders.length > 0 && (
        <section className="wd-assigned">
          <div className="wd-assigned__head">
            <div className="wd-assigned__title-wrap">
              <span
                className="wd-assigned__icon"
                style={{ background: `${cfg.color}14`, color: cfg.color }}
              >
                <LuBell size={16} />
              </span>
              <div className="wd-assigned__titles">
                <h2 className="wd-assigned__title">
                  {t(
                    "workerPanel.adminAssignedSectionTitle",
                    "These orders were assigned to you by admin",
                  )}
                </h2>
                <p className="wd-assigned__subtitle">
                  {t(
                    "workerPanel.adminAssignedSectionHint",
                    "Accept to start, or decline to notify admin.",
                  )}
                </p>
              </div>
            </div>
            <span
              className="wd-assigned__count"
              style={{ background: cfg.color }}
            >
              {pendingAssignedOrders.length}
            </span>
          </div>

          <div className="wd-assigned__list">
            {pendingAssignedOrders.map((order) => {
              const orderLabel = getOrderLabelParts(order, language);
              const roleState = getRoleOrderState(order, user?.accountType);
              const assignedAt = roleState.assignedAt || order.assignedAt;
              const customerName =
                order.customer?.firstName ||
                getOrderPrimaryDisplayName(order, "-", language);
              const busy = actionPending && actionOrderId === order.id;

              return (
                <article key={order.id} className="wd-assigned-card">
                  <div className="wd-assigned-card__top">
                    <div className="wd-assigned-card__identity">
                      <span className="wd-assigned-card__bill">
                        #{order.customer?.billNumber || order.billNumber || "-"}
                      </span>
                      <span className="wd-assigned-badge wd-assigned-badge--new">
                        {t("workerPanel.statusNew", "New")}
                      </span>
                    </div>
                    {order.isEmergency && (
                      <span className="wd-assigned-badge wd-assigned-badge--priority">
                        {t("orders.emergencyBadge", "Emergency")}
                      </span>
                    )}
                  </div>

                  <div className="wd-assigned-card__grid">
                    <div className="wd-assigned-card__field">
                      <span className="wd-assigned-card__label">
                        {t("common.customer", "Customer")}
                      </span>
                      <strong className="wd-assigned-card__value">
                        {customerName}
                      </strong>
                    </div>
                    <div className="wd-assigned-card__field">
                      <span className="wd-assigned-card__label">
                        {t("assignment.clothesType", "Clothes type")}
                      </span>
                      <strong className="wd-assigned-card__value">
                        {orderLabel.typeWithSequenceLabel}
                      </strong>
                    </div>
                    <div className="wd-assigned-card__field">
                      <span className="wd-assigned-card__label">
                        {t("assignment.quantity", "Quantity")}
                      </span>
                      <strong className="wd-assigned-card__value">
                        {order.quantity || 1}
                      </strong>
                    </div>
                    <div className="wd-assigned-card__field">
                      <span className="wd-assigned-card__label">
                        {t("workerPanel.assignedDate", "Assigned date")}
                      </span>
                      <strong className="wd-assigned-card__value">
                        {assignedAt
                          ? formatSystemDate(assignedAt, language)
                          : "-"}
                      </strong>
                    </div>
                  </div>

                  {order.assignmentNote && (
                    <p className="wd-assigned-card__note">
                      {order.assignmentNote}
                    </p>
                  )}

                  <div className="wd-assigned-card__actions">
                    <button
                      type="button"
                      className="wd-assigned-btn wd-assigned-btn--accept"
                      style={{ background: cfg.color }}
                      disabled={actionPending}
                      onClick={() => acceptMut.mutate(order.id)}
                    >
                      <LuCheck size={15} strokeWidth={2.5} />
                      <span>
                        {busy && acceptMut.isPending
                          ? t("common.loading", "Loading...")
                          : t("workerPanel.accept", "Accept")}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="wd-assigned-btn wd-assigned-btn--decline"
                      disabled={actionPending}
                      onClick={() => declineMut.mutate(order.id)}
                    >
                      <LuX size={15} strokeWidth={2.5} />
                      <span>
                        {busy && declineMut.isPending
                          ? t("common.loading", "Loading...")
                          : t("workerPanel.decline", "Decline")}
                      </span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Welcome Section */}
      <section className="wd-welcome">
        <div className="wd-welcome__content">
          <div
            className="wd-welcome__icon-wrap"
            style={{ background: cfg.color + "14" }}
          >
            <div className="wd-welcome__icon" style={{ background: cfg.color }}>
              <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>
                {user?.name?.charAt(0) || "?"}
              </span>
            </div>
          </div>
          <div className="wd-welcome__text">
            <h1 className="wd-welcome__title">
              {t("workerPanel.greeting", "Welcome")},{" "}
              <span style={{ color: cfg.color }}>{user?.name || ""}</span>
            </h1>
            <p className="wd-welcome__sub">
              <span
                className="wd-welcome__role-pill"
                style={{
                  background: cfg.color + "14",
                  color: cfg.color,
                  borderColor: cfg.color + "30",
                }}
              >
                {roleLabel}
              </span>
              <span className="wd-welcome__sep">·</span>
              <LuCalendarCheck size={13} style={{ opacity: 0.5 }} />
              <span>{monthLabel}</span>
            </p>
          </div>
        </div>
        <div className="worker-panel-receive-trigger worker-panel-receive-trigger--dashboard">
          <button
            type="button"
            className="worker-panel-receive-trigger__btn"
            style={{ background: cfg.color }}
            onClick={() =>
              navigate("/panel/orders", {
                state: { openOrderReceiveModal: true },
              })
            }
          >
            <LuClipboardList size={18} />
            {t("workerPanel.receiveOrders", "Receive Orders")}
          </button>
        </div>
      </section>

      {/* Financial Stats - Primary */}
      <section className="wd-stats">
        <div className="wd-stats__primary">
          <div
            className={`wd-stat-card wd-stat-card--featured ${currentMoney >= 0 ? "wd-stat-card--positive" : "wd-stat-card--negative"}`}
          >
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background:
                    currentMoney >= 0
                      ? "linear-gradient(135deg, #dcfce7, #bbf7d0)"
                      : "linear-gradient(135deg, #ffe4e6, #fecdd3)",
                  color: currentMoney >= 0 ? "#15803d" : "#be123c",
                }}
              >
                <LuWallet size={22} />
              </div>
              <span className="wd-stat-card__trend wd-stat-card__trend--up">
                {monthLabel}
              </span>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t("workerPanel.currentMoney", "Current Balance")}
              </p>
              <p className="wd-stat-card__value">
                <AfCurrencyIcon size={20} />
                {formatCurrency(currentMoney, language)}
              </p>
            </div>
          </div>

          <div className="wd-stat-card wd-stat-card--featured wd-stat-card--success">
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                  color: "#15803d",
                }}
              >
                <LuReceipt size={22} />
              </div>
              <span className="wd-stat-card__trend wd-stat-card__trend--up">
                {monthLabel}
              </span>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t("workerPanel.moneyReceipt", "Received Money")}
              </p>
              <p className="wd-stat-card__value">
                <AfCurrencyIcon size={20} />
                {formatCurrency(moneyReceiptTotal, language)}
              </p>
            </div>
          </div>
        </div>

        <div className="wd-stats__secondary">
          <div className="wd-stat-card wd-stat-card--info">
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                  color: "#1d4ed8",
                }}
              >
                <LuTrendingUp size={20} />
              </div>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t(
                  "workerPanel.totalCompletedPayments",
                  "Total Completed Amount",
                )}
              </p>
              <p className="wd-stat-card__value">
                <AfCurrencyIcon size={16} />
                {formatCurrency(totalCompletedPayments, language)}
              </p>
            </div>
          </div>

          <div className="wd-stat-card wd-stat-card--warning">
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                  color: "#b45309",
                }}
              >
                <LuBanknote size={20} />
              </div>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t("workerPanel.loanTotal", "Total Debt")}
              </p>
              <p className="wd-stat-card__value">
                <AfCurrencyIcon size={16} />
                {formatCurrency(totalLoanAmount, language)}
              </p>
            </div>
          </div>

          <div className="wd-stat-card wd-stat-card--danger">
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background: "linear-gradient(135deg, #ffe4e6, #fecdd3)",
                  color: "#be123c",
                }}
              >
                <LuCircleAlert size={20} />
              </div>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t("workerPanel.totalPenaltyAmount", "Total Penalties")}
              </p>
              <p className="wd-stat-card__value">
                <AfCurrencyIcon size={16} />
                {formatCurrency(damagePenaltyTotal, language)}
              </p>
              {penaltyCount > 0 && (
                <p className="wd-stat-card__sub">
                  {penaltyCount} {t("workerPanel.totalPenalties", "penalties")}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="wd-stats__orders">
          <div className="wd-stat-card wd-stat-card--orders">
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
                  color: "#4338ca",
                }}
              >
                <LuClipboardList size={20} />
              </div>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t("workerPanel.totalOrders", "Total Orders")}
              </p>
              <p className="wd-stat-card__value wd-stat-card__value--count">
                {ordersLoading ? "—" : stats.all}
              </p>
            </div>
          </div>

          <div className="wd-stat-card wd-stat-card--orders">
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                  color: cfg.color,
                }}
              >
                <LuInbox size={20} />
              </div>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t("workerPanel.statusAssigned", "Received")}
              </p>
              <p className="wd-stat-card__value wd-stat-card__value--count">
                {ordersLoading ? "—" : stats.assigned}
              </p>
            </div>
          </div>

          <div className="wd-stat-card wd-stat-card--orders">
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
                  color: "#1d4ed8",
                }}
              >
                <LuPlay size={20} />
              </div>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t("workerPanel.statusInProgress", "In Progress")}
              </p>
              <p className="wd-stat-card__value wd-stat-card__value--count">
                {ordersLoading ? "—" : stats.inProgress}
              </p>
            </div>
          </div>

          <div className="wd-stat-card wd-stat-card--orders">
            <div className="wd-stat-card__head">
              <div
                className="wd-stat-card__icon"
                style={{
                  background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
                  color: "#15803d",
                }}
              >
                <LuSquareCheck size={20} />
              </div>
            </div>
            <div className="wd-stat-card__body">
              <p className="wd-stat-card__label">
                {t("workerPanel.statusCompleted", "Completed")}
              </p>
              <p className="wd-stat-card__value wd-stat-card__value--count">
                {ordersLoading ? "—" : stats.completed}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
