import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  LuCircleCheck,
  LuClock,
  LuGift,
  LuPhone,
  LuReceiptText,
  LuSearch,
  LuShieldCheck,
  LuSquareCheck,
} from "react-icons/lu";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import api from "../lib/api.js";
import {
  normalizePhone,
  parseNumberLocale,
  toAsciiDigits,
} from "../lib/normalize.js";
import { formatCurrency } from "../lib/currency.js";
import { getOrderGrossTotal } from "../lib/orderFinancials.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
} from "../lib/orderType.js";
import {
  Card,
  EmptyState,
  Modal,
  Spinner,
} from "../components/ui/index.jsx";

const DELIVERY_SCROLL_THUMB_MIN = 56;
let cachedDeliveryRtlScrollType = null;

function detectDeliveryRtlScrollType() {
  if (typeof document === "undefined") return "negative";
  if (cachedDeliveryRtlScrollType) return cachedDeliveryRtlScrollType;

  const scroller = document.createElement("div");
  const content = document.createElement("div");
  scroller.dir = "rtl";
  scroller.style.cssText =
    "position:absolute;top:-9999px;width:4px;height:1px;overflow:scroll;visibility:hidden;";
  content.style.cssText = "width:8px;height:1px;";
  scroller.appendChild(content);
  document.body.appendChild(scroller);

  if (scroller.scrollLeft > 0) {
    cachedDeliveryRtlScrollType = "default";
  } else {
    scroller.scrollLeft = 1;
    cachedDeliveryRtlScrollType =
      scroller.scrollLeft === 0 ? "negative" : "reverse";
  }

  document.body.removeChild(scroller);
  return cachedDeliveryRtlScrollType;
}

function getDeliveryScrollLeft(element) {
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
  const direction = window.getComputedStyle(element).direction;
  const scrollLeft = element.scrollLeft;

  if (direction !== "rtl") {
    return Math.min(maxScroll, Math.max(0, scrollLeft));
  }

  switch (detectDeliveryRtlScrollType()) {
    case "negative":
      return Math.min(maxScroll, Math.max(0, maxScroll + scrollLeft));
    case "reverse":
      return Math.min(maxScroll, Math.max(0, maxScroll - scrollLeft));
    default:
      return Math.min(maxScroll, Math.max(0, scrollLeft));
  }
}

function setDeliveryScrollLeft(element, value) {
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
  const nextValue = Math.min(maxScroll, Math.max(0, value));
  const direction = window.getComputedStyle(element).direction;

  if (direction !== "rtl") {
    element.scrollLeft = nextValue;
    return;
  }

  switch (detectDeliveryRtlScrollType()) {
    case "negative":
      element.scrollLeft = nextValue - maxScroll;
      break;
    case "reverse":
      element.scrollLeft = maxScroll - nextValue;
      break;
    default:
      element.scrollLeft = nextValue;
  }
}

