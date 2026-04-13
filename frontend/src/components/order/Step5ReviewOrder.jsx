import { useTranslation } from "react-i18next";
import {
  LuUser,
  LuPhone,
  LuReceipt,
  LuRuler,
  LuPalette,
  LuShoppingBag,
} from "react-icons/lu";
import { parseNumberLocale } from "../../lib/normalize.js";

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

function SectionHeader({ icon: Icon, title }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".08em",
        color: "var(--text3)",
        marginBottom: 10,
        paddingBottom: 7,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {Icon && <Icon size={13} style={{ color: "var(--primary)" }} />}
      {title}
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--text3)",
          fontWeight: 600,
          minWidth: 80,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text1)" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function MeasureGrid({ entries, cols = 3 }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(120px,1fr))`,
        gap: 6,
      }}
    >
      {entries.map(([key, value]) => (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 9px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 7,
            fontSize: 11,
          }}
        >
          <span style={{ color: "var(--text3)", fontWeight: 600 }}>
            {t(`createOrder.fields.${key}`, {
              defaultValue: key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (s) => s.toUpperCase())
                .trim(),
            })}
          </span>
          <span style={{ fontWeight: 700, color: "var(--text1)" }}>
            {typeof value === "boolean" ? t("common.yes") : value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Step5ReviewOrder({ form, onBack, onSubmit, loading }) {
  const { t } = useTranslation();
  const orderTypes = form.orderTypes || [];
  const measurements = form.measurements || {};
  const billing = form.billing || {};

  // Grand totals
  const grandTotals = orderTypes.reduce(
    (acc, _, i) => {
      const b = billing[i] || {};
      const pricePerItem = parseNumberLocale(b.totalPrice) || 0;
      const qtyRaw = parseNumberLocale(b.quantity);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;
      acc.total += pricePerItem * qty;
      acc.discount += parseNumberLocale(b.discount) || 0;
      acc.paid += parseNumberLocale(b.paidAmount) || 0;
      return acc;
    },
    { total: 0, discount: 0, paid: 0 },
  );
  const grandRemaining = Math.max(
    0,
    grandTotals.total - grandTotals.discount - grandTotals.paid,
  );

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {t("createOrder.reviewOrder")}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
        {t("createOrder.reviewCopy")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* ── Customer Info ── */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "14px 16px",
            background: "var(--surface)",
          }}
        >
          <SectionHeader icon={LuUser} title={t("createOrder.customerInfo")} />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <InfoChip
              label={t("createOrder.firstName")}
              value={form.firstName}
            />
            <InfoChip label={t("common.phone")} value={form.phoneNumber} />
          </div>
        </div>

        {/* ── Per-Order Cards ── */}
        {orderTypes.map((entry, i) => {
          const b = billing[i] || {};
          const measRaw = measurements[i];
          const measObj = Array.isArray(measRaw)
            ? measRaw[0] || {}
            : measRaw || {};
          const pricePerItem = parseNumberLocale(b.totalPrice) || 0;
          const qtyRaw = parseNumberLocale(b.quantity);
          const qty = Number.isFinite(qtyRaw)
            ? Math.max(1, Math.floor(qtyRaw))
            : 1;
          const totalPrice = pricePerItem * qty;
          const discount = parseNumberLocale(b.discount) || 0;
          const paid = parseNumberLocale(b.paidAmount) || 0;
          const remaining = Math.max(0, totalPrice - discount - paid);

          const numericEntries = Object.entries(measObj).filter(
            ([k, v]) =>
              NUMERIC_FIELDS.has(k) &&
              v !== "" &&
              v !== undefined &&
              v !== null,
          );
          const styleEntries = Object.entries(measObj).filter(
            ([k, v]) =>
              !NUMERIC_FIELDS.has(k) &&
              k !== "__name" &&
              k !== "id" &&
              k !== "orderId" &&
              v !== "" &&
              v !== undefined &&
              v !== null &&
              v !== false,
          );

          return (
            <div
              key={i}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "14px 16px",
                background: "var(--surface)",
              }}
            >
              {/* Order header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <LuShoppingBag size={15} style={{ color: "var(--primary)" }} />
                <span className="badge bg-gold" style={{ fontSize: 11 }}>
                  {entry.type}
                </span>
                {entry.isEmergency && (
                  <span className="badge bg-red" style={{ fontSize: 10 }}>
                    {t("createOrder.emergencyShort")}
                  </span>
                )}
                {measObj.__name && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {measObj.__name}
                  </span>
                )}
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: "var(--text3)",
                  }}
                >
                  {t("createOrder.orderLabel", { number: i + 1 })}
                </span>
              </div>

              {/* Billing summary */}
              <SectionHeader
                icon={LuReceipt}
                title={t("createOrder.billing")}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {[
                  [t("createOrder.totalPrice"), `$${totalPrice.toFixed(2)}`],
                  [t("createOrder.discount"), `$${discount.toFixed(2)}`],
                  [t("common.paid"), `$${paid.toFixed(2)}`],
                  [t("common.remaining"), `$${remaining.toFixed(2)}`],
                  [t("common.quantity"), qty],
                ].map(([label, val]) => (
                  <div
                    key={String(label)}
                    style={{
                      background: "var(--surface2)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text3)",
                        marginBottom: 3,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Measurements */}
              {numericEntries.length > 0 && (
                <>
                  <SectionHeader
                    icon={LuRuler}
                    title={t("createOrder.measurements")}
                  />
                  <div style={{ marginBottom: 14 }}>
                    <MeasureGrid entries={numericEntries} cols={4} />
                  </div>
                </>
              )}

              {/* Styles */}
              {styleEntries.length > 0 && (
                <>
                  <SectionHeader
                    icon={LuPalette}
                    title={t("createOrder.styleOptions")}
                  />
                  <MeasureGrid entries={styleEntries} cols={2} />
                </>
              )}
            </div>
          );
        })}

        {/* ── Grand Total Footer ── */}
        <div className="info-box ib-gold">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))",
              gap: 12,
              width: "100%",
            }}
          >
            {[
              ["Grand Total", `$${grandTotals.total.toFixed(2)}`],
              ["Total Discount", `$${grandTotals.discount.toFixed(2)}`],
              ["Total Paid", `$${grandTotals.paid.toFixed(2)}`],
              ["Remaining", `$${grandRemaining.toFixed(2)}`],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>
                  {label}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{val}</div>
              </div>
            ))}
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
          onClick={onSubmit}
          className="btn btn-gold"
          style={{ flex: 2 }}
          disabled={loading}
        >
          {loading
            ? t("createOrder.creatingOrder")
            : t("createOrder.confirmSubmit")}
        </button>
      </div>
    </div>
  );
}
