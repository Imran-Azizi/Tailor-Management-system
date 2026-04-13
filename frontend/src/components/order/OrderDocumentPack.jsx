import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import JsBarcode from "jsbarcode";
import {
  LuDownload,
  LuFileText,
  LuPhone,
  LuPrinter,
  LuReceipt,
  LuScissors,
  LuUserRound,
} from "react-icons/lu";
import { SHOP_CONFIG } from "../../config/shopConfig.js";

// ─── Numeric measurement field names (used to split measurements vs styles) ───
const NUMERIC_FIELDS = new Set([
  "height",
  "shoulder",
  "sleeve",
  "neck",
  "chest",
  "armpit",
  "waist",
  "skirt",
  "tenban",
  "pantLeg",
  "arm",
  "calf",
  "sorain",
  "patlonHeight",
  "kamerPatlon",
  "doroBaghlePatlon",
  "sorainPatlon",
  "patPatlon",
  "pachaPatlon",
]);
const SKIP_FIELDS = new Set(["id", "orderId", "__name"]);

function Barcode({ value }) {
  const ref = useRef();
  useEffect(() => {
    if (!value || !ref.current) return;
    try {
      JsBarcode(ref.current, String(value), {
        format: "CODE128",
        width: 2,
        height: 36,
        displayValue: true,
        fontSize: 11,
        margin: 6,
      });
    } catch (e) {
      console.error("Barcode generation failed", e);
    }
  }, [value]);
  return <svg ref={ref} style={{ maxWidth: 140, width: "100%" }} />;
}

export function getMeasurementsFromOrder(order) {
  if (!order) return {};
  if (order.measurements) return order.measurements;
  if (order.type === "OUTFIT") return order.outfit || {};
  if (order.type === "WASKAT") return order.waskat || {};
  if (order.type === "KORTY") return order.korty || {};
  if (order.type === "YAKHANQAQ") return order.yakhanQaq || {};
  return {};
}

