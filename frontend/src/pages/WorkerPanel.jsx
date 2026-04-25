import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuBell,
  LuCheck,
  LuCircleAlert,
  LuClipboardList,
  LuCircleDollarSign,
  LuEye,
  LuHash,
  LuPhone,
  LuPlay,
  LuSearch,
  LuSquareCheck,
  LuUser,
} from "react-icons/lu";
import api from "../lib/api.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import { formatUserNotificationMessage } from "../lib/notifications.js";
import { formatDateTimeLocale } from "../lib/locale.js";
import { useAuth } from "../context/AuthContext.jsx";
import { NotificationText } from "../components/ui/index.jsx";

const ROLE_CONFIG = {
  DOKHT: {
    color: "#DB2777",
    colorBg: "#DB277714",
    colorBd: "#DB277730",
    label: "Dokht",
  },
  QICHIKAR: {
    color: "#D97706",
    colorBg: "#D9770614",
    colorBd: "#D9770630",
    label: "Qichikar",
  },
};

const TYPE_COLORS = {
  OUTFIT: "#D97706",
  WASKAT: "#0D9488",
  KORTY: "#B45309",
  YAKHANQAQ: "#DC2626",
};

const NUM_LABELS = {
  height: "Height",
  shoulder: "Shoulder",
  sleeve: "Sleeve",
  neck: "Neck",
  chest: "Chest",
  armpit: "Armpit",
  waist: "Waist",
  skirt: "Skirt",
  tenban: "Tenban",
  pantLeg: "Pant Leg",
  arm: "Arm",
  calf: "Calf",
  sorain: "Sorain",
  patlonHeight: "Patlon H.",
  kamerPatlon: "Kamer",
  doroBaghlePatlon: "Doro Baghle",
  sorainPatlon: "Sorain P.",
  patPatlon: "Pat Patlon",
  pachaPatlon: "Pacha",
};

const STYLE_LABELS = {
  neckStyle: "Neck Style",
  sleeveStyle: "Sleeve Style",
  sleeveSize: "Sleeve Size",
  skirtStyle: "Skirt Style",
  waskatStyle: "Style",
  shoulderState: "Shoulder State",
  outfitDesign: "Design",
  outfitStyle: "Style",
  buttonStyle: "Buttons",
  pantStyle: "Pants",
  style: "Style",
  yakhanQaqDesign: "Design",
  additionalStyleInfo: "Notes",
};

const BOOL_LABELS = {
  frontPocket: "Front Pocket",
  sidePocket: "Side Pocket",
  underPocket: "Under Pocket",
};

function getMeasure(order) {
  return (
    order?.outfit || order?.waskat || order?.korty || order?.yakhanQaq || {}
  );
}

