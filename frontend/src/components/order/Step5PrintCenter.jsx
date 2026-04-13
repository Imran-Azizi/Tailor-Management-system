import { LuBadgeCheck, LuPrinter, LuScissors } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import {
  CustomerBill,
  TailorBill,
  getMeasurementsFromOrder,
  printElement,
} from "./OrderDocumentPack.jsx";

function toPreviewOrder(order, measurements) {
  return {
    ...order,
    measurements: Array.isArray(measurements)
      ? measurements[0] || {}
      : measurements || {},
  };
}

export default function Step5PrintCenter({ data }) {
  const { t } = useTranslation();
  const result = data?.result;
  const customer = result?.customer;
  const orders = result?.orders || [];
  const measurements = data?.measurements || {};

  if (!result) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 0",
          color: "var(--text3)",
          fontSize: 14,
        }}
      >
        {t("createOrder.waitingConfirmation")}
      </div>
    );
  }

  return (
    <div>
      {/* ── Success badge ── */}
      <div style={{ textAlign: "center", paddingBottom: 28 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "#DCFCE7",
            marginBottom: 14,
          }}
        >
          <LuBadgeCheck size={30} style={{ color: "#059669" }} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
          {t("createOrder.orderCreated")}
        </h2>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 99,
            padding: "5px 16px",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--text3)" }}>
            {t("createOrder.billLabel")}
          </span>
          <span style={{ fontWeight: 800, color: "var(--primary)" }}>
            #{customer?.billNumber}
          </span>
          <span style={{ color: "var(--border2)" }}>·</span>
          <span style={{ color: "var(--text3)" }}>
            {orders.length}{" "}
            {orders.length > 1
              ? t("createOrder.ordersPlural")
              : t("createOrder.orderSingular")}
          </span>
        </div>
      </div>

      {/* ── Print cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((order, index) => {
          const previewOrder = toPreviewOrder(order, measurements[index]);
          const meas = getMeasurementsFromOrder(previewOrder);
          const customerId = `step5-order-${order.id || index}-customer`;
          const tailorId = `step5-order-${order.id || index}-tailor`;

          return (
            <div
              key={order.id || index}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                overflow: "hidden",
                background: "var(--surface)",
              }}
            >
              {/* Order label (only when multiple orders or has a name) */}
              {(orders.length > 1 || order.orderName) && (
                <div
                  style={{
                    padding: "10px 18px",
                    background: "var(--surface2)",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span className="badge bg-gold" style={{ fontSize: 11 }}>
                    {order.type}
                  </span>
                  {order.orderName ? (
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {order.orderName}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>
                      {t("createOrder.orderLabel", { number: index + 1 })}
                    </span>
                  )}
                </div>
              )}

              {/* Two print buttons side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {/* Customer bill button */}
                <button
                  type="button"
                  onClick={() => printElement(customerId)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "28px 16px",
                    border: "none",
                    cursor: "pointer",
                    background:
                      "linear-gradient(135deg, #0F6CBD 0%, #1D82D7 100%)",
                    color: "#fff",
                    transition: "opacity .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = ".88")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LuPrinter size={20} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}
                    >
                      {t("createOrder.printBill")}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>
                      {t("createOrder.forCustomer")}
                    </div>
                  </div>
                </button>

                {/* Tailor shop button */}
                <button
                  type="button"
                  onClick={() => printElement(tailorId)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "28px 16px",
                    border: "none",
                    cursor: "pointer",
                    background:
                      "linear-gradient(135deg, #2B211A 0%, #584332 100%)",
                    color: "#fff",
                    transition: "opacity .15s",
                    borderLeft: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = ".88")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LuScissors size={20} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}
                    >
                      {t("createOrder.printBill")}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2 }}>
                      {t("createOrder.forTailor")}
                    </div>
                  </div>
                </button>
              </div>

              {/* Hidden print targets (off-screen, not display:none so they render correctly) */}
              <div
                style={{
                  position: "absolute",
                  left: "-9999px",
                  top: 0,
                  pointerEvents: "none",
                  zIndex: -1,
                }}
              >
                <div id={customerId}>
                  <CustomerBill customer={customer} order={previewOrder} />
                </div>
                <div id={tailorId}>
                  <TailorBill
                    customer={customer}
                    order={previewOrder}
                    measurements={meas}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
