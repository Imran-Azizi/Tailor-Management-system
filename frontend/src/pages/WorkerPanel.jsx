import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuBell,
  LuCheck,
  LuCircleAlert,
  LuClipboardList,
  LuEye,
  LuHash,
  LuPlay,
  LuSearch,
  LuSquareCheck,
  LuUser,
} from "react-icons/lu";
import api from "../lib/api.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
import { formatUserNotificationMessage } from "../lib/notifications.js";
import { formatDateTimeLocale, formatSystemDate } from "../lib/locale.js";
import {
  getNotificationSummary,
  groupNotificationsByDay,
} from "../lib/notificationGrouping.js";
import { formatCurrency } from "../lib/currency.js";
import { formatMeters } from "../lib/meters.js";

import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../lib/months.js";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import { NotificationText } from "../components/ui/index.jsx";
import OrderCreatorBadge from "../components/order/OrderCreatorBadge.jsx";

const ROLE_CONFIG = {
  DOKHT: {
    color: "#DB2777",
    colorBg: "#DB277714",
    colorBd: "#DB277730",
    labelKey: "workerPanel.dokhtLabel",
  },
  QICHIKAR: {
    color: "#D97706",
    colorBg: "#D9770614",
    colorBd: "#D9770630",
    labelKey: "workerPanel.qichikarLabel",
  },
};

const TYPE_COLORS = {
  OUTFIT: "#D97706",
  WASKAT: "#0D9488",
  KORTY: "#B45309",
  YAKHANQAQ: "#DC2626",
};