function getRoleKeys(accountType) {
  if (accountType === "QICHIKAR") {
    return {
      assignedToId: "qichikarAssignedToId",
      receivedById: "qichikarReceivedById",
      receivedAt: "qichikarReceivedAt",
      inProgress: "qichikarInProgress",
    };
  }
  if (accountType === "DOKHT") {
    return {
      assignedToId: "dokhtAssignedToId",
      receivedById: "dokhtReceivedById",
      receivedAt: "dokhtReceivedAt",
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
    receivedById: keys
      ? (order?.[keys.receivedById] ?? receivedFallback)
      : order?.receivedById,
    receivedAt: keys
      ? (order?.[keys.receivedAt] ?? order?.receivedAt)
      : order?.receivedAt,
    inProgress: Boolean(
      keys
        ? (order?.[keys.inProgress] ?? order?.inProgress)
        : order?.inProgress,
    ),
  };
}

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

function getStatus(order, accountType) {
  if (isWorkerCompletedForRole(order, accountType)) return "completed";
  if (getRoleOrderState(order, accountType).inProgress) return "inProgress";
  return "assigned";
}

function statusColor(status) {
  if (status === "completed") return "#DC2626";
  if (status === "inProgress") return "#2563EB";
  return "#D97706";
}

function statusLabel(status, t) {
  if (status === "completed") {
    return t("workerPanel.statusCompleted", "Completed");
  }
  if (status === "inProgress") {
    return t("workerPanel.statusInProgress", "In Progress");
  }
  return t("workerPanel.statusAssigned", "Assigned");
}

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function getRolePaymentState(order, accountType) {
  if (accountType === "DOKHT") {
    return {
      status: order?.dokhtPaymentStatus ?? order?.workerPaymentStatus,
      amount: order?.dokhtPaymentAmount ?? order?.workerPaymentAmount ?? 0,
      paidAt: order?.dokhtPaidAt ?? order?.workerPaidAt,
    };
  }
  if (accountType === "QICHIKAR") {
    return {
      status: order?.qichikarPaymentStatus ?? order?.workerPaymentStatus,
      amount: order?.qichikarPaymentAmount ?? order?.workerPaymentAmount ?? 0,
      paidAt: order?.qichikarPaidAt ?? order?.workerPaidAt,
    };
  }
  return {
    status: order?.workerPaymentStatus,
    amount: order?.workerPaymentAmount ?? 0,
    paidAt: order?.workerPaidAt,
  };
}

function getVisibleSearchOrders(searchResult, userId, accountType) {
  if (!Array.isArray(searchResult?.orders)) return [];

  return searchResult.orders.filter((order) => {
    const roleState = getRoleOrderState(order, accountType);

    // Prevent same-role workers from seeing an order claimed/assigned by another worker.
    if (roleState.assignedToId && roleState.assignedToId !== userId) {
      return false;
    }
    if (roleState.receivedById && roleState.receivedById !== userId) {
      return false;
    }

    // Dokht can only see after Qichikar completion.
    if (accountType === "DOKHT" && !order?.qichikarCompletedAt) {
      return false;
    }

    return true;
  });
}

function upsertOrderInWorkerPayload(previousPayload, nextOrder) {
  if (!nextOrder?.id) return previousPayload;

  if (Array.isArray(previousPayload)) {
    const next = previousPayload.slice();
    const index = next.findIndex((item) => item?.id === nextOrder.id);
    if (index >= 0) {
      next[index] = { ...next[index], ...nextOrder };
      return next;
    }
    return [nextOrder, ...next];
  }

  const existing = Array.isArray(previousPayload?.data)
    ? previousPayload.data
    : [];
  const index = existing.findIndex((item) => item?.id === nextOrder.id);
  const data = index >= 0 ? existing.slice() : [nextOrder, ...existing];

  if (index >= 0) {
    data[index] = { ...data[index], ...nextOrder };
  }

  return {
    ...(previousPayload || {}),
    data,
  };
}

function ConfirmActionModal({ config, pending, onClose, onConfirm }) {
  if (!config) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 18,
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
          {config.title}
        </h3>
        <p
          style={{ margin: "10px 0 14px", color: "var(--text2)", fontSize: 13 }}
        >
          {config.message}
        </p>
        {config.preview && (
          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              borderRadius: 8,
              padding: 10,
              display: "grid",
              gap: 6,
              fontSize: 13,
            }}
          >
            {config.preview}
          </div>
        )}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={pending}
          >
            {config.cancelLabel}
          </button>
          <button
            className="btn btn-gold"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? config.pendingLabel : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, language, t, onClose }) {
  if (!order) return null;
  const payment = getRolePaymentState(order, order?.assignedTo?.accountType);
  const measure = getMeasure(order);
  const paidToWorker = payment.status === "PAID_TO_WORKER";
  const priceValue = paidToWorker
    ? Number(payment.amount || 0)
    : order?.assignmentPrice != null
      ? Number(order.assignmentPrice)
      : 0;
  const measurementRows = Object.entries(NUM_LABELS).filter(
    ([key]) => measure[key] != null,
  );
  const styleRows = Object.entries(STYLE_LABELS).filter(
    ([key]) => measure[key],
  );
  const booleanRows = Object.entries(BOOL_LABELS).filter(
    ([key]) => measure[key] === true,
  );

  const tableWrapStyle = {
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
    background: "var(--surface)",
  };

  const thStyle = {
    fontSize: 11,
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: ".04em",
    textAlign: "left",
    padding: "9px 10px",
    background: "var(--surface2)",
    borderBottom: "1px solid var(--border)",
  };

  const tdStyle = {
    fontSize: 13,
    color: "var(--text1)",
    padding: "9px 10px",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 18,
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 10 }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
              {order.customer?.firstName || "-"}
            </h3>
            <p
              style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text3)" }}
            >
              #{order.customer?.billNumber || "-"} -{" "}
              {getOrderTypeLabel(order.type, language)}
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={tableWrapStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("workerPanel.price", "Price")}</th>
                  <th style={thStyle}>
                    {t("workerPanel.updatedOn", "Updated")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, borderBottom: "none" }}>
                    ${priceValue.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, borderBottom: "none" }}>
                    {fmtDate(payment.paidAt || order.updatedAt)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text3)",
              marginBottom: 8,
            }}
          >
            {t("createOrder.rakhtSelection", {
              defaultValue: "Rakht Selection",
            })}
          </p>
          <div style={tableWrapStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("common.field", "Field")}</th>
                  <th style={thStyle}>{t("common.value", "Value")}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    t("rakht.brandName", { defaultValue: "Brand" }),
                    order?.rakhtBrandName || "-",
                  ],
                  [
                    t("rakht.color", { defaultValue: "Color" }),
                    order?.rakhtColor || "-",
                  ],
                  [
                    t("rakht.requiredMeters", {
                      defaultValue: "Required Meters",
                    }),
                    order?.rakhtRequiredMeters != null
                      ? Number(order.rakhtRequiredMeters).toFixed(2)
                      : "-",
                  ],
                ].map(([field, value], index, arr) => (
                  <tr key={field}>
                    <td style={tdStyle}>{field}</td>
                    <td
                      style={{
                        ...tdStyle,
                        borderBottom:
                          index === arr.length - 1
                            ? "none"
                            : tdStyle.borderBottom,
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text3)",
              marginBottom: 8,
            }}
          >
            {t("createOrder.measurements", "Measurements")}
          </p>
          <div style={tableWrapStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("common.field", "Field")}</th>
                  <th style={thStyle}>{t("common.value", "Value")}</th>
                </tr>
              </thead>
              <tbody>
                {measurementRows.length ? (
                  measurementRows.map(([key, label], index) => (
                    <tr key={key}>
                      <td style={tdStyle}>{label}</td>
                      <td
                        style={{
                          ...tdStyle,
                          borderBottom:
                            index === measurementRows.length - 1
                              ? "none"
                              : tdStyle.borderBottom,
                        }}
                      >
                        {measure[key]}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      style={{ ...tdStyle, borderBottom: "none" }}
                      colSpan={2}
                    >
                      -
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text3)",
              marginBottom: 8,
            }}
          >
            {t("createOrder.styleOptions", "Styling Details")}
          </p>
          <div style={tableWrapStyle}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("common.field", "Field")}</th>
                  <th style={thStyle}>{t("common.value", "Value")}</th>
                </tr>
              </thead>
              <tbody>
                {[...styleRows, ...booleanRows].length ? (
                  [...styleRows, ...booleanRows].map(
                    ([key, label], index, arr) => (
                      <tr key={key}>
                        <td style={tdStyle}>{label}</td>
                        <td
                          style={{
                            ...tdStyle,
                            borderBottom:
                              index === arr.length - 1
                                ? "none"
                                : tdStyle.borderBottom,
                          }}
                        >
                          {measure[key] === true
                            ? t("common.yes", "Yes")
                            : measure[key]}
                        </td>
                      </tr>
                    ),
                  )
                ) : (
                  <tr>
                    <td
                      style={{ ...tdStyle, borderBottom: "none" }}
                      colSpan={2}
                    >
                      -
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkerPanel() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;
  const workerScope = [user?.id, user?.accountType];

  const [activeTab, setActiveTab] = useState("all");
  const [billSearch, setBillSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearchAttempt, setHasSearchAttempt] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [optimisticInProgressIds, setOptimisticInProgressIds] = useState([]);
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState([]);

  const { data: orderPayload, isLoading } = useQuery({
    queryKey: ["worker-panel-orders", ...workerScope],
    queryFn: () =>
      api.get("/orders", { params: { limit: 200 } }).then((r) => r.data),
    enabled: Boolean(user?.id && user?.accountType),
    refetchInterval: 30000,
  });

  const orders = Array.isArray(orderPayload)
    ? orderPayload
    : orderPayload?.data || [];

  const { data: allNotifs = [] } = useQuery({
    queryKey: ["worker-panel-notifs", ...workerScope],
    queryFn: () => api.get("/users/me/notifications").then((r) => r.data),
    enabled: Boolean(user?.id && user?.accountType),
    refetchInterval: 30000,
  });

  const { data: workerMoneySummary } = useQuery({
    queryKey: ["worker-panel-transaction-summary", ...workerScope],
    queryFn: () => api.get("/transactions/me/summary").then((r) => r.data),
    enabled: Boolean(user?.id && user?.accountType),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const unreadNotifs = allNotifs.filter((n) => !n.isRead);

  const readAllMut = useMutation({
    mutationFn: () => api.patch("/users/me/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-panel-notifs"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-dropdown"] });
    },
  });

  const readOneMut = useMutation({
    mutationFn: (id) => api.patch(`/users/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-panel-notifs"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-dropdown"] });
    },
  });

  const receiveMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/receive`).then((r) => r.data),
    onSuccess: (updatedOrder) => {
      qc.setQueryData(["worker-panel-orders", ...workerScope], (prev) =>
        upsertOrderInWorkerPayload(prev, updatedOrder),
      );
      qc.setQueryData(["worker-panel-notifs", ...workerScope], (prev = []) =>
        Array.isArray(prev)
          ? prev.map((notif) =>
              notif?.orderId === updatedOrder?.id
                ? { ...notif, isRead: true }
                : notif,
            )
          : prev,
      );
      qc.setQueryData(
        ["worker-notifs-dropdown", ...workerScope],
        (prev = []) =>
          Array.isArray(prev)
            ? prev.filter((notif) => notif?.orderId !== updatedOrder?.id)
            : prev,
      );
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      qc.invalidateQueries({ queryKey: ["worker-panel-notifs"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-count"] });
      qc.invalidateQueries({ queryKey: ["worker-notifs-dropdown"] });
      setActiveTab("assigned");
      toast.success(
        t(
          "workerPanel.orderReceivedAdminNotified",
          "Order received - Admin notified",
        ),
      );
      refreshSearchResult();
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          t("workerPanel.failedReceiveOrder", "Failed to receive order"),
        ),
      );
    },
  });

  const progressMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/progress`).then((r) => r.data),
    onSuccess: (updated, id) => {
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      toast.success(
        t(
          "workerPanel.statusUpdatedAdminNotified",
          "Status updated - Admin notified",
        ),
      );
      setOptimisticInProgressIds((prev) => prev.filter((item) => item !== id));
      if (updated?.inProgress) setActiveTab("inProgress");
      refreshSearchResult();
      setConfirmAction(null);
    },
    onError: (error, id) => {
      setOptimisticInProgressIds((prev) => prev.filter((item) => item !== id));
      toast.error(
        getApiErrorMessage(
          error,
          t("workerPanel.failedUpdateStatus", "Failed to update status"),
        ),
      );
    },
  });

  const completeMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/complete`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      toast.success(
        t(
          "workerPanel.orderCompletedAdminNotified",
          "Order completed - Admin notified",
        ),
      );
      setActiveTab("completed");
      refreshSearchResult();
      setConfirmAction(null);
      setOptimisticCompletedIds([]);
    },
    onError: (error) => {
      setOptimisticCompletedIds([]);
      toast.error(
        getApiErrorMessage(
          error,
          t("workerPanel.failedCompleteOrder", "Failed to complete order"),
        ),
      );
    },
  });

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
      assigned: orders.filter(
        (order) =>
          !isWorkerCompletedForRole(order, accountType) &&
          !getRoleOrderState(order, accountType).inProgress &&
          getRoleOrderState(order, accountType).receivedById === userId,
      ).length,
      inProgress: orders.filter(
        (order) =>
          !isWorkerCompletedForRole(order, accountType) &&
          getRoleOrderState(order, accountType).inProgress,
      ).length,
      completed: orders.filter((order) =>
        isWorkerCompletedForRole(order, accountType),
      ).length,
    };
  }, [orders, user?.accountType]);

  const totalLoanAmount = Number(workerMoneySummary?.loanTotal || 0);
  const totalCompletedPayments = Number(
    workerMoneySummary?.totalCompletedPayments || 0,
  );
  const currentMoney = totalCompletedPayments - totalLoanAmount;

  const newAssignedOrders = useMemo(() => {
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
        receivedByOtherUser
      )
        return false;

      return !roleState.inProgress;
    });
  }, [orders, user?.accountType, user?.id]);

  const filteredOrders = useMemo(() => {
    const accountType = user?.accountType;
    if (activeTab === "assigned")
      return orders.filter(
        (order) =>
          !isWorkerCompletedForRole(order, accountType) &&
          !getRoleOrderState(order, accountType).inProgress &&
          getRoleOrderState(order, accountType).receivedById === user?.id &&
          !optimisticInProgressIds.includes(order.id) &&
          !optimisticCompletedIds.includes(order.id),
      );
    if (activeTab === "inProgress")
      return orders.filter(
        (order) =>
          !isWorkerCompletedForRole(order, accountType) &&
          (getRoleOrderState(order, accountType).inProgress ||
            optimisticInProgressIds.includes(order.id)) &&
          !optimisticCompletedIds.includes(order.id),
      );
    if (activeTab === "completed")
      return orders.filter(
        (order) =>
          isWorkerCompletedForRole(order, accountType) ||
          optimisticCompletedIds.includes(order.id),
      );
    return orders.filter((order) => {
      const roleState = getRoleOrderState(order, accountType);
      return (
        isWorkerCompletedForRole(order, accountType) ||
        roleState.receivedById === user?.id ||
        optimisticInProgressIds.includes(order.id) ||
        optimisticCompletedIds.includes(order.id)
      );
    });
  }, [
    activeTab,
    optimisticCompletedIds,
    optimisticInProgressIds,
    orders,
    user?.accountType,
    user?.id,
  ]);

  const canOrderBeReceived = (order) => {
    if (isWorkerCompletedForRole(order, user?.accountType)) return false;

    // Dokht can only receive an order after Qichikar has completed their part.
    if (user?.accountType === "DOKHT" && !order?.qichikarCompletedAt) {
      return false;
    }

    const roleState = getRoleOrderState(order, user?.accountType);

    const receivedBySameRoleOtherUser =
      roleState.receivedById && roleState.receivedById !== user?.id;

    if (receivedBySameRoleOtherUser) {
      return false;
    }

    if (!roleState.assignedToId || roleState.assignedToId === user?.id)
      return true;

    return false;
  };

  const getAssignmentBlockReason = (order) => {
    // Dokht-specific: Qichikar must complete first.
    if (user?.accountType === "DOKHT" && !order?.qichikarCompletedAt) {
      return t(
        "workerPanel.waitingForQichikar",
        "Waiting for Qichikar (cutting) to complete first",
      );
    }

    const roleState = getRoleOrderState(order, user?.accountType);

    if (roleState.receivedById && roleState.receivedById !== user?.id) {
      return t(
        "workerPanel.sameRoleClaimConflict",
        "this order already receive by someone else try another",
      );
    }
    if (roleState.assignedToId && roleState.assignedToId !== user?.id) {
      return t(
        "workerPanel.sameRoleClaimConflict",
        "this order already receive by someone else try another",
      );
    }
    return null;
  };

  const tabs = [
    {
      key: "all",
      label: t("workerPanel.allOrders", "All Orders"),
      count: stats.all,
    },
    {
      key: "assigned",
      label: t("workerPanel.statusAssigned", "Assigned"),
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
  ];

  const refreshSearchResult = async () => {
    if (!searchResult?.customer || !billSearch.trim()) return;
    const parsed = parseNumberLocale(billSearch.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    try {
      const { data } = await api.get("/orders/lookup", {
        params: { billNumber: Math.trunc(parsed) },
      });
      const visibleOrders = getVisibleSearchOrders(
        data,
        user?.id,
        user?.accountType,
      );
      setSearchResult({ ...data, orders: visibleOrders });
    } catch {
      // keep previous search payload if refresh fails
    }
  };

  const onSearch = async () => {
    const parsed = parseNumberLocale(billSearch.trim());
    setHasSearchAttempt(true);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(
        t("assignment.invalidBillNumber", "Enter a valid bill number."),
      );
      return;
    }

    setSearchLoading(true);
    try {
      const { data } = await api.get("/orders/lookup", {
        params: { billNumber: Math.trunc(parsed) },
      });
      const visibleOrders = getVisibleSearchOrders(
        data,
        user?.id,
        user?.accountType,
      );
      setSearchResult({ ...data, orders: visibleOrders });
      toast.success(t("createOrder.customerFound", "Customer found"));
    } catch (error) {
      setSearchResult(null);
      toast.error(
        getApiErrorMessage(
          error,
          t("assignment.noOrdersFound", "No orders found for this bill."),
        ),
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const openConfirm = (type, order) => {
    setConfirmAction({ type, order });
  };

  const runAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "receive") {
      receiveMut.mutate(confirmAction.order.id);
      return;
    }
    if (confirmAction.type === "start") {
      const { order } = confirmAction;
      const receivedByCurrentUser =
        getRoleOrderState(order, user?.accountType).receivedById === user?.id;
      if (!receivedByCurrentUser && canOrderBeReceived(order)) {
        try {
          await receiveMut.mutateAsync(order.id);
          setOptimisticInProgressIds((prev) =>
            prev.includes(order.id) ? prev : [...prev, order.id],
          );
          await progressMut.mutateAsync(order.id);
        } catch {
          // errors are handled in mutation callbacks
        }
        return;
      }
      setOptimisticInProgressIds((prev) =>
        prev.includes(order.id) ? prev : [...prev, order.id],
      );
      progressMut.mutate(order.id);
      return;
    }
    if (confirmAction.type === "complete") {
      setOptimisticCompletedIds([confirmAction.order.id]);
      setActiveTab("completed");
      completeMut.mutate(confirmAction.order.id);
    }
  };

  const pendingAction =
    receiveMut.isPending || progressMut.isPending || completeMut.isPending;

  const confirmConfig = useMemo(() => {
    if (!confirmAction?.order) return null;
    const { order } = confirmAction;
    if (confirmAction.type === "receive") {
      return {
        title: t("workerPanel.receiveOrder", "Receive Order"),
        message: t(
          "workerPanel.receiveOrderConfirmMsg",
          "Receive this order to add it to your Assigned tab. Admin will be notified.",
        ),
        confirmLabel: t("workerPanel.receive", "Receive"),
        pendingLabel: t("workerPanel.processing", "Processing..."),
        cancelLabel: t("common.cancel", "Cancel"),
      };
    }
    if (confirmAction.type === "start") {
      const receivedByCurrentUser =
        getRoleOrderState(order, user?.accountType).receivedById === user?.id;
      return {
        title: t("workerPanel.startWork", "Start Work"),
        message: receivedByCurrentUser
          ? t(
              "workerPanel.workflowReceivedByYou",
              "This order is in your active workflow.",
            )
          : t(
              "workerPanel.searchOrderReceiveHint",
              "Starting work will first receive this order and notify admin.",
            ),
        confirmLabel: t("workerPanel.startWork", "Start Work"),
        pendingLabel: t("workerPanel.processing", "Processing..."),
        cancelLabel: t("common.cancel", "Cancel"),
      };
    }
    return {
      title: t("workerPanel.confirmCompletion", "Confirm Completion"),
      message: t(
        "workerPanel.confirmNotifyAdmin",
        "The following notification will be sent to Admin upon confirmation:",
      ),
      confirmLabel: t("workerPanel.confirm", "Confirm"),
      pendingLabel: t("workerPanel.processing", "Processing..."),
      cancelLabel: t("common.cancel", "Cancel"),
      preview: (
        <>
          <div>
            <b>{t("workerPanel.worker", "Worker")}:</b> {user?.name || "-"}
          </div>
          <div>
            <b>{t("orders.billNumber", "Bill Number")}:</b>{" "}
            {order.customer?.billNumber || "-"}
          </div>
          <div>
            <b>{t("workerPanel.orderType", "Order Type")}:</b>{" "}
            {getOrderTypeLabel(order.type, language)}
          </div>
          <div>
            <b>{t("common.customer", "Customer")}:</b>{" "}
            {order.customer?.firstName || "-"}
          </div>
          <div style={{ color: "#15803d", fontWeight: 700 }}>
            {t(
              "workerPanel.completedSuccess",
              "This order has been completed successfully",
            )}
          </div>
        </>
      ),
    };
  }, [confirmAction, language, t, user?.name]);

  const renderOrderCard = (order, source = "list") => {
    const status = getStatus(order, user?.accountType);
    const isCompleted =
      isWorkerCompletedForRole(order, user?.accountType) ||
      optimisticCompletedIds.includes(order.id);
    const roleState = getRoleOrderState(order, user?.accountType);
    const isInProgress =
      roleState.inProgress || optimisticInProgressIds.includes(order.id);
    const sColor = statusColor(status);
    const receivedByCurrentUser = roleState.receivedById === user?.id;
    const canReceive = canOrderBeReceived(order);
    const canStart = !isCompleted && receivedByCurrentUser && !isInProgress;
    const canComplete = !isCompleted && receivedByCurrentUser && isInProgress;
    const typeColor = TYPE_COLORS[order.type] || cfg.color;
    const payment = getRolePaymentState(order, user?.accountType);
    const paidToWorker = payment.status === "PAID_TO_WORKER";

    return (
      <div
        key={`${source}-${order.id}`}
        className="card"
        style={{ padding: 14, display: "grid", gap: 10 }}
      >
        {/* ── Card header: badge + customer info ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span
            className="badge"
            style={{
              background: `${typeColor}18`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
              flexShrink: 0,
            }}
          >
            {getOrderTypeLabel(order.type, language)}
          </span>
          {order.orderName && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text3)",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {order.orderName}
            </div>
          )}
        </div>

        {/* ── Customer identity block ── */}
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text1)" }}>
            {order.customer?.firstName || "-"}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text3)",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span>#{order.customer?.billNumber || "-"}</span>
            {order.customer?.phoneNumber && (
              <span>{order.customer.phoneNumber}</span>
            )}
          </div>
        </div>

        {(order?.rakhtBrandName || order?.rakhtColor) && (
          <div className="order-mobile-rakht">
            <span className="order-rakht-chip order-rakht-chip--brand">
              {order.rakhtBrandName || "-"}
            </span>
            <span className="order-rakht-chip order-rakht-chip--color">
              {order.rakhtColor || "-"}
            </span>
            {order?.rakhtRequiredMeters != null && (
              <span className="order-rakht-chip order-rakht-chip--meters">
                {Number(order.rakhtRequiredMeters).toFixed(2)}m
              </span>
            )}
          </div>
        )}

        {/* ── Assignment / received info ── */}
        {receivedByCurrentUser && roleState.receivedAt ? (
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {t("workerPanel.receivedOn", "Received on")}:{" "}
            {fmtDate(roleState.receivedAt)}
          </div>
        ) : (
          order.assignedBy && (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {t("workerPanel.assignedBy", "Assigned by")}:{" "}
              {order.assignedBy.name} {t("workerPanel.on", "on")}{" "}
              {fmtDate(order.assignedAt)}
            </div>
          )
        )}

        {/* ── Price row ── */}
        <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>
          {t("workerPanel.price", "Price")}:{" "}
          <span
            style={{
              color: paidToWorker ? "#15803d" : "var(--text1)",
            }}
          >
            {paidToWorker
              ? `$${Number(payment.amount || 0).toLocaleString()}`
              : order.assignmentPrice != null
                ? `$${Number(order.assignmentPrice).toLocaleString()}`
                : "-"}
          </span>
          {!paidToWorker && order.assignmentPrice != null && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text3)",
                marginLeft: 4,
                fontWeight: 400,
              }}
            >
              ({t("workerPanel.assignedPrice", "assigned")})
            </span>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 8,
          }}
        >
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setDetailOrder(order)}
            style={{ gridColumn: "1 / -1" }}
          >
            <LuEye size={13} /> {t("workerPanel.view", "View")}
          </button>

          <button
            className="btn btn-outline btn-sm"
            style={{ gridColumn: "1 / -1" }}
            onClick={() => {
              if (isCompleted) return;
              openConfirm("start", order);
            }}
            disabled={
              isCompleted ||
              pendingAction ||
              (receivedByCurrentUser ? !canStart : !canReceive)
            }
            title={
              !receivedByCurrentUser && !canReceive
                ? t(
                    "workerPanel.receivedByLabel",
                    "Order already received by {{name}}",
                    {
                      name:
                        order.receivedBy?.name ||
                        t("workerPanel.anotherWorker", "another worker"),
                    },
                  )
                : ""
            }
          >
            {!receivedByCurrentUser && canReceive ? (
              <LuCheck size={13} />
            ) : (
              <LuPlay size={13} />
            )}
            {!receivedByCurrentUser && canReceive
              ? t("workerPanel.startWork", "Start Work")
              : t("workerPanel.startWork", "Start Work")}
          </button>

          <button
            className="btn btn-sm"
            style={
              isCompleted
                ? {
                    gridColumn: "1 / -1",
                    background: "#DC2626",
                    color: "#fff",
                    border: "1px solid #B91C1C",
                    cursor: "not-allowed",
                    opacity: 0.95,
                  }
                : { gridColumn: "1 / -1" }
            }
            onClick={() => {
              if (isCompleted) return;
              openConfirm("complete", order);
            }}
            disabled={isCompleted || !canComplete || pendingAction}
            title={
              isCompleted
                ? t("workerPanel.statusCompleted", "Completed")
                : undefined
            }
          >
            <LuSquareCheck size={13} />{" "}
            {isCompleted
              ? t("workerPanel.statusCompleted", "Completed")
              : t("workerPanel.complete", "Complete")}
          </button>
        </div>
      </div>
    );
  };

  const renderSearchResultCard = (order) => {
    const receivedByCurrentUser =
      getRoleOrderState(order, user?.accountType).receivedById === user?.id;
    const canReceive = canOrderBeReceived(order);

    return (
      <div
        key={`search-compact-${order.id}`}
        className="card"
        style={{ padding: 12, display: "grid", gap: 10 }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>
            {t("common.customer", "Customer")}:{" "}
            {order.customer?.firstName || "-"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>
            {t("orders.billNumber", "Bill Number")}: #
            {order.customer?.billNumber || "-"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>
            {t("workerPanel.orderType", "Order Type")}:{" "}
            {getOrderTypeLabel(order.type, language)}
          </div>
          {(order?.rakhtBrandName || order?.rakhtColor) && (
            <div className="order-mobile-rakht">
              <span className="order-rakht-chip order-rakht-chip--brand">
                {order.rakhtBrandName || "-"}
              </span>
              <span className="order-rakht-chip order-rakht-chip--color">
                {order.rakhtColor || "-"}
              </span>
              {order?.rakhtRequiredMeters != null && (
                <span className="order-rakht-chip order-rakht-chip--meters">
                  {Number(order.rakhtRequiredMeters).toFixed(2)}m
                </span>
              )}
            </div>
          )}
        </div>

        {receivedByCurrentUser ? (
          <div
            style={{
              fontSize: 12,
              color: "#166534",
              background: "#DCFCE7",
              border: "1px solid #86EFAC",
              borderRadius: 8,
              padding: "8px 10px",
              fontWeight: 600,
            }}
          >
            {t(
              "workerPanel.searchOrderReceivedHint",
              "This order is already in your panel.",
            )}
          </div>
        ) : canReceive ? (
          <button
            className="btn btn-gold btn-sm"
            style={{ width: "100%" }}
            onClick={() => openConfirm("receive", order)}
            disabled={pendingAction}
          >
            <LuCheck size={13} />{" "}
            {t("workerPanel.receiveOrder", "Receive Order")}
          </button>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: "#92400E",
              background: "#FEF3C7",
              border: "1px solid #FCD34D",
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            {getAssignmentBlockReason(order) ??
              t(
                "workerPanel.cannotReceiveOrder",
                "You cannot receive this order.",
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div className="card" style={{ padding: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text1)",
              }}
            >
              {t("workerPanel.greeting", "Welcome")} {user?.name || ""}
            </h1>
            <p
              style={{ margin: "7px 0 0", color: "var(--text3)", fontSize: 13 }}
            >
              {cfg.label} - {t("workerPanel.allOrders", "All Orders")}:{" "}
              {stats.all}
            </p>
          </div>
          <span
            className="badge"
            style={{
              alignSelf: "start",
              background: `${cfg.color}14`,
              color: cfg.color,
              border: `1px solid ${cfg.color}30`,
            }}
          >
            {cfg.label}
          </span>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 10,
          }}
        >
          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              borderRadius: 10,
              padding: "10px 12px",
              display: "grid",
              gap: 4,
            }}
          >
            <div
              style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}
            >
              {t(
                "workerPanel.totalCompletedPayments",
                "Total Money from Completed Orders",
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#2563EB",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              <LuCircleDollarSign size={18} />$
              {totalCompletedPayments.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface2)",
              borderRadius: 10,
              padding: "10px 12px",
              display: "grid",
              gap: 4,
            }}
          >
            <div
              style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}
            >
              {t("workerPanel.loanTotal", "Loan Total")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#B45309",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              <LuCircleDollarSign size={18} />$
              {totalLoanAmount.toLocaleString()}
            </div>
          </div>

          <div
            style={{
              border: `1px solid ${currentMoney >= 0 ? "#86EFAC" : "#FCA5A5"}`,
              background: currentMoney >= 0 ? "#F0FDF4" : "#FEF2F2",
              borderRadius: 10,
              padding: "10px 12px",
              display: "grid",
              gap: 4,
            }}
          >
            <div
              style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}
            >
              {t("workerPanel.currentMoney", "Current Money")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: currentMoney >= 0 ? "#15803D" : "#DC2626",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              <LuCircleDollarSign size={18} />${currentMoney.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div
          style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr auto" }}
        >
          <div>
            <label className="lbl">
              {t("orders.billNumber", "Bill Number")}
            </label>
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
                style={{ paddingLeft: 32 }}
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                placeholder={t(
                  "workerPanel.searchBillPlaceholder",
                  "Search by bill number",
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSearch();
                }}
              />
            </div>
          </div>
          <button
            className="btn btn-gold"
            style={{ alignSelf: "end", minWidth: 110 }}
            onClick={onSearch}
            disabled={searchLoading}
          >
            <LuSearch size={14} />{" "}
            {searchLoading
              ? t("common.loading", "Loading...")
              : t("common.search", "Search")}
          </button>
        </div>

        {searchResult?.orders?.length ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {searchResult.orders.map((order) => renderSearchResultCard(order))}
          </div>
        ) : hasSearchAttempt ? (
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--text3)" }}>
            {t(
              "workerPanel.noOrderFoundByBill",
              "No order found for this bill number.",
            )}
          </div>
        ) : null}
      </div>

      {(newAssignedOrders.length > 0 || unreadNotifs.length > 0) && (
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LuBell size={15} style={{ color: cfg.color }} />
              <strong style={{ fontSize: 14 }}>
                {t("workerPanel.newAssignments", "New Assignments")}
              </strong>
              <span
                className="badge"
                style={{ background: cfg.color, color: "#fff" }}
              >
                {newAssignedOrders.length}
              </span>
            </div>
            {unreadNotifs.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => readAllMut.mutate()}
              >
                {t("workerPanel.markAllRead", "Mark all read")}
              </button>
            )}
          </div>
          {newAssignedOrders.length > 0 && (
            <div style={{ padding: 12, display: "grid", gap: 8 }}>
              {newAssignedOrders.slice(0, 6).map((order) => {
                const canReceive = canOrderBeReceived(order);

                return (
                  <div
                    key={`new-assigned-${order.id}`}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      background: "var(--surface2)",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text1)",
                        }}
                      >
                        {order.customer?.firstName || "-"} #
                        {order.customer?.billNumber || "-"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>
                        {getOrderTypeLabel(order.type, language)}
                      </div>
                      {order.assignmentPrice != null && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text2)",
                            fontWeight: 600,
                            marginTop: 2,
                          }}
                        >
                          ${Number(order.assignmentPrice).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-gold btn-sm"
                      onClick={() => openConfirm("receive", order)}
                      disabled={pendingAction || !canReceive}
                      title={
                        canReceive
                          ? ""
                          : getAssignmentBlockReason(order) ||
                            t(
                              "workerPanel.cannotReceiveOrder",
                              "You cannot receive this order.",
                            )
                      }
                    >
                      <LuCheck size={13} />{" "}
                      {t("workerPanel.receive", "Receive")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {unreadNotifs.length > 0 && (
            <div style={{ maxHeight: 250, overflowY: "auto" }}>
              {unreadNotifs.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <LuCircleAlert
                    size={14}
                    style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <NotificationText
                      language={language}
                      style={{
                        fontSize: 13,
                        color: "var(--text1)",
                        lineHeight: 1.45,
                      }}
                    >
                      {formatUserNotificationMessage(item, t, language)}
                    </NotificationText>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text3)",
                        marginTop: 3,
                      }}
                    >
                      {formatDateTimeLocale(item.createdAt, language)}
                    </div>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => readOneMut.mutate(item.id)}
                  >
                    <LuCheck size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            borderBottom: "1px solid var(--border)",
            padding: "0 12px",
          }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  border: "none",
                  background: "none",
                  padding: "12px 13px",
                  cursor: "pointer",
                  color: active ? cfg.color : "var(--text3)",
                  borderBottom: active
                    ? `2px solid ${cfg.color}`
                    : "2px solid transparent",
                  fontWeight: active ? 700 : 500,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
                <span
                  className="badge"
                  style={{
                    background: active ? `${cfg.color}14` : "var(--surface2)",
                    color: active ? cfg.color : "var(--text3)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: 14 }}>
          {isLoading ? (
            <div
              style={{
                padding: "30px 0",
                textAlign: "center",
                color: "var(--text3)",
              }}
            >
              {t("workerPanel.loadingOrders", "Loading orders...")}
            </div>
          ) : null}

          {!isLoading && filteredOrders.length === 0 ? (
            <div
              style={{
                padding: "40px 0",
                textAlign: "center",
                color: "var(--text3)",
              }}
            >
              <LuClipboardList size={36} style={{ marginBottom: 8 }} />
              <div>
                {t(
                  "workerPanel.noOrdersInCategory",
                  "No orders in this category.",
                )}
              </div>
            </div>
          ) : null}

          {!isLoading && filteredOrders.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
                gap: 12,
              }}
            >
              {filteredOrders.map((order) => renderOrderCard(order))}
            </div>
          ) : null}
        </div>
      </div>

      <OrderDetailsModal
        order={detailOrder}
        language={language}
        t={t}
        onClose={() => setDetailOrder(null)}
      />
      <ConfirmActionModal
        config={confirmConfig}
        pending={pendingAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}
