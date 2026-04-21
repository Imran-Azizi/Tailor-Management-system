import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuScissors,
  LuSquareCheck,
  LuClipboardList,
  LuCalendarClock,
  LuUser,
  LuBell,
  LuCheck,
  LuPlay,
  LuPause,
  LuEye,
  LuPhone,
  LuHash,
  LuClock,
  LuX,
} from "react-icons/lu";

import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import { formatUserNotificationMessage } from "../lib/notifications.js";
import { formatDateTimeLocale } from "../lib/locale.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Badge,
  Spinner,
  EmptyState,
  NotificationText,
} from "../components/ui/index.jsx";

// ── Constants ──────────────────────────────────────────────────────────────────
const TYPE_V = {
  OUTFIT: "gold",
  WASKAT: "teal",
  KORTY: "amber",
  YAKHANQAQ: "red",
};
const TYPE_CLR = {
  OUTFIT: "#D97706",
  WASKAT: "#0D9488",
  KORTY: "#B45309",
  YAKHANQAQ: "#DC2626",
};

// Numeric measurement field → readable label
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
const STY_LABELS = {
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function getStatus(order) {
  if (order.isCompleted) return "completed";
  if (order.inProgress) return "inProgress";
  return "assigned";
}

function statusColor(s) {
  if (s === "completed") return "#16a34a";
  if (s === "inProgress") return "#2563EB";
  return "#D97706";
}

function fmt$(v) {
  return `$${Number(v || 0).toLocaleString()}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Measurements grid ──────────────────────────────────────────────────────────
function MeasurementsGrid({ order }) {
  const m = order.outfit || order.waskat || order.korty || order.yakhanQaq;
  if (!m)
    return (
      <p style={{ fontSize: 13, color: "var(--text3)", padding: "8px 0" }}>
        No measurements on record.
      </p>
    );

  const nums = Object.entries(NUM_LABELS)
    .filter(([k]) => m[k] != null)
    .map(([k, lbl]) => ({ k, lbl, v: m[k] }));
  const stys = Object.entries(STY_LABELS)
    .filter(([k]) => m[k])
    .map(([k, lbl]) => ({ k, lbl, v: m[k] }));
  const bools = Object.entries(BOOL_LABELS)
    .filter(([k]) => m[k] === true)
    .map(([k, lbl]) => ({ k, lbl }));

  return (
    <div>
      {nums.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
            gap: "8px 10px",
            marginBottom: 14,
          }}
        >
          {nums.map(({ k, lbl, v }) => (
            <div
              key={k}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "6px 8px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text3)",
                  marginBottom: 3,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                {lbl}
              </p>
              <p
                style={{ fontSize: 16, fontWeight: 800, color: "var(--text1)" }}
              >
                {v}
              </p>
            </div>
          ))}
        </div>
      )}
      {(stys.length > 0 || bools.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {stys.map(({ k, lbl, v }) => (
            <div
              key={k}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 20,
                color: "var(--text2)",
              }}
            >
              <span style={{ color: "var(--text3)", fontSize: 11 }}>
                {lbl}:{" "}
              </span>
              {v}
            </div>
          ))}
          {bools.map(({ k, lbl }) => (
            <div
              key={k}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                background: "#16a34a12",
                border: "1px solid #16a34a30",
                borderRadius: 20,
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <LuCheck size={11} />
              {lbl}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Order Detail Modal ─────────────────────────────────────────────────────────
function OrderDetailModal({
  order,
  onClose,
  onProgress,
  onComplete,
  progressPending,
  completePending,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const status = getStatus(order);
  const sc = statusColor(status);

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
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          width: "100%",
          maxWidth: 660,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--sh-lg)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
              {order.customer?.firstName}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text3)",
                  marginLeft: 8,
                }}
              >
                Bill #{order.customer?.billNumber}
              </span>
            </h2>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <Badge v={TYPE_V[order.type] || "gold"}>
                {getOrderTypeLabel(order.type, language)}
              </Badge>
              {order.isEmergency && <Badge v="red">⚡ Emergency</Badge>}
              {order.orderName && (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text3)",
                    fontStyle: "italic",
                  }}
                >
                  "{order.orderName}"
                </span>
              )}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 9px",
                  borderRadius: 99,
                  background: sc + "18",
                  color: sc,
                  border: `1px solid ${sc}30`,
                }}
              >
                {status === "completed"
                  ? t("orders.done")
                  : status === "inProgress"
                    ? t("myTasks.inProgress")
                    : t("myTasks.assigned")}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text3)",
              padding: 4,
            }}
          >
            <LuX size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div
          style={{
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Customer + Payment row */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            {/* Customer */}
            <div
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  marginBottom: 10,
                }}
              >
                {t("myTasks.customerInfo")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <LuUser
                    size={12}
                    style={{ color: "var(--text3)", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {order.customer?.firstName}
                  </span>
                </div>
                {order.customer?.phoneNumber && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <LuPhone
                      size={12}
                      style={{ color: "var(--text3)", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, color: "var(--text2)" }}>
                      {order.customer.phoneNumber}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <LuHash
                    size={12}
                    style={{ color: "var(--text3)", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--text2)" }}>
                    Bill #{order.customer?.billNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment */}
            <div
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  marginBottom: 10,
                }}
              >
                {t("myTasks.paymentInfo")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "var(--text3)" }}>
                    {t("myTasks.totalShort")}
                  </span>
                  <span style={{ fontWeight: 700 }}>
                    {fmt$(order.totalPrice)}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--text3)" }}>
                      {t("myTasks.discountShort")}
                    </span>
                    <span style={{ color: "#16a34a" }}>
                      − {fmt$(order.discount)}
                    </span>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "var(--text3)" }}>
                    {t("myTasks.paidShort")}
                  </span>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>
                    {fmt$(order.paidAmount)}
                  </span>
                </div>
                <div
                  style={{
                    height: 1,
                    background: "var(--border)",
                    margin: "2px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {t("myTasks.remainingShort")}
                  </span>
                  <span
                    style={{
                      fontWeight: 800,
                      color: order.remaining > 0 ? "#DC2626" : "#16a34a",
                    }}
                  >
                    {order.remaining > 0
                      ? fmt$(order.remaining)
                      : `✓ ${t("myTasks.paidDone")}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment info */}
          {order.assignedBy && (
            <div
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  marginBottom: 10,
                }}
              >
                {t("myTasks.assignmentInfo")}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <LuUser size={12} style={{ color: "var(--text3)" }} />
                  <span style={{ color: "var(--text2)" }}>
                    {t("assignment.assignedBy")}:{" "}
                    <strong>{order.assignedBy.name}</strong>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <LuCalendarClock
                    size={12}
                    style={{ color: "var(--text3)" }}
                  />
                  <span style={{ color: "var(--text2)" }}>
                    {fmtDate(order.assignedAt)}
                  </span>
                </div>
              </div>
              {order.assignmentNote && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text3)",
                    marginTop: 8,
                    fontStyle: "italic",
                    padding: "6px 10px",
                    background: "var(--surface)",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                  }}
                >
                  📌 "{order.assignmentNote}"
                </p>
              )}
            </div>
          )}

          {/* Measurements */}
          <div
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 12,
              }}
            >
              {t("myTasks.measurements")}
            </p>
            <MeasurementsGrid order={order} />
          </div>
        </div>

        {/* Footer actions */}
        {!order.isCompleted && (
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "14px 24px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                color: "var(--text2)",
              }}
            >
              Close
            </button>
            <button
              onClick={() => onProgress(order.id)}
              disabled={progressPending}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 0",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: progressPending ? "not-allowed" : "pointer",
                background: order.inProgress ? "var(--surface2)" : "#2563EB",
                color: order.inProgress ? "var(--text2)" : "#fff",
                border: `1px solid ${order.inProgress ? "var(--border)" : "#2563EB"}`,
                opacity: progressPending ? 0.7 : 1,
              }}
            >
              {order.inProgress ? <LuPause size={13} /> : <LuPlay size={13} />}
              {order.inProgress
                ? t("myTasks.stopWorking")
                : t("myTasks.startWorking")}
            </button>
            {order.remaining === 0 && (
              <button
                onClick={() => onComplete(order.id)}
                disabled={completePending}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 0",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: completePending ? "not-allowed" : "pointer",
                  opacity: completePending ? 0.7 : 1,
                }}
              >
                <LuSquareCheck size={13} />
                {t("common.complete")}
              </button>
            )}
          </div>
        )}
        {order.isCompleted && (
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "8px 20px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                color: "var(--text2)",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Order Card ─────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onView,
  onProgress,
  onComplete,
  progressPending,
  completePending,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const status = getStatus(order);
  const sc = statusColor(status);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${sc}`,
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Top row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        {/* Type icon */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: (TYPE_CLR[order.type] || "#D97706") + "18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <LuScissors
            size={17}
            style={{ color: TYPE_CLR[order.type] || "#D97706" }}
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 5,
            }}
          >
            <span
              style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}
            >
              {order.customer?.firstName}
            </span>
            <span
              style={{ fontSize: 12, color: "var(--text3)", fontWeight: 500 }}
            >
              #{order.customer?.billNumber}
            </span>
            <Badge v={TYPE_V[order.type] || "gold"}>
              {getOrderTypeLabel(order.type, language)}
            </Badge>
            {order.isEmergency && <Badge v="red">⚡ Emergency</Badge>}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 9px",
                borderRadius: 99,
                background: sc + "18",
                color: sc,
                border: `1px solid ${sc}30`,
              }}
            >
              {status === "completed"
                ? t("orders.done")
                : status === "inProgress"
                  ? t("myTasks.inProgress")
                  : t("myTasks.assigned")}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              fontSize: 12,
              color: "var(--text3)",
            }}
          >
            {order.assignedAt && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <LuCalendarClock size={11} />
                {fmtDate(order.assignedAt)}
              </span>
            )}
            {order.assignedBy && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <LuUser size={11} />
                {t("assignment.assignedBy")}: {order.assignedBy.name}
              </span>
            )}
            {order.orderName && (
              <span style={{ fontStyle: "italic" }}>"{order.orderName}"</span>
            )}
          </div>

          {order.assignmentNote && (
            <p
              style={{
                fontSize: 11,
                color: "var(--text3)",
                marginTop: 5,
                fontStyle: "italic",
              }}
            >
              📌 {order.assignmentNote}
            </p>
          )}
        </div>

        {/* Price */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>
            {fmt$(order.totalPrice)}
          </p>
          {order.discount > 0 && (
            <p style={{ fontSize: 11, color: "#16a34a" }}>
              − {fmt$(order.discount)}
            </p>
          )}
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: order.remaining > 0 ? "#DC2626" : "#16a34a",
            }}
          >
            {order.remaining > 0
              ? `${t("common.remaining", "Remaining")}: ${fmt$(order.remaining)}`
              : "✓ " + t("orders.paidInFull")}
          </p>
        </div>
      </div>

      {/* Action row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          paddingTop: 10,
          borderTop: "1px solid var(--border)",
        }}
      >
        <button
          onClick={() => onView(order)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 13px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            color: "var(--text2)",
          }}
        >
          <LuEye size={12} />
          {t("myTasks.viewDetails")}
        </button>

        {!order.isCompleted && (
          <button
            onClick={() => onProgress(order.id)}
            disabled={progressPending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 13px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: progressPending ? "not-allowed" : "pointer",
              background: order.inProgress ? "var(--surface2)" : "#2563EB18",
              color: order.inProgress ? "var(--text2)" : "#2563EB",
              border: `1px solid ${order.inProgress ? "var(--border)" : "#2563EB40"}`,
              opacity: progressPending ? 0.7 : 1,
            }}
          >
            {order.inProgress ? <LuPause size={12} /> : <LuPlay size={12} />}
            {order.inProgress
              ? t("myTasks.stopWorking")
              : t("myTasks.startWorking")}
          </button>
        )}

        {!order.isCompleted && order.remaining === 0 && (
          <button
            onClick={() => onComplete(order.id)}
            disabled={completePending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 13px",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              cursor: completePending ? "not-allowed" : "pointer",
              opacity: completePending ? 0.7 : 1,
            }}
          >
            <LuSquareCheck size={12} />
            {t("common.complete")}
          </button>
        )}

        {order.isCompleted && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              color: "#16a34a",
              fontWeight: 600,
            }}
          >
            <LuSquareCheck size={13} />
            {t("orders.done")} · {fmtDate(order.updatedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function MyTasks() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";

  const [activeTab, setActiveTab] = useState("all");
  const [viewOrder, setViewOrder] = useState(null);

  const roleColor = user?.accountType === "QICHIKAR" ? "#D97706" : "#DB2777";

  // ── Fetch all assigned orders (workers see only their own via controller) ──
  const { data: result, isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: () =>
      api.get("/orders", { params: { limit: 200 } }).then((r) => r.data),
    refetchInterval: 30_000,
  });
  const allOrders = result?.data || [];

  // ── Unread user notifications ──
  const { data: notifs = [] } = useQuery({
    queryKey: ["my-notifs-unread"],
    queryFn: () =>
      api.get("/users/me/notifications?unread=true").then((r) => r.data),
    refetchInterval: 30_000,
  });

  // ── Mutations ──
  const readAllMut = useMutation({
    mutationFn: () => api.patch("/users/me/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifs-unread"] });
      qc.invalidateQueries({ queryKey: ["my-notifs-count"] });
    },
  });

  const readOneMut = useMutation({
    mutationFn: (id) => api.patch(`/users/me/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifs-unread"] });
      qc.invalidateQueries({ queryKey: ["my-notifs-count"] });
    },
  });

  const progressMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/progress`),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      toast.success(t("myTasks.statusUpdated"));
      const updated = response.data;
      if (viewOrder?.id === updated?.id) {
        setViewOrder((prev) =>
          prev ? { ...prev, inProgress: updated.inProgress } : null,
        );
      }
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("myTasks.statusFailed"))),
  });

  const completeMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      toast.success(t("orders.completedSuccess"));
      setViewOrder(null);
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, t("orders.completeFailed"))),
  });

  // ── Stats derived from full list ──
  const stats = useMemo(
    () => ({
      total: allOrders.length,
      assigned: allOrders.filter((o) => !o.inProgress && !o.isCompleted).length,
      inProgress: allOrders.filter((o) => o.inProgress && !o.isCompleted)
        .length,
      completed: allOrders.filter((o) => o.isCompleted).length,
    }),
    [allOrders],
  );

  // ── Client-side tab filtering ──
  const filtered = useMemo(() => {
    switch (activeTab) {
      case "assigned":
        return allOrders.filter((o) => !o.inProgress && !o.isCompleted);
      case "inProgress":
        return allOrders.filter((o) => o.inProgress && !o.isCompleted);
      case "completed":
        return allOrders.filter((o) => o.isCompleted);
      default:
        return allOrders;
    }
  }, [allOrders, activeTab]);

  const tabs = [
    { key: "all", label: t("assignment.all"), count: stats.total },
    { key: "assigned", label: t("myTasks.assigned"), count: stats.assigned },
    {
      key: "inProgress",
      label: t("myTasks.inProgress"),
      count: stats.inProgress,
    },
    { key: "completed", label: t("orders.done"), count: stats.completed },
  ];

  return (
    <div style={{ padding: "0 0 40px" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: roleColor + "18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <LuScissors size={20} style={{ color: roleColor }} />
        </div>
        <div>
          <h1
            style={{
              fontSize: 21,
              fontWeight: 800,
              color: "var(--text1)",
              letterSpacing: "-.02em",
            }}
          >
            {t("myTasks.title")}
          </h1>
          <p style={{ fontSize: 12, color: "var(--text3)" }}>
            {user?.name} ·{" "}
            <span style={{ color: roleColor, fontWeight: 700 }}>
              {user?.accountType}
            </span>
          </p>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: t("myTasks.totalAssigned"),
            value: stats.total,
            color: roleColor,
            Icon: LuClipboardList,
          },
          {
            label: t("myTasks.assigned"),
            value: stats.assigned,
            color: "#D97706",
            Icon: LuClock,
          },
          {
            label: t("myTasks.inProgress"),
            value: stats.inProgress,
            color: "#2563EB",
            Icon: LuScissors,
          },
          {
            label: t("orders.done"),
            value: stats.completed,
            color: "#16a34a",
            Icon: LuSquareCheck,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text3)",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  lineHeight: 1.3,
                }}
              >
                {s.label}
              </p>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: s.color + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <s.Icon size={13} style={{ color: s.color }} />
              </div>
            </div>
            <p
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: s.color,
                letterSpacing: "-.03em",
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Notification panel ── */}
      {notifs.length > 0 && (
        <div
          style={{
            background: "#2563EB08",
            border: "1px solid #2563EB25",
            borderRadius: 12,
            marginBottom: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 16px",
              borderBottom: "1px solid #2563EB20",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LuBell size={14} style={{ color: "#2563EB" }} />
              <span
                style={{ fontSize: 13, fontWeight: 600, color: "var(--text1)" }}
              >
                {t("myTasks.newAssignments", { count: notifs.length })}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 7px",
                  background: "#2563EB",
                  color: "#fff",
                  borderRadius: 99,
                  fontWeight: 800,
                }}
              >
                {notifs.length}
              </span>
            </div>
            <button
              onClick={() => readAllMut.mutate()}
              disabled={readAllMut.isPending}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#2563EB",
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: readAllMut.isPending ? 0.6 : 1,
              }}
            >
              {t("myTasks.markAllRead")}
            </button>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {notifs.map((n) => (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 16px",
                  borderBottom: "1px solid #2563EB12",
                }}
              >
                <LuBell
                  size={12}
                  style={{ color: "#2563EB", flexShrink: 0, marginTop: 3 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <NotificationText
                    language={language}
                    style={{
                      fontSize: 12,
                      color: "var(--text1)",
                      lineHeight: 1.45,
                    }}
                  >
                    {formatUserNotificationMessage(n, t, language)}
                  </NotificationText>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text3)",
                      marginTop: 2,
                    }}
                  >
                    {formatDateTimeLocale(n.createdAt, language)}
                  </p>
                </div>
                <button
                  onClick={() => readOneMut.mutate(n.id)}
                  title={t("myTasks.markAllRead")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#2563EB",
                    padding: "3px 5px",
                    borderRadius: 5,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <LuCheck size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                background: active ? roleColor : "var(--surface2)",
                color: active ? "#fff" : "var(--text2)",
                border: `1px solid ${active ? roleColor : "var(--border)"}`,
                cursor: "pointer",
              }}
            >
              {tab.label}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: 99,
                  background: active
                    ? "rgba(255,255,255,.25)"
                    : "var(--surface)",
                  color: active ? "#fff" : "var(--text3)",
                  border: active ? "none" : "1px solid var(--border)",
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Order list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState message={t("myTasks.noTasks")} Icon={LuClipboardList} />
        ) : (
          filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onView={setViewOrder}
              onProgress={(id) => progressMut.mutate(id)}
              onComplete={(id) => completeMut.mutate(id)}
              progressPending={progressMut.isPending}
              completePending={completeMut.isPending}
            />
          ))
        )}
      </div>

      {/* ── Detail Modal ── */}
      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          onClose={() => setViewOrder(null)}
          onProgress={(id) => progressMut.mutate(id)}
          onComplete={(id) => completeMut.mutate(id)}
          progressPending={progressMut.isPending}
          completePending={completeMut.isPending}
        />
      )}
    </div>
  );
}
