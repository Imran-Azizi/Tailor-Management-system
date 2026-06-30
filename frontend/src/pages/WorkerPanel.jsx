import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuBell,
  LuCheck,
  LuClipboardList,
  LuEye,
  LuPlay,
  LuSearch,
  LuSquareCheck,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { parseNumberLocale } from "../lib/normalize.js";
import {
  getWorkerFeedbackMessage,
  workerToastOptions,
} from "../lib/workerFeedback.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
import { resolveRakhtColorHex } from "../lib/rakhtColors.js";
import {
  formatDateTimeLocale,
  formatSystemDate,
  isRtlLanguage,
  normalizeLanguage,
} from "../lib/locale.js";
import { formatCurrency } from "../lib/currency.js";
import { formatMeters } from "../lib/meters.js";
import {
  getOrderCompletionBadgeStyle,
  getOrderCompletionStatus,
} from "../lib/orderCompletionStatus.js";

import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { useWorkerPanel } from "../context/WorkerPanelContext.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";

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

const RECEIVED_CARD_VISIBILITY_MS = 60 * 1000;

function getTimestampMs(value) {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function shouldHideReceivedOrderCard(order, accountType, userId, nowMs) {
  const roleState = getRoleOrderState(order, accountType);
  if (roleState.receivedById !== userId || !roleState.receivedAt) {
    return false;
  }

  const receivedAtMs = getTimestampMs(roleState.receivedAt);
  return (
    receivedAtMs != null && nowMs - receivedAtMs >= RECEIVED_CARD_VISIBILITY_MS
  );
}

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

    // ---
    if (roleState.assignedToId && roleState.assignedToId !== userId) {
      return false;
    }
    if (roleState.receivedById && roleState.receivedById !== userId) {
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

  // ---
  let language = undefined;
  if (typeof window !== "undefined" && window.i18next) {
    language = window.i18next.language;
  }
  const isRtl = isRtlLanguage(language);

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

function OrderDetailsModal({ order, language, accountType, t, onClose }) {
  if (!order) return null;
  const orderLabel = getOrderLabelParts(order, language);
  const orderPrimaryName = getOrderPrimaryDisplayName(
    order,
    order.customer?.firstName,
    language,
  );
  const payment = getRolePaymentState(order, order?.assignedTo?.accountType);
  const completionStatus = getOrderCompletionStatus(order, t);
  const isCompleted = isWorkerCompletedForRole(order, accountType);
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

  const isRtl = isRtlLanguage(language);
  const showCompletionBadge = !isCompleted;
  const rakhtColorName =
    typeof order?.rakhtColor === "string"
      ? order.rakhtColor.trim()
      : order?.rakhtColor;
  const renderRakhtColorValue = (colorName, colorHex) => {
    const swatchHex = resolveRakhtColorHex(colorName, colorHex);
    const safeColorName =
      typeof colorName === "string" ? colorName.trim() : colorName;

    return (
      <span className="worker-rakht-color-value">
        {swatchHex ? (
          <span
            className="worker-rakht-color-value__swatch"
            style={{ background: swatchHex }}
          />
        ) : null}
        <span>{safeColorName}</span>
      </span>
    );
  };
  const rakhtRows = [
    [t("rakht.brandName", { defaultValue: "Brand" }), order?.rakhtBrandName],
    ...(rakhtColorName
      ? [
          [
            t("rakht.color", { defaultValue: "Color" }),
            renderRakhtColorValue(rakhtColorName, order?.rakhtColorHex),
          ],
        ]
      : []),
    [
      t("rakht.requiredMeters", {
        defaultValue: "Required Meters",
      }),
      order?.rakhtRequiredMeters != null
        ? formatMeters(order.rakhtRequiredMeters)
        : "",
    ],
  ].filter(([, value]) => value != null && String(value).trim() !== "");

  const summaryRows = [
    [t("workerPanel.price", "Price"), formatCurrency(priceValue, language)],
    [
      t("workerPanel.updatedOn", "Updated"),
      fmtDate(payment.paidAt || order.updatedAt, language),
    ],
  ];

  const primaryDetailSections = [
    {
      title: t("workerPanel.orderSummary", "Order Summary"),
      rows: summaryRows,
    },
    {
      title: t("createOrder.rakhtSelection", {
        defaultValue: "Rakht Selection",
      }),
      rows: rakhtRows,
    },
  ];

  const pairedDetailSections = [
    {
      title: t("createOrder.measurements", "Measurements"),
      rows: measurementRows.map(([key, tKey]) => [t(tKey), measure[key]]),
    },
    {
      title: t("createOrder.styleOptions", "Styling Details"),
      rows: [...styleRows, ...booleanRows].map(([key, tKey]) => [
        t(tKey),
        measure[key] === true ? t("common.yes", "Yes") : measure[key],
      ]),
    },
  ];

  const renderTitledDetailTable = (section) => (
    <>
      <div className="worker-detail-table-title">{section.title}</div>
      <div className="worker-detail-table-scroll">
        <table className="worker-detail-table">
          <thead>
            <tr>
              <th>{t("common.field", "Field")}</th>
              <th>{t("common.value", "Value")}</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.length ? (
              section.rows.map(([label, value]) => (
                <tr key={`${section.title}-${label}`}>
                  <td>{label}</td>
                  <td>{value}</td>
                </tr>
              ))
            ) : (
              <tr className="worker-detail-table__empty-row">
                <td colSpan={2}>-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-4"
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
      <div
        className="worker-details-modal max-h-[82vh] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        dir={isRtl ? "rtl" : "ltr"}
        style={{
          width: "min(760px, calc(100vw - 28px))",
          maxWidth: "760px",
        }}
      >
        <div className="worker-details-modal__header">
          <div className="min-w-0">
            <h2>
              {orderPrimaryName}
            </h2>
            <div className="worker-details-modal__meta">
              <span>#{order.customer?.billNumber || "-"}</span>
              <span>{orderLabel.typeWithSequenceLabel}</span>
            </div>
            {showCompletionBadge ? (
              <div className="worker-details-modal__status">
              <span
                className="badge"
                style={getOrderCompletionBadgeStyle(completionStatus)}
                title={completionStatus.detail || completionStatus.label}
              >
                {completionStatus.label}
              </span>
              {completionStatus.detail ? (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {completionStatus.detail}
                </span>
              ) : null}
              </div>
            ) : null}
          </div>
          <button
            className="worker-details-modal__close"
            onClick={onClose}
            aria-label={t("common.close", "Close")}
          >
            <LuX size={18} />
          </button>
        </div>

        <div className="worker-details-modal__body">
          <section
            className="worker-detail-section worker-detail-section--unified"
            aria-label={t("myTasks.orderDetails", "Order Details")}
          >
            <div className="worker-detail-primary-stack">
              {primaryDetailSections.map((section) => (
                <div className="worker-detail-primary-panel" key={section.title}>
                  {renderTitledDetailTable(section)}
                </div>
              ))}
            </div>
            <div className="worker-detail-paired-grid">
              {pairedDetailSections.map((section) => (
                <div className="worker-detail-paired-panel" key={section.title}>
                  {renderTitledDetailTable(section)}
                </div>
              ))}
            </div>
          </section>
        </div>

        <style>{`
          .worker-details-modal {
            color: var(--text1, #0f172a);
          }

          .worker-details-modal__header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: .65rem;
            padding: .68rem .76rem;
            border-bottom: 1px solid var(--border, #e2e8f0);
            background: linear-gradient(180deg, color-mix(in srgb, var(--surface2, #f8fafc) 70%, var(--surface, #fff)), var(--surface, #fff));
          }

          .worker-details-modal__header h2 {
            margin: 0;
            color: var(--text1, #0f172a);
            font-size: clamp(.98rem, 1.8vw, 1.12rem);
            font-weight: 900;
            line-height: 1.3;
            letter-spacing: 0;
          }

          .worker-details-modal__meta,
          .worker-details-modal__status {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: .3rem;
            margin-top: .34rem;
          }

          .worker-details-modal__meta span {
            min-height: 23px;
            display: inline-flex;
            align-items: center;
            border: 1px solid var(--border, #e2e8f0);
            border-radius: 999px;
            background: var(--surface, #fff);
            color: var(--text2, #64748b);
            font-size: .7rem;
            font-weight: 800;
            padding: .16rem .46rem;
          }

          .worker-details-modal__close {
            width: 29px;
            height: 29px;
            display: inline-grid;
            place-items: center;
            flex: 0 0 auto;
            border: 1px solid var(--border, #e2e8f0);
            border-radius: 9px;
            color: var(--text2, #64748b);
            background: var(--surface, #fff);
            cursor: pointer;
            transition: transform .16s ease, border-color .16s ease, color .16s ease;
          }

          .worker-details-modal__close:hover {
            transform: translateY(-1px);
            color: var(--primary, #2563eb);
            border-color: color-mix(in srgb, var(--primary, #2563eb) 34%, var(--border, #e2e8f0));
          }

          .worker-details-modal__body {
            display: grid;
            gap: .6rem;
            padding: .68rem;
          }

          .worker-detail-section {
            border: 1px solid var(--border, #e2e8f0);
            border-radius: 14px;
            background: color-mix(in srgb, var(--surface2, #f8fafc) 34%, var(--surface, #fff));
          }

          .worker-detail-section {
            overflow: hidden;
          }

          .worker-detail-section--unified {
            box-shadow: 0 14px 34px rgba(15, 23, 42, .07);
          }

          .worker-detail-primary-stack {
            display: grid;
            gap: .68rem;
            padding: .68rem;
            background: color-mix(in srgb, var(--surface2, #f8fafc) 46%, var(--surface, #fff));
          }

          .worker-detail-primary-panel {
            min-width: 0;
            overflow: hidden;
            border: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 86%, transparent);
            border-radius: 12px;
            background: var(--surface, #fff);
            box-shadow: 0 10px 22px rgba(15, 23, 42, .045);
          }

          .worker-detail-paired-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: .68rem;
            padding: .68rem;
            border-top: 1px solid var(--border, #e2e8f0);
            background: color-mix(in srgb, var(--surface2, #f8fafc) 58%, var(--surface, #fff));
          }

          .worker-detail-paired-panel {
            min-width: 0;
            overflow: hidden;
            border: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 86%, transparent);
            border-radius: 12px;
            background: var(--surface, #fff);
            box-shadow: 0 10px 22px rgba(15, 23, 42, .045);
          }

          .worker-detail-table-title {
            padding: .74rem .82rem .68rem;
            border-bottom: 1px solid color-mix(in srgb, var(--primary, #2563eb) 18%, var(--border, #e2e8f0));
            background: linear-gradient(90deg, color-mix(in srgb, var(--primary, #2563eb) 12%, var(--surface2, #f8fafc)), var(--surface, #fff));
            color: var(--text1, #0f172a);
            font-size: .84rem;
            font-weight: 950;
            line-height: 1.45;
          }

          .worker-detail-paired-panel .worker-detail-table {
            min-width: 320px;
          }

          .worker-detail-paired-panel .worker-detail-table th {
            top: 0;
          }

          .worker-rakht-color-value {
            display: inline-flex;
            align-items: center;
            gap: .5rem;
            max-width: 100%;
            vertical-align: middle;
          }

          .worker-rakht-color-value__swatch {
            width: 1rem;
            height: 1rem;
            flex: 0 0 auto;
            border-radius: 999px;
            border: 2px solid var(--surface, #fff);
            box-shadow:
              0 0 0 1px color-mix(in srgb, var(--border, #e2e8f0) 86%, #94a3b8),
              0 2px 6px rgba(15, 23, 42, .16);
          }

          .worker-detail-section h3 {
            margin: 0;
            padding: .45rem .55rem;
            border-bottom: 1px solid var(--border, #e2e8f0);
            color: var(--text1, #0f172a);
            font-size: .78rem;
            font-weight: 900;
            line-height: 1.5;
          }

          .worker-detail-table-scroll {
            width: 100%;
            overflow-x: auto;
            overscroll-behavior-inline: contain;
            scrollbar-width: thin;
            scrollbar-color: color-mix(in srgb, var(--primary, #2563eb) 36%, transparent) transparent;
          }

          .worker-detail-table {
            width: 100%;
            min-width: 560px;
            border-collapse: collapse;
            background: var(--surface, #fff);
          }

          .worker-detail-table th,
          .worker-detail-table td {
            padding: .62rem .72rem;
            border-bottom: 1px solid color-mix(in srgb, var(--border, #e2e8f0) 82%, transparent);
            text-align: left;
            vertical-align: top;
            line-height: 1.55;
          }

          .worker-detail-table th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: color-mix(in srgb, var(--surface2, #f8fafc) 72%, var(--surface, #fff));
            color: var(--text2, #64748b);
            font-size: .7rem;
            font-weight: 900;
            letter-spacing: .02em;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .worker-detail-table td {
            color: var(--text1, #0f172a);
            font-size: .8rem;
            font-weight: 800;
            overflow-wrap: anywhere;
          }

          .worker-detail-table td:first-child {
            width: 36%;
            color: var(--text2, #64748b);
            font-size: .74rem;
            font-weight: 900;
            white-space: nowrap;
          }

          .worker-detail-table tbody tr:last-child td {
            border-bottom: 0;
          }

          .worker-detail-table__section-row td {
            padding: .72rem .78rem;
            background: linear-gradient(90deg, color-mix(in srgb, var(--primary, #2563eb) 12%, var(--surface2, #f8fafc)), var(--surface2, #f8fafc));
            border-top: 1px solid color-mix(in srgb, var(--primary, #2563eb) 18%, var(--border, #e2e8f0));
            border-bottom: 1px solid color-mix(in srgb, var(--primary, #2563eb) 18%, var(--border, #e2e8f0));
            color: var(--text1, #0f172a);
            font-size: .82rem;
            font-weight: 950;
            letter-spacing: 0;
          }

          .worker-detail-table tbody .worker-detail-table__section-row:first-child td {
            border-top: 0;
          }

          .worker-detail-table__empty-row td {
            padding: .72rem .78rem;
            color: var(--text3, #94a3b8);
            font-weight: 800;
            background: var(--surface, #fff);
          }

          .worker-details-modal[dir="rtl"],
          .worker-details-modal[dir="rtl"] h2,
          .worker-details-modal[dir="rtl"] h3,
          .worker-details-modal[dir="rtl"] .worker-detail-table th,
          .worker-details-modal[dir="rtl"] .worker-detail-table td {
            text-align: right;
          }

          .worker-details-modal[dir="rtl"] .worker-detail-table__section-row td {
            background: linear-gradient(270deg, color-mix(in srgb, var(--primary, #2563eb) 12%, var(--surface2, #f8fafc)), var(--surface2, #f8fafc));
          }

          .worker-details-modal[dir="rtl"] .worker-detail-table-title {
            text-align: right;
            background: linear-gradient(270deg, color-mix(in srgb, var(--primary, #2563eb) 12%, var(--surface2, #f8fafc)), var(--surface, #fff));
          }

          .worker-details-modal[dir="rtl"] .worker-details-modal__header,
          .worker-details-modal[dir="rtl"] .worker-details-modal__meta,
          .worker-details-modal[dir="rtl"] .worker-details-modal__status {
            direction: rtl;
          }

          @media (max-width: 680px) {
            .worker-details-modal {
              max-height: 90vh;
              border-radius: 12px;
            }

            .worker-details-modal__header {
              gap: .52rem;
            }

            .worker-detail-table-scroll {
              -webkit-overflow-scrolling: touch;
            }

            .worker-detail-table {
              min-width: 560px;
            }
          }

          @media (max-width: 760px) {
            .worker-detail-paired-grid {
              grid-template-columns: 1fr;
              gap: .58rem;
              padding: .58rem;
            }

            .worker-detail-primary-stack {
              gap: .58rem;
              padding: .58rem;
            }

            .worker-detail-paired-panel .worker-detail-table {
              min-width: 440px;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

// ---
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
    READY_FOR_DELIVERY: {
      label: t("orderCompletion.readyForDelivery"),
      bg: "var(--green-bg, #DCFCE7)",
      color: "var(--green-fg, #15803D)",
    },
    QICHIKAR_COMPLETED: {
      label: t("orderCompletion.qichikarCompleted", {
        name: t("orderCompletion.qichikarFallback", "Qichikar"),
      }),
      bg: "#DBEAFE",
      color: "#2563EB",
    },
    DOKHT_COMPLETED: {
      label: t("orderCompletion.dokhtCompleted", {
        name: t("orderCompletion.dokhtFallback", "Dokht worker"),
      }),
      bg: "#FEF3C7",
      color: "#D97706",
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
          <div className="order-scroll-x overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {[
                  [
                    t("damagedClothes.details.billNumber"),
                    `#${penalty.billNumber}`,
                  ],
                  [
                    t("damagedClothes.details.customerName"),
                    penalty.customerName || "\u2014",
                  ],
                  [
                    t("damagedClothes.details.phoneNumber"),
                    penalty.phoneNumber || "\u2014",
                  ],
                  [
                    t("damagedClothes.details.orderType"),
                    penalty.orderType || "\u2014",
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
          <div className="order-scroll-x overflow-x-auto">
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
          <div className="order-scroll-x overflow-x-auto">
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
                      "Daily Expense",
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
            {penalty.createdBy?.name || "\u2014"}
          </strong>
        </div>
      </div>
    </div>
  );
}

export default function WorkerPanel() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { viewMonth, viewYear, setViewMonth, setViewYear } = useMonth();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const feedbackToastOptions = useMemo(
    () => workerToastOptions(language),
    [language],
  );
  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;
  const workerScope = [user?.id, user?.accountType];

  const { activeTab, setActiveTab, setTabs } = useWorkerPanel();

  const [billSearch, setBillSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearchAttempt, setHasSearchAttempt] = useState(false);
  const [isOrderReceiveModalOpen, setIsOrderReceiveModalOpen] =
    useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [optimisticInProgressIds, setOptimisticInProgressIds] = useState([]);
  const [optimisticCompletedIds, setOptimisticCompletedIds] = useState([]);
  const [receiveSuccessIds, setReceiveSuccessIds] = useState([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const receiveSuccessTimersRef = useRef({});

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(receiveSuccessTimersRef.current).forEach((timerId) => {
        clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    if (!isOrderReceiveModalOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOrderReceiveModalOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOrderReceiveModalOpen]);

  useEffect(() => {
    if (!location.state?.openOrderReceiveModal) return;

    setIsOrderReceiveModalOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state?.openOrderReceiveModal, navigate]);

  const {
    data: orderPayload,
    isLoading,
    isError: ordersLoadFailed,
  } = useQuery({
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
        }, RECEIVED_CARD_VISIBILITY_MS);
        finishReceiveUpdate();
      } else {
        finishReceiveUpdate();
      }

      setActiveTab("assigned");
      toast.success(
        t(
          "workerPanel.orderReceivedAdminNotified",
          "Order received - Admin notified",
        ),
        feedbackToastOptions,
      );
      setConfirmAction(null);
    },
    onError: (error) => {
      toast.error(
        getWorkerFeedbackMessage(
          error,
          t,
          language,
          "workerPanel.failedReceiveOrder",
          t("workerPanel.failedReceiveOrder", "Failed to receive order"),
        ),
        feedbackToastOptions,
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
        feedbackToastOptions,
      );
      setOptimisticInProgressIds((prev) => prev.filter((item) => item !== id));
      if (updated?.inProgress) setActiveTab("inProgress");
      refreshSearchResult();
      setConfirmAction(null);
    },
    onError: (error, id) => {
      setOptimisticInProgressIds((prev) => prev.filter((item) => item !== id));
      toast.error(
        getWorkerFeedbackMessage(
          error,
          t,
          language,
          "workerPanel.failedUpdateStatus",
          t("workerPanel.failedUpdateStatus", "Failed to update status"),
        ),
        feedbackToastOptions,
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
        feedbackToastOptions,
      );
      setActiveTab("completed");
      refreshSearchResult();
      setConfirmAction(null);
      setOptimisticCompletedIds([]);
    },
    onError: (error) => {
      setOptimisticCompletedIds([]);
      toast.error(
        getWorkerFeedbackMessage(
          error,
          t,
          language,
          "workerPanel.failedCompleteOrder",
          t("workerPanel.failedCompleteOrder", "Failed to complete order"),
        ),
        feedbackToastOptions,
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

  const damagedPenalties = Array.isArray(damagedPenaltyPayload?.data)
    ? damagedPenaltyPayload.data
    : [];

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
  const visibleSearchResultOrders = useMemo(() => {
    const resultOrders = Array.isArray(searchResult?.orders)
      ? searchResult.orders
      : [];
    return resultOrders.filter(
      (order) =>
        !shouldHideReceivedOrderCard(order, user?.accountType, user?.id, nowMs),
    );
  }, [nowMs, searchResult?.orders, user?.accountType, user?.id]);

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
  ];

  useEffect(() => {
    setTabs(tabs);
  }, [
    setTabs,
    stats.all,
    stats.assigned,
    stats.inProgress,
    stats.completed,
    damagedPenaltyPayload?.total,
    language,
  ]);

  const activeTabMeta = tabs.find((tab) => tab.key === activeTab) || tabs[0];

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
      // ---
    }
  };

  const onSearch = async () => {
    const parsed = parseNumberLocale(billSearch.trim());
    setHasSearchAttempt(true);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(
        t("assignment.invalidBillNumber", "Enter a valid bill number."),
        feedbackToastOptions,
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
      toast.success(
        t("createOrder.customerFound", "Customer found"),
        feedbackToastOptions,
      );
    } catch (error) {
      setSearchResult(null);
      toast.error(
        getWorkerFeedbackMessage(
          error,
          t,
          language,
          "workerPanel.feedback.searchFailed",
          t("assignment.noOrdersFound", "No orders found for this bill."),
        ),
        feedbackToastOptions,
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
          // ---
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
          "Receive this order to add it to your received orders list. Admin will be notified.",
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
    const completionStatus = getOrderCompletionStatus(order, t);
    const isCompleted =
      isWorkerCompletedForRole(order, user?.accountType) ||
      optimisticCompletedIds.includes(order.id);
    const roleState = getRoleOrderState(order, user?.accountType);
    const isInProgress =
      roleState.inProgress || optimisticInProgressIds.includes(order.id);
    const receivedByCurrentUser = roleState.receivedById === user?.id;
    const canReceive = canOrderBeReceived(order);
    const canStart = !isCompleted && receivedByCurrentUser && !isInProgress;
    const canComplete = !isCompleted && receivedByCurrentUser && isInProgress;
    const typeColor = TYPE_COLORS[order.type] || cfg.color;
    const payment = getRolePaymentState(order, user?.accountType);
    const paidToWorker = payment.status === "PAID_TO_WORKER";

    return (
      <article
        key={`${source}-${order.id}`}
        className="worker-order-card"
        style={{ "--order-accent": typeColor }}
      >
        <div className="worker-order-card__head">
          <div className="worker-order-card__badges">
            <span
              className="worker-order-card__type-badge"
              style={{
                background: `${typeColor}14`,
                color: typeColor,
                borderColor: `${typeColor}35`,
              }}
            >
              {orderLabel.typeWithSequenceLabel}
            </span>
            {!isCompleted && (
              <span
                className="worker-order-card__status-badge"
                style={getOrderCompletionBadgeStyle(completionStatus)}
                title={completionStatus.detail || completionStatus.label}
              >
                {completionStatus.label}
              </span>
            )}
            {isCompleted && (
              <span className="worker-order-card__status-badge worker-order-card__status-badge--done">
                {t("workerPanel.statusCompleted", "Completed")}
              </span>
            )}
          </div>
          <span className="worker-order-card__bill">
            #{order.customer?.billNumber || "-"}
          </span>
        </div>

        <div className="worker-order-card__body">
          <h3 className="worker-order-card__customer">
            {getOrderPrimaryDisplayName(
              order,
              order.customer?.firstName,
              language,
            )}
          </h3>

          {(order?.rakhtBrandName || order?.rakhtColor) && (
            <div className="order-mobile-rakht worker-order-card__rakht">
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

          <div className="worker-order-card__meta">
            {receivedByCurrentUser && roleState.receivedAt ? (
              <div className="worker-order-card__meta-item">
                <span className="worker-order-card__meta-label">
                  {t("workerPanel.receivedOn", "Received on")}
                </span>
                <span className="worker-order-card__meta-value">
                  {fmtDate(roleState.receivedAt, language)}
                </span>
              </div>
            ) : (
              order.assignedBy && (
                <div className="worker-order-card__meta-item">
                  <span className="worker-order-card__meta-label">
                    {t("workerPanel.assignedBy", "Received from")}
                  </span>
                  <span className="worker-order-card__meta-value">
                    {order.assignedBy.name}
                  </span>
                </div>
              )
            )}
            <div className="worker-order-card__meta-item">
              <span className="worker-order-card__meta-label">
                {t("workerPanel.price", "Price")}
              </span>
              <span
                className={`worker-order-card__meta-value worker-order-card__price${paidToWorker ? " worker-order-card__price--paid" : ""}`}
              >
                {paidToWorker
                  ? formatCurrency(payment.amount || 0, language)
                  : order.assignmentPrice != null
                    ? formatCurrency(order.assignmentPrice, language)
                    : "-"}
                {!paidToWorker && order.assignmentPrice != null && (
                  <span className="worker-order-card__price-hint">
                    ({t("workerPanel.assignedPrice", "order price")})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="worker-order-card__actions">
          <button
            type="button"
            className="worker-order-card__btn worker-order-card__btn--view"
            onClick={() => setDetailOrder(order)}
          >
            <LuEye size={14} />
            {t("workerPanel.view", "View")}
          </button>

          <button
            type="button"
            className="worker-order-card__btn worker-order-card__btn--start"
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
              <LuCheck size={14} />
            ) : (
              <LuPlay size={14} />
            )}
            {t("workerPanel.startWork", "Start Work")}
          </button>

          <button
            type="button"
            className={`worker-order-card__btn worker-order-card__btn--complete${isCompleted ? " is-done" : ""}`}
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
            <LuSquareCheck size={14} />
            {isCompleted
              ? t("workerPanel.statusCompleted", "Completed")
              : t("workerPanel.complete", "Complete")}
          </button>
        </div>
      </article>
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

  // ---
  const lang =
    typeof i18n !== "undefined" && i18n.resolvedLanguage
      ? i18n.resolvedLanguage
      : typeof language !== "undefined"
        ? language
        : "en";
  const isRtl = isRtlLanguage(lang);

  return (
    <div className="worker-panel-page" dir={isRtl ? "rtl" : "ltr"}>
      {newAssignedOrders.length > 0 && (
        <section className="worker-panel-assignments">
          <div className="worker-panel-assignments__head">
            <div className="worker-panel-assignments__title-wrap">
              <LuBell size={16} style={{ color: cfg.color }} />
              <strong>{t("workerPanel.newAssignments", "New Orders")}</strong>
              <span
                className="worker-panel-assignments__count"
                style={{ background: cfg.color }}
              >
                {newAssignedOrders.length}
              </span>
            </div>
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
        </section>
      )}

      <section className="worker-panel-orders">
        <div className="worker-panel-orders__head">
          <h2 className="worker-panel-orders__title">{activeTabMeta?.label}</h2>
          <span
            className="worker-panel-orders__count"
            style={{ background: `${cfg.color}14`, color: cfg.color }}
          >
            {activeTabMeta?.count ?? 0}
          </span>
        </div>

        <div className="worker-panel-orders__body">
          {activeTab === "penalties" ? (
            damagedPenaltyLoading ? (
              <div className="worker-panel-orders__empty">
                {t("common.loading", "Loading...")}
              </div>
            ) : damagedPenalties.length === 0 ? (
              <div className="worker-panel-orders__empty">
                <LuClipboardList size={36} />
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
                    READY_FOR_DELIVERY: {
                      label: t("orderCompletion.readyForDelivery"),
                      bg: "#DCFCE7",
                      color: "#15803D",
                    },
                    QICHIKAR_COMPLETED: {
                      label: t("orderCompletion.qichikarCompleted", {
                        name: t("orderCompletion.qichikarFallback", "Qichikar"),
                      }),
                      bg: "#DBEAFE",
                      color: "#2563EB",
                    },
                    DOKHT_COMPLETED: {
                      label: t("orderCompletion.dokhtCompleted", {
                        name: t(
                          "orderCompletion.dokhtFallback",
                          "Dokht worker",
                        ),
                      }),
                      bg: "#FEF3C7",
                      color: "#D97706",
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
                            value: penalty.phoneNumber || "\u2014",
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
                            value: penalty.createdBy?.name || "\u2014",
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
                <div className="worker-panel-orders__empty">
                  {t("workerPanel.loadingOrders", "Loading orders...")}
                </div>
              ) : null}

              {!isLoading && filteredOrders.length === 0 ? (
                <div className="worker-panel-orders__empty">
                  <LuClipboardList size={36} />
                  <div>
                    {t(
                      "workerPanel.noOrdersInCategory",
                      "No orders in this category.",
                    )}
                  </div>
                </div>
              ) : null}

              {!isLoading && filteredOrders.length > 0 ? (
                <div className="worker-panel-orders__grid">
                  {filteredOrders.map((order) => renderOrderCard(order))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      {isOrderReceiveModalOpen && (
        <div
          className="worker-order-receive-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsOrderReceiveModalOpen(false);
            }
          }}
        >
          <section
            className="worker-order-receive-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="worker-order-receive-modal-title"
          >
            <header className="worker-order-receive-modal__header">
              <div className="worker-order-receive-modal__heading">
                <span
                  className="worker-order-receive-modal__icon"
                  style={{ background: cfg.color + "18", color: cfg.color }}
                >
                  <LuClipboardList size={19} />
                </span>
                <div>
                  <h2 id="worker-order-receive-modal-title">
                    {t("workerPanel.receiveOrders", "Receive Orders")}
                  </h2>
                  <p>
                    {t(
                      "workerPanel.receiveOrdersDescription",
                      "Search by bill number to receive an order.",
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="worker-order-receive-modal__close"
                onClick={() => setIsOrderReceiveModalOpen(false)}
                aria-label={t("common.close", "Close")}
              >
                <LuX size={19} />
              </button>
            </header>

            <div className="worker-order-receive-modal__body">
              <label
                className="worker-order-receive-modal__label"
                htmlFor="worker-order-bill-search"
              >
                {t("workerPanel.billNumberLabel", "Bill Number")}
              </label>
              <div className="worker-panel-search__inner">
                <LuSearch size={16} className="worker-panel-search__icon" />
                <input
                  id="worker-order-bill-search"
                  className="worker-panel-search__input"
                  inputMode="numeric"
                  autoFocus
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
                <button
                  type="button"
                  className="worker-panel-search__btn"
                  style={{ background: cfg.color }}
                  onClick={onSearch}
                  disabled={searchLoading}
                >
                  {searchLoading
                    ? t("common.loading", "Loading...")
                    : t("common.search", "Search")}
                </button>
              </div>

              {visibleSearchResultOrders.length ? (
                <div className="worker-panel-search__results">
                  {visibleSearchResultOrders.map((order) =>
                    renderSearchResultCard(order),
                  )}
                </div>
              ) : hasSearchAttempt && !searchResult?.orders?.length ? (
                <p className="worker-panel-search__empty">
                  {t(
                    "workerPanel.noOrderFoundByBill",
                    "No order found for this bill number.",
                  )}
                </p>
              ) : null}
            </div>
          </section>
        </div>
      )}

      <OrderDetailsModal
        order={detailOrder}
        language={language}
        accountType={user?.accountType}
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



