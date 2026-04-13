import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../lib/api.js";
import toast from "react-hot-toast";
import {
  CustomerBill,
  TailorBill,
  getMeasurementsFromOrder,
  printElement,
} from "../components/order/OrderDocumentPack.jsx";
import {
  parseNumberLocale,
  normalizePhone,
  normalizeText,
  toAsciiDigits,
} from "../lib/normalize.js";

export default function PrintBills() {
  const { t } = useTranslation();
  const [billNumber, setBillNumber] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchCustomerDetails = async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  };

  const handleSearch = async () => {
    setLoading(true);
    setCustomer(null);
    setSelectedOrder(null);
    try {
      if (phone.trim()) {
        const p = normalizePhone(phone.trim());
        const res = await api.get("/customers/search/phone", {
          params: { phone: p },
        });
        if (res.data) {
          const full = await fetchCustomerDetails(res.data.customer.id);
          setCustomer(full);
          setSelectedOrder((full && full.orders && full.orders[0]) || null);
          toast.success(t("createOrder.customerFound"));
          setLoading(false);
          return;
        }
        toast.error(t("createOrder.customerNotFound"));
        setLoading(false);
        return;
      }

      if (billNumber.trim()) {
        const bn = parseNumberLocale(toAsciiDigits(billNumber.trim()));
        const res = await api.get("/customers", { params: { limit: 1000 } });
        const list = (res.data && res.data.data) || [];
        const found = list.find((c) => Number(c.billNumber) === bn);
        if (found) {
          const full = await fetchCustomerDetails(found.id);
          setCustomer(full);
          setSelectedOrder((full && full.orders && full.orders[0]) || null);
          toast.success(t("createOrder.customerFound"));
          setLoading(false);
          return;
        }
        toast.error(t("createOrder.customerNotFound"));
        setLoading(false);
        return;
      }

      if (name.trim()) {
        const q = normalizeText(name.trim());
        const res = await api.get("/customers", {
          params: { search: q, limit: 50 },
        });
        const list = (res.data && res.data.data) || [];
        if (list.length) {
          const full = await fetchCustomerDetails(list[0].id);
          setCustomer(full);
          setSelectedOrder((full && full.orders && full.orders[0]) || null);
          toast.success(t("createOrder.customerFound"));
          setLoading(false);
          return;
        }
        toast.error(t("createOrder.customerNotFound"));
        setLoading(false);
        return;
      }

      toast(
        t("orders.searchCustomers") ||
          "Enter Bill Number, Customer Name or Phone Number to search",
      );
    } catch (e) {
      console.error("Search failed", e);
      toast.error(t("createOrder.customerLookupFailed") || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCustomerBill = () => {
    if (!selectedOrder) {
      toast.error(
        t("createOrder.selectAtLeastOne") || "No order selected for print.",
      );
      return;
    }
    try {
      printElement("preview-customer");
    } catch (e) {
      console.error("Print failed", e);
      toast.error(t("orders.printFailed") || "Print failed");
    }
  };

  const handlePrintType = (type) => {
    if (!customer || !customer.orders) return;
    const order = customer.orders.find((o) => o.type === type);
    if (!order) {
      toast.error(
        t("orders.noOrders") || "This customer does not have this order.",
      );
      return;
    }
    setSelectedOrder(order);
    try {
      printElement("preview-tailor");
    } catch (e) {
      console.error("Print failed", e);
      toast.error(t("orders.printFailed") || "Print failed");
    }
  };

  return (
    <div className="page" style={{ maxWidth: 680, margin: "0 auto" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {t("orders.printBills")}
      </h2>
      <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>
        {t("orders.printPackCopy")}
      </p>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
          {/* Search controls */}
          <div>
            <div className="form-row">
              <input
                aria-label={t("orders.billNumber")}
                className="inp"
                placeholder={t("orders.billNumber")}
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
              />
              <input
                aria-label={t("common.phone")}
                className="inp"
                placeholder={t("common.phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 10 }}>
              <input
                aria-label={t("createOrder.firstName")}
                className="inp"
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
                  type="button"
                  className="btn btn-gold print-btn"
                  onClick={handleSearch}
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
                    setName("");
                    setPhone("");
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
                  <div
                    className="info-box ib-gold"
                    style={{ marginBottom: 12 }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>
                          {t("orders.billNumber")}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          #{customer.billNumber}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>
                          {t("orders.orderDocuments")}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {(customer.orders || []).length}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>
                          {t("common.customer")}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {customer.firstName || "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--text3)" }}>
                          {t("common.phone")}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {customer.phoneNumber || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vertical stacked print buttons */}
                  <div className="vstack">
                    <button
                      aria-label={t("orders.printBill")}
                      className="btn btn-gold print-btn"
                      disabled={!customer || !selectedOrder}
                      onClick={handlePrintCustomerBill}
                    >
                      {`${t("orders.printBill")} —  بل مشتری`}
                    </button>
                    {/* <button
                      aria-label={t("orders.printTailorCopy")}
                      className="btn btn-gold print-btn"
                      disabled={!customer}
                      onClick={() => handlePrintType("OUTFIT")}
                    >
                      {t("orders.printTailorCopy")}
                    </button> */}
                    <button
                      aria-label="Print Outfit"
                      className="btn btn-gold print-btn"
                      disabled={!customer}
                      onClick={() => handlePrintType("OUTFIT")}
                    >{`${t("orders.printBill")} — پیراهن تنبان`}</button>
                    <button
                      aria-label="Print Waskat"
                      className="btn btn-gold print-btn"
                      disabled={!customer}
                      onClick={() => handlePrintType("WASKAT")}
                    >{`${t("orders.printBill")} — واسکت`}</button>
                    <button
                      aria-label="Print Korty"
                      className="btn btn-gold print-btn"
                      disabled={!customer}
                      onClick={() => handlePrintType("KORTY")}
                    >{`${t("orders.printBill")} — کورتی`}</button>
                    <button
                      aria-label="Print YakhanQaq"
                      className="btn btn-gold print-btn"
                      disabled={!customer}
                      onClick={() => handlePrintType("YAKHANQAQ")}
                    >{`${t("orders.printBill")} — یخن قاق`}</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 14, color: "var(--text3)" }}>
                  {t("common.noData")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden print targets */}
      <div style={{ display: "none" }}>
        {customer && selectedOrder && (
          <div>
            <div id="preview-customer">
              <CustomerBill customer={customer} order={selectedOrder} />
            </div>
            <div id="preview-tailor">
              <TailorBill
                customer={customer}
                order={selectedOrder}
                measurements={getMeasurementsFromOrder(selectedOrder)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
