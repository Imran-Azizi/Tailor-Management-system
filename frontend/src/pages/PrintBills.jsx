import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api.js";
import toast from "react-hot-toast";
import {
  CustomerCombinedBill,
  PrintSafeSheet,
  TailorBill,
  getOrderDisplayName,
  getBillLanguageSettings,
  getMeasurementsFromOrder,
  getRakhtDetails,
  hasPrintableBillValue,
  printElement,
} from "../components/order/OrderDocumentPack.jsx";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
import {
  parseNumberLocale,
  normalizeText,
  normalizePhone,
  toAsciiDigits,
} from "../lib/normalize.js";
import { resolveRakhtColorHex } from "../lib/rakhtColors.js";
import { useAuth } from "../context/AuthContext.jsx";
import { mergePrintShopSources } from "../lib/billTypography.js";

export default function PrintBills() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const resolvedLanguage = i18n.resolvedLanguage || i18n.language;
  const billSettings = getBillLanguageSettings(resolvedLanguage);
  const { text: billText, langCode: currentLanguage, isRtl } = billSettings;
  const alignClass = isRtl ? "text-right" : "text-left";
  const preselectCustomerId = location?.state?.preselectCustomerId;
  const preselectBillNumber = location?.state?.preselectBillNumber;
  const isFinance = user?.accountType === "FINANCE";

  const [billNumber, setBillNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const shop = mergePrintShopSources(customer?.tenant, user?.tenant);

  const setSelectedCustomer = (full, { showToast = true } = {}) => {
    if (!full || !Array.isArray(full.orders) || full.orders.length === 0) {
      setCustomer(null);
      setSelectedOrder(null);
      if (showToast) {
        toast.error(t("createOrder.customerNotFound"));
      }
      return false;
    }

    setCustomer(full);
    setSelectedOrder((full && full.orders && full.orders[0]) || null);
    setBillNumber(String(full?.billNumber || ""));
    setPhone(full?.phoneNumber || "");
    setName(full?.firstName || "");
    if (showToast) {
      toast.success(t("createOrder.customerFound"));
    }
    return true;
  };

  const toPrintableCustomer = (payload) => {
    if (!payload) return null;

    if (payload.customer && Array.isArray(payload.orders)) {
      return {
        ...payload.customer,
        orders: payload.orders,
        tenant: payload.tenant || payload.customer.tenant || null,
      };
    }

    return payload;
  };

  const fetchBillDetailsByOrderId = async (orderId) => {
    if (!orderId) return null;
    const billRes = await api.get(`/orders/${orderId}/bill`);
    return toPrintableCustomer(billRes.data);
  };

  const fetchBillDetailsByBillNumber = async (value) => {
    const bn = parseNumberLocale(toAsciiDigits(String(value || "").trim()));
    if (!Number.isFinite(bn) || bn <= 0) return null;

    const { data } = await api.get("/orders/lookup", {
      params: { billNumber: Math.trunc(bn) },
    });
    return toPrintableCustomer(data);
  };

  const fetchCustomerDetails = async (id) => {
    const res = await api.get(`/customers/${id}`);
    const customerDetails = res.data;
    const firstOrderId = customerDetails?.orders?.[0]?.id;
    if (!firstOrderId) return customerDetails;

    try {
      const billData = await fetchBillDetailsByOrderId(firstOrderId);
      if (billData?.orders?.length) {
        return {
          ...customerDetails,
          ...billData,
        };
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Bill detail hydration failed", error);
      }
    }

    return customerDetails;
  };

  useEffect(() => {
    if (!preselectCustomerId && !preselectBillNumber) return;

    let ignore = false;
    setLoading(true);

    const loadPreselectedBill = async () => {
      if (preselectBillNumber) {
        const full = await fetchBillDetailsByBillNumber(preselectBillNumber);
        if (full) return full;
      }
      if (preselectCustomerId && !isFinance) {
        return fetchCustomerDetails(preselectCustomerId);
      }
      return null;
    };

    loadPreselectedBill()
      .then((full) => {
        if (ignore) return;
        setSelectedCustomer(full, { showToast: false });
      })
      .catch((error) => {
        if (ignore) return;
        if (import.meta.env.DEV) {
          console.error("Auto-select customer failed", error);
        }
        toast.error(t("createOrder.customerLookupFailed") || "Search failed");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
        navigate(location.pathname, { replace: true, state: null });
      });

    return () => {
      ignore = true;
    };
  }, [
    isFinance,
    location.pathname,
    navigate,
    preselectBillNumber,
    preselectCustomerId,
    t,
  ]);

  const handleSearch = async () => {
    setLoading(true);
    setCustomer(null);
    setSelectedOrder(null);

    try {
      if (billNumber.trim()) {
        const bn = parseNumberLocale(toAsciiDigits(billNumber.trim()));
        if (!Number.isFinite(bn) || bn <= 0) {
          toast.error(t("createOrder.customerNotFound"));
          return;
        }

        const { data } = await api.get("/orders/lookup", {
          params: { billNumber: Math.trunc(bn) },
        });

        if (data?.customer?.id) {
          const full = toPrintableCustomer(data);
          setSelectedCustomer(full);
          return;
        }
        toast.error(t("createOrder.customerNotFound"));
        return;
      }

      if (phone.trim()) {
        const p = normalizePhone(phone.trim());
        const { data } = await api.get("/orders/lookup", {
          params: { phoneNumber: p },
        });

        if (data?.customer?.id) {
          const full = toPrintableCustomer(data);
          setSelectedCustomer(full);
          return;
        }
        toast.error(t("createOrder.customerNotFound"));
        return;
      }

      if (name.trim()) {
        const normalizedName = normalizeText(name.trim());
        if (isFinance) {
          const { data } = await api.get("/orders/global-search", {
            params: { q: normalizedName, limit: 1 },
          });
          const order = data?.data?.[0];
          const full = await fetchBillDetailsByOrderId(order?.id);
          if (full) {
            setSelectedCustomer(full);
            return;
          }
          toast.error(t("createOrder.customerNotFound"));
          return;
        }

        const res = await api.get("/customers", {
          params: { search: normalizedName, limit: 50 },
        });
        const list = (res.data && res.data.data) || [];
        const customersWithOrders = list.filter(
          (c) => Number(c?._count?.orders || 0) > 0,
        );
        const found =
          customersWithOrders.find(
            (c) => normalizeText(c.firstName || "") === normalizedName,
          ) || customersWithOrders[0];
        if (found) {
          const full = await fetchCustomerDetails(found.id);
          setSelectedCustomer(full);
          return;
        }
        toast.error(t("createOrder.customerNotFound"));
        return;
      }

      toast(t("orders.searchCustomers"));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Search failed", error);
      }
      if (error?.response?.status === 404) {
        toast.error(t("createOrder.customerNotFound"));
      } else {
        toast.error(t("createOrder.customerLookupFailed") || "Search failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    handleSearch();
  };

  const handlePrintCustomerBill = () => {
    if (!customer || !(customer.orders || []).length) {
      toast.error(t("orders.noOrders") || "No orders found for this customer.");
      return;
    }
    try {
      const printed = printElement("preview-customer", {
        dir: billSettings.dir,
        lang: billSettings.htmlLang,
        title: t("orders.orderDocuments"),
      });
      if (!printed) {
        toast.error(t("orders.printFailed") || "Print failed");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Print failed", error);
      }
      toast.error(t("orders.printFailed") || "Print failed");
    }
  };

  const handlePrintTailorBill = (order, previewId) => {
    if (!order) {
      toast.error(
        t("createOrder.selectAtLeastOne") || "No order selected for print.",
      );
      return;
    }
    setSelectedOrder(order);
    try {
      const printed = printElement(previewId, {
        dir: billSettings.dir,
        lang: billSettings.htmlLang,
        title: t("orders.orderDocuments"),
      });
      if (!printed) {
        toast.error(t("orders.printFailed") || "Print failed");
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Print failed", error);
      }
      toast.error(t("orders.printFailed") || "Print failed");
    }
  };

  const getTailorPreviewId = (order, index) =>
    `preview-tailor-${order?.id || `${order?.type || "order"}-${index}`}`;

  const orders = customer?.orders || [];
  const orderMeta = useMemo(
    () => buildOrderItemMeta(orders, currentLanguage, customer?.firstName),
    [orders, currentLanguage, customer?.firstName],
  );
  const isBillEmergency = useMemo(
    () => orders.some((order) => order.isEmergency),
    [orders],
  );
  const emergencyTypes = useMemo(
    () =>
      Array.from(
        new Set(
          orders.map((order) => getOrderDisplayName(order, currentLanguage)),
        ),
      ),
    [orders, currentLanguage],
  );
  const emergencyAnchorOrder = useMemo(() => orders[0] || null, [orders]);

  return (
    <div
      className={`page print-bills-page ${isRtl ? "print-bills-page--rtl" : "print-bills-page--ltr"}`}
      lang={billSettings.htmlLang}
      dir={billSettings.dir}
      style={{
        maxWidth: 760,
        margin: "0 auto",
        fontFamily: billSettings.fontFamily,
      }}
    >
      <div className="no-print">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
          {t("orders.printBills")}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
          {t("orders.printPackCopy")}
        </p>
        <div
          style={{
            marginBottom: 14,
            display: "inline-flex",
            gap: 8,
            flexWrap: "wrap",
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

        <div className="card" style={{ padding: 18 }}>
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}
          >
            <div>
              <div className="form-row">
                <div>
                  <label
                    htmlFor="print-bills-bill-number"
                    className="lbl"
                    style={{ textAlign: isRtl ? "right" : "left" }}
                  >
                    {t("orders.billNumber")}
                  </label>
                  <input
                    id="print-bills-bill-number"
                    aria-label={t("orders.billNumber")}
                    className="inp"
                    dir="ltr"
                    data-field-direction="ltr"
                    placeholder={t("orders.billNumber")}
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="print-bills-phone"
                    className="lbl"
                    style={{ textAlign: isRtl ? "right" : "left" }}
                  >
                    {t("common.phone", "Phone")}
                  </label>
                  <input
                    id="print-bills-phone"
                    aria-label={t("common.phone", "Phone")}
                    className="inp"
                    dir="ltr"
                    data-field-direction="ltr"
                    placeholder={t("common.phone", "Phone")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <label
                  htmlFor="print-bills-first-name"
                  className="lbl"
                  style={{ textAlign: isRtl ? "right" : "left" }}
                >
                  {t("createOrder.firstName")}
                </label>
                <input
                  id="print-bills-first-name"
                  aria-label={t("createOrder.firstName")}
                  className="inp"
                  dir={isRtl ? "rtl" : "ltr"}
                  placeholder={t("createOrder.firstName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ marginTop: 12 }} className="vstack">
                <div
                  className="form-row"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <button
                    aria-label={t("common.search")}
                    type="submit"
                    className="btn btn-gold print-btn"
                    disabled={loading}
                  >
                    {loading ? `${t("common.loading")}` : t("common.search")}
                  </button>
                  <button
                    aria-label={t("common.cancel")}
                    type="button"
                    className="btn btn-outline print-btn"
                    onClick={() => {
                      setBillNumber("");
                      setPhone("");
                      setName("");
                      setCustomer(null);
                      setSelectedOrder(null);
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                {customer ? (
                  <div>
                    {isBillEmergency && (
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#b91c1c",
                            letterSpacing: ".06em",
                            textTransform: "uppercase",
                            marginBottom: 8,
                          }}
                        >
                          {t("createOrder.emergencyOrder")}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (emergencyAnchorOrder) {
                              setSelectedOrder(emergencyAnchorOrder);
                            }
                          }}
                          className="btn btn-outline"
                          style={{
                            height: "auto",
                            width: "100%",
                            padding: "10px 12px",
                            justifyContent: "flex-start",
                            textAlign: isRtl ? "right" : "left",
                            borderColor: "#ef4444",
                            background: "#fff1f2",
                          }}
                        >
                          <span
                            className="badge bg-red"
                            style={{ fontSize: 10, marginInlineEnd: 8 }}
                          >
                            {t("createOrder.emergencyShort")}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: 12 }}>
                            {emergencyTypes.join(", ")}
                          </span>
                        </button>
                      </div>
                    )}

                    <div className="vstack">
                      <button
                        aria-label={billText.printBillForCustomer}
                        className="btn btn-gold print-btn"
                        disabled={!customer || orders.length === 0}
                        onClick={handlePrintCustomerBill}
                      >
                        {billText.printBillForCustomer}
                      </button>
                    </div>

                    {orders.length > 0 && (
                      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                        {orderMeta.map((meta) => {
                          const { order, index, itemLabel, primaryName } = meta;
                          const isSelected = selectedOrder?.id === order.id;
                          const rakhtDetails = getRakhtDetails(order);
                          return (
                            <div
                              key={order.id || `${order.type}-${index}`}
                              className={`rounded-xl border px-3 py-3 shadow-sm transition ${
                                isSelected
                                  ? "border-amber-500 bg-amber-100/70 dark:border-amber-400 dark:bg-amber-900/20"
                                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                              }`}
                            >
                              <div
                                className={`flex flex-wrap items-center justify-between gap-3 ${alignClass}`}
                              >
                                <div
                                  className={`flex flex-wrap items-center gap-2 ${isRtl ? "flex-row-reverse" : "flex-row"}`}
                                >
                                  <span
                                    className="badge bg-gold"
                                    style={{ fontSize: 11 }}
                                  >
                                    {itemLabel}
                                  </span>
                                  {primaryName ? (
                                    <span
                                      style={{
                                        fontSize: 12,
                                        color: "var(--text2)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {primaryName}
                                    </span>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() =>
                                    handlePrintTailorBill(
                                      order,
                                      getTailorPreviewId(order, index),
                                    )
                                  }
                                >
                                  {`${t("createOrder.printBill")} ${itemLabel}`}
                                </button>
                              </div>

                              {rakhtDetails.hasData && (
                                <div
                                  style={{
                                    marginTop: 10,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 800,
                                      color: "var(--warning-strong)",
                                      textTransform: "uppercase",
                                      letterSpacing: ".08em",
                                    }}
                                  >
                                    {t("createOrder.rakhtSelection", {
                                      defaultValue: "Rakht",
                                    })}
                                  </span>
                                  {hasPrintableBillValue(
                                    rakhtDetails.brand || rakhtDetails.company,
                                  ) && (
                                    <span
                                      className="badge"
                                      style={{
                                        background: "var(--warning-soft)",
                                        color: "var(--warning-strong)",
                                        border:
                                          "1px solid var(--warning-soft-border)",
                                      }}
                                    >
                                      {rakhtDetails.brand ||
                                        rakhtDetails.company}
                                    </span>
                                  )}
                                  {hasPrintableBillValue(
                                    rakhtDetails.color,
                                  ) && (
                                    <span
                                      className="badge"
                                      style={{
                                        background: "var(--info-soft)",
                                        color: "var(--info)",
                                        border:
                                          "1px solid var(--info-soft-border)",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                    >
                                      {resolveRakhtColorHex(
                                        rakhtDetails.color,
                                        rakhtDetails.colorHex,
                                      ) ? (
                                        <span
                                          style={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            border:
                                              "1px solid rgba(15,23,42,0.16)",
                                            background: resolveRakhtColorHex(
                                              rakhtDetails.color,
                                              rakhtDetails.colorHex,
                                            ),
                                          }}
                                        />
                                      ) : null}
                                      {rakhtDetails.color}
                                    </span>
                                  )}
                                  {hasPrintableBillValue(
                                    rakhtDetails.meters,
                                  ) && (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        color: "var(--text1)",
                                      }}
                                    >
                                      {rakhtDetails.meters}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 14, color: "var(--text3)" }}>
                    {t("common.noData")}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      <div style={{ display: "none" }}>
        {customer && orders.length > 0 && (
          <div>
            <PrintSafeSheet id="preview-customer">
              <CustomerCombinedBill
                customer={customer}
                orders={orders}
                shop={shop}
              />
            </PrintSafeSheet>
            {orderMeta.map(({ order, index, itemLabel }) => (
              <PrintSafeSheet
                key={order.id || `${order.type}-${index}`}
                id={getTailorPreviewId(order, index)}
              >
                <TailorBill
                  customer={customer}
                  order={order}
                  measurements={getMeasurementsFromOrder(order)}
                  itemLabel={itemLabel}
                  shop={shop}
                />
              </PrintSafeSheet>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function buildOrderItemMeta(orders = [], language, customerName) {
  const typeCounts = {};
  const totalByType = (orders || []).reduce((acc, order) => {
    const typeKey = order?.type || "ITEM";
    acc[typeKey] = (acc[typeKey] || 0) + 1;
    return acc;
  }, {});

  return (orders || []).map((order, index) => {
    const typeKey = order?.type || "ITEM";
    typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;
    const itemNumber = typeCounts[typeKey];

    const parts = getOrderLabelParts(order, language, {
      totalByType: totalByType[typeKey],
      sequenceByType: itemNumber,
    });
    return {
      order,
      index,
      itemNumber,
      itemLabel: parts.typeWithSequenceLabel,
      primaryName: getOrderPrimaryDisplayName(order, customerName, language, {
        totalByType: totalByType[typeKey],
        sequenceByType: itemNumber,
      }),
      fullLabel: parts.fullLabel,
    };
  });
}