function ReceiveSuccessState({ t, isRtl }) {
  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="relative flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-3 py-2 text-emerald-800 shadow-sm ring-1 ring-emerald-200/70 transition-all duration-300 ease-out dark:border-emerald-700 dark:from-emerald-950/50 dark:via-slate-900 dark:to-teal-950/40 dark:text-emerald-200 dark:ring-emerald-800/60"
    >
      <span className="absolute inset-0 bg-emerald-400/10 animate-pulse" />
      <span
        className={`relative z-10 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
          <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-30 animate-ping" />
          <svg
            viewBox="0 0 24 24"
            className="relative h-4 w-4"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12.5l4.1 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 24,
                animation:
                  "workerPanelCheckDraw 0.45s 0.12s cubic-bezier(.2,.9,.2,1) forwards",
              }}
            />
          </svg>
        </span>
        <span className="text-xs font-extrabold tracking-normal sm:text-sm">
          {t("workerPanel.receivedSuccess", "Order received")}
        </span>
      </span>
      <style>{`
        @keyframes workerPanelCheckDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

const NUM_LABEL_KEYS = {
  height: "createOrder.fields.height",
  shoulder: "createOrder.fields.shoulder",
  sleeve: "createOrder.fields.sleeve",
  neck: "createOrder.fields.neck",
  chest: "createOrder.fields.chest",
  armpit: "createOrder.fields.armpit",
  waist: "createOrder.fields.waist",
  skirt: "createOrder.fields.skirt",
  tenban: "createOrder.fields.tenban",
  pantLeg: "createOrder.fields.pantLeg",
  arm: "createOrder.fields.arm",
  calf: "createOrder.fields.calf",
  sorain: "createOrder.fields.sorain",
  patlonHeight: "createOrder.fields.patlonHeight",
  kamerPatlon: "createOrder.fields.kamerPatlon",
  doroBaghlePatlon: "createOrder.fields.doroBaghlePatlon",
  sorainPatlon: "createOrder.fields.sorainPatlon",
  patPatlon: "createOrder.fields.patPatlon",
  pachaPatlon: "createOrder.fields.pachaPatlon",
};

const STYLE_LABEL_KEYS = {
  neckStyle: "createOrder.fields.neckStyle",
  sleeveStyle: "createOrder.fields.sleeveStyle",
  sleeveSize: "createOrder.fields.sleeveSize",
  skirtStyle: "createOrder.fields.skirtStyle",
  waskatStyle: "createOrder.fields.waskatStyle",
  shoulderState: "createOrder.fields.shoulderState",
  outfitDesign: "createOrder.fields.outfitDesign",
  outfitStyle: "createOrder.fields.outfitStyle",
  buttonStyle: "createOrder.fields.buttonStyle",
  pantStyle: "createOrder.fields.pantStyle",
  style: "createOrder.fields.style",
  yakhanQaqDesign: "createOrder.fields.yakhanQaqDesign",
  additionalStyleInfo: "createOrder.fields.additionalStyleInfo",
};

const BOOL_LABEL_KEYS = {
  frontPocket: "createOrder.fields.frontPocket",
  sidePocket: "createOrder.fields.sidePocket",
  doubleSidePocket: "createOrder.fields.doubleSidePocket",
  underPocket: "createOrder.fields.underPocket",
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
  if (order?.isDamageOrder) return "damageOrder";
  if (isWorkerCompletedForRole(order, accountType)) return "completed";
  if (getRoleOrderState(order, accountType).inProgress) return "inProgress";
  return "assigned";
}

function statusColor(status) {
  if (status === "damageOrder") return "#B91C1C";
  if (status === "completed") return "#DC2626";
  if (status === "inProgress") return "#2563EB";
  return "#D97706";
}

function statusLabel(status, t) {
  if (status === "damageOrder") {
    return t("orders.damageOrderStatus", "Damage Order");
  }
  if (status === "completed") {
    return t("workerPanel.statusCompleted", "Completed");
  }
  if (status === "inProgress") {
    return t("workerPanel.statusInProgress", "In Progress");
  }
  return t("workerPanel.statusAssigned", "Assigned");
}

function fmtDate(value, language) {
  if (!value) return "-";
  return formatSystemDate(value, language);
}

function formatTrimmedNumber(value, maximumFractionDigits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
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

  // RTL support for modal
  let language = undefined;
  if (typeof window !== "undefined" && window.i18next) {
    language = window.i18next.language;
  }
  const isRtl = ["fa", "ps", "prs", "uz-Arab", "ar", "ur"].includes(
    (language || "").split("-")[0],
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      dir={isRtl ? "rtl" : "ltr"}
      style={
        isRtl
          ? {
              direction: "rtl",
              textAlign: "right",
              fontFamily:
                "'Noto Naskh Arabic', 'Noto Sans Arabic', Tahoma, Arial, sans-serif",
            }
          : {}
      }
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-[520px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg sm:p-5">
        <h3 className="m-0 text-base font-extrabold sm:text-lg">
          {config.title}
        </h3>
        <p className="mb-3 mt-2 text-xs text-[var(--text2)] sm:mb-4 sm:text-sm">
          {config.message}
        </p>
        {config.preview && (
          <div className="grid gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-2.5 text-xs sm:text-sm">
            {config.preview}
          </div>
        )}
        <div className="mt-4 flex flex-col justify-end gap-2 sm:flex-row">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={pending}
          >
            {config.cancelLabel}
          </button>
          <button
            className="btn btn-gold"
            style={{
              background: "#FFD700",
              borderColor: "#FFD700",
              boxShadow:
                "0 2px 8px 0 rgba(0,0,0,0.08), 0 1.5px 4px 0 #FFD70033",
              fontWeight: 700,
              fontSize: 16,
              padding: "10px 28px",
              borderRadius: 8,
              color: "#fff",
              letterSpacing: ".01em",
              transition: "all 0.15s cubic-bezier(.4,0,.2,1)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
            }}
            onClick={onConfirm}
            disabled={pending}
          >
            <LuCheck style={{ fontSize: 18, verticalAlign: "middle" }} />
            {pending ? config.pendingLabel : config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, language, t, onClose }) {
  if (!order) return null;
  const orderLabel = getOrderLabelParts(order, language);
  const orderPrimaryName = getOrderPrimaryDisplayName(
    order,
    order.customer?.firstName,
    language,
  );
  const payment = getRolePaymentState(order, order?.assignedTo?.accountType);
  const measure = getMeasure(order);
  const paidToWorker = payment.status === "PAID_TO_WORKER";
  const priceValue = paidToWorker
    ? Number(payment.amount || 0)
    : order?.assignmentPrice != null
      ? Number(order.assignmentPrice)
      : 0;
  const measurementRows = Object.entries(NUM_LABEL_KEYS).filter(
    ([key]) => measure[key] != null,
  );
  const styleRows = Object.entries(STYLE_LABEL_KEYS).filter(
    ([key]) => measure[key],
  );
  const booleanRows = Object.entries(BOOL_LABEL_KEYS).filter(
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
    textAlign: "start",
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

  // RTL support
  const isRtl = ["fa", "ps", "prs", "uz-Arab", "ar", "ur"].includes(
    (language || "").split("-")[0],
  );
  return (
    <div
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-3 sm:p-4`}
      dir={isRtl ? "rtl" : "ltr"}
      style={
        isRtl
          ? {
              direction: "rtl",
              textAlign: "right",
              fontFamily:
                "'Noto Naskh Arabic', 'Noto Sans Arabic', Tahoma, Arial, sans-serif",
            }
          : {}
      }
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-h-[90vh] max-w-[800px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-6 pt-6 pb-2 border-b border-[var(--border)] bg-gradient-to-br from-sky-50 via-cyan-50 to-white dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
          <div>
            <h2 className="m-0 text-2xl font-extrabold text-sky-900 dark:text-slate-100">
              {orderPrimaryName}
            </h2>
            <div className="mt-1 text-sm text-[var(--text3)] font-medium">
              #{order.customer?.billNumber || "-"} &bull;{" "}
              {orderLabel.typeWithSequenceLabel}
            </div>
            <div className="mt-2">
              <OrderCreatorBadge order={order} compact />
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm mt-2 sm:mt-0"
            onClick={onClose}
          >
            {t("common.close", "Close")}
          </button>
        </div>
        {/* Price & Updated */}
        <div className="px-6 pt-5 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-sky-50 dark:bg-slate-800/70 p-4 border border-sky-100 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                {t("workerPanel.price", "Price")}
              </div>
              <div className="text-lg font-bold text-sky-900 dark:text-slate-100">
                {formatCurrency(priceValue, language)}
              </div>
            </div>
            <div className="rounded-xl bg-cyan-50 dark:bg-slate-800/70 p-4 border border-cyan-100 dark:border-slate-700">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                {t("workerPanel.updatedOn", "Updated")}
              </div>
              <div className="text-lg font-bold text-sky-900 dark:text-slate-100">
                {fmtDate(payment.paidAt || order.updatedAt, language)}
              </div>
            </div>
          </div>
        </div>
        {/* Rakht Section */}
        <div className="px-6 pt-5 pb-2">
          <div className="text-base font-bold text-sky-800 dark:text-slate-200 mb-2 border-b border-sky-100 dark:border-slate-700 pb-1">
            {t("createOrder.rakhtSelection", {
              defaultValue: "Rakht Selection",
            })}
          </div>
          <div className="overflow-x-auto rounded-xl border border-sky-100 dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 bg-sky-50 dark:bg-slate-800/70 border-b border-sky-100 dark:border-slate-700">
                    {t("common.field", "Field")}
                  </th>
                  <th className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 bg-sky-50 dark:bg-slate-800/70 border-b border-sky-100 dark:border-slate-700">
                    {t("common.value", "Value")}
                  </th>
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
                      ? formatMeters(order.rakhtRequiredMeters)
                      : "-",
                  ],
                ].map(([field, value]) => (
                  <tr key={field}>
                    <td className="px-3 py-2 text-sm text-sky-900 dark:text-slate-100 border-b border-sky-100 dark:border-slate-700">
                      {field}
                    </td>
                    <td className="px-3 py-2 text-sm text-sky-900 dark:text-slate-100 border-b border-sky-100 dark:border-slate-700">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Measurements Section */}
        <div className="px-6 pt-5 pb-2">
          <div className="text-base font-bold text-sky-800 dark:text-slate-200 mb-2 border-b border-sky-100 dark:border-slate-700 pb-1">
            {t("createOrder.measurements", "Measurements")}
          </div>
          <div className="overflow-x-auto rounded-xl border border-sky-100 dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 bg-sky-50 dark:bg-slate-800/70 border-b border-sky-100 dark:border-slate-700">
                    {t("common.field", "Field")}
                  </th>
                  <th className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 bg-sky-50 dark:bg-slate-800/70 border-b border-sky-100 dark:border-slate-700">
                    {t("common.value", "Value")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {measurementRows.length ? (
                  measurementRows.map(([key, tKey]) => (
                    <tr key={key}>
                      <td className="px-3 py-2 text-sm text-sky-900 dark:text-slate-100 border-b border-sky-100 dark:border-slate-700">
                        {t(tKey)}
                      </td>
                      <td className="px-3 py-2 text-sm text-sky-900 dark:text-slate-100 border-b border-sky-100 dark:border-slate-700">
                        {measure[key]}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-3 py-2 text-sm text-sky-900 dark:text-slate-100 border-b-0"
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
        {/* Styling Details Section */}
        <div className="px-6 pt-5 pb-6">
          <div className="text-base font-bold text-sky-800 dark:text-slate-200 mb-2 border-b border-sky-100 dark:border-slate-700 pb-1">
            {t("createOrder.styleOptions", "Styling Details")}
          </div>
          <div className="overflow-x-auto rounded-xl border border-sky-100 dark:border-slate-700 bg-white dark:bg-slate-900">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 bg-sky-50 dark:bg-slate-800/70 border-b border-sky-100 dark:border-slate-700">
                    {t("common.field", "Field")}
                  </th>
                  <th className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 bg-sky-50 dark:bg-slate-800/70 border-b border-sky-100 dark:border-slate-700">
                    {t("common.value", "Value")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...styleRows, ...booleanRows].length ? (
                  [...styleRows, ...booleanRows].map(([key, tKey]) => (
                    <tr key={key}>
                      <td className="px-3 py-2 text-sm text-sky-900 dark:text-slate-100 border-b border-sky-100 dark:border-slate-700">
                        {t(tKey)}
                      </td>
                      <td className="px-3 py-2 text-sm text-sky-900 dark:text-slate-100 border-b border-sky-100 dark:border-slate-700">
                        {measure[key] === true
                          ? t("common.yes", "Yes")
                          : measure[key]}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="px-3 py-2 text-sm text-sky-900 dark:text-slate-100 border-b-0"
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

// ─── Penalty Detail Modal ───────────────────────────────────────────────────
function PenaltyDetailModal({ penalty, language, t, onClose }) {
  if (!penalty) return null;

  const statusBadge = {
    DAMAGE_ORDER: {
      label: t("orders.damageOrderStatus", "Damage Order"),
      bg: "#FEF2F2",
      color: "#B91C1C",
    },
    COMPLETED: {
      label: t("workerPanel.statusCompleted"),
      bg: "var(--green-bg, #DCFCE7)",
      color: "var(--green-fg, #15803D)",
    },
    IN_PROGRESS: {
      label: t("workerPanel.statusInProgress"),
      bg: "var(--blue-bg, #DBEAFE)",
      color: "var(--blue-fg, #1D4ED8)",
    },
    PENDING: {
      label: t("workerPanel.statusPending", "Pending"),
      bg: "var(--surface2)",
      color: "var(--text3)",
    },
  }[penalty.orderStatus] || {
    label: penalty.orderStatus,
    bg: "var(--surface2)",
    color: "var(--text3)",
  };

  const thStyle = {
    fontSize: 11,
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: ".04em",
    textAlign: "start",
    padding: "8px 10px",
    background: "var(--surface2)",
    borderBottom: "1px solid var(--border)",
    fontWeight: 700,
  };

  const tdLabelStyle = {
    fontSize: 12,
    color: "var(--text3)",
    padding: "8px 10px",
    borderBottom: "1px solid var(--border)",
    width: "45%",
  };

  const tdValueStyle = {
    fontSize: 13,
    color: "var(--text1)",
    fontWeight: 600,
    padding: "8px 10px",
    borderBottom: "1px solid var(--border)",
    textAlign: "end",
  };

  const tableWrapStyle = {
    border: "1px solid var(--border)",
    borderRadius: 10,
    overflow: "hidden",
    background: "var(--surface)",
  };

  const sectionLabelStyle = {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: ".04em",
    margin: "14px 0 6px",
  };

  const CurrencyCell = ({ value, accent }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        color: accent || "var(--text1)",
        fontWeight: 700,
      }}
    >
      <AfCurrencyIcon size={12} />
      {formatCurrency(value || 0, language)}
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-h-[90vh] max-w-[520px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg sm:p-5">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
              {t("workerPanel.penaltyDetailTitle", "Penalty Record Details")}
            </h3>
            <p
              style={{ margin: "5px 0 0", fontSize: 13, color: "var(--text3)" }}
            >
              #{penalty.billNumber} · {penalty.customerName}
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            {t("common.close", "Close")}
          </button>
        </div>

        {/* Order Information */}
        <p style={sectionLabelStyle}>
          {t("workerPanel.orderInfoSection", "Order Information")}
        </p>
        <div style={tableWrapStyle}>
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  [
                    t("damagedClothes.details.billNumber"),
                    `#${penalty.billNumber}`,
                  ],
                  [
                    t("damagedClothes.details.customerName"),
                    penalty.customerName || "—",
                  ],
                  [
                    t("damagedClothes.details.phoneNumber"),
                    penalty.phoneNumber || "—",
                  ],
                  [
                    t("damagedClothes.details.orderType"),
                    penalty.orderType || "—",
                  ],
                ].map(([label, value], i, arr) => (
                  <tr key={label}>
                    <td
                      style={{
                        ...tdLabelStyle,
                        borderBottom:
                          i === arr.length - 1
                            ? "none"
                            : tdLabelStyle.borderBottom,
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        ...tdValueStyle,
                        borderBottom:
                          i === arr.length - 1
                            ? "none"
                            : tdValueStyle.borderBottom,
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

        {/* Status + date row */}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              background: "var(--surface)",
            }}
          >
            <div
              style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}
            >
              {t("workerPanel.orderStatus", "Order Status")}
            </div>
            <span
              className="badge"
              style={{
                background: statusBadge.bg,
                color: statusBadge.color,
                fontWeight: 700,
              }}
            >
              {statusBadge.label}
            </span>
          </div>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "8px 10px",
              background: "var(--surface)",
            }}
          >
            <div
              style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}
            >
              {t("workerPanel.penaltyDate", "Penalty Applied")}
            </div>
            <strong style={{ fontSize: 12 }}>
              {formatDateTimeLocale(penalty.createdAt, language)}
            </strong>
          </div>
        </div>

        {/* Billing Information */}
        <p style={sectionLabelStyle}>
          {t("workerPanel.billingInfoSection", "Billing Information")}
        </p>
        <div style={tableWrapStyle}>
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("common.field", "Field")}</th>
                  <th style={{ ...thStyle, textAlign: "end" }}>
                    {t("common.value", "Value")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdLabelStyle}>
                    {t("workerPanel.totalOrderPrice", "Total Order Price")}
                  </td>
                  <td style={{ ...tdValueStyle }}>
                    <CurrencyCell value={penalty.totalOrderPrice} />
                  </td>
                </tr>
                <tr>
                  <td style={tdLabelStyle}>
                    {t("createOrder.discount", "Discount")}
                  </td>
                  <td style={{ ...tdValueStyle }}>
                    <CurrencyCell
                      value={penalty.discount}
                      accent={penalty.discount > 0 ? "#15803D" : undefined}
                    />
                  </td>
                </tr>
                <tr>
                  <td style={tdLabelStyle}>
                    {t("createOrder.paidAmount", "Paid Amount")}
                  </td>
                  <td style={{ ...tdValueStyle }}>
                    <CurrencyCell value={penalty.paidAmount} accent="#1D4ED8" />
                  </td>
                </tr>
                <tr>
                  <td style={tdLabelStyle}>
                    {t("common.remaining", "Remaining")}
                  </td>
                  <td style={{ ...tdValueStyle }}>
                    <CurrencyCell
                      value={penalty.remaining}
                      accent={penalty.remaining > 0 ? "#DC2626" : "#15803D"}
                    />
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      ...tdLabelStyle,
                      borderBottom: "none",
                      fontWeight: 700,
                      color: "var(--text1)",
                    }}
                  >
                    {t("workerPanel.finalPayable", "Final Payable")}
                  </td>
                  <td style={{ ...tdValueStyle, borderBottom: "none" }}>
                    <CurrencyCell value={penalty.finalPayable} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Information */}
        <p style={sectionLabelStyle}>
          {t("workerPanel.expenseInfoSection", "Expense Information")}
        </p>
        <div style={tableWrapStyle}>
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>{t("common.field", "Field")}</th>
                  <th style={{ ...thStyle, textAlign: "end" }}>
                    {t("common.value", "Value")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{
                      ...tdLabelStyle,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {t("damagedClothes.details.rakhtExpense", "Rakht Expense")}
                  </td>
                  <td
                    style={{
                      ...tdValueStyle,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {penalty.rakhtExpense}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      ...tdLabelStyle,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {t("damagedClothes.details.dokhtExpense", "Dokht Expense")}
                  </td>
                  <td
                    style={{
                      ...tdValueStyle,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {penalty.dokhtExpense}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      ...tdLabelStyle,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {t(
                      "damagedClothes.details.qichikarExpense",
                      "Qichikar Expense",
                    )}
                  </td>
                  <td
                    style={{
                      ...tdValueStyle,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {penalty.qichikarExpense}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      ...tdLabelStyle,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {t(
                      "damagedClothes.details.dailyTaskExpense",
                      "Daily Task Expense",
                    )}
                  </td>
                  <td
                    style={{
                      ...tdValueStyle,
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {penalty.dailyTaskExpense}
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      ...tdLabelStyle,
                      borderBottom: "none",
                      fontWeight: 700,
                      color: "#92400E",
                    }}
                  >
                    {t("damagedClothes.details.totalPenalty", "Total Penalty")}
                  </td>
                  <td style={{ ...tdValueStyle, borderBottom: "none" }}>
                    <CurrencyCell
                      value={penalty.totalExpense}
                      accent="#B45309"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Applied by footer */}
        <div className="mt-3 flex flex-col items-start justify-between gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2.5 py-2 text-xs sm:flex-row sm:items-center">
          <span style={{ color: "var(--text3)" }}>
            {t("workerPanel.appliedBy", "Applied By")}
          </span>
          <strong style={{ color: "var(--text1)" }}>
            {penalty.createdBy?.name || "—"}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default function WorkerPanel() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { viewMonth, viewYear, setViewMonth, setViewYear } = useMonth();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;
  const roleLabel = t(cfg.labelKey, {
    defaultValue: user?.accountType === "DOKHT" ? "Dokht" : "Qichikar",
  });
  const workerScope = [user?.id, user?.accountType];

  const [activeTab, setActiveTab] = useState("all");
  const [billSearch, setBillSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearchAttempt, setHasSearchAttempt] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [optimisticInProgressIds, setOptimisticInProgressIds] = useState([]);
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState([]);
  const [receiveSuccessIds, setReceiveSuccessIds] = useState([]);
  const receiveSuccessTimersRef = useRef({});

  useEffect(() => {
    return () => {
      Object.values(receiveSuccessTimersRef.current).forEach((timerId) => {
        clearTimeout(timerId);
      });
    };
  }, []);

  const { data: orderPayload, isLoading } = useQuery({
    queryKey: ["worker-panel-orders", ...workerScope, viewMonth, viewYear],
    queryFn: () =>
      api
        .get("/orders", {
          params: {
            limit: 200,
            month: viewMonth,
            year: viewYear,
          },
        })
        .then((r) => r.data),
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
    queryKey: [
      "worker-panel-transaction-summary",
      ...workerScope,
      viewMonth,
      viewYear,
    ],
    queryFn: () =>
      api
        .get("/transactions/me/summary", {
          params: {
            month: viewMonth,
            year: viewYear,
          },
        })
        .then((r) => r.data),
    enabled: Boolean(user?.id && user?.accountType),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const { data: damagedPenaltyPayload, isLoading: damagedPenaltyLoading } =
    useQuery({
      queryKey: ["worker-panel-damaged-penalties", ...workerScope],
      queryFn: () =>
        api
          .get("/damaged-clothes/my-penalties", {
            params: { page: 1, limit: 100 },
          })
          .then((r) => r.data),
      enabled: Boolean(user?.id),
      refetchInterval: 30000,
    });

  const unreadNotifs = useMemo(
    () => allNotifs.filter((n) => !n.isRead),
    [allNotifs],
  );
  const groupedUnreadNotifs = useMemo(
    () =>
      groupNotificationsByDay(unreadNotifs, {
        language,
        t,
        getDate: (item) => item?.createdAt,
      }),
    [language, t, unreadNotifs],
  );

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
      const orderId = updatedOrder?.id;
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

      const finishReceiveUpdate = () => {
        qc.setQueryData(
          ["worker-panel-orders", ...workerScope, viewMonth, viewYear],
          (prev) => upsertOrderInWorkerPayload(prev, updatedOrder),
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
        refreshSearchResult();
      };

      if (orderId) {
        setReceiveSuccessIds((ids) =>
          ids.includes(orderId) ? ids : [...ids, orderId],
        );
        clearTimeout(receiveSuccessTimersRef.current[orderId]);
        receiveSuccessTimersRef.current[orderId] = setTimeout(() => {
          setReceiveSuccessIds((ids) => ids.filter((id) => id !== orderId));
          delete receiveSuccessTimersRef.current[orderId];
          finishReceiveUpdate();
        }, 1500);
      } else {
        finishReceiveUpdate();
      }

      setActiveTab("assigned");
      toast.success(
        t(
          "workerPanel.orderReceivedAdminNotified",
          "Order received - Admin notified",
        ),
      );
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
      qc.invalidateQueries({ queryKey: ["worker-panel-transaction-summary"] });
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
  const damagePenaltyTotalFromSummary = Number(
    workerMoneySummary?.damagePenaltyTotal || 0,
  );
  const totalCompletedPayments = Number(
    workerMoneySummary?.totalCompletedPayments || 0,
  );
  const moneyReceiptTotal = Number(workerMoneySummary?.moneyReceiptTotal || 0);
  const currentMoney =
    totalCompletedPayments - totalLoanAmount - damagePenaltyTotalFromSummary;
  const damagedPenalties = Array.isArray(damagedPenaltyPayload?.data)
    ? damagedPenaltyPayload.data
    : [];
  const totalDamagePenaltyAmount = damagePenaltyTotalFromSummary;

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

  const optimisticInProgressIdSet = useMemo(
    () => new Set(optimisticInProgressIds),
    [optimisticInProgressIds],
  );
  const optimisticCompletedIdSet = useMemo(
    () => new Set(optimisticCompletedIds),
    [optimisticCompletedIds],
  );
  const receiveSuccessIdSet = useMemo(
    () => new Set(receiveSuccessIds),
    [receiveSuccessIds],
  );

  const filteredOrders = useMemo(() => {
    const accountType = user?.accountType;
    if (activeTab === "assigned")
      return orders.filter(
        (order) =>
          !isWorkerCompletedForRole(order, accountType) &&
          !getRoleOrderState(order, accountType).inProgress &&
          getRoleOrderState(order, accountType).receivedById === user?.id &&
          !optimisticInProgressIdSet.has(order.id) &&
          !optimisticCompletedIdSet.has(order.id),
      );
    if (activeTab === "inProgress")
      return orders.filter(
        (order) =>
          !isWorkerCompletedForRole(order, accountType) &&
          (getRoleOrderState(order, accountType).inProgress ||
            optimisticInProgressIdSet.has(order.id)) &&
          !optimisticCompletedIdSet.has(order.id),
      );
    if (activeTab === "completed")
      return orders.filter(
        (order) =>
          isWorkerCompletedForRole(order, accountType) ||
          optimisticCompletedIdSet.has(order.id),
      );
    return orders.filter((order) => {
      const roleState = getRoleOrderState(order, accountType);
      return (
        isWorkerCompletedForRole(order, accountType) ||
        roleState.receivedById === user?.id ||
        optimisticInProgressIdSet.has(order.id) ||
        optimisticCompletedIdSet.has(order.id)
      );
    });
  }, [
    activeTab,
    optimisticCompletedIdSet,
    optimisticInProgressIdSet,
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
    {
      key: "penalties",
      label: t("workerPanel.penaltyTab", "Penalty History"),
      count: damagedPenaltyPayload?.total || 0,
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
    const orderLabel = getOrderLabelParts(order, language);
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
            {orderLabel.typeWithSequenceLabel}
          </div>
          <div>
            <b>{t("common.customer", "Customer")}:</b>{" "}
            {getOrderPrimaryDisplayName(
              order,
              order.customer?.firstName,
              language,
            )}
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
    const orderLabel = getOrderLabelParts(order, language);
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
            {orderLabel.typeWithSequenceLabel}
          </span>
        </div>

        {/* ── Customer identity block ── */}
        <div style={{ display: "grid", gap: 2 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text1)" }}>
            {getOrderPrimaryDisplayName(
              order,
              order.customer?.firstName,
              language,
            )}
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
            {!["DOKHT", "QICHIKAR"].includes(user?.accountType) &&
              order.customer?.phoneNumber && (
                <span>{order.customer.phoneNumber}</span>
              )}
          </div>
          <div style={{ marginTop: 6 }}>
            <OrderCreatorBadge order={order} compact />
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
                {formatMeters(order.rakhtRequiredMeters)}m
              </span>
            )}
          </div>
        )}

        {/* ── Assignment / received info ── */}
        {receivedByCurrentUser && roleState.receivedAt ? (
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            {t("workerPanel.receivedOn", "Received on")}:{" "}
            {fmtDate(roleState.receivedAt, language)}
          </div>
        ) : (
          order.assignedBy && (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {t("workerPanel.assignedBy", "Assigned by")}:{" "}
              {order.assignedBy.name} {t("workerPanel.on", "on")}{" "}
              {fmtDate(order.assignedAt, language)}
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
              ? formatCurrency(payment.amount || 0, language)
              : order.assignmentPrice != null
                ? formatCurrency(order.assignmentPrice, language)
                : "-"}
          </span>
          {!paidToWorker && order.assignmentPrice != null && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text3)",
                marginInlineStart: 4,
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
    const orderLabel = getOrderLabelParts(order, language);
    const receivedByCurrentUser =
      getRoleOrderState(order, user?.accountType).receivedById === user?.id;
    const canReceive = canOrderBeReceived(order);
    const showReceiveSuccess = receiveSuccessIdSet.has(order.id);

    return (
      <div
        key={`search-compact-${order.id}`}
        className="card"
        style={{ padding: 12, display: "grid", gap: 10 }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}>
            {t("common.customer", "Customer")}:{" "}
            {getOrderPrimaryDisplayName(
              order,
              order.customer?.firstName,
              language,
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>
            {t("orders.billNumber", "Bill Number")}: #
            {order.customer?.billNumber || "-"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>
            {t("workerPanel.orderType", "Order Type")}:{" "}
            {orderLabel.typeWithSequenceLabel}
          </div>
          <OrderCreatorBadge order={order} compact />
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
                  {formatMeters(order.rakhtRequiredMeters)}m
                </span>
              )}
            </div>
          )}
        </div>

        {showReceiveSuccess ? (
          <ReceiveSuccessState t={t} isRtl={isRtl} />
        ) : receivedByCurrentUser ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-100 px-2.5 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
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
          <div className="rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
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

  // Determine RTL based on language, hoisted to top scope
  const lang =
    typeof i18n !== "undefined" && i18n.resolvedLanguage
      ? i18n.resolvedLanguage
      : typeof language !== "undefined"
        ? language
        : "en";
  const isRtl =
    typeof i18n !== "undefined" && typeof i18n.dir === "function"
      ? i18n.dir(lang) === "rtl"
      : ["fa", "prs", "ps", "ar", "ur"].some((code) => lang.startsWith(code));
  window.__isRtl = isRtl; // for debugging

  return (
    <div className="grid gap-4 text-slate-900 dark:text-slate-100 sm:gap-5">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="m-0 text-xl font-extrabold text-[var(--text1)] sm:text-2xl">
              {t("workerPanel.greeting", "Welcome")} {user?.name || ""}
            </h1>
            <p className="mt-1.5 text-xs text-[var(--text3)] sm:text-sm">
              {roleLabel} - {t("workerPanel.allOrders", "All Orders")}:{" "}
              {stats.all}
            </p>
            <p className="mt-1 text-xs text-[var(--text3)]">
              {t("common.viewingMonth", "Viewing data for")}:{" "}
              <b>{formatMonthYearLabel(viewMonth, viewYear, language)}</b>
            </p>
          </div>
          <span
            className="badge"
            style={{
              background: `${cfg.color}14`,
              color: cfg.color,
              border: `1px solid ${cfg.color}30`,
            }}
          >
            {roleLabel}
          </span>
        </div>

        {/* Stat Cards Section - Dokht/Qichikar only */}
        <div className="mt-4 grid gap-3" dir={isRtl ? "rtl" : "ltr"}>
          <div
            className={`min-h-[118px] rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              currentMoney >= 0
                ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:to-slate-900"
                : "border-rose-300 bg-gradient-to-br from-rose-50 to-white dark:border-rose-800 dark:from-rose-950/40 dark:to-slate-900"
            }`}
          >
            <div className="flex h-full items-start justify-between gap-3">
              <div className="grid min-w-0 content-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t("workerPanel.currentMoney", "Current Money")}
                  </div>
                  <div
                    className={`mt-2 flex flex-wrap items-center gap-2 text-3xl font-extrabold ${
                      currentMoney >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    <AfCurrencyIcon size={22} />
                    {formatCurrency(currentMoney, language)}
                  </div>
                </div>
              </div>
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 ${
                  currentMoney >= 0
                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-900"
                    : "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-900"
                }`}
              >
                <AfCurrencyIcon size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-h-[118px] rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-rose-900/70 dark:from-rose-950/35 dark:to-slate-900">
            <div className="flex h-full items-start justify-between gap-3">
              <div className="grid min-w-0 content-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t("workerPanel.totalPenaltyAmount", "Total Damage Penalty")}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-extrabold text-rose-700 dark:text-rose-300">
                    <AfCurrencyIcon size={20} />
                    {formatCurrency(totalDamagePenaltyAmount, language)}
                  </div>
                </div>
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {damagedPenaltyPayload?.total || 0}{" "}
                  {t("workerPanel.totalPenalties", "penalties")}
                </div>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:ring-rose-900">
                <LuCircleAlert size={22} />
              </div>
            </div>
          </div>

          <div className="min-h-[118px] rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/70 dark:from-amber-950/35 dark:to-slate-900">
            <div className="flex h-full items-start justify-between gap-3">
              <div className="grid min-w-0 content-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t("workerPanel.loanTotal", "Loan Total")}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                    <AfCurrencyIcon size={20} />
                    {formatCurrency(totalLoanAmount, language)}
                  </div>
                </div>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:ring-amber-900">
                <LuHash size={22} />
              </div>
            </div>
          </div>

          <div className="min-h-[118px] rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-blue-900/70 dark:from-blue-950/35 dark:to-slate-900">
            <div className="flex h-full items-start justify-between gap-3">
              <div className="grid min-w-0 content-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t(
                      "workerPanel.totalCompletedPayments",
                      "Total Money from Completed Orders",
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-extrabold text-blue-700 dark:text-blue-300">
                    <AfCurrencyIcon size={20} />
                    {formatCurrency(totalCompletedPayments, language)}
                  </div>
                </div>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:ring-blue-900">
                <LuSquareCheck size={22} />
              </div>
            </div>
          </div>

          <div className="min-h-[118px] rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900/70 dark:from-emerald-950/35 dark:to-slate-900">
            <div className="flex h-full items-start justify-between gap-3">
              <div className="grid min-w-0 content-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t("workerPanel.moneyReceipt", "Money Receipt")}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
                    <AfCurrencyIcon size={20} />
                    {formatCurrency(moneyReceiptTotal, language)}
                  </div>
                </div>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-900">
                <AfCurrencyIcon size={22} />
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="card p-3.5 sm:p-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2.5">
          <div>
            <label className="lbl">
              {t("orders.billNumber", "Bill Number")}
            </label>
            <div style={{ position: "relative" }}>
              <LuSearch
                size={14}
                style={{
                  position: "absolute",
                  insetInlineStart: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                className="inp"
                inputMode="numeric"
                style={{ paddingInlineStart: 32 }}
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
          <div className="grid">
            <button
              className="btn btn-gold"
              style={{ minWidth: 110, height: 40 }}
              onClick={onSearch}
              disabled={searchLoading}
            >
              <LuSearch size={14} />{" "}
              {searchLoading
                ? t("common.loading", "Loading...")
                : t("common.search", "Search")}
            </button>
          </div>
        </div>

        {searchResult?.orders?.length ? (
          <div className="mt-3.5 grid gap-2.5">
            {searchResult.orders.map((order) => renderSearchResultCard(order))}
          </div>
        ) : hasSearchAttempt ? (
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t(
              "workerPanel.noOrderFoundByBill",
              "No order found for this bill number.",
            )}
          </div>
        ) : null}
      </div>

      {(newAssignedOrders.length > 0 || unreadNotifs.length > 0) && (
        <div className="card" style={{ padding: 0 }}>
          <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
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
            <div className="grid gap-2 p-3">
              {newAssignedOrders.slice(0, 6).map((order) => {
                const orderLabel = getOrderLabelParts(order, language);
                const canReceive = canOrderBeReceived(order);
                const showReceiveSuccess = receiveSuccessIdSet.has(order.id);

                return (
                  <div
                    key={`new-assigned-${order.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text1)",
                        }}
                      >
                        #{order.customer?.billNumber || "-"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text2)" }}>
                        {getOrderPrimaryDisplayName(
                          order,
                          order.customer?.firstName,
                          language,
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>
                        {orderLabel.typeWithSequenceLabel}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <OrderCreatorBadge order={order} compact />
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
                          {formatCurrency(order.assignmentPrice, "en")}
                        </div>
                      )}
                    </div>

                    <div className="w-full sm:w-40">
                      {showReceiveSuccess ? (
                        <ReceiveSuccessState t={t} isRtl={isRtl} />
                      ) : (
                        <button
                          className="btn btn-gold btn-sm w-full transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {unreadNotifs.length > 0 && (
            <div className="worker-notif-scroll">
              {groupedUnreadNotifs.map((group) => (
                <section
                  key={group.dayKey}
                  className="notif-day-group worker-notif-day-group"
                >
                  <div className="notif-day-heading">{group.heading}</div>
                  {group.items.map((item) => {
                    const isPayment = item.type === "ADMIN_PAYMENT";
                    const message = formatUserNotificationMessage(
                      item,
                      t,
                      language,
                    );
                    const summary = getNotificationSummary(message);

                    return (
                      <article
                        key={item.id}
                        className="notif-feed-item notif-feed-item--drawer worker-notif-item"
                      >
                        <span
                          className="notif-feed-item__icon"
                          aria-hidden="true"
                        >
                          {isPayment ? (
                            <AfCurrencyIcon
                              size={14}
                              style={{ color: "var(--success)" }}
                            />
                          ) : (
                            <LuCircleAlert
                              size={14}
                              style={{ color: cfg.color }}
                            />
                          )}
                        </span>
                        <div className="notif-feed-item__copy">
                          <p className="notif-feed-item__title">
                            {summary.title}
                          </p>
                          {summary.message && (
                            <NotificationText
                              language={language}
                              className="notif-feed-item__message"
                            >
                              {summary.message}
                            </NotificationText>
                          )}
                          <div className="notif-feed-item__meta">
                            <span>
                              {formatDateTimeLocale(item.createdAt, language)}
                            </span>
                          </div>
                        </div>
                        <button
                          className="btn btn-outline btn-sm worker-notif-read-btn"
                          onClick={() => readOneMut.mutate(item.id)}
                        >
                          <LuCheck size={13} />
                        </button>
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden p-0">
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

        <div className="p-3.5 sm:p-4">
          {activeTab === "penalties" ? (
            damagedPenaltyLoading ? (
              <div
                style={{
                  padding: "30px 0",
                  textAlign: "center",
                  color: "var(--text3)",
                }}
              >
                {t("common.loading", "Loading...")}
              </div>
            ) : damagedPenalties.length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "var(--text3)",
                }}
              >
                <LuClipboardList size={36} style={{ marginBottom: 8 }} />
                <div>{t("workerPanel.noDamagedPenaltyHistory")}</div>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {damagedPenaltyPayload?.data?.map((penalty) => {
                  const statusCfg = {
                    DAMAGE_ORDER: {
                      label: t("orders.damageOrderStatus", "Damage Order"),
                      bg: "#FEE2E2",
                      color: "#991B1B",
                    },
                    COMPLETED: {
                      label: t("workerPanel.statusCompleted"),
                      bg: "#DCFCE7",
                      color: "#15803D",
                    },
                    IN_PROGRESS: {
                      label: t("workerPanel.statusInProgress"),
                      bg: "#DBEAFE",
                      color: "#1D4ED8",
                    },
                    PENDING: {
                      label: t("workerPanel.statusPending", "Pending"),
                      bg: "#F3F4F6",
                      color: "#4B5563",
                    },
                  }[penalty.orderStatus] || {
                    label: penalty.orderStatus,
                    bg: "#F3F4F6",
                    color: "#4B5563",
                  };

                  return (
                    <div
                      key={penalty.id}
                      style={{
                        border: "1px solid #FCD34D",
                        background: "var(--surface1)",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      {/* Card header */}
                      <div
                        style={{
                          padding: "9px 14px",
                          background: "#FEF3C7",
                          borderBottom: "1px solid #FCD34D",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: "#92400E",
                          }}
                        >
                          #{penalty.billNumber}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text1)",
                            flex: 1,
                            minWidth: 60,
                          }}
                        >
                          {penalty.customerName}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: "#FCD34D",
                            color: "#92400E",
                          }}
                        >
                          {penalty.orderType}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: statusCfg.bg,
                            color: statusCfg.color,
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Card body: key info grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(130px, 1fr))",
                        }}
                      >
                        {[
                          {
                            label: t("damagedClothes.details.phoneNumber"),
                            value: penalty.phoneNumber || "—",
                          },
                          {
                            label: t(
                              "workerPanel.penaltyDate",
                              "Penalty Applied",
                            ),
                            value: formatDateTimeLocale(
                              penalty.createdAt,
                              language,
                            ),
                          },
                          {
                            label: t("workerPanel.appliedBy", "Applied By"),
                            value: penalty.createdBy?.name || "—",
                          },
                        ].map((item, i, arr) => (
                          <div
                            key={i}
                            style={{
                              padding: "8px 12px",
                              borderBottom: "1px solid #FEF3C7",
                              borderInlineEnd:
                                i < arr.length - 1
                                  ? "1px solid #FEF3C7"
                                  : "none",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text3)",
                                marginBottom: 2,
                              }}
                            >
                              {item.label}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text1)",
                              }}
                            >
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Card footer: penalty amount + view details */}
                      <div
                        style={{
                          padding: "8px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          flexWrap: "wrap",
                          background: "#FFFBEB",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "#92400E",
                              fontWeight: 600,
                            }}
                          >
                            {t("damagedClothes.details.totalPenalty")}:
                          </span>
                          <strong
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color: "#B45309",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <AfCurrencyIcon size={14} />
                            {formatCurrency(
                              penalty.totalExpense || 0,
                              language,
                            )}
                          </strong>
                        </div>
                        <button
                          className="btn btn-sm"
                          style={{
                            background: "#FEF3C7",
                            border: "1px solid #FCD34D",
                            color: "#92400E",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                          onClick={() => setSelectedPenalty(penalty)}
                        >
                          <LuEye size={13} />
                          {t("workerPanel.viewDetails", "View Details")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <>
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredOrders.map((order) => renderOrderCard(order))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <OrderDetailsModal
        order={detailOrder}
        language={language}
        t={t}
        onClose={() => setDetailOrder(null)}
      />
      <PenaltyDetailModal
        penalty={selectedPenalty}
        language={language}
        t={t}
        onClose={() => setSelectedPenalty(null)}
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
