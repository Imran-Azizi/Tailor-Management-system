import { LuBadgeCheck, LuPrinter, LuScissors } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import {
  CustomerBill,
  getOrderLabelParts,
  TailorBill,
  getBillLanguageSettings,
  getMeasurementsFromOrder,
  printElement,
} from "./OrderDocumentPack.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function toPreviewOrder(order, measurements) {
  return {
    ...order,
    measurements: Array.isArray(measurements)
      ? measurements[0] || {}
      : measurements || {},
  };
}

export default function Step5PrintCenter({ data }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const shop = user?.tenant || null;
  const result = data?.result;
  const customer = result?.customer;
  const orders = result?.orders || [];
  const measurements = data?.measurements || {};
  const currentLanguage = i18n.resolvedLanguage || i18n.language;
  const billSettings = getBillLanguageSettings(currentLanguage);

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
          <span style={{ color: "var(--border2)" }}>•</span>
          <span style={{ color: "var(--text3)" }}>
            {orders.length}{" "}
            {orders.length > 1
              ? t("createOrder.ordersPlural")
              : t("createOrder.orderSingular")}
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "inline-flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { code: "en", label: t("common.english") },
            { code: "dari", label: t("common.dari") },
            { code: "pashto", label: t("common.pashto") },
          ].map((lang) => {
            const isActive = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                className={`btn ${isActive ? "btn-gold" : "btn-outline"}`}
                style={{ height: 34, padding: "0 12px", fontSize: 12 }}
                onClick={() => {
                  i18n.changeLanguage(lang.code);
                  localStorage.setItem("lang", lang.code);
                }}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

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
              {(orders.length > 1 ||
                order.orderName ||
                Number(order.orderTypeTotal || 0) > 1) && (
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
                    {getOrderLabelParts(order, currentLanguage).fullLabel}
                  </span>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <button
                  type="button"
                  onClick={() =>
                    printElement(customerId, {
                      dir: billSettings.dir,
                      lang: billSettings.htmlLang,
                      title: t("orders.orderDocuments"),
                    })
                  }
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

                <button
                  type="button"
                  onClick={() =>
                    printElement(tailorId, {
                      dir: billSettings.dir,
                      lang: billSettings.htmlLang,
                      title: t("orders.orderDocuments"),
                    })
                  }
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
                    borderInlineStart: "1px solid rgba(255,255,255,0.1)",
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

              <div
                style={{
                  position: "absolute",
                  insetInlineStart: "-9999px",
                  top: 0,
                  pointerEvents: "none",
                  zIndex: -1,
                }}
              >
                <div id={customerId}>
                  <CustomerBill customer={customer} order={previewOrder} shop={shop} />
                </div>
                <div id={tailorId}>
                  <TailorBill
                    customer={customer}
                    order={previewOrder}
                    measurements={meas}
                    shop={shop}
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
