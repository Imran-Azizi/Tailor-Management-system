import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuPhone, LuReceipt, LuSearch } from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { formatCurrency } from "../lib/currency.js";
import { getOrderLabelParts } from "../lib/orderType.js";
import {
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from "../components/ui/index.jsx";

function formatMoney(value, language) {
  return formatCurrency(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function ClothesDeliveryToCustomer() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const normalizedLanguage = String(language || "en").toLowerCase();
  const isEnglish = normalizedLanguage.startsWith("en");
  const isRtl = false;
  const dir = "ltr";
  const receiveButtonText = isEnglish ? "Receive" : "رسید";
  const completedStatusText = t("orders.done", "Completed");

  const [mode, setMode] = useState("bill"); // bill | phone
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { customer, orders }
  const [paying, setPaying] = useState(false);
  const [payments, setPayments] = useState({}); // orderId -> string

  const orders = result?.orders || [];

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, o) => {
        acc.total += o.totalPrice || 0;
        acc.discount += o.discount || 0;
        acc.paid += o.paidAmount || 0;
        acc.remaining += o.remaining || 0;
        return acc;
      },
      { total: 0, discount: 0, paid: 0, remaining: 0 },
    );
  }, [orders]);

  const runSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error(
        t("common.search") +
          " " +
          (mode === "bill"
            ? t("delivery.searchByBill")
            : t("delivery.searchByPhone")),
      );
      return;
    }
    setLoading(true);
    try {
      const params =
        mode === "bill" ? { billNumber: trimmed } : { phoneNumber: trimmed };
      const { data } = await api.get("/orders/lookup", { params });
      setResult(data);
      // Default payment input to full remaining per order.
      const nextPayments = {};
      (data?.orders || []).forEach((o) => {
        if ((o.remaining || 0) > 0) nextPayments[o.id] = String(o.remaining);
      });
      setPayments(nextPayments);
    } catch (err) {
      setResult(null);
      toast.error(getApiErrorMessage(err, t("delivery.noResults")));
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async (order) => {
    const remaining = Number(order.remaining || 0);

    setPaying(true);
    try {
      let nextRemaining = remaining;

      if (remaining > 0.001) {
        const raw = payments[order.id] ?? "";
        const amount = parseNumberLocale(raw);

        if (!Number.isFinite(amount) || amount <= 0) {
          toast.error(t("delivery.invalidAmount"));
          return;
        }

        if (amount - remaining > 0.001) {
          toast.error(t("delivery.paymentGreaterThanRemaining"));
          return;
        }

        const newPaid = (order.paidAmount || 0) + amount;
        nextRemaining = remaining - amount;

        await api.put(`/orders/${order.id}`, {
          paidAmount: newPaid,
        });
      }

      if (nextRemaining <= 0.001) {
        await api.patch(`/orders/${order.id}/complete`, {
          deliveryReceive: true,
        });
      }

      toast.success(t("delivery.paymentRecorded"));
      await runSearch();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Payment failed"));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div
      className={`page ${isRtl ? "[font-family:'Noto_Naskh_Arabic','Noto_Sans_Arabic','Tahoma','Inter',sans-serif]" : ""}`}
      dir={dir}
    >
      <PageHeader
        title={t("sidebar.clothesDelivery")}
        subtitle={t("delivery.subtitle")}
      />

      <Card title={t("delivery.searchTitle")}>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("bill")}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition ${
                mode === "bill"
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              } ${isRtl ? "text-right" : "text-left"}`}
            >
              <div
                className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`rounded-md p-2 ${mode === "bill" ? "bg-blue-100" : "bg-slate-100"}`}
                >
                  <LuReceipt size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {t("delivery.searchByBill")}
                  </div>
                  <div className="text-xs opacity-70">
                    {t("delivery.searchByBillHint")}
                  </div>
                </div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border ${
                  mode === "bill"
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-300"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setMode("phone")}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition ${
                mode === "phone"
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              } ${isRtl ? "text-right" : "text-left"}`}
            >
              <div
                className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`rounded-md p-2 ${mode === "phone" ? "bg-blue-100" : "bg-slate-100"}`}
                >
                  <LuPhone size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {t("delivery.searchByPhone")}
                  </div>
                  <div className="text-xs opacity-70">
                    {t("delivery.searchByPhoneHint")}
                  </div>
                </div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border ${
                  mode === "phone"
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-300"
                }`}
              />
            </button>
          </div>

          <div className="grid gap-2">
            <label htmlFor="delivery-search-input" className="lbl">
              {mode === "bill"
                ? t("orders.billNumber", "Bill Number")
                : t("common.phone", "Phone")}
            </label>
            <input
              id="delivery-search-input"
              className="inp"
              placeholder={
                mode === "bill"
                  ? t("delivery.billPlaceholder")
                  : t("delivery.phonePlaceholder")
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
          </div>

          <div className="flex justify-center">
            <button
              className="btn btn-gold btn-sm"
              onClick={runSearch}
              disabled={loading || paying}
              type="button"
            >
              <LuSearch size={14} />
              {t("common.search")}
            </button>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        {loading ? (
          <Spinner />
        ) : !result ? (
          <Card title={t("delivery.resultsTitle")} noPad>
            <EmptyState message={t("delivery.noResults")} />
          </Card>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div
                  className={`text-xs font-semibold text-slate-500 ${isRtl ? "tracking-normal" : "uppercase tracking-wide"}`}
                >
                  {t("common.total", "Total")}
                </div>
                <div className="mt-2 text-lg font-extrabold text-slate-900">
                  {formatMoney(totals.total, language)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div
                  className={`text-xs font-semibold text-slate-500 ${isRtl ? "tracking-normal" : "uppercase tracking-wide"}`}
                >
                  {t("createOrder.discount", "Discount")}
                </div>
                <div className="mt-2 text-lg font-extrabold text-slate-900">
                  {formatMoney(totals.discount, language)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div
                  className={`text-xs font-semibold text-slate-500 ${isRtl ? "tracking-normal" : "uppercase tracking-wide"}`}
                >
                  {t("common.paid", "Paid")}
                </div>
                <div className="mt-2 text-lg font-extrabold text-emerald-700">
                  {formatMoney(totals.paid, language)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div
                  className={`text-xs font-semibold text-slate-500 ${isRtl ? "tracking-normal" : "uppercase tracking-wide"}`}
                >
                  {t("common.remaining", "Remaining")}
                </div>
                <div
                  className={`mt-2 text-lg font-extrabold ${
                    totals.remaining > 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {formatMoney(totals.remaining, language)}
                </div>
              </div>
            </div>

            <Card noPad>
              <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-4 py-4 sm:px-5">
                <div
                  className={`flex flex-col gap-3 sm:items-center sm:justify-between ${
                    isRtl ? "sm:flex-row-reverse" : "sm:flex-row"
                  }`}
                >
                  <div
                    className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-base font-extrabold text-blue-700">
                      {(result.customer?.firstName || "C")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <p className="text-xs font-semibold text-slate-500">
                        {t("common.customer", "Customer")}
                      </p>
                      <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                        {result.customer?.firstName || "-"}
                      </h3>
                    </div>
                  </div>

                  <div
                    className={`grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 ${isRtl ? "text-right" : "text-left"}`}
                  >
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {t("orders.billNumber")}
                      </p>
                      <p className="text-sm font-black text-slate-900 [direction:ltr] [unicode-bidi:embed]">
                        #{result.customer?.billNumber || "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500">
                        {t("common.phone", "Phone")}
                      </p>
                      <p className="text-sm font-black text-slate-900 [direction:ltr] [unicode-bidi:embed]">
                        {result.customer?.phoneNumber || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tbl-wrap">
                <table
                  className="min-w-full border-separate border-spacing-0"
                  style={{ minWidth: 640 }}
                >
                  <thead>
                    <tr
                      className={`text-xs font-semibold text-slate-500 ${
                        isRtl
                          ? "tracking-normal text-right"
                          : "uppercase tracking-wide text-left"
                      }`}
                    >
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        {t("delivery.orderHeader")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        {t("common.type", "Type")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        {t("common.total", "Total")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        {t("createOrder.discount", "Discount")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        {t("common.paid", "Paid")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        {t("common.remaining", "Remaining")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        {t("common.status", "Status")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        {t("delivery.remainingPayment")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, idx) => {
                      const orderLabel = getOrderLabelParts(o, language);
                      const remaining = Number(o.remaining || 0);
                      const isCompleted = Boolean(o.isCompleted);
                      const readyToReceive = !isCompleted && remaining <= 0.001;

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80">
                          <td
                            className={`border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 ${
                              isRtl ? "text-right" : "text-left"
                            }`}
                          >
                            {t("delivery.orderLabel", { number: idx + 1 })}
                          </td>
                          <td
                            className={`border-b border-slate-100 px-4 py-3 text-sm text-slate-700 ${
                              isRtl ? "text-right" : "text-left"
                            }`}
                          >
                            <div>{orderLabel.baseTypeLabel}</div>
                            {orderLabel.customName ? (
                              <div className="mt-0.5 text-xs text-slate-500">
                                {orderLabel.customName}
                              </div>
                            ) : null}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.totalPrice, language)}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.discount, language)}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-emerald-700 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.paidAmount, language)}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-rose-700 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.remaining, language)}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3">
                            {isCompleted ? (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                                {completedStatusText}
                              </span>
                            ) : readyToReceive ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                {t(
                                  "delivery.readyToReceive",
                                  "Ready to receive",
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                {t(
                                  "delivery.notFullyPaidBadge",
                                  "Not Completed",
                                )}
                              </span>
                            )}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3">
                            {isCompleted ? (
                              <span className="text-sm text-slate-500">-</span>
                            ) : readyToReceive ? (
                              <button
                                type="button"
                                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                onClick={() => submitPayment(o)}
                                disabled={paying}
                              >
                                {receiveButtonText}
                              </button>
                            ) : (
                              <div
                                className={`flex flex-col gap-2 md:items-center ${
                                  isRtl ? "md:flex-row-reverse" : "md:flex-row"
                                }`}
                              >
                                <input
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:w-40"
                                  value={payments[o.id] ?? ""}
                                  onChange={(e) =>
                                    setPayments((p) => ({
                                      ...p,
                                      [o.id]: e.target.value,
                                    }))
                                  }
                                  inputMode="decimal"
                                  placeholder={String(remaining)}
                                  disabled={paying}
                                />
                                <button
                                  type="button"
                                  className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                  onClick={() => submitPayment(o)}
                                  disabled={paying}
                                >
                                  {receiveButtonText}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
