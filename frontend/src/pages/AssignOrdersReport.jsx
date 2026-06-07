import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuSearch } from "react-icons/lu";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { getOrderLabelParts } from "../lib/orderType.js";
import {
  Card,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
} from "../components/ui/index.jsx";
import OrderCreatorBadge from "../components/order/OrderCreatorBadge.jsx";

function resolveOrderState(order) {
  if (order?.isDamageOrder) {
    return { key: "DAMAGE_ORDER", tone: "danger", workerName: "" };
  }

  if (order?.isCompleted) {
    return { key: "COMPLETED", tone: "success", workerName: "" };
  }

  const assignedWorker = order?.assignedTo;
  if (assignedWorker?.accountType === "QICHIKAR") {
    return {
      key: "WITH_QICHIKAR",
      tone: "info",
      workerName: assignedWorker.name || "Qichikar",
    };
  }

  if (assignedWorker?.accountType === "DOKHT") {
    return {
      key: "WITH_DOKHT",
      tone: "info",
      workerName: assignedWorker.name || "Dokht",
    };
  }

  return { key: "PENDING", tone: "warning", workerName: "" };
}

function getLocalizedStatusMessage(t, state) {
  if (state.key === "DAMAGE_ORDER") {
    return t("orders.damageOrderStatus", "Damage Order");
  }
  if (state.key === "WITH_QICHIKAR") {
    return t("assignment.statusWithQichikar", {
      defaultValue: "With Qichikar {{name}}",
      name: state.workerName || "-",
    });
  }
  if (state.key === "WITH_DOKHT") {
    return t("assignment.statusWithDokht", {
      defaultValue: "With Dokht {{name}}",
      name: state.workerName || "-",
    });
  }
  if (state.key === "COMPLETED") {
    return t("assignment.statusCompleted", "Order completed");
  }
  return t("assignment.statusPending", "Order is pending");
}

function stateStyle(tone) {
  if (tone === "danger") {
    return {
      color: "#991B1B",
      background: "#FEF2F2",
      border: "1px solid #FECACA",
    };
  }
  if (tone === "success") {
    return {
      color: "#15803D",
      background: "#F0FDF4",
      border: "1px solid #86EFAC",
    };
  }
  if (tone === "info") {
    return {
      color: "#1D4ED8",
      background: "#EFF6FF",
      border: "1px solid #BFDBFE",
    };
  }
  if (tone === "warning") {
    return {
      color: "#B45309",
      background: "#FFFBEB",
      border: "1px solid #FCD34D",
    };
  }
  return {
    color: "var(--text2)",
    background: "var(--surface2)",
    border: "1px solid var(--border)",
  };
}

function isReportRtl(language = "en") {
  const l = String(language || "en").toLowerCase();
  return (
    l.startsWith("dari") ||
    l.startsWith("fa") ||
    l.startsWith("pashto") ||
    l.startsWith("ps")
  );
}