function DeliveryHorizontalScrollArea({ children, label }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const metricsRef = useRef({
    canScroll: false,
    maxScroll: 0,
    thumbLeft: 0,
    thumbWidth: DELIVERY_SCROLL_THUMB_MIN,
  });
  const dragRef = useRef(null);
  const rafRef = useRef(0);
  const [metrics, setMetrics] = useState(metricsRef.current);

  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const update = () => {
      const trackWidth = trackRef.current?.clientWidth || viewport.clientWidth;
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const canScroll = maxScroll > 1 && trackWidth > 0;
      const thumbWidth = canScroll
        ? Math.max(
            DELIVERY_SCROLL_THUMB_MIN,
            Math.round((viewport.clientWidth / viewport.scrollWidth) * trackWidth),
          )
        : trackWidth;
      const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
      const scrollLeft = getDeliveryScrollLeft(viewport);
      const thumbLeft =
        canScroll && maxScroll > 0
          ? Math.round((scrollLeft / maxScroll) * maxThumbLeft)
          : 0;

      setMetrics({ canScroll, maxScroll, thumbLeft, thumbWidth });
    };

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(update);
    };

    scheduleUpdate();
    viewport.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(viewport);
      if (viewport.firstElementChild) {
        resizeObserver.observe(viewport.firstElementChild);
      }
    }

    return () => {
      viewport.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.cancelAnimationFrame(rafRef.current);
      resizeObserver?.disconnect();
    };
  }, []);

  const scrollToThumbLeft = (thumbLeft) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const maxThumbLeft = Math.max(
      1,
      track.clientWidth - metricsRef.current.thumbWidth,
    );
    const ratio = Math.min(1, Math.max(0, thumbLeft / maxThumbLeft));
    setDeliveryScrollLeft(viewport, ratio * metricsRef.current.maxScroll);
  };

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const track = trackRef.current;
    if (!track || !metricsRef.current.canScroll) return;

    event.preventDefault();
    const rect = track.getBoundingClientRect();
    const onThumb = Boolean(
      event.target.closest(".delivery-table-scrollbar__thumb"),
    );
    const nextThumbLeft = onThumb
      ? metricsRef.current.thumbLeft
      : event.clientX - rect.left - metricsRef.current.thumbWidth / 2;

    if (!onThumb) scrollToThumbLeft(nextThumbLeft);

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startThumbLeft: Math.min(
        Math.max(0, nextThumbLeft),
        Math.max(0, track.clientWidth - metricsRef.current.thumbWidth),
      ),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    scrollToThumbLeft(drag.startThumbLeft + event.clientX - drag.startX);
  };

  const stopDragging = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  };

  const handleKeyDown = (event) => {
    const viewport = viewportRef.current;
    if (!viewport || !metricsRef.current.canScroll) return;

    const current = getDeliveryScrollLeft(viewport);
    const step = Math.max(44, Math.round(viewport.clientWidth * 0.18));
    let next = current;

    if (event.key === "ArrowLeft") next = current - step;
    else if (event.key === "ArrowRight") next = current + step;
    else if (event.key === "PageUp") next = current - viewport.clientWidth * 0.8;
    else if (event.key === "PageDown") next = current + viewport.clientWidth * 0.8;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = metricsRef.current.maxScroll;
    else return;

    event.preventDefault();
    setDeliveryScrollLeft(viewport, next);
  };

  return (
    <div className="delivery-scroll-shell">
      <div
        ref={viewportRef}
        className="delivery-results-table"
        tabIndex={0}
        aria-label={label}
      >
        {children}
      </div>
      {metrics.canScroll ? (
        <div className="delivery-table-scrollbar">
          <div
            ref={trackRef}
            className="delivery-table-scrollbar__track"
            role="scrollbar"
            aria-label={label}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={Math.round(metrics.maxScroll)}
            aria-valuenow={Math.round(
              metrics.maxScroll > 0
                ? (metrics.thumbLeft /
                    Math.max(
                      1,
                      (trackRef.current?.clientWidth || 0) - metrics.thumbWidth,
                    )) *
                    metrics.maxScroll
                : 0,
            )}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
          >
            <div
              className="delivery-table-scrollbar__thumb"
              style={{
                width: `${metrics.thumbWidth}px`,
                transform: `translateX(${metrics.thumbLeft}px)`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

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
  const isRtl = isDariOrPashto || (i18n.dir?.() || "ltr") === "rtl";
  const dir = isRtl ? "rtl" : "ltr";
  const receiveButtonText = isEnglish ? "Receive" : "\u0631\u0633\u06cc\u062f";
  const completedStatusText = t("orders.done", "Completed");

  const [mode, setMode] = useState("bill"); // bill | phone
  const isBillInputRtl = isDariOrPashto && mode === "bill";
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { customer, orders }
  const [paying, setPaying] = useState(false);
  const [payments, setPayments] = useState({}); // orderId -> string
  const [paymentConfirmation, setPaymentConfirmation] = useState(null);

  const orders = result?.orders || [];
  const resultCountLabel = t("delivery.ordersFound", {
    count: orders.length,
    defaultValue: `${orders.length} order${orders.length === 1 ? "" : "s"} found`,
  });

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
    } catch {
      setResult(null);
      toast.error(t("delivery.noResults"));
    } finally {
      setLoading(false);
    }
  };

  const openPaymentConfirmation = (order) => {
    const remaining = Number(order.remaining || 0);
    let amount = 0;

    if (remaining > 0.001) {
      const raw = payments[order.id] ?? "";
      amount = parseNumberLocale(raw);

      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error(t("delivery.invalidAmount"));
        return;
      }

      if (amount - remaining > 0.001) {
        toast.error(t("delivery.paymentGreaterThanRemaining"));
        return;
      }
    }

    const discountToAdd =
      remaining > 0.001 ? Math.max(0, remaining - amount) : 0;
    const finalRemaining = Math.max(0, remaining - amount - discountToAdd);

    setPaymentConfirmation({
      order,
      amount,
      remaining,
      discountToAdd,
      finalRemaining,
    });
  };

  const confirmPayment = async () => {
    if (!paymentConfirmation || paying) return;

    const { order, amount } = paymentConfirmation;

    setPaying(true);
    try {
      await api.patch(`/orders/${order.id}/settle`, {
        receivedAmount: amount,
        deliveryReceive: true,
      });

      toast.success(t("delivery.paymentRecorded"));
      setPaymentConfirmation(null);
      await runSearch();
    } catch {
      toast.error(
        t("delivery.paymentFailed", {
          defaultValue: "Unable to record payment. Please try again.",
        }),
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <div
      className={`page clothes-delivery-page ${isRtl ? "clothes-delivery-page--rtl [font-family:'Noto_Naskh_Arabic','Noto_Sans_Arabic','Tahoma','Inter',sans-serif]" : "clothes-delivery-page--ltr"}`}
      dir={dir}
    >
      <div
        className="delivery-page-titlebar mb-6 w-full"
        dir={dir}
        style={{
          direction: dir,
          textAlign: isRtl ? "right" : "left",
        }}
      >
        <div
          style={{
            display: "block",
            maxWidth: isRtl ? 720 : undefined,
            marginLeft: isRtl ? "auto" : undefined,
            marginRight: isRtl ? 0 : undefined,
            textAlign: isRtl ? "right" : "left",
          }}
        >
          <h1 className="m-0 text-[19px] font-bold tracking-normal text-[var(--text1)]">
            {t("sidebar.clothesDelivery")}
          </h1>
          <p className="mt-1 text-[13px] leading-6 text-[var(--text3)]">
            {t("delivery.subtitle")}
          </p>
        </div>
      </div>

      <Card title={t("delivery.searchTitle")}>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("bill")}
              dir={dir}
              className={`delivery-mode-button flex items-center justify-between rounded-lg border px-4 py-3 transition ${
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
              dir={dir}
              className={`delivery-mode-button flex items-center justify-between rounded-lg border px-4 py-3 transition ${
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
            <label
              htmlFor="delivery-search-input"
              className={`lbl ${isRtl ? "text-right" : "text-left"}`}
            >
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

          <div className="delivery-search-actions flex justify-center">
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

      <div className="mt-6 delivery-results-section">
        {loading ? (
          <Card title={t("delivery.resultsTitle")}>
            <div className="delivery-results-loading">
              <Spinner />
              <p>{t("common.loading", "Loading")}</p>
            </div>
          </Card>
        ) : !result ? (
          <Card title={t("delivery.resultsTitle")}>
            <div className="delivery-results-empty">
              <EmptyState message={t("delivery.noResults")} />
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            <Card title={t("delivery.resultsTitle")} noPad>
              <div className="delivery-results-card-shell" dir={dir}>
                <div
                  className={`delivery-results-summary ${isRtl ? "text-right" : "text-left"}`}
                >
                  <span className="delivery-results-summary-badge">
                    {resultCountLabel}
                  </span>
                  <span className="delivery-results-summary-text">
                    {mode === "bill"
                      ? t("orders.billNumber", "Bill Number")
                      : t("common.phone", "Phone")}
                    : <strong>{query}</strong>
                  </span>
                </div>

                {orders.length === 0 ? (
                  <div className="delivery-results-empty">
                    <EmptyState message={t("delivery.noResults")} />
                  </div>
                ) : (
                  <DeliveryHorizontalScrollArea
                    label={t("delivery.resultsTitle")}
                  >
                    <table className="tbl delivery-results-grid-table">
                      <colgroup>
                        <col style={{ width: "64px" }} />
                        <col style={{ width: "172px" }} />
                        <col style={{ width: "144px" }} />
                        <col style={{ width: "96px" }} />
                        <col style={{ width: "92px" }} />
                        <col style={{ width: "96px" }} />
                        <col style={{ width: "108px" }} />
                        <col style={{ width: "128px" }} />
                        <col style={{ width: "206px" }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>{t("delivery.orderHeader", "Order #")}</th>
                          <th>{t("common.customer", "Customer")}</th>
                          <th>{t("orders.orderType", "Order Type")}</th>
                          <th>{t("common.total", "Total")}</th>
                          <th>{t("createOrder.discount", "Discount")}</th>
                          <th>{t("common.paid", "Paid")}</th>
                          <th>{t("common.remaining", "Remaining")}</th>
                          <th>{t("common.status", "Status")}</th>
                          <th>{t("delivery.remainingPayment")}</th>
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
                          const readyToReceive =
                            !isCompleted && remaining <= 0.001;
                          const statusLabel = isCompleted
                            ? completedStatusText
                            : readyToReceive
                              ? t(
                                  "delivery.readyToReceive",
                                  "Ready to receive",
                                )
                              : t(
                                  "delivery.notFullyPaidBadge",
                                  "Not Completed",
                                );
                          const statusTone = isCompleted
                            ? "completed"
                            : readyToReceive
                              ? "ready"
                              : "pending";
                          const StatusIcon = isCompleted
                            ? LuCircleCheck
                            : readyToReceive
                              ? LuSquareCheck
                              : LuClock;

                          return (
                            <tr key={o.id}>
                              <td className="[direction:ltr]">
                                {idx + 1}
                              </td>
                              <td className="delivery-results-text-cell">
                                <strong className="delivery-table-primary">
                                  {itemDisplayName}
                                </strong>
                              </td>
                              <td className="delivery-results-text-cell">
                                {orderLabel.typeWithSequenceLabel}
                              </td>
                              <td className="[direction:ltr]">
                                {formatMoney(getOrderGrossTotal(o), language)}
                              </td>
                              <td className="[direction:ltr]">
                                {formatMoney(o.discount, language)}
                              </td>
                              <td className="[direction:ltr] text-emerald-700 dark:text-emerald-300">
                                {formatMoney(o.paidAmount, language)}
                              </td>
                              <td
                                className={`[direction:ltr] ${
                                  remaining > 0.001
                                    ? "text-red-700 dark:text-red-300"
                                    : "text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {formatMoney(o.remaining, language)}
                              </td>
                              <td className="delivery-results-status-cell">
                                <span
                                  className={`delivery-status-pill delivery-status-pill--${statusTone}`}
                                >
                                  <StatusIcon size={14} />
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="delivery-results-payment-cell">
                                <div
                                  className={`delivery-payment-cell ${isRtl ? "delivery-payment-cell--rtl" : ""}`}
                                >
                                  {isCompleted ? (
                                    <span className="delivery-payment-complete">
                                      {completedStatusText}
                                    </span>
                                  ) : readyToReceive ? (
                                    <button
                                      type="button"
                                      className="delivery-receive-button inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 disabled:opacity-50"
                                      onClick={() =>
                                        openPaymentConfirmation(o)
                                      }
                                      disabled={paying}
                                    >
                                      {receiveButtonText}
                                    </button>
                                  ) : (
                                    <div className="delivery-payment-controls">
                                      <input
                                        className="delivery-payment-input h-10 w-full rounded-lg border border-amber-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
                                        value={payments[o.id] ?? ""}
                                        onChange={(e) =>
                                          setPayments((p) => ({
                                            ...p,
                                            [o.id]: e.target.value,
                                          }))
                                        }
                                        inputMode="decimal"
                                        dir="ltr"
                                        data-field-direction="ltr"
                                        placeholder={String(remaining)}
                                        disabled={paying}
                                      />
                                      <button
                                        type="button"
                                        className="delivery-receive-button inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400 disabled:opacity-50"
                                        onClick={() =>
                                          openPaymentConfirmation(o)
                                        }
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
                  </DeliveryHorizontalScrollArea>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(paymentConfirmation)}
        onClose={() => {
          if (!paying) setPaymentConfirmation(null);
        }}
        title={t("delivery.confirmPaymentTitle")}
        maxW={460}
        dir={dir}
        overlayClassName="delivery-confirm-overlay"
        boxClassName="delivery-confirm-modal"
        bodyClassName="delivery-confirm-modal__body"
      >
        {paymentConfirmation ? (
          <div className="delivery-confirm" dir={dir}>
            <div className="delivery-confirm__amounts">
              <div className="delivery-confirm__amount">
                <span>
                  <LuReceiptText size={16} />
                  {t("common.remaining", "Remaining")}
                </span>
                <strong>
                  {formatMoney(paymentConfirmation.remaining, language)}
                </strong>
              </div>
              <div className="delivery-confirm__amount delivery-confirm__amount--received">
                <span>
                  <LuCircleCheck size={16} />
                  {t("delivery.receivedAmount")}
                </span>
                <strong>
                  {formatMoney(paymentConfirmation.amount, language)}
                </strong>
              </div>
              <div className="delivery-confirm__amount delivery-confirm__amount--discount">
                <span>
                  <LuGift size={16} />
                  {t("delivery.discountToApply")}
                </span>
                <strong>
                  {formatMoney(paymentConfirmation.discountToAdd, language)}
                </strong>
              </div>
            </div>

            {paymentConfirmation.discountToAdd > 0.001 ? (
              <div className="delivery-confirm__notice">
                <LuGift size={18} />
                <span>
                  {t("delivery.discountExplanation", {
                    amount: formatMoney(
                      paymentConfirmation.discountToAdd,
                      language,
                    ),
                  })}
                </span>
              </div>
            ) : null}

            <div className="delivery-confirm__settled">
              <span>
                <LuCircleCheck size={18} />
                {t("delivery.finalBalance")}
              </span>
              <strong>
                {formatMoney(paymentConfirmation.finalRemaining, language)}
              </strong>
            </div>

            <div className="delivery-confirm__actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPaymentConfirmation(null)}
                disabled={paying}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="btn btn-gold delivery-confirm__submit"
                onClick={confirmPayment}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Spinner size={16} />
                    {t("common.saving", "Saving...")}
                  </>
                ) : (
                  <>
                    <LuShieldCheck size={17} />
                    {t("delivery.confirmAndReceive")}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
