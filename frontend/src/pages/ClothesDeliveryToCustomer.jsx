import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuPhone, LuSearch } from "react-icons/lu";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import {
  normalizePhone,
  parseNumberLocale,
  toAsciiDigits,
} from "../lib/normalize.js";
import { formatCurrency } from "../lib/currency.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
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
  const isDariOrPashto =
    normalizedLanguage.startsWith("dari") ||
    normalizedLanguage.startsWith("pashto");
  const isRtl = (i18n.dir?.() || "ltr") === "rtl";
  const dir = isRtl ? "rtl" : "ltr";
  const receiveButtonText = isEnglish ? "Receive" : "رسید";
  const completedStatusText = t("orders.done", "Completed");

  const [mode, setMode] = useState("bill"); // bill | phone
  const isBillInputRtl = isDariOrPashto && mode === "bill";
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
    const normalizedBill = toAsciiDigits(trimmed).replace(/\D/g, "");
    const normalizedPhone = normalizePhone(trimmed);
    if (!trimmed || (mode === "bill" && !normalizedBill)) {
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
        mode === "bill"
          ? { billNumber: normalizedBill }
          : { phoneNumber: normalizedPhone };
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
                  ? "border-amber-500 bg-amber-100/70 text-amber-900 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-200"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              } ${isRtl ? "text-right" : "text-left"}`}
            >
              <div
                className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`rounded-md p-2 ${mode === "bill" ? "bg-amber-200/70 dark:bg-amber-900/40" : "bg-slate-100 dark:bg-slate-800"}`}
                >
                  <AfCurrencyIcon size={18} />
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
                    ? "border-amber-600 bg-amber-500 dark:border-amber-400 dark:bg-amber-400"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setMode("phone")}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 transition ${
                mode === "phone"
                  ? "border-amber-500 bg-amber-100/70 text-amber-900 dark:border-amber-400 dark:bg-amber-900/20 dark:text-amber-200"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              } ${isRtl ? "text-right" : "text-left"}`}
            >
              <div
                className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`rounded-md p-2 ${mode === "phone" ? "bg-amber-200/70 dark:bg-amber-900/40" : "bg-slate-100 dark:bg-slate-800"}`}
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
                    ? "border-amber-600 bg-amber-500 dark:border-amber-400 dark:bg-amber-400"
                    : "border-slate-300 dark:border-slate-600"
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
              dir={isBillInputRtl ? "rtl" : "ltr"}
              data-field-direction={isBillInputRtl ? "rtl" : "ltr"}
              style={isBillInputRtl ? { textAlign: "right" } : undefined}
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
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${isRtl ? "tracking-normal" : "uppercase tracking-wide"}`}
                >
                  {t("common.total", "Total")}
                </div>
                <div className="mt-2 text-lg font-extrabold text-gray-900 dark:text-slate-100">
                  {formatMoney(totals.total, language)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${isRtl ? "tracking-normal" : "uppercase tracking-wide"}`}
                >
                  {t("createOrder.discount", "Discount")}
                </div>
                <div className="mt-2 text-lg font-extrabold text-gray-900 dark:text-slate-100">
                  {formatMoney(totals.discount, language)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${isRtl ? "tracking-normal" : "uppercase tracking-wide"}`}
                >
                  {t("common.paid", "Paid")}
                </div>
                <div className="mt-2 text-lg font-extrabold text-emerald-700">
                  {formatMoney(totals.paid, language)}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div
                  className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${isRtl ? "tracking-normal" : "uppercase tracking-wide"}`}
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
              <div className="delivery-customer-head border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-100 px-4 py-4 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 sm:px-5">
                <div
                  className={`flex flex-col gap-3 sm:items-center sm:justify-between ${
                    isRtl ? "sm:flex-row-reverse" : "sm:flex-row"
                  }`}
                >
                  <div
                    className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-base font-extrabold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                      {(result.customer?.firstName || "C")
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {t("common.customer", "Customer")}
                      </p>
                      <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-slate-100">
                        {result.customer?.firstName || "-"}
                      </h3>
                    </div>
                  </div>

                  <div
                    className={`grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 ${isRtl ? "text-right" : "text-left"}`}
                  >
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {t("orders.billNumber")}
                      </p>
                      <p className="text-sm font-black text-gray-900 dark:text-slate-100 [direction:ltr] [unicode-bidi:embed]">
                        #{result.customer?.billNumber || "-"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {t("common.phone", "Phone")}
                      </p>
                      <p className="text-sm font-black text-gray-900 dark:text-slate-100 [direction:ltr] [unicode-bidi:embed]">
                        {result.customer?.phoneNumber || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tbl-wrap delivery-results-table">
                <table
                  className="min-w-full border-separate border-spacing-0"
                  style={{ minWidth: 640 }}
                >
                  <thead>
                    <tr
                      className={`text-xs font-semibold text-slate-500 dark:text-slate-400 ${
                        isRtl
                          ? "tracking-normal text-right"
                          : "uppercase tracking-wide text-left"
                      }`}
                    >
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("delivery.orderHeader")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("common.customer", "Customer")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("common.type", "Type")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("common.total", "Total")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("createOrder.discount", "Discount")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("common.paid", "Paid")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("common.remaining", "Remaining")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("common.status", "Status")}
                      </th>
                      <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                        {t("delivery.remainingPayment")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, idx) => {
                      const orderLabel = getOrderLabelParts(o, language);
                      const itemDisplayName = getOrderPrimaryDisplayName(
                        o,
                        result.customer?.firstName,
                        language,
                      );
                      const remaining = Number(o.remaining || 0);
                      const isCompleted = Boolean(o.isCompleted);
                      const readyToReceive = !isCompleted && remaining <= 0.001;

                      return (
                        <tr
                          key={o.id}
                          className="hover:bg-amber-50/70 dark:hover:bg-slate-800"
                        >
                          <td
                            className={`border-b border-amber-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:text-slate-100 ${
                              isRtl ? "text-right" : "text-left"
                            }`}
                          >
                            {t("delivery.orderLabel", { number: idx + 1 })}
                          </td>
                          <td
                            className={`border-b border-slate-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:text-slate-100 ${
                              isRtl ? "text-right" : "text-left"
                            }`}
                          >
                            {itemDisplayName}
                          </td>
                          <td
                            className={`border-b border-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200 ${
                              isRtl ? "text-right" : "text-left"
                            }`}
                          >
                            <div>{orderLabel.typeWithSequenceLabel}</div>
                          </td>
                          <td className="border-b border-amber-100 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:text-slate-100 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.totalPrice, language)}
                          </td>
                          <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.discount, language)}
                          </td>
                          <td className="border-b border-amber-100 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-slate-700 dark:text-emerald-300 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.paidAmount, language)}
                          </td>
                          <td className="border-b border-amber-100 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-slate-700 dark:text-rose-300 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.remaining, language)}
                          </td>
                          <td className="border-b border-amber-100 px-4 py-3 dark:border-slate-700">
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
                          <td className="border-b border-amber-100 px-4 py-3 dark:border-slate-700">
                            <div className="flex flex-col gap-2">
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {itemDisplayName}
                              </p>
                              {isCompleted ? (
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                  -
                                </span>
                              ) : readyToReceive ? (
                                <button
                                  type="button"
                                  className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 disabled:opacity-50"
                                  onClick={() => submitPayment(o)}
                                  disabled={paying}
                                >
                                  {receiveButtonText}
                                </button>
                              ) : (
                                <div
                                  className={`flex flex-col gap-2 md:items-center ${
                                    isRtl
                                      ? "md:flex-row-reverse"
                                      : "md:flex-row"
                                  }`}
                                >
                                  <input
                                    className="h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20 md:w-40"
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
                                    className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 disabled:opacity-50"
                                    onClick={() => submitPayment(o)}
                                    disabled={paying}
                                  >
                                    {receiveButtonText}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="delivery-results-mobile">
                {orders.map((o, idx) => {
                  const orderLabel = getOrderLabelParts(o, language);
                  const itemDisplayName = getOrderPrimaryDisplayName(
                    o,
                    result.customer?.firstName,
                    language,
                  );
                  const remaining = Number(o.remaining || 0);
                  const isCompleted = Boolean(o.isCompleted);
                  const readyToReceive = !isCompleted && remaining <= 0.001;

                  return (
                    <article
                      key={`mobile-${o.id}`}
                      className="delivery-order-card"
                    >
                      <div className="delivery-order-card-head">
                        <div>
                          <p className="delivery-order-card-kicker">
                            {t("delivery.orderLabel", { number: idx + 1 })}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {t("common.customer", "Customer")}:{" "}
                            {itemDisplayName}
                          </p>
                          <h4 className="delivery-order-card-type">
                            {orderLabel.typeWithSequenceLabel}
                          </h4>
                        </div>
                        <div>
                          {isCompleted ? (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-900/25 dark:text-rose-300">
                              {completedStatusText}
                            </span>
                          ) : readyToReceive ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/25 dark:text-emerald-300">
                              {t("delivery.readyToReceive", "Ready to receive")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              {t("delivery.notFullyPaidBadge", "Not Completed")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="delivery-order-card-stats">
                        <div className="delivery-order-card-stat">
                          <span>{t("common.total", "Total")}</span>
                          <strong className="[direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.totalPrice, language)}
                          </strong>
                        </div>
                        <div className="delivery-order-card-stat">
                          <span>{t("createOrder.discount", "Discount")}</span>
                          <strong className="[direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.discount, language)}
                          </strong>
                        </div>
                        <div className="delivery-order-card-stat">
                          <span>{t("common.paid", "Paid")}</span>
                          <strong className="text-emerald-700 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.paidAmount, language)}
                          </strong>
                        </div>
                        <div className="delivery-order-card-stat">
                          <span>{t("common.remaining", "Remaining")}</span>
                          <strong className="text-rose-700 [direction:ltr] [unicode-bidi:embed]">
                            {formatMoney(o.remaining, language)}
                          </strong>
                        </div>
                      </div>

                      <div className="delivery-order-card-actions">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {itemDisplayName}
                        </p>
                        {isCompleted ? (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            -
                          </span>
                        ) : readyToReceive ? (
                          <button
                            type="button"
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 disabled:opacity-50"
                            onClick={() => submitPayment(o)}
                            disabled={paying}
                          >
                            {receiveButtonText}
                          </button>
                        ) : (
                          <>
                            <input
                              className="h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
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
                              className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 disabled:opacity-50"
                              onClick={() => submitPayment(o)}
                              disabled={paying}
                            >
                              {receiveButtonText}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
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
