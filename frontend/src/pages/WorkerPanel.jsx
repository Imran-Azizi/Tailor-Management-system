import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  LuClipboardList,
  LuPlay,
  LuPause,
  LuSquareCheck,
  LuBell,
  LuCheck,
  LuUser,
  LuPhone,
  LuHash,
  LuClock,
  LuX,
  LuEye,
  LuCalendar,
  LuPrinter,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { useAuth } from "../context/AuthContext.jsx";

// ── Role config ────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  DOKHT: {
    color: "#DB2777",
    colorBg: "#DB277714",
    colorBd: "#DB277730",
    label: "Dokht",
    emoji: "🪡",
    greeting: "Welcome back",
  },
  QICHIKAR: {
    color: "#D97706",
    colorBg: "#D9770614",
    colorBd: "#D9770630",
    label: "Qichikar",
    emoji: "✂️",
    greeting: "Welcome back",
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
function statusLabel(s) {
  if (s === "completed") return "Completed";
  if (s === "inProgress") return "In Progress";
  return "Assigned";
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
function formatKey(k) {
  return k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ── Print handler ──────────────────────────────────────────────────────────────
function buildPrintHTML(order, isWorker = false) {
  const m =
    order.outfit || order.waskat || order.korty || order.yakhanQaq || {};
  const nums = Object.entries(NUM_LABELS)
    .filter(([k]) => m[k] != null)
    .map(
      ([k, lbl]) =>
        `<div class="meas"><span>${lbl}</span><strong>${m[k]}</strong></div>`,
    )
    .join("");
  const styles = Object.entries(STY_LABELS)
    .filter(([k]) => m[k])
    .map(([k, lbl]) => `<div class="sty">${lbl}: <b>${m[k]}</b></div>`)
    .join("");
  const bools = Object.entries(BOOL_LABELS)
    .filter(([k]) => m[k] === true)
    .map(([, lbl]) => `<div class="bool">✓ ${lbl}</div>`)
    .join("");

  const assnLine = order.assignedBy
    ? `<p><b>Assigned by:</b> ${order.assignedBy.name} on ${fmtDate(order.assignedAt)}</p>`
    : "";
  const noteLine = order.assignmentNote
    ? `<p><b>Note:</b> ${order.assignmentNote}</p>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Order – Bill #${order.customer?.billNumber}</title>
<style>
  body{font-family:Arial,sans-serif;margin:24px;color:#111;font-size:13px}
  h1{font-size:20px;margin:0 0 4px}
  h2{font-size:14px;margin:18px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
  .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:2px solid #111;padding-bottom:12px}
  .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700;background:#f3f4f6;border:1px solid #d1d5db;margin-right:6px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:12px}
  .info-grid p{margin:0;line-height:1.6}
  .meas-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
  .meas{border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;display:flex;flex-direction:column;align-items:center}
  .meas span{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
  .meas strong{font-size:16px;font-weight:800;margin-top:2px}
  .sty-grid{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
  .sty,.bool{font-size:12px;padding:3px 10px;border-radius:20px;background:#f3f4f6;border:1px solid #e5e7eb}
  .bool{background:#f0fdf4;border-color:#bbf7d0;color:#15803d}
  .pay-row{display:flex;justify-content:space-between;border-bottom:1px solid #f3f4f6;padding:4px 0}
  @media print{body{margin:12px}}
</style></head><body>
<div class="top">
  <div>
    <h1>${order.customer?.firstName || "—"}</h1>
    <div>
      <span class="badge">${order.type}</span>
      ${order.isEmergency ? '<span class="badge" style="background:#fee2e2;border-color:#fca5a5;color:#b91c1c">⚡ Emergency</span>' : ""}
      <span class="badge" style="${order.isCompleted ? "background:#f0fdf4;border-color:#bbf7d0;color:#15803d" : ""}">${order.isCompleted ? "Completed" : order.inProgress ? "In Progress" : "Assigned"}</span>
    </div>
  </div>
  <div style="text-align:right">
    <div style="font-size:11px;color:#6b7280">Bill Number</div>
    <div style="font-size:28px;font-weight:900">#${order.customer?.billNumber}</div>
    <div style="font-size:11px;color:#6b7280">${new Date().toLocaleDateString()}</div>
  </div>
</div>

<h2>Customer Information</h2>
<div class="info-grid">
  <p><b>Name:</b> ${order.customer?.firstName || "—"}</p>
  <p><b>Bill #:</b> ${order.customer?.billNumber || "—"}</p>
  <p><b>Phone:</b> ${order.customer?.phoneNumber || "—"}</p>
  <p><b>Order Type:</b> ${order.type}</p>
  ${order.quantity > 1 ? `<p><b>Quantity:</b> ${order.quantity} pieces</p>` : ""}
</div>

${!isWorker ? `<h2>Payment Summary</h2>
<div style="max-width:320px">
  <div class="pay-row"><span>Total Price</span><b>${fmt$(order.totalPrice)}</b></div>
  <div class="pay-row"><span>Discount</span><b>-${fmt$(order.discount)}</b></div>
  <div class="pay-row"><span>Paid</span><b>${fmt$(order.paidAmount)}</b></div>
  <div class="pay-row"><span>Remaining</span><b style="color:${Number(order.remaining) > 0 ? "#b91c1c" : "#15803d"}">${fmt$(order.remaining)}</b></div>
</div>` : ""}

${assnLine || noteLine ? `<h2>Assignment Info</h2><div class="info-grid">${assnLine}${noteLine}</div>` : ""}

${nums ? `<h2>Measurements</h2><div class="meas-grid">${nums}</div>` : ""}

${styles || bools ? `<h2>Style Information</h2><div class="sty-grid">${styles}${bools}</div>` : ""}

</body></html>`;
}

function printOrder(order, isWorker = false) {
  const win = window.open("", "_blank", "width=850,height=700");
  if (!win) {
    toast.error("Allow popups to print");
    return;
  }
  win.document.write(buildPrintHTML(order, isWorker));
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, bg, border }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 11,
          background: bg,
          border: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 11,
            color: "var(--text3)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: ".05em",
            marginBottom: 4,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "var(--text1)",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function MeasurementsGrid({ order }) {
  const m = order.outfit || order.waskat || order.korty || order.yakhanQaq;
  if (!m)
    return (
      <p style={{ fontSize: 13, color: "var(--text3)", padding: "8px 0" }}>
        No measurements recorded.
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
            gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
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
                padding: "7px 8px",
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
                style={{ fontSize: 17, fontWeight: 800, color: "var(--text1)" }}
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
                padding: "4px 11px",
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
                padding: "4px 11px",
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

function InfoCard({ title, children }) {
  return (
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
        {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {children}
      </div>
    </div>
  );
}
function InfoRow({ icon, label, bold }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ color: "var(--text3)", flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          fontSize: 13,
          color: bold ? "var(--text1)" : "var(--text2)",
          fontWeight: bold ? 700 : 400,
        }}
      >
        {label}
      </span>
    </div>
  );
}
function PayRow({ label, value, color }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
    >
      <span style={{ color: "var(--text3)" }}>{label}</span>
      <span style={{ fontWeight: 700, color: color || "var(--text1)" }}>
        {value}
      </span>
    </div>
  );
}

// ── Order Detail Modal ─────────────────────────────────────────────────────────
function OrderDetailModal({
  order,
  roleColor,
  onClose,
  onProgress,
  onComplete,
  progressPending,
  completePending,
  isWorker,
}) {
  const status = getStatus(order);
  const sc = statusColor(status);
  const canComplete =
    !order.isCompleted &&
    order.inProgress &&
    (isWorker || Number(order.remaining || 0) === 0);
  const typeColor = TYPE_COLORS[order.type] || "#888";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.52)",
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
          maxWidth: 700,
          maxHeight: "92vh",
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
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 7 }}>
              {order.customer?.firstName}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text3)",
                  marginLeft: 9,
                }}
              >
                Bill #{order.customer?.billNumber}
              </span>
            </h2>
            <div
              style={{
                display: "flex",
                gap: 7,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 9px",
                  borderRadius: 99,
                  background: typeColor + "18",
                  color: typeColor,
                  border: `1px solid ${typeColor}30`,
                }}
              >
                {order.type}
              </span>
              {order.isEmergency && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 9px",
                    borderRadius: 99,
                    background: "#DC262618",
                    color: "#DC2626",
                    border: "1px solid #DC262630",
                  }}
                >
                  ⚡ Emergency
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
                {statusLabel(status)}
              </span>
              {order.quantity > 1 && (
                <span style={{ fontSize: 11, color: "var(--text3)" }}>
                  ×{order.quantity} pcs
                </span>
              )}
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

        {/* Scrollable body */}
        <div
          style={{
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            <InfoCard title="Customer Info">
              <InfoRow
                icon={<LuUser size={12} />}
                label={order.customer?.firstName}
                bold
              />
              {order.customer?.phoneNumber && (
                <InfoRow
                  icon={<LuPhone size={12} />}
                  label={order.customer.phoneNumber}
                />
              )}
              <InfoRow
                icon={<LuHash size={12} />}
                label={`Bill #${order.customer?.billNumber}`}
              />
            </InfoCard>
            {!isWorker && (
              <InfoCard title="Payment Info">
                <PayRow label="Total" value={fmt$(order.totalPrice)} />
                <PayRow
                  label="Discount"
                  value={`-${fmt$(order.discount)}`}
                  color="#D97706"
                />
                <PayRow label="Paid" value={fmt$(order.paidAmount)} />
                <PayRow
                  label="Remaining"
                  value={fmt$(order.remaining)}
                  color={Number(order.remaining) > 0 ? "#DC2626" : "#16a34a"}
                />
              </InfoCard>
            )}
          </div>

          {order.assignedBy && (
            <InfoCard title="Assignment Info">
              <InfoRow
                icon={<LuUser size={12} />}
                label={`Assigned by ${order.assignedBy.name}`}
              />
              {order.assignedAt && (
                <InfoRow
                  icon={<LuClock size={12} />}
                  label={fmtDate(order.assignedAt)}
                />
              )}
              {order.assignmentNote && (
                <div
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${roleColor}30`,
                    borderLeft: `3px solid ${roleColor}`,
                    borderRadius: 7,
                    padding: "8px 11px",
                    marginTop: 4,
                    fontSize: 13,
                    color: "var(--text2)",
                    fontStyle: "italic",
                  }}
                >
                  "{order.assignmentNote}"
                </div>
              )}
            </InfoCard>
          )}

          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text3)",
                textTransform: "uppercase",
                letterSpacing: ".07em",
                marginBottom: 12,
              }}
            >
              Measurements
            </p>
            <MeasurementsGrid order={order} />
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {/* Print */}
          <button
            onClick={() => printOrder(order, isWorker)}
            style={{
              ...footerBtnBase,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <LuPrinter size={13} /> Print
          </button>

          <button onClick={onClose} style={footerBtnBase}>
            Close
          </button>

          {!order.isCompleted && (
            <button
              onClick={!order.inProgress || !isWorker ? onProgress : undefined}
              disabled={progressPending || (isWorker && order.inProgress)}
              style={{
                ...footerBtnBase,
                flex: 1.4,
                background: order.inProgress ? "#EFF6FF" : roleColor + "15",
                color: order.inProgress ? "#2563EB" : roleColor,
                border: `1px solid ${order.inProgress ? "#BFDBFE" : roleColor + "40"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {order.inProgress ? (
                isWorker ? (
                  "In Progress"
                ) : (
                  <>
                    <LuPause size={13} /> Stop Working
                  </>
                )
              ) : (
                <>
                  <LuPlay size={13} /> Start Working
                </>
              )}
            </button>
          )}

          {order.isCompleted ? (
            <div
              style={{
                ...footerBtnBase,
                flex: 1.4,
                background: "#f0fdf4",
                color: "#16a34a",
                border: "1px solid #bbf7d0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                cursor: "default",
              }}
            >
              <LuSquareCheck size={13} /> Completed
            </div>
          ) : canComplete && (
            <button
              onClick={onComplete}
              disabled={completePending}
              style={{
                ...footerBtnBase,
                flex: 1.4,
                background: "#16a34a",
                color: "#fff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <LuSquareCheck size={13} /> Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Order card ─────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  roleColor,
  onViewDetails,
  onProgress,
  onComplete,
  progressPending,
  completePending,
  isWorker,
}) {
  const status = getStatus(order);
  const sc = statusColor(status);
  const typeColor = TYPE_COLORS[order.type] || "#888";
  const canComplete =
    !order.isCompleted &&
    order.inProgress &&
    (isWorker || Number(order.remaining || 0) === 0);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      {/* Type + status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 7,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 99,
              background: typeColor + "18",
              color: typeColor,
              border: `1px solid ${typeColor}30`,
            }}
          >
            {order.type}
          </span>
          {order.isEmergency && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 99,
                background: "#DC262614",
                color: "#DC2626",
                border: "1px solid #DC262628",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <LuBell size={9} /> Emergency
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 99,
            background: sc + "18",
            color: sc,
            border: `1px solid ${sc}30`,
          }}
        >
          {statusLabel(status)}
        </span>
      </div>

      {/* Customer */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text1)" }}>
            {order.customer?.firstName}
          </p>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>
            Bill #{order.customer?.billNumber}
          </span>
        </div>
        {order.orderName && (
          <p
            style={{
              fontSize: 12,
              color: "var(--text3)",
              fontStyle: "italic",
              marginTop: 1,
            }}
          >
            "{order.orderName}"
          </p>
        )}
      </div>

      {!isWorker && (
        <div
          style={{ display: "flex", gap: 14, fontSize: 12, flexWrap: "wrap" }}
        >
          <span>
            <span style={{ color: "var(--text3)" }}>Total: </span>
            <strong style={{ color: "var(--text1)" }}>
              {fmt$(order.totalPrice)}
            </strong>
          </span>
          {Number(order.discount) > 0 && (
            <span>
              <span style={{ color: "var(--text3)" }}>Disc: </span>
              <strong style={{ color: "#D97706" }}>
                -{fmt$(order.discount)}
              </strong>
            </span>
          )}
          <span>
            <span style={{ color: "var(--text3)" }}>Remaining: </span>
            <strong
              style={{
                color: Number(order.remaining) > 0 ? "#DC2626" : "#16a34a",
              }}
            >
              {fmt$(order.remaining)}
            </strong>
          </span>
        </div>
      )}

      {/* Assignment meta */}
      {order.assignedBy && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text3)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <LuCalendar size={11} />
          <span>
            Assigned by{" "}
            <strong style={{ color: "var(--text2)" }}>
              {order.assignedBy.name}
            </strong>{" "}
            · {fmtDate(order.assignedAt)}
          </span>
        </div>
      )}
      {order.assignmentNote && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text2)",
            padding: "7px 11px",
            background: "var(--surface2)",
            borderRadius: 7,
            borderLeft: `3px solid ${roleColor}`,
            fontStyle: "italic",
          }}
        >
          {order.assignmentNote}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 2 }}>
        <button
          onClick={() => printOrder(order, isWorker)}
          style={{
            ...cardBtnBase,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <LuPrinter size={11} /> Print
        </button>
        <button
          onClick={() => onViewDetails(order)}
          style={{
            flex: 1,
            ...cardBtnBase,
            color: "var(--text2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <LuEye size={12} /> Details
        </button>
        {!order.isCompleted && (
          <button
            onClick={() =>
              !order.inProgress || !isWorker ? onProgress(order) : undefined
            }
            disabled={progressPending || (isWorker && order.inProgress)}
            style={{
              flex: 1,
              ...cardBtnBase,
              background: order.inProgress ? "#EFF6FF" : roleColor + "12",
              color: order.inProgress ? "#2563EB" : roleColor,
              border: `1px solid ${order.inProgress ? "#BFDBFE" : roleColor + "35"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            {order.inProgress ? (
              isWorker ? (
                "In Progress"
              ) : (
                <>
                  <LuPause size={12} /> Stop
                </>
              )
            ) : (
              <>
                <LuPlay size={12} /> Start Work
              </>
            )}
          </button>
        )}
        {order.isCompleted ? (
          <div
            style={{
              flex: 1,
              ...cardBtnBase,
              background: "#f0fdf4",
              color: "#16a34a",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              cursor: "default",
            }}
          >
            <LuSquareCheck size={12} /> Completed
          </div>
        ) : canComplete && (
          <button
            onClick={() => onComplete(order)}
            disabled={completePending}
            style={{
              flex: 1,
              ...cardBtnBase,
              background: "#16a34a",
              color: "#fff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <LuSquareCheck size={12} /> Complete
          </button>
        )}
      </div>
    </div>
  );
}

// Simple confirmation modal shown before completing an order
function ConfirmModal({ order, workerName, onCancel, onConfirm, pending }) {
  if (!order) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 22,
          width: "100%",
          maxWidth: 440,
          boxShadow: "var(--sh-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: "#16a34a14",
              border: "1px solid #16a34a30",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <LuSquareCheck size={18} style={{ color: "#16a34a" }} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            Confirm Completion
          </h3>
        </div>

        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 14 }}>
          The following notification will be sent to Admin upon confirmation:
        </p>

        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid #16a34a",
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 7,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", gap: 6, fontSize: 13 }}>
            <span style={{ color: "var(--text3)", minWidth: 90 }}>Worker:</span>
            <strong style={{ color: "var(--text1)" }}>{workerName}</strong>
          </div>
          <div style={{ display: "flex", gap: 6, fontSize: 13 }}>
            <span style={{ color: "var(--text3)", minWidth: 90 }}>Customer:</span>
            <strong style={{ color: "var(--text1)" }}>{order.customer?.firstName}</strong>
          </div>
          <div style={{ display: "flex", gap: 6, fontSize: 13 }}>
            <span style={{ color: "var(--text3)", minWidth: 90 }}>Bill #:</span>
            <strong style={{ color: "var(--text1)" }}>{order.customer?.billNumber}</strong>
          </div>
          <div style={{ display: "flex", gap: 6, fontSize: 13 }}>
            <span style={{ color: "var(--text3)", minWidth: 90 }}>Order Type:</span>
            <strong style={{ color: "var(--text1)" }}>{order.type}</strong>
          </div>
          <div
            style={{
              marginTop: 4,
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
              fontSize: 13,
              color: "#16a34a",
              fontWeight: 600,
            }}
          >
            This order has been completed successfully
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              color: "var(--text2)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            style={{
              padding: "8px 16px",
              background: "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {pending ? (
              "Processing..."
            ) : (
              <>
                <LuSquareCheck size={13} /> Confirm
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main WorkerPanel ───────────────────────────────────────────────────────────
export default function WorkerPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [notifsExpanded, setNotifsExpanded] = useState(true);

  const cfg = ROLE_CONFIG[user?.accountType] || ROLE_CONFIG.QICHIKAR;

  const isWorker = ["QICHIKAR", "DOKHT"].includes(user?.accountType);

  // ── Data queries ───────────────────────────────────────────────────
  const { data: rawOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["worker-panel-orders"],
    queryFn: () =>
      api.get("/orders", { params: { limit: 200 } }).then((r) => r.data),
    refetchInterval: 30_000,
  });
  // Service returns { data: [...], total, page, limit }
  const orders = Array.isArray(rawOrders) ? rawOrders : rawOrders?.data || [];

  const { data: allNotifs = [] } = useQuery({
    queryKey: ["worker-panel-notifs"],
    queryFn: () => api.get("/users/me/notifications").then((r) => r.data),
    refetchInterval: 30_000,
  });
  const unreadNotifs = allNotifs.filter((n) => !n.isRead);

  // ── Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: orders.length,
      assigned: orders.filter((o) => !o.inProgress && !o.isCompleted).length,
      inProgress: orders.filter((o) => o.inProgress && !o.isCompleted).length,
      completed: orders.filter((o) => o.isCompleted).length,
    }),
    [orders],
  );

  // ── Tab filter ─────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (activeTab === "assigned")
      return orders.filter((o) => !o.inProgress && !o.isCompleted);
    if (activeTab === "inProgress")
      return orders.filter((o) => o.inProgress && !o.isCompleted);
    if (activeTab === "completed") return orders.filter((o) => o.isCompleted);
    return orders;
  }, [orders, activeTab]);

  // Derive selected order from live data so modal status auto-updates
  const selectedOrder = selectedId
    ? orders.find((o) => o.id === selectedId)
    : null;

  const [confirmOrderId, setConfirmOrderId] = useState(null);
  const confirmOrder = confirmOrderId
    ? orders.find((o) => o.id === confirmOrderId)
    : null;

  // ── Mutations ──────────────────────────────────────────────────────
  const progressMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/progress`).then((r) => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      // if the order is now in progress, show In Progress tab
      if (updated?.inProgress) setActiveTab("inProgress");
      toast.success("Status updated — Admin notified");
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, "Failed to update status")),
  });

  const completeMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/complete`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      toast.success("Order completed — Admin notified");
      setSelectedId(null);
      setConfirmOrderId(null);
      setActiveTab("completed");
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, "Failed to complete order")),
  });

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

  // ── Date string ────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const TABS = [
    { key: "all", label: "All Orders", count: stats.total },
    { key: "assigned", label: "Assigned", count: stats.assigned },
    { key: "inProgress", label: "In Progress", count: stats.inProgress },
    { key: "completed", label: "Completed", count: stats.completed },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Welcome banner ─────────────────────────────────────────── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${cfg.color}18, ${cfg.color}06)`,
          border: `1px solid ${cfg.colorBd}`,
          borderRadius: 14,
          padding: "22px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 6,
            }}
          >
            <LuCalendar size={13} style={{ color: cfg.color }} />
            <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600 }}>
              {today}
            </span>
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text1)",
              marginBottom: 6,
            }}
          >
            {cfg.greeting}, {user?.name}!
          </h1>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.5 }}>
            {stats.assigned > 0 ? (
              <>
                You have{" "}
                <strong style={{ color: cfg.color }}>{stats.assigned}</strong>{" "}
                new {stats.assigned === 1 ? "assignment" : "assignments"}
                {stats.inProgress > 0 ? (
                  <>
                    {" "}
                    and{" "}
                    <strong style={{ color: "#2563EB" }}>
                      {stats.inProgress}
                    </strong>{" "}
                    in progress
                  </>
                ) : (
                  ""
                )}
                .
              </>
            ) : stats.inProgress > 0 ? (
              <>
                You have{" "}
                <strong style={{ color: "#2563EB" }}>{stats.inProgress}</strong>{" "}
                order{stats.inProgress === 1 ? "" : "s"} in progress.
              </>
            ) : (
              "All caught up — no pending assignments."
            )}
          </p>
        </div>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 40, display: "block", marginBottom: 6 }}>
            {cfg.emoji}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 12px",
              borderRadius: 99,
              background: cfg.colorBg,
              color: cfg.color,
              border: `1px solid ${cfg.colorBd}`,
            }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          icon={<LuClipboardList size={22} style={{ color: cfg.color }} />}
          label="Total Assigned"
          value={stats.total}
          color={cfg.color}
          bg={cfg.colorBg}
          border={cfg.colorBd}
        />
        <StatCard
          icon={<LuBell size={22} style={{ color: "#D97706" }} />}
          label="Assigned"
          value={stats.assigned}
          color="#D97706"
          bg="#D9770614"
          border="#D9770630"
        />
        <StatCard
          icon={<LuClock size={22} style={{ color: "#2563EB" }} />}
          label="In Progress"
          value={stats.inProgress}
          color="#2563EB"
          bg="#2563EB14"
          border="#2563EB30"
        />
        <StatCard
          icon={<LuSquareCheck size={22} style={{ color: "#16a34a" }} />}
          label="Completed"
          value={stats.completed}
          color="#16a34a"
          bg="#16a34a14"
          border="#16a34a30"
        />
      </div>

      {/* ── Notifications panel ────────────────────────────────────── */}
      {unreadNotifs.length > 0 && (
        <div
          style={{
            background: "var(--surface)",
            border: `1px solid ${cfg.colorBd}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "13px 18px",
              borderBottom: notifsExpanded ? "1px solid var(--border)" : "none",
              background: cfg.colorBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setNotifsExpanded((e) => !e)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LuBell size={15} style={{ color: cfg.color }} />
              <span
                style={{ fontSize: 14, fontWeight: 700, color: "var(--text1)" }}
              >
                New Assignments
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 8px",
                  borderRadius: 99,
                  background: cfg.color,
                  color: "#fff",
                }}
              >
                {unreadNotifs.length}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  readAllMut.mutate();
                }}
                disabled={readAllMut.isPending}
                style={{
                  fontSize: 12,
                  color: cfg.color,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                }}
              >
                Mark all read
              </button>
              <span
                style={{ fontSize: 16, color: "var(--text3)", lineHeight: 1 }}
              >
                {notifsExpanded ? "−" : "+"}
              </span>
            </div>
          </div>
          {notifsExpanded && (
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {unreadNotifs.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 18px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <LuBell
                    size={13}
                    style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text1)",
                        lineHeight: 1.45,
                      }}
                    >
                      {n.message}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text3)",
                        marginTop: 3,
                      }}
                    >
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => readOneMut.mutate(n.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text3)",
                      padding: "3px 4px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    <LuCheck size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Orders section ─────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "0 18px",
            display: "flex",
            gap: 2,
            overflowX: "auto",
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "13px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? cfg.color : "var(--text3)",
                  borderBottom: active
                    ? `2px solid ${cfg.color}`
                    : "2px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  whiteSpace: "nowrap",
                  transition: "color .15s",
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "1px 7px",
                    borderRadius: 99,
                    background: active ? cfg.colorBg : "var(--surface2)",
                    color: active ? cfg.color : "var(--text3)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Order grid */}
        <div style={{ padding: 18 }}>
          {ordersLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "var(--text3)",
                fontSize: 13,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  border: "3px solid var(--border)",
                  borderTopColor: cfg.color,
                  borderRadius: "50%",
                  animation: "spin .7s linear infinite",
                  margin: "0 auto 10px",
                }}
              />
              Loading orders...
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <LuClipboardList
                size={36}
                style={{ color: "var(--text3)", marginBottom: 12 }}
              />
              <p
                style={{ fontSize: 14, color: "var(--text3)", fontWeight: 500 }}
              >
                {activeTab === "all"
                  ? "No orders assigned yet."
                  : "No orders in this category."}
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 14,
              }}
            >
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  roleColor={cfg.color}
                  onViewDetails={(o) => setSelectedId(o.id)}
                  onProgress={(o) => progressMut.mutate(o.id)}
                  onComplete={(o) => setConfirmOrderId(o.id)}
                  isWorker={isWorker}
                  progressPending={progressMut.isPending}
                  completePending={completeMut.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          roleColor={cfg.color}
          onClose={() => setSelectedId(null)}
          onProgress={() => progressMut.mutate(selectedOrder.id)}
          onComplete={() => setConfirmOrderId(selectedOrder.id)}
          isWorker={isWorker}
          progressPending={progressMut.isPending}
          completePending={completeMut.isPending}
        />
      )}

      {confirmOrder && (
        <ConfirmModal
          order={confirmOrder}
          workerName={user?.name}
          onCancel={() => setConfirmOrderId(null)}
          onConfirm={() => completeMut.mutate(confirmOrder.id)}
          pending={completeMut.isPending}
        />
      )}
    </div>
  );
}

// ── Style constants ────────────────────────────────────────────────────────────
const footerBtnBase = {
  flex: 1,
  padding: "9px 0",
  background: "var(--surface2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  color: "var(--text2)",
  fontWeight: 500,
};
const cardBtnBase = {
  padding: "8px 0",
  background: "var(--surface2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 500,
};
