import { useMemo, useState } from "react";
import { parseNumberLocale } from "../../lib/normalize.js";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { formatCurrency } from "../../lib/currency.js";
import { getOrderTypeLabel } from "../../lib/orderType.js";

const DEFAULT_BILLING = {
  totalPrice: "", // treated as price-per-item; actual total = totalPrice * quantity
  discount: "",
  paidAmount: "",
  quantity: "1",
};

function toWholeAmount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function formatWholeAmount(value) {
  return toWholeAmount(value).toLocaleString("en-US");
}

function sanitizeWholeInput(raw = "") {
  return String(raw).replace(
    /[^\d\u0660-\u0669\u06F0-\u06F9\uFF10-\uFF19]/g,
    "",
  );
}

function getDisplayLabel(entry, index, language = "en") {
  if (entry?.displayName?.trim()) return entry.displayName.trim();
  if (entry?.name?.trim()) return entry.name.trim();
  const orderType = getOrderTypeLabel(entry?.type, language);
  const sequence = Number(entry?.sequence || 0) || index + 1;
  return `${orderType} ${sequence}`;
}

function buildBillingEntries(orderTypes = [], orderItems = [], language = "en") {
  if (Array.isArray(orderItems) && orderItems.length > 0) {
    return orderItems.map((item, index) => ({
      ...item,
      sequence: Number(item?.sequence || 0) || index + 1,
      billingKey: String(item?.billingKey ?? item?.key ?? index),
      displayName: getDisplayLabel(item, index, language),
    }));
  }

  return (orderTypes || []).map((entry, index) => ({
    ...entry,
    sequence: index + 1,
    billingKey: String(index),
    displayName: getDisplayLabel(entry, index, language),
  }));
}

function normalizeInitial(entries, initial) {
  const source = initial || {};
  const normalized = {};
  entries.forEach((entry, index) => {
    const sourceEntry = source[entry.billingKey] || source[index] || {};
    normalized[entry.billingKey] = {
      ...DEFAULT_BILLING,
      ...sourceEntry,
      totalPrice: String(toWholeAmount(sourceEntry?.totalPrice)),
      discount: String(toWholeAmount(sourceEntry?.discount)),
      paidAmount: String(toWholeAmount(sourceEntry?.paidAmount)),
      quantity: String(sourceEntry?.quantity ?? "1"),
    };
  });
  return normalized;
}