export default function AssignOrdersReport() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isReportRtl(language);

  const [billNumber, setBillNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [isOrderNotFound, setIsOrderNotFound] = useState(false);

  const customerNameByBill = useMemo(() => {
    const map = {};
    const orders = Array.isArray(lookupResult?.orders)
      ? lookupResult.orders
      : [];

    orders.forEach((order) => {
      const bill = order?.customer?.billNumber;
      if (bill === null || bill === undefined) return;

      const orderCustomerName = String(order?.customer?.firstName || "").trim();
      if (
        orderCustomerName &&
        (!map[bill] || orderCustomerName.length > map[bill].length)
      ) {
        map[bill] = orderCustomerName;
      }
    });

    return map;
  }, [lookupResult, language]);

  const searchByBill = async () => {
    const parsedBill = parseNumberLocale(billNumber);

    if (!Number.isFinite(parsedBill) || parsedBill <= 0) {
      toast.error(
        t("assignment.invalidBillNumber", "Enter a valid bill number."),
      );
      return;
    }

    setLoading(true);
    setIsOrderNotFound(false);
    try {
      const { data } = await api.get("/orders/lookup", {
        params: { billNumber: Math.trunc(parsedBill) },
      });
      setLookupResult(data);
      if (!data?.orders?.length) {
        setIsOrderNotFound(true);
      }
    } catch (err) {
      setLookupResult(null);
      if (err?.response?.status === 404) {
        setIsOrderNotFound(true);
      } else {
        toast.error(
          getApiErrorMessage(
            err,
            t("assignment.searchFailed", "Search failed."),
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`page report-root assignment-report-page ${
        isRtl ? "assignment-report-page--rtl" : "assignment-report-page--ltr"
      } leading-relaxed tracking-normal`}
      style={{
        maxWidth: 920,
        margin: "0 auto",
        width: "100%",
        direction: isRtl ? "rtl" : "ltr",
        textAlign: isRtl ? "right" : "left",
        fontFamily: isRtl
          ? "'Vazirmatn', 'Noto Sans Arabic', 'Noto Naskh Arabic', sans-serif"
          : undefined,
      }}
    >
      <PageHeader
        title={t("assignment.reportTitle", "Order Tracking")}
        subtitle={t(
          "assignment.reportSubtitle",
          "Search by bill number to quickly see where each order currently is.",
        )}
      />

      <Card>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "minmax(0, 1fr) auto",
            alignItems: "end",
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          <Field label={t("orders.billNumber", "Bill Number")} required>
            <input
              className="inp"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder={t(
                "assignment.billSearchPlaceholder",
                "Search by bill number",
              )}
              inputMode="numeric"
              onKeyDown={(e) => {
                if (e.key === "Enter") searchByBill();
              }}
            />
          </Field>

          <button
            type="button"
            className="btn btn-gold"
            onClick={searchByBill}
            disabled={loading}
            style={{
              minWidth: 132,
              justifyContent: "center",
            }}
          >
            <LuSearch size={14} />
            {t("common.search", "Search")}
          </button>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <Spinner />
        ) : isOrderNotFound ? (
          <Card title={t("assignment.searchResult", "Search Result")} noPad>
            <div style={{ padding: 16, display: "grid", gap: 8 }}>
              <div className="badge bg-gray">
                {t(
                  "assignment.orderNotFoundSystem",
                  "Order not found in the system",
                )}
              </div>
            </div>
          </Card>
        ) : lookupResult ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Card title={t("common.allOrders", "All Orders")}>
              <div style={{ display: "grid", gap: 10 }}>
                {(lookupResult.orders || []).map((order) => {
                  const orderLabel = getOrderLabelParts(order, language);
                  const state = resolveOrderState(order);
                  const localizedStatus = getLocalizedStatusMessage(t, state);
                  const billNumber = order?.customer?.billNumber;
                  const resolvedRealCustomerName =
                    String(order?.customer?.firstName || "").trim() ||
                    String(lookupResult?.customer?.firstName || "").trim() ||
                    (billNumber !== null && billNumber !== undefined
                      ? String(customerNameByBill[billNumber] || "").trim()
                      : "") ||
                    "-";
                  const displayCustomerName =
                    String(orderLabel.customName || "").trim() ||
                    resolvedRealCustomerName;
                  return (
                    <div
                      key={order.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        background: "var(--surface)",
                        display: "grid",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: "var(--text1)",
                          }}
                        >
                          {displayCustomerName}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text2)",
                          }}
                        >
                          {orderLabel.typeWithSequenceLabel}
                        </span>
                        <span className="badge bg-gray">
                          #{billNumber ?? "-"}
                        </span>
                        <OrderCreatorBadge order={order} compact />
                      </div>

                      <div
                        style={{
                          ...stateStyle(state.tone),
                          borderRadius: 8,
                          padding: "6px 10px",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700 }}>
                          {localizedStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : (
          <Card title={t("assignment.searchResult", "Search Result")} noPad>
            <EmptyState
              message={t(
                "assignment.reportEmpty",
                "Search by bill number to see where this order is currently assigned.",
              )}
              Icon={AfCurrencyIcon}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
