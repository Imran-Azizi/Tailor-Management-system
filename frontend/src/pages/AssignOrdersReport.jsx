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

function resolveOrderState(order, t, lang) {
  const receivedBy = order?.receivedBy;
  const assignedTo = order?.assignedTo;
  const completedBy = receivedBy || assignedTo;

  const isDari = lang === "fa";
  const isPashto = lang === "ps";

  if (order?.isCompleted) {
    if (completedBy?.accountType === "QICHIKAR") {
      const name = completedBy?.name || "Qichikar";
      if (isPashto || isDari) {
        return {
          label: `قیچی کار ${name} این سفارش را تکمیل کرد است`,
          tone: "success",
        };
      }
      return {
        label: `Qichikar ${name} completed this order`,
        tone: "success",
      };
    }
    if (completedBy?.accountType === "DOKHT" || assignedTo?.accountType === "DOKHT") {
      if (isPashto || isDari) {
        return {
          label: "فرمایش دوخته شد",
          tone: "success",
        };
      }
      return {
        label: "Order completed",
        tone: "success",
      };
    }
    if (isPashto || isDari) {
      return {
        label: "فرمایش دوخته شد",
        tone: "success",
      };
    }
    return {
      label: "Order completed",
      tone: "success",
    };
  }

  if (receivedBy?.accountType) {
    const isDokht = receivedBy.accountType === "DOKHT";
    const name = receivedBy?.name || "";

    if (isPashto || isDari) {
      if (isDokht) {
        return {
          label: name ? `دوخته ${name} پذیرفته` : `دوخته پذیرفته`,
          tone: "info",
        };
      }
      return {
        label: name ? `قیچی کار ${name} پذیرفته` : `قیچی کار پذیرفته`,
        tone: "info",
      };
    }

    const roleLabel = isDokht
      ? t("assignment.dokhtLabel", "Dokht")
      : t("assignment.qichikarLabel", "Qichikar");
    return {
      label: name ? `With ${name} (${roleLabel})` : `With ${roleLabel}`,
      tone: "info",
    };
  }

  if (assignedTo?.accountType) {
    const isDokht = assignedTo.accountType === "DOKHT";
    const name = assignedTo?.name || "";

    if (isPashto || isDari) {
      if (isDokht) {
        return {
          label: name
            ? `به دوخته ${name} فرستاده شده`
            : `به دوخته فرستاده شده`,
          tone: "warning",
        };
      }
      return {
        label: name
          ? `به قیچی کار ${name} فرستاده شده`
          : `به قیچی کار فرستاده شده`,
        tone: "warning",
      };
    }

    const roleLabel = isDokht
      ? t("assignment.dokhtLabel", "Dokht")
      : t("assignment.qichikarLabel", "Qichikar");
    return {
      label: name ? `Sent to ${name} (${roleLabel})` : `Sent to ${roleLabel}`,
      tone: "warning",
    };
  }

  if (isPashto || isDari) {
    return {
      label: "تخصیص نداده",
      tone: "muted",
    };
  }

  return {
    label: t("workerPanel.notAssigned", "Not assigned"),
    tone: "muted",
  };
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
  const language = i18n.resolvedLanguage || i18n.language;

  const [billNumber, setBillNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);

  const getErrorMessage = (key, fallback) => {
      const isPashto = language === "ps";
      const isDari = language === "fa";

      const translations = {
        invalidBillNumber: {
          ps: "یو正确的 بل نمبر entered کړئ",
          fa: "لطفاً یک شماره بل صحیح وارد کنید",
        },
        noOrdersFound: {
          ps: "د دې بل لپاره هیڅ سفارش ونه موندل شو",
          fa: "هیچ سفارشی برای این بل یافت نشد",
        },
        searchFailed: {
          ps: "لټون ناکام شو",
          fa: "جستجو ناموفق بود",
        },
      };

      if (isPashto || isDari) {
        return translations[key]?.[isPashto ? "ps" : "fa"] || fallback;
      }
      return fallback;
    };

  const searchByBill = async () => {
    const parsedBill = parseNumberLocale(billNumber);

    if (!Number.isFinite(parsedBill) || parsedBill <= 0) {
      toast.error(
        getErrorMessage("invalidBillNumber", t("assignment.invalidBillNumber", "Enter a valid bill number.")),
      );
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/orders/lookup", {
        params: { billNumber: Math.trunc(parsedBill) },
      });
      setLookupResult(data);
      if (!data?.orders?.length) {
        toast.error(
          getErrorMessage("noOrdersFound", t("assignment.noOrdersFound", "No orders found for this bill.")),
        );
      }
    } catch (err) {
      setLookupResult(null);
      if (err?.response?.status === 404) {
        toast.error(
          getErrorMessage("noOrdersFound", t("assignment.noOrdersFound", "No orders found for this bill.")),
        );
      } else {
        toast.error(
          getApiErrorMessage(
            err,
            getErrorMessage("searchFailed", t("assignment.searchFailed", "Search failed.")),
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedStrings = () => {
    const isPashto = language === "ps";
    const isDari = language === "fa";

    if (isPashto || isDari) {
      return {
        pageTitle: "راپور",
        pageSubtitle: "د بل نمبر سره search کړئ ترڅو وینئ چې دا سفارشlach کومې کس ته تخصیص شوی.",
        billLabel: "بل نمبر",
        searchPlaceholder: "د بل نمبر سره search کړئ",
        searchButton: "لټون",
        searchResultTitle: "د لټون نتیجه",
        emptyMessage: "د بل نمبر سره search کړئ ترڅو وینئ چې دا سفارش کومې کس ته تخصیص شوی.",
        allOrdersTitle: "ټول سفارشونه",
      };
    }

    return {
      pageTitle: t("sidebar.report", "Report"),
      pageSubtitle: t(
        "assignment.reportSubtitle",
        "Search by bill number and track where each order is (Dokht or Qichikar).",
      ),
      billLabel: t("orders.billNumber", "Bill Number"),
      searchPlaceholder: t(
        "assignment.billSearchPlaceholder",
        "Search by bill number",
      ),
      searchButton: t("common.search", "Search"),
      searchResultTitle: t("assignment.searchResult", "Search Result"),
      emptyMessage: t(
        "assignment.reportEmpty",
        "Search by bill number to see where this order is currently assigned.",
      ),
      allOrdersTitle: t("common.allOrders", "All Orders"),
    };
  };

  const localizedStrings = getLocalizedStrings();

  return (
    <div className="page">
      <PageHeader
        title={localizedStrings.pageTitle}
        subtitle={localizedStrings.pageSubtitle}
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
          <Field label={localizedStrings.billLabel} required>
            <input
              className="inp"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder={localizedStrings.searchPlaceholder}
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
            {localizedStrings.searchButton}
          </button>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <Spinner />
        ) : !lookupResult ? (
          <Card title={localizedStrings.searchResultTitle} noPad>
            <EmptyState
              message={localizedStrings.emptyMessage}
              Icon={LuReceipt}
            />
          </Card>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <Card title={localizedStrings.allOrdersTitle}>
              <div style={{ display: "grid", gap: 10 }}>
                {(lookupResult.orders || []).map((order) => {
                  const state = resolveOrderState(order, t, language);
                  return (
                    <div
                      key={order.id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        background: "var(--surface)",
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
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
                      </div>

                      <div
                        style={{
                          ...stateStyle(state.tone),
                          borderRadius: 8,
                          padding: "6px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 700 }}>
                          {state.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