function formatKey(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── Shared shop header ────────────────────────────────────────────────────────
function ShopHeader({ gradient, accent, label, date }) {
  return (
    <div
      style={{
        background: gradient,
        color: "#fff",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      {/* Logo placeholder */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          background: "rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          flexShrink: 0,
          fontWeight: 900,
          color: "#fff",
        }}
      >
        ✂
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>
          {SHOP_CONFIG.name}
        </div>
        <div
          style={{
            fontSize: 11,
            opacity: 0.85,
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {SHOP_CONFIG.address}
        </div>
        <div style={{ fontSize: 11, opacity: 0.85 }}>
          {SHOP_CONFIG.phones.join(" • ")}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div
          style={{
            fontSize: 10,
            opacity: 0.72,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            fontWeight: 700,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 11, opacity: 0.78, marginTop: 3 }}>{date}</div>
      </div>
    </div>
  );
}

// ─── Customer Bill ─────────────────────────────────────────────────────────────
export function CustomerBill({ customer, order }) {
  const total = order?.totalPrice || 0;
  const discount = order?.discount || 0;
  const paid = order?.paidAmount || 0;
  const remaining = Math.max(0, order?.remaining ?? total - discount - paid);
  const qty = order?.quantity || 1;
  const date = new Date(order?.createdAt || Date.now()).toLocaleDateString();

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        background: "#fff",
        border: "1px solid #dbe3ef",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <ShopHeader
        gradient="linear-gradient(135deg, #0F6CBD 0%, #1D82D7 100%)"
        label="Customer Bill"
        date={date}
      />

      {/* Main section: left table + right sidebar */}
      <div style={{ display: "flex", borderTop: "2px solid #e2e8f0" }}>
        {/* Left: order details table */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {["Bill #", "Customer Name", "Order Type", "Qty"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "10px 10px",
                    fontWeight: 800,
                    fontSize: 14,
                    color: "#0F6CBD",
                  }}
                >
                  #{customer?.billNumber}
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {customer?.firstName}
                </td>
                <td style={{ padding: "10px 10px" }}>
                  <span
                    style={{
                      background: "#DBEAFE",
                      color: "#1E40AF",
                      padding: "2px 8px",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {order?.type}
                  </span>
                </td>
                <td
                  style={{
                    padding: "10px 10px",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {qty}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Barcode */}
          <div
            style={{
              flex: 1,
              padding: "10px 16px",
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Barcode value={customer?.billNumber} />
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {customer?.phoneNumber}
            </div>
          </div>
        </div>

        {/* Right sidebar: financial summary */}
        <div
          style={{
            width: 165,
            borderLeft: "2px solid #BFDBFE",
            background: "#EFF6FF",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "7px 12px",
              background: "#DBEAFE",
              fontSize: 10,
              fontWeight: 800,
              color: "#1E40AF",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              borderBottom: "1px solid #BFDBFE",
            }}
          >
            Financial Summary
          </div>

          {[
            ["Total Price", `$${total.toFixed(2)}`, "#0f172a"],
            [
              "Discount",
              discount > 0 ? `-$${discount.toFixed(2)}` : "—",
              "#ef4444",
            ],
            ["Paid Amount", `$${paid.toFixed(2)}`, "#059669"],
            [
              "Remaining",
              remaining > 0 ? `$${remaining.toFixed(2)}` : "Paid in Full",
              remaining > 0 ? "#f97316" : "#059669",
            ],
          ].map(([label, value, color], idx) => (
            <div
              key={label}
              style={{
                padding: "10px 14px",
                flex: 1,
                borderBottom: idx < 3 ? "1px solid #BFDBFE" : "none",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: "#64748b",
                  fontWeight: 600,
                  marginBottom: 3,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tailor Shop Bill ─────────────────────────────────────────────────────────
function TailorSectionTitle({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: ".08em",
        color: "#7c5a2a",
        padding: "6px 0 6px",
        marginBottom: 8,
        borderBottom: "1px solid #f0e0c0",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
    </div>
  );
}

export function TailorBill({ customer, order, measurements }) {
  const date = new Date(order?.createdAt || Date.now()).toLocaleDateString();

  const allEntries = Object.entries(measurements || {}).filter(
    ([key, value]) =>
      !SKIP_FIELDS.has(key) &&
      value !== undefined &&
      value !== "" &&
      value !== null,
  );

  const numericEntries = allEntries.filter(([key]) => NUMERIC_FIELDS.has(key));
  const styleEntries = allEntries.filter(
    ([key, value]) => !NUMERIC_FIELDS.has(key) && value !== false,
  );

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        background: "#fffaf3",
        border: "1px solid #e5d9c7",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <ShopHeader
        gradient="linear-gradient(135deg, #2B211A 0%, #584332 100%)"
        label="Tailor Shop Copy"
        date={date}
      />

      <div style={{ padding: "16px 18px" }}>
        {/* ── Section 1: Customer Information ── */}
        <TailorSectionTitle>① Customer Information</TailorSectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            background: "#fff8ed",
            border: "1px solid #fde68a",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
          }}
        >
          {[
            ["Bill #", `#${customer?.billNumber}`],
            ["Date", date],
            ["Name", customer?.firstName],
            ["Phone", customer?.phoneNumber],
            ["Order Type", order?.type],
            ["Quantity", order?.quantity || 1],
          ].map(([label, value]) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 10,
                  color: "#92400e",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  marginBottom: 2,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
                {value ?? "—"}
              </div>
            </div>
          ))}
        </div>

        {/* ── Section 2: Measurements ── */}
        {numericEntries.length > 0 && (
          <>
            <TailorSectionTitle>② Measurement Information</TailorSectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {numericEntries.map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "5px 9px",
                    background: "#fff",
                    border: "1px solid #e5d9c7",
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "#78716c", fontWeight: 600 }}>
                    {formatKey(key)}
                  </span>
                  <span style={{ fontWeight: 800, color: "#1a1a1a" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Section 3: Styles Information ── */}
        {styleEntries.length > 0 && (
          <>
            <TailorSectionTitle>③ Styles Information</TailorSectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0,1fr))",
                gap: 6,
              }}
            >
              {styleEntries.map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "5px 9px",
                    background: "#fff",
                    border: "1px solid #e5d9c7",
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                >
                  <span style={{ color: "#78716c", fontWeight: 600 }}>
                    {formatKey(key)}
                  </span>
                  <span style={{ fontWeight: 800, color: "#1a1a1a" }}>
                    {typeof value === "boolean" ? "Yes" : value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Print / PDF helpers ──────────────────────────────────────────────────────
export function printElement(id) {
  const element = document.getElementById(id);
  if (!element) return;

  const printWindow = window.open("", "_blank", "width=800,height=1000");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Order Document</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:'Inter',sans-serif;background:#fff;padding:8mm;color:#0f172a}
          @page{size:A5 portrait;margin:0}
          @media print{body{padding:8mm}}
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 400);
}

export async function exportPdf(id, filename) {
  try {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    const element = document.getElementById(id);
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2.5,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a5",
    });
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
    pdf.save(filename);
  } catch (error) {
    toast.error(`PDF export failed: ${error.message}`);
  }
}

// ─── Detail field (used inside the summary hero) ──────────────────────────────
function DetailField({ label, value, Icon }) {
  return (
    <div className="print-detail-field">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: ".06em",
          }}
        >
          {label}
        </span>
        {Icon && <Icon size={15} style={{ color: "#0F6CBD" }} />}
      </div>
      <div className="print-detail-value">{value || "-"}</div>
    </div>
  );
}

// ─── OrderDocumentPack ────────────────────────────────────────────────────────
export function OrderDocumentPack({ customer, order, previewId }) {
  const { t } = useTranslation();
  const measurements = getMeasurementsFromOrder(order);
  const customerId = `${previewId}-customer`;
  const tailorId = `${previewId}-tailor`;

  return (
    <div className="order-doc-pack">
      <div className="order-doc-summary">
        <div className="order-doc-hero">
          <div>
            <span className="order-doc-hero-badge">
              {t("orders.professionalPrintPack")}
            </span>
            <h3
              style={{
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.15,
                marginTop: 10,
              }}
            >
              {t("orders.orderDocuments")}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,.84)",
                maxWidth: 520,
                marginTop: 8,
              }}
            >
              {t("orders.printPackCopy")}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)" }}>
              {t("orders.billNumber")}
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1 }}>
              #{customer?.billNumber}
            </div>
          </div>
        </div>

        <div className="order-doc-grid">
          <DetailField
            label={t("common.customer")}
            value={customer?.firstName}
            Icon={LuUserRound}
          />
          <DetailField
            label={t("common.phone")}
            value={customer?.phoneNumber}
            Icon={LuPhone}
          />
          <DetailField
            label={t("orders.orderType")}
            value={order?.type}
            Icon={LuReceipt}
          />
          <DetailField
            label={t("common.status")}
            value={order?.isCompleted ? t("orders.done") : t("orders.pending")}
            Icon={LuFileText}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="order-doc-actions">
        {/* Customer Bill */}
        <div className="order-doc-action-card">
          <div>
            <p className="order-doc-action-title">Print Bill for Customer</p>
            <p className="order-doc-action-copy">
              A5 receipt with bill summary and financial breakdown
            </p>
          </div>
          <div className="order-doc-action-row">
            <button
              type="button"
              className="print-center-btn"
              onClick={() => printElement(customerId)}
            >
              <LuPrinter size={16} />
              <span>Print Bill for Customer</span>
            </button>
            <button
              type="button"
              className="print-center-side-btn"
              onClick={() =>
                exportPdf(
                  customerId,
                  `bill-${customer?.billNumber}-${order?.id}-customer.pdf`,
                )
              }
            >
              <LuDownload size={15} />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Tailor Shop Bill */}
        <div className="order-doc-action-card">
          <div>
            <p className="order-doc-action-title">Print Bill for Tailor Shop</p>
            <p className="order-doc-action-copy">
              Internal copy with measurements and style details
            </p>
          </div>
          <div className="order-doc-action-row">
            <button
              type="button"
              className="print-center-btn"
              onClick={() => printElement(tailorId)}
            >
              <LuScissors size={16} />
              <span>Print Bill for Tailor Shop</span>
            </button>
            <button
              type="button"
              className="print-center-side-btn"
              onClick={() =>
                exportPdf(
                  tailorId,
                  `bill-${customer?.billNumber}-${order?.id}-tailor.pdf`,
                )
              }
            >
              <LuDownload size={15} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden print targets */}
      <div className="order-doc-preview-grid">
        <div id={customerId}>
          <CustomerBill customer={customer} order={order} />
        </div>
        <div id={tailorId}>
          <TailorBill
            customer={customer}
            order={order}
            measurements={measurements}
          />
        </div>
      </div>
    </div>
  );
}
