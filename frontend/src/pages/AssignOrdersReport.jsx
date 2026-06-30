import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuClipboardList, LuSearch } from "react-icons/lu";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import api from "../lib/api.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { getOrderLabelParts } from "../lib/orderType.js";
import {
  getOrderCompletionBadgeStyle,
  getOrderCompletionStatus,
} from "../lib/orderCompletionStatus.js";
import {
  Card,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
} from "../components/ui/index.jsx";

function getRoleReceivedWorker(order, role) {
  if (role === "QICHIKAR") {
    return (
      order?.qichikarReceivedBy ||
      (order?.receivedBy?.accountType === "QICHIKAR" ? order.receivedBy : null)
    );
  }

  if (role === "DOKHT") {
    return (
      order?.dokhtReceivedBy ||
      (order?.receivedBy?.accountType === "DOKHT" ? order.receivedBy : null)
    );
  }

  return null;
}

function getOrderReceivedState(order, t) {
  const dokhtWorker = getRoleReceivedWorker(order, "DOKHT");
  if (dokhtWorker || order?.dokhtReceivedById) {
    return {
      key: "DOKHT_RECEIVED",
      color: "#D97706",
      soft: "#FEF3C7",
      label: t("assignment.dokhtReceivedStatus", {
        name:
          dokhtWorker?.name ||
          t("assignment.dokhtWorkerFallback", "Dokht worker"),
        defaultValue: "Dokht worker {{name}} has received this order.",
      }),
      detail: "",
    };
  }

  const qichikarWorker = getRoleReceivedWorker(order, "QICHIKAR");
  if (qichikarWorker || order?.qichikarReceivedById) {
    return {
      key: "QICHIKAR_RECEIVED",
      color: "#2563EB",
      soft: "#DBEAFE",
      label: t("assignment.qichikarReceivedStatus", {
        name:
          qichikarWorker?.name ||
          t("assignment.qichikarWorkerFallback", "Qichikar"),
        defaultValue: "Qichikar {{name}} has received this order.",
      }),
      detail: "",
    };
  }

  return null;
}

function resolveAssignmentState(order, t) {
  const completionStatus = getOrderCompletionStatus(order, t);
  if (
    completionStatus.key === "damage" ||
    completionStatus.key === "readyForDelivery" ||
    completionStatus.key === "dokhtCompleted" ||
    completionStatus.key === "legacyCompleted"
  ) {
    return completionStatus;
  }

  const receivedStatus = getOrderReceivedState(order, t);
  if (receivedStatus) return receivedStatus;

  if (completionStatus.key !== "pending") return completionStatus;
  const assignedWorker = order?.assignedTo;

  if (assignedWorker?.accountType === "QICHIKAR") {
    return {
      key: "WITH_QICHIKAR",
      color: "#2563EB",
      soft: "#DBEAFE",
      label: t("assignment.statusWithQichikar", {
        defaultValue: "With Qichikar {{name}}",
        name: assignedWorker.name || "Qichikar",
      }),
      detail: "",
    };
  }

  if (assignedWorker?.accountType === "DOKHT") {
    return {
      key: "WITH_DOKHT",
      color: "#D97706",
      soft: "#FEF3C7",
      label: t("assignment.statusWithDokht", {
        defaultValue: "With Dokht {{name}}",
        name: assignedWorker.name || "Dokht",
      }),
      detail: "",
    };
  }

  return {
    ...completionStatus,
    label: t("assignment.statusPending", "Order is pending"),
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
        toast.error(t("assignment.searchFailed", "Search failed."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`page report-root professional-report-page assignment-report-page ${
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
          className="assignment-report-search-form"
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
          <Card title={t("assignment.searchResult", "Search Result")}>
            <div className="assignment-report-loading">
              <Spinner />
              <p>{t("common.loading", "Loading")}</p>
            </div>
          </Card>
        ) : isOrderNotFound ? (
          <Card title={t("assignment.searchResult", "Search Result")} noPad>
            <div className="assignment-report-empty">
              <EmptyState
                message={t(
                  "assignment.orderNotFoundSystem",
                  "Order not found in the system",
                )}
                Icon={LuClipboardList}
              />
            </div>
          </Card>
        ) : lookupResult ? (
          <div style={{ display: "grid", gap: 16 }}>
            <Card title={t("common.allOrders", "All Orders")} noPad>
              <div className="assignment-report-results-shell">
                <div className="assignment-report-results-summary">
                  <span className="assignment-report-results-badge">
                    {t("assignment.searchResult", "Search Result")}
                  </span>
                  <span className="assignment-report-results-query">
                    {t("orders.billNumber", "Bill Number")}:{" "}
                    <strong>{billNumber}</strong>
                  </span>
                </div>

                <div className="assignment-report-card-grid">
                  {(lookupResult.orders || []).map((order) => {
                    const orderLabel = getOrderLabelParts(order, language);
                    const state = resolveAssignmentState(order, t);
                    const bill = order?.customer?.billNumber;
                    const resolvedRealCustomerName =
                      String(order?.customer?.firstName || "").trim() ||
                      String(lookupResult?.customer?.firstName || "").trim() ||
                      (bill !== null && bill !== undefined
                        ? String(customerNameByBill[bill] || "").trim()
                        : "") ||
                      "-";
                    const displayCustomerName =
                      String(orderLabel.customName || "").trim() ||
                      resolvedRealCustomerName;

                    return (
                      <article key={order.id} className="assignment-status-card">
                        <div className="assignment-status-card__head">
                          <div className="assignment-status-card__identity">
                            <span className="assignment-status-card__bill">
                              #{bill ?? "-"}
                            </span>
                            <h3>{displayCustomerName}</h3>
                            <p>{orderLabel.typeWithSequenceLabel}</p>
                          </div>
                          <span
                            className="assignment-status-card__status"
                            style={getOrderCompletionBadgeStyle(state)}
                          >
                            <strong>{state.label}</strong>
                            {state.detail ? <span>{state.detail}</span> : null}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
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
