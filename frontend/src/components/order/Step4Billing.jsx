import { useMemo, useState } from "react";
import { parseNumberLocale, toAsciiDigits } from "../../lib/normalize.js";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const DEFAULT_BILLING = {
  totalPrice: "", // treated as price-per-item; actual total = totalPrice × quantity
  discount: "",
  paidAmount: "",
  quantity: "1",
};

function normalizeInitial(orderTypes, initial) {
  const source = initial || {};
  const normalized = {};
  orderTypes.forEach((_, index) => {
    normalized[index] = {
      ...DEFAULT_BILLING,
      ...(source[index] || {}),
      quantity: String(source[index]?.quantity ?? "1"),
    };
  });
  return normalized;
}

function BillingCard({ entry, value, onChange, index }) {
  const { t } = useTranslation();
  const pricePerItem = parseNumberLocale(value.totalPrice) || 0;
  const qtyRaw = parseNumberLocale(value.quantity);
  const quantity = Number.isFinite(qtyRaw)
    ? Math.max(1, Math.floor(qtyRaw))
    : 1;
  const discount = parseNumberLocale(value.discount) || 0;
  const paidAmount = parseNumberLocale(value.paidAmount) || 0;

  const computedTotal = pricePerItem * quantity;
  const remaining = Math.max(0, computedTotal - discount - paidAmount);

  const setField = (key, next) =>
    onChange(index, {
      ...value,
      [key]:
        key === "quantity"
          ? next.replace(/[^\d\u0660-\u0669\u06F0-\u06F9\uFF10-\uFF19]/g, "")
          : next,
    });

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text3)",
    marginBottom: 4,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: ".06em",
  };
  const inputStyle = { height: 40, fontSize: 13 };

  return (
    <div
      style={{
        border: "1px solid var(--border2)",
        borderRadius: 12,
        padding: 16,
        background: "var(--surface2)",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <span className="badge bg-gold" style={{ fontSize: 11 }}>
          {entry.type}
        </span>
        {entry.name && (
          <span style={{ fontSize: 13, fontWeight: 600 }}>{entry.name}</span>
        )}
        {entry.isEmergency && (
          <span className="badge bg-red" style={{ fontSize: 10 }}>
            {t("createOrder.emergencyShort")}
          </span>
        )}
      </div>

      {/* Inputs: row 1 — Price per Item + Quantity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <label className="lbl" style={labelStyle}>
            {t("createOrder.pricePerItem")}
          </label>
          <input
            className="inp"
            inputMode="decimal"
            value={value.totalPrice}
            onChange={(e) => setField("totalPrice", e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="lbl" style={labelStyle}>
            {t("common.quantity")}
          </label>
          <input
            className="inp"
            inputMode="numeric"
            value={value.quantity}
            onChange={(e) => setField("quantity", e.target.value)}
            placeholder="1"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Computed total display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderRadius: 8,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>
          {t("createOrder.totalPrice")}&nbsp;
          {quantity > 1 && (
            <span style={{ color: "var(--text3)", fontWeight: 400 }}>
              ({quantity} × ${pricePerItem.toFixed(2)})
            </span>
          )}
        </span>
        <span
          style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)" }}
        >
          ${computedTotal.toFixed(2)}
        </span>
      </div>

      {/* Inputs: row 2 — Discount + Paid Amount */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="lbl" style={labelStyle}>
            {t("createOrder.discount")}
          </label>
          <input
            className="inp"
            inputMode="decimal"
            value={value.discount}
            onChange={(e) => setField("discount", e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="lbl" style={labelStyle}>
            {t("createOrder.paidAmount")}
          </label>
          <input
            className="inp"
            inputMode="decimal"
            value={value.paidAmount}
            onChange={(e) => setField("paidAmount", e.target.value)}
            placeholder="0.00"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Live remaining indicator (only when there's data) */}
      {computedTotal > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "flex-end",
            gap: 16,
            fontSize: 12,
          }}
        >
          {discount > 0 && (
            <span style={{ color: "var(--text3)" }}>
              {t("createOrder.afterDiscount")}{" "}
              <strong style={{ color: "var(--text1)" }}>
                ${(computedTotal - discount).toFixed(2)}
              </strong>
            </span>
          )}
          <span
            style={{
              color: remaining > 0 ? "#f97316" : "#059669",
              fontWeight: 700,
            }}
          >
            {remaining > 0
              ? `${t("common.remaining")}: $${remaining.toFixed(2)}`
              : t("createOrder.fullyPaid")}
          </span>
        </div>
      )}
    </div>
  );
}

export default function Step4Billing({
  onNext,
  onBack,
  orderTypes = [],
  initial = {},
  loading = false,
}) {
  const { t } = useTranslation();
  const [billing, setBilling] = useState(() =>
    normalizeInitial(orderTypes, initial),
  );
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    return orderTypes.reduce(
      (acc, _, index) => {
        const item = billing[index] || DEFAULT_BILLING;
        const pricePerItem = parseNumberLocale(item.totalPrice) || 0;
        const qtyRaw = parseNumberLocale(item.quantity);
        const qty = Number.isFinite(qtyRaw)
          ? Math.max(1, Math.floor(qtyRaw))
          : 1;
        const total = pricePerItem * qty;
        const discount = parseNumberLocale(item.discount) || 0;
        const paidAmount = parseNumberLocale(item.paidAmount) || 0;

        acc.total += total;
        acc.discount += discount;
        acc.paid += paidAmount;
        return acc;
      },
      { total: 0, discount: 0, paid: 0 },
    );
  }, [billing, orderTypes]);

  const remaining = Math.max(0, totals.total - totals.discount - totals.paid);

  const updateBilling = (index, nextValue) => {
    setError("");
    setBilling((current) => ({ ...current, [index]: nextValue }));
  };

  const validateAndContinue = () => {
    for (let index = 0; index < orderTypes.length; index += 1) {
      const item = billing[index] || DEFAULT_BILLING;
      const pricePerItem = parseNumberLocale(item.totalPrice);
      const qtyRaw = parseNumberLocale(item.quantity);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
      const totalPrice = (isNaN(pricePerItem) ? 0 : pricePerItem) * qty;
      const discount = parseFloat(item.discount || "0") || 0;
      const paidAmount = parseNumberLocale(item.paidAmount || "0") || 0;
      const label = orderTypes[index]?.name?.trim()
        ? `${orderTypes[index].type} (${orderTypes[index].name.trim()})`
        : orderTypes[index]?.type || `Item ${index + 1}`;

      if (isNaN(pricePerItem) || pricePerItem <= 0) {
        const message = t("createOrder.validTotalPrice", { label });
        setError(message);
        toast.error(message);
        return;
      }
      if (discount < 0 || paidAmount < 0) {
        const message = t("createOrder.nonNegativeAmounts", { label });
        setError(message);
        toast.error(message);
        return;
      }
      if (discount > totalPrice) {
        const message = t("createOrder.discountTooHigh", { label });
        setError(message);
        toast.error(message);
        return;
      }
      if (paidAmount > totalPrice - discount) {
        const message = t("createOrder.paidTooHigh", { label });
        setError(message);
        toast.error(message);
        return;
      }
      if (isNaN(qty) || qty < 1) {
        const message = t("createOrder.quantityMin", { label });
        setError(message);
        toast.error(message);
        return;
      }
    }
    setError("");
    onNext({ billing });
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {t("createOrder.billing")}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
        {t("createOrder.billingCopy")}
      </p>

      {error && (
        <div className="info-box ib-red" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {orderTypes.map((entry, index) => (
          <BillingCard
            key={`${entry.type}-${index}`}
            entry={entry}
            value={billing[index] || DEFAULT_BILLING}
            onChange={updateBilling}
            index={index}
          />
        ))}
      </div>

      {/* Grand total summary */}
      <div style={{ marginTop: 18 }} className="info-box ib-gold">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            width: "100%",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {t("createOrder.grandTotal")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              ${totals.total.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {t("createOrder.totalDiscount")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              ${totals.discount.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {t("common.paid")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              ${totals.paid.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {t("common.remaining")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              ${remaining.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline"
          style={{ flex: 1 }}
          disabled={loading}
        >
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={validateAndContinue}
          className="btn btn-gold"
          style={{ flex: 1 }}
          disabled={loading}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}
