import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuReceipt, LuSearch } from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import {
  Card,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
} from "../components/ui/index.jsx";

function resolveOrderState(order) {
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

export default function AssignOrdersReport() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";

  const [billNumber, setBillNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [isOrderNotFound, setIsOrderNotFound] = useState(false);

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
      className="page"
      style={{
        maxWidth: 920,
        margin: "0 auto",
        width: "100%",
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
            className="btn btn-primary"
            onClick={searchByBill}
            disabled={loading}
            style={{ minWidth: 120, justifyContent: "center" }}
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
                  const state = resolveOrderState(order);
                  const localizedStatus = getLocalizedStatusMessage(t, state);
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
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--text1)",
                          }}
                        >
                          {getOrderTypeLabel(order.type, language)}
                        </span>
                        <span className="badge bg-gray">
                          #{order?.customer?.billNumber ?? "-"}
                        </span>
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
              Icon={LuReceipt}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