function BillingCard({ entry, value, onChange, billingKey }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const pricePerItem = toWholeAmount(parseNumberLocale(value.totalPrice));
  const qtyRaw = parseNumberLocale(value.quantity);
  const quantity = Number.isFinite(qtyRaw)
    ? Math.max(1, Math.floor(qtyRaw))
    : 1;
  const discount = toWholeAmount(parseNumberLocale(value.discount));
  const paidAmount = toWholeAmount(parseNumberLocale(value.paidAmount));

  const computedTotal = pricePerItem * quantity;
  const remaining = Math.max(0, computedTotal - discount - paidAmount);

  const setField = (key, next) =>
    onChange(billingKey, {
      ...value,
      [key]: sanitizeWholeInput(next),
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
          {getOrderTypeLabel(entry.type, language)}
        </span>
        {entry.displayName && (
          <span style={{ fontSize: 13, fontWeight: 600 }}>{entry.displayName}</span>
        )}
        {entry.isEmergency && (
          <span className="badge bg-red" style={{ fontSize: 10 }}>
            {t("createOrder.emergencyShort")}
          </span>
        )}
      </div>

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
            inputMode="numeric"
            value={value.totalPrice}
            onChange={(e) => setField("totalPrice", e.target.value)}
            placeholder="0"
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
              ({formatWholeAmount(quantity)} x{" "}
              {formatCurrency(pricePerItem, language)})
            </span>
          )}
        </span>
        <span
          style={{ fontSize: 16, fontWeight: 800, color: "var(--primary)" }}
        >
          {formatCurrency(computedTotal, language)}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="lbl" style={labelStyle}>
            {t("createOrder.discount")}
          </label>
          <input
            className="inp"
            inputMode="numeric"
            value={value.discount}
            onChange={(e) => setField("discount", e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="lbl" style={labelStyle}>
            {t("createOrder.paidAmount")}
          </label>
          <input
            className="inp"
            inputMode="numeric"
            value={value.paidAmount}
            onChange={(e) => setField("paidAmount", e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
      </div>

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
              {t("createOrder.afterDiscount")} {" "}
              <strong style={{ color: "var(--text1)" }}>
                {formatCurrency(computedTotal - discount, language)}
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
              ? `${t("common.remaining")}: ${formatCurrency(remaining, language)}`
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
  orderItems = [],
  initial = {},
  loading = false,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const billingEntries = useMemo(
    () => buildBillingEntries(orderTypes, orderItems, language),
    [orderItems, orderTypes, language],
  );
  const [billing, setBilling] = useState(() =>
    normalizeInitial(billingEntries, initial),
  );
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    return billingEntries.reduce(
      (acc, entry) => {
        const item = billing[entry.billingKey] || DEFAULT_BILLING;
        const pricePerItem = toWholeAmount(parseNumberLocale(item.totalPrice));
        const qtyRaw = parseNumberLocale(item.quantity);
        const qty = Number.isFinite(qtyRaw)
          ? Math.max(1, Math.floor(qtyRaw))
          : 1;
        const total = pricePerItem * qty;
        const discount = toWholeAmount(parseNumberLocale(item.discount));
        const paidAmount = toWholeAmount(parseNumberLocale(item.paidAmount));

        acc.total += total;
        acc.discount += discount;
        acc.paid += paidAmount;
        return acc;
      },
      { total: 0, discount: 0, paid: 0 },
    );
  }, [billing, billingEntries]);

  const remaining = Math.max(0, totals.total - totals.discount - totals.paid);

  const updateBilling = (billingKey, nextValue) => {
    setError("");
    setBilling((current) => ({ ...current, [billingKey]: nextValue }));
  };

  const validateAndContinue = () => {
    const normalizedBilling = {};

    for (let index = 0; index < billingEntries.length; index += 1) {
      const entry = billingEntries[index];
      const item = billing[entry.billingKey] || DEFAULT_BILLING;
      const rawPrice = parseNumberLocale(item.totalPrice);
      const pricePerItem = toWholeAmount(rawPrice);
      const qtyRaw = parseNumberLocale(item.quantity);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
      const totalPrice = pricePerItem * qty;
      const discount = toWholeAmount(parseNumberLocale(item.discount || "0"));
      const paidAmount = toWholeAmount(parseNumberLocale(item.paidAmount || "0"));
      const label = entry.displayName || `${getOrderTypeLabel(entry.type, language)} ${index + 1}`;

      if (Number.isNaN(rawPrice) || pricePerItem <= 0) {
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
      if (Number.isNaN(qty) || qty < 1) {
        const message = t("createOrder.quantityMin", { label });
        setError(message);
        toast.error(message);
        return;
      }

      normalizedBilling[entry.billingKey] = {
        ...item,
        totalPrice: String(pricePerItem),
        discount: String(discount),
        paidAmount: String(paidAmount),
        quantity: String(qty),
      };
    }

    setError("");
    onNext({ billing: normalizedBilling });
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
        {billingEntries.map((entry) => (
          <BillingCard
            key={entry.billingKey}
            entry={entry}
            value={billing[entry.billingKey] || DEFAULT_BILLING}
            onChange={updateBilling}
            billingKey={entry.billingKey}
          />
        ))}
      </div>

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
              {formatCurrency(totals.total, language)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {t("createOrder.totalDiscount")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {formatCurrency(totals.discount, language)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {t("common.paid")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {formatCurrency(totals.paid, language)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {t("common.remaining")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {formatCurrency(remaining, language)}
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
