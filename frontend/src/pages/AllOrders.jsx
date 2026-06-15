import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LuSearch,
  LuTrash2,
  LuClipboardList,
  LuPhone,
  LuUserCheck,
  LuEllipsisVertical,
  LuX,
  LuPencil,
  LuCalendarCheck,
  LuSquareCheck,
  LuClock,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale, toAsciiDigits } from "../lib/normalize.js";
import { formatCurrency } from "../lib/currency.js";
import { MONEY_SCALE } from "../lib/decimal.js";
import { formatMeters } from "../lib/meters.js";
import {
  getOrderDisplayName,
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
  getOrderTypeLabel,
} from "../lib/orderType.js";
import {
  PageHeader,
  Spinner,
  Badge,
  Modal,
  Pagination,
  Card,
  StatCard,
  EmptyState,
  ConfirmDeleteModal,
} from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import { OrderDocumentPack } from "../components/order/OrderDocumentPack.jsx";
import OrderCreatorBadge from "../components/order/OrderCreatorBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../lib/months.js";
import {
  formatSystemDate,
  formatSystemDateTime,
  formatNumberLocale,
  isRtlLanguage,
} from "../lib/locale.js";
import { getOrderCompletionStatus } from "../lib/orderCompletionStatus.js";

const ROLE_COLORS = { QICHIKAR: "#D97706", DOKHT: "#DB2777" };
const ORDER_SCROLL_THUMB_MIN = 64;

let cachedRtlScrollType = null;

function detectRtlScrollType() {
  if (typeof document === "undefined") return "negative";
  if (cachedRtlScrollType) return cachedRtlScrollType;

  const scroller = document.createElement("div");
  const content = document.createElement("div");
  scroller.dir = "rtl";
  scroller.style.cssText =
    "position:absolute;top:-9999px;width:4px;height:1px;overflow:scroll;visibility:hidden;";
  content.style.cssText = "width:8px;height:1px;";
  scroller.appendChild(content);
  document.body.appendChild(scroller);

  if (scroller.scrollLeft > 0) {
    cachedRtlScrollType = "default";
  } else {
    scroller.scrollLeft = 1;
    cachedRtlScrollType = scroller.scrollLeft === 0 ? "negative" : "reverse";
  }

  document.body.removeChild(scroller);
  return cachedRtlScrollType;
}

function getNormalizedScrollLeft(element) {
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
  const direction = window.getComputedStyle(element).direction;
  const scrollLeft = element.scrollLeft;

  if (direction !== "rtl") {
    return Math.min(maxScroll, Math.max(0, scrollLeft));
  }

  switch (detectRtlScrollType()) {
    case "negative":
      return Math.min(maxScroll, Math.max(0, maxScroll + scrollLeft));
    case "reverse":
      return Math.min(maxScroll, Math.max(0, maxScroll - scrollLeft));
    default:
      return Math.min(maxScroll, Math.max(0, scrollLeft));
  }
}

function setNormalizedScrollLeft(element, value) {
  const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
  const nextValue = Math.min(maxScroll, Math.max(0, value));
  const direction = window.getComputedStyle(element).direction;

  if (direction !== "rtl") {
    element.scrollLeft = nextValue;
    return;
  }

  switch (detectRtlScrollType()) {
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

function OrdersHorizontalScrollArea({ children }) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const metricsRef = useRef({
    canScroll: false,
    maxScroll: 0,
    thumbLeft: 0,
    thumbWidth: ORDER_SCROLL_THUMB_MIN,
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
            ORDER_SCROLL_THUMB_MIN,
            Math.round((viewport.clientWidth / viewport.scrollWidth) * trackWidth),
          )
        : trackWidth;
      const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
      const normalizedScrollLeft = getNormalizedScrollLeft(viewport);
      const thumbLeft =
        canScroll && maxScroll > 0
          ? Math.round((normalizedScrollLeft / maxScroll) * maxThumbLeft)
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
      if (viewport.firstElementChild) resizeObserver.observe(viewport.firstElementChild);
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

    const maxThumbLeft = Math.max(1, track.clientWidth - metricsRef.current.thumbWidth);
    const ratio = Math.min(1, Math.max(0, thumbLeft / maxThumbLeft));
    setNormalizedScrollLeft(viewport, ratio * metricsRef.current.maxScroll);
  };

  const handlePointerDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const track = trackRef.current;
    if (!track || !metricsRef.current.canScroll) return;

    event.preventDefault();
    const rect = track.getBoundingClientRect();
    const onThumb = Boolean(event.target.closest(".orders-table-scrollbar__thumb"));
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

    const current = getNormalizedScrollLeft(viewport);
    const step = Math.max(48, Math.round(viewport.clientWidth * 0.18));
    let next = current;

    if (event.key === "ArrowLeft") next = current - step;
    else if (event.key === "ArrowRight") next = current + step;
    else if (event.key === "PageUp") next = current - viewport.clientWidth * 0.8;
    else if (event.key === "PageDown") next = current + viewport.clientWidth * 0.8;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = metricsRef.current.maxScroll;
    else return;

    event.preventDefault();
    setNormalizedScrollLeft(viewport, next);
  };

  return (
    <div className="orders-scroll-shell">
      <div
        ref={viewportRef}
        className="tbl-wrap all-orders-table-wrap order-scroll-x"
        tabIndex={0}
      >
        {children}
      </div>
      {metrics.canScroll ? (
        <div className="orders-table-scrollbar" aria-hidden={false}>
          <div
            ref={trackRef}
            className="orders-table-scrollbar__track"
            role="scrollbar"
            aria-label="Orders table horizontal scroll"
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
              className="orders-table-scrollbar__thumb"
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

function isCompletedForWorkerType(order, workerType) {
  if (!order || !workerType) return false;
  if (order.isCompleted) return true;
  if (workerType === "QICHIKAR") return Boolean(order.qichikarCompletedAt);
  if (workerType === "DOKHT") return Boolean(order.dokhtCompletedAt);
  return false;
}

function getAllOrdersItemName(order, language) {
  const parts = getOrderLabelParts(order, language);
  return parts.customName || parts.typeWithSequenceLabel;
}

function AssignModal({ order, onClose, onAssigned }) {
  const { t, i18n } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState(
    order.assignedToId || "",
  );
  const [note, setNote] = useState(order.assignmentNote || "");
  const [price, setPrice] = useState(
    order.assignmentPrice != null ? String(order.assignmentPrice) : "",
  );
  const [saving, setSaving] = useState(false);

  const { data: workers = [] } = useQuery({
    queryKey: ["assignable-workers"],
    queryFn: () => api.get("/users/assignable").then((r) => r.data),
  });

  const handleAssign = async () => {
    setSaving(true);
    try {
      const selectedWorker = workers.find(
        (worker) => worker.id === selectedUserId,
      );
      if (
        selectedUserId &&
        isCompletedForWorkerType(order, selectedWorker?.accountType)
      ) {
        toast.error(
          t("assignment.completedReassignBlocked", {
            defaultValue:
              "This order is completed. You cannot assign it again.",
          }),
        );
        setSaving(false);
        return;
      }

      let parsedPrice = null;
      if (selectedUserId) {
        parsedPrice = parseNumberLocale(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          toast.error(t("assignment.invalidPrice"));
          setSaving(false);
          return;
        }
      }

      await api.patch(`/orders/${order.id}/assign`, {
        assignedToId: selectedUserId || null,
        assignmentNote: note || null,
        assignmentPrice: selectedUserId ? parsedPrice : null,
      });
      toast.success(
        selectedUserId ? t("assignment.assigned") : t("assignment.unassigned"),
      );
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("assignment.failed")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 24,
          width: "100%",
          maxWidth: 400,
          boxShadow: "var(--sh-lg)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>
            {t("assignment.assignOrder")}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text3)",
            }}
          >
            <LuX size={16} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>
          <strong>
            {getAllOrdersItemName(
              order,
              i18n.resolvedLanguage || i18n.language,
            )}
          </strong>{" "}
          - Bill #{order.customer?.billNumber} |{" "}
          {getOrderDisplayName(order, i18n.resolvedLanguage || i18n.language)}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text2)",
              display: "block",
              marginBottom: 5,
            }}
          >
            {t("assignment.assignTo")}
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--surface2)",
              color: "var(--text1)",
              fontSize: 14,
            }}
          >
            <option value="">{t("assignment.unassign")}</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.accountType})
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text2)",
              display: "block",
              marginBottom: 5,
            }}
          >
            {t("assignment.price")}
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("assignment.pricePlaceholder")}
            inputMode="decimal"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--surface2)",
              color: "var(--text1)",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text2)",
              display: "block",
              marginBottom: 5,
            }}
          >
            {t("assignment.note")}
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("assignment.notePlaceholder")}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--surface2)",
              color: "var(--text1)",
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "9px 0",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              color: "var(--text2)",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleAssign}
            disabled={saving}
            style={{
              flex: 2,
              padding: "9px 0",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? t("common.loading") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

const TV = { OUTFIT: "gold", WASKAT: "teal", KORTY: "amber", YAKHANQAQ: "red" };

function formatMoney(value, language) {
  return formatCurrency(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function getDisplayTotalBenefit(order) {
  const finalTotalBenefit = Number(order?.finalTotalBenefit);
  if (Number.isFinite(finalTotalBenefit)) return finalTotalBenefit;

  const totalBenefit = Number(order?.totalBenefit || 0);
  if (order?.type !== "READY_MADE" && order?.type !== "READY_MADE_WASKAT") {
    return totalBenefit;
  }
  const readyMadeOriginalPrice = Number(
    order?.type === "READY_MADE"
      ? order?.readyMadeOriginalPrice || 0
      : order?.readyMadeWaskatOriginalPrice || 0,
  );
  return totalBenefit - readyMadeOriginalPrice;
}

function getBenefitEntryDate(entry) {
  return entry?.date || entry?.paidAt || null;
}

function OrderViewModal({ orderId, open, onClose }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { data, isLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => api.get(`/orders/${orderId}`).then((r) => r.data),
    enabled: open && !!orderId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
  const benefitDetails = data?.benefitDetails;
  const detailOrderLabel = getOrderLabelParts(data, language);
  const detailCustomerName = String(data?.customer?.firstName || "").trim();
  const detailPrimaryName = getOrderPrimaryDisplayName(
    data,
    detailCustomerName || detailOrderLabel.typeWithSequenceLabel,
    language,
  );
  const detailCreatedAt = data?.createdAt
    ? formatSystemDateTime(data.createdAt, language)
    : "-";
  const hasRakhtDetails =
    data?.type !== "READY_MADE" &&
    data?.type !== "READY_MADE_WASKAT" &&
    Boolean(
      data?.rakhtId ||
      data?.rakhtCompanyName ||
      data?.rakhtBrandName ||
      data?.rakhtTonId ||
      data?.rakhtColor ||
      data?.rakhtRequiredMeters != null ||
      data?.rakhtPiecePrice != null ||
      data?.rakhtCustomerPricePerMeter != null ||
      data?.rakhtTotalCustomerPrice != null,
    );
  const rakhtMeters = Number(data?.rakhtRequiredMeters || 0);
  const rakhtPurchasePerMeter = Number(data?.rakhtPiecePrice || 0);
  const rakhtPurchaseTotal =
    rakhtMeters > 0 ? rakhtPurchasePerMeter * rakhtMeters : 0;
  const rakhtCustomerTotal = Number(data?.rakhtTotalCustomerPrice || 0);
  const rakhtBenefit = rakhtCustomerTotal - rakhtPurchaseTotal;
  const readyMadeOriginalPrice =
    data?.type === "READY_MADE"
      ? Number(data?.readyMadeOriginalPrice || 0)
      : data?.type === "READY_MADE_WASKAT"
        ? Number(data?.readyMadeWaskatOriginalPrice || 0)
        : 0;
  const displayTotalBenefit = Number(
    benefitDetails?.totalBenefit ?? data?.totalBenefit ?? 0,
  );
  const displayTotalExpenses = Number(benefitDetails?.totalExpenses ?? 0);
  const displayTotalCardValue =
    data?.type === "READY_MADE_WASKAT"
      ? Math.max(0, Number(data?.totalPrice || 0) - readyMadeOriginalPrice)
      : Number(data?.totalPrice || 0);
  const benefitExpenseRows = benefitDetails?.expenses || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("orders.orderDetails")}
      maxW={1100}
      boxClassName="order-details-modal-box"
      bodyClassName="order-details-modal-body"
    >
      {isLoading ? (
        <Spinner />
      ) : data == null ? (
        <EmptyState message={t("orders.orderNotFound", "Order not found")} />
      ) : (
        <div className="order-details-shell">
          <div
            className="order-view-top-grid"
            style={{ gridTemplateColumns: "1fr" }}
          >
            <div className="order-view-spotlight">
              <div
                className="order-details-hero"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    <Badge v={TV[data.type] || "gold"}>
                      {detailOrderLabel.typeWithSequenceLabel}
                    </Badge>
                    {data.isDamageOrder && (
                      <Badge v="red">
                        {t("orders.damageOrderStatus", "Damage Order")}
                      </Badge>
                    )}
                    {data.isEmergency && (
                      <Badge v="red">{t("orders.emergencyBadge")}</Badge>
                    )}
                  </div>
                  <h3
                    className="order-details-title"
                    style={{ fontSize: 24, fontWeight: 900 }}
                  >
                    {detailPrimaryName}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text3)",
                      marginTop: 4,
                    }}
                  >
                    {t("orders.createdOn", { date: detailCreatedAt })}
                  </p>
                </div>
                <div
                  className="order-details-bill"
                  style={{ textAlign: "end" }}
                >
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>
                    {t("orders.billNumber")}
                  </div>
                  <div
                    className="order-details-bill-number"
                    style={{
                      fontSize: 30,
                      fontWeight: 900,
                      color: "var(--primary)",
                    }}
                  >
                    #{data.customer?.billNumber}
                  </div>
                </div>
              </div>

              <div className="order-details-info-grid">
                <div className="order-details-info-card">
                  <span>{t("orders.customerName", "Customer Name")}</span>
                  <strong>{detailCustomerName || "-"}</strong>
                </div>
                <div className="order-details-info-card">
                  <span>{t("orders.orderType", "Order Type")}</span>
                  <strong>
                    {detailOrderLabel.typeWithSequenceLabel || "-"}
                  </strong>
                </div>
                <div className="order-details-info-card">
                  <span>{t("common.phone", "Phone")}</span>
                  <strong className="order-details-ltr-value">
                    {data.customer?.phoneNumber || "-"}
                  </strong>
                </div>
                <div className="order-details-info-card">
                  <span>{t("orders.createdBy", "Created By")}</span>
                  <strong>
                    <OrderCreatorBadge order={data} />
                  </strong>
                </div>
                {data.type === "READY_MADE" && data.readyMadeClothingCode && (
                  <div className="order-details-info-card">
                    <span>{t("readyMade.code", "Code")}</span>
                    <strong>{data.readyMadeClothingCode}</strong>
                  </div>
                )}
                {data.type === "READY_MADE_WASKAT" &&
                  data.readyMadeWaskatClothingCode && (
                    <div className="order-details-info-card">
                      <span>{t("readyMadeWaskat.code", "Code")}</span>
                      <strong>{data.readyMadeWaskatClothingCode}</strong>
                    </div>
                  )}
                {data.type === "READY_MADE" &&
                  data.readyMadeOriginalPrice != null && (
                    <div className="order-details-info-card">
                      <span>
                        {t("readyMade.originalPrice", "Original Price")}
                      </span>
                      <strong style={{ color: "#7C3AED" }}>
                        {formatMoney(data.readyMadeOriginalPrice, language)}
                      </strong>
                    </div>
                  )}
                {data.type === "READY_MADE_WASKAT" &&
                  data.readyMadeWaskatOriginalPrice != null && (
                    <div className="order-details-info-card">
                      <span>
                        {t("readyMadeWaskat.originalPrice", "Original Price")}
                      </span>
                      <strong style={{ color: "#7C3AED" }}>
                        {formatMoney(
                          data.readyMadeWaskatOriginalPrice,
                          language,
                        )}
                      </strong>
                    </div>
                  )}
              </div>

              <div className="order-details-kpi-block">
                <div className="order-view-kpi-grid">
                  <div className="order-view-kpi-item">
                    <span>{t("common.total", "Total")}</span>
                    <strong>
                      {formatMoney(displayTotalCardValue, language)}
                    </strong>
                  </div>
                  <div className="order-view-kpi-item">
                    <span>{t("common.paid", "Paid")}</span>
                    <strong style={{ color: "#15803D" }}>
                      {formatMoney(data.paidAmount, language)}
                    </strong>
                  </div>
                  <div className="order-view-kpi-item">
                    <span>{t("common.remaining", "Remaining")}</span>
                    <strong
                      style={{
                        color: data.remaining > 0 ? "#DC2626" : "#15803D",
                      }}
                    >
                      {formatMoney(data.remaining, language)}
                    </strong>
                  </div>
                  <div className="order-view-kpi-item order-view-kpi-item--benefit">
                    <span>{t("orders.totalBenefit", "Total Benefit")}</span>
                    <strong
                      style={{
                        color: displayTotalBenefit >= 0 ? "#15803D" : "#DC2626",
                      }}
                    >
                      {formatMoney(displayTotalBenefit, language)}
                    </strong>
                  </div>
                  {data.type === "READY_MADE" && readyMadeOriginalPrice > 0 && (
                    <div className="order-view-kpi-item">
                      <span>
                        {t(
                          "orders.readyMadeOriginalPrice",
                          "Ready-Made Original Price",
                        )}
                      </span>
                      <strong style={{ color: "#7C3AED" }}>
                        {formatMoney(readyMadeOriginalPrice, language)}
                      </strong>
                    </div>
                  )}
                  {data.type === "READY_MADE_WASKAT" && (
                    <div className="order-view-kpi-item">
                      <span>
                        {t(
                          "orders.readyMadeWaskatOriginalPrice",
                          "Ready-Made Waskat Original Price",
                        )}
                      </span>
                      <strong style={{ color: "#7C3AED" }}>
                        {formatMoney(readyMadeOriginalPrice, language)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {hasRakhtDetails && (
            <div
              className="card order-details-rakht-card"
              style={{
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 14,
                background: "var(--surface2)",
                marginBottom: 12,
              }}
            >
              <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
                {t("createOrder.rakhtSelection", "Rakht (Fabric)")}
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                {data.rakhtCompanyName && (
                  <div className="order-details-info-card">
                    <span>{t("rakht.companyName", "Company")}</span>
                    <strong>{data.rakhtCompanyName}</strong>
                  </div>
                )}
                {data.rakhtBrandName && (
                  <div className="order-details-info-card">
                    <span>{t("rakht.brandName", "Brand")}</span>
                    <strong>{data.rakhtBrandName}</strong>
                  </div>
                )}
                {data.rakhtColor && (
                  <div className="order-details-info-card">
                    <span>{t("rakht.color", "Color")}</span>
                    <strong
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {data.rakhtColorHex && (
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: data.rakhtColorHex,
                            border: "1px solid rgba(15,23,42,0.15)",
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {data.rakhtColor}
                    </strong>
                  </div>
                )}
                {data.rakhtRequiredMeters != null && (
                  <div className="order-details-info-card">
                    <span>{t("rakht.requiredMeters", "Meters Used")}</span>
                    <strong>
                      {formatMeters(data.rakhtRequiredMeters)}{" "}
                      {t("common.meterUnit", "m")}
                    </strong>
                  </div>
                )}
                {data.rakhtCustomerPricePerMeter != null && (
                  <div className="order-details-info-card">
                    <span>
                      {t("rakht.priceForCustomer", "Price / m (Customer)")}
                    </span>
                    <strong>
                      {formatMoney(data.rakhtCustomerPricePerMeter, language)}
                    </strong>
                  </div>
                )}
                {data.rakhtPiecePrice != null && (
                  <div className="order-details-info-card">
                    <span>
                      {t("rakht.purchasePricePerMeter", "Price / m (Purchase)")}
                    </span>
                    <strong>
                      {formatMoney(data.rakhtPiecePrice, language)}
                    </strong>
                  </div>
                )}
                {rakhtPurchaseTotal > 0 && (
                  <div className="order-details-info-card">
                    <span>
                      {t("rakht.totalPurchasePrice", "Total Price (Purchase)")}
                    </span>
                    <strong>{formatMoney(rakhtPurchaseTotal, language)}</strong>
                  </div>
                )}
                {data.rakhtTotalCustomerPrice != null &&
                  Number(data.rakhtTotalCustomerPrice) > 0 && (
                    <div className="order-details-info-card">
                      <span>
                        {t("rakht.totalPriceForCustomer", "Total Rakht Price")}
                      </span>
                      <strong>
                        {formatMoney(data.rakhtTotalCustomerPrice, language)}
                      </strong>
                    </div>
                  )}
                {(rakhtPurchaseTotal > 0 || rakhtCustomerTotal > 0) && (
                  <div className="order-details-info-card">
                    <span>{t("rakht.benefit", "Rakht Benefit")}</span>
                    <strong
                      style={{
                        color: rakhtBenefit >= 0 ? "#15803D" : "#DC2626",
                      }}
                    >
                      {formatMoney(rakhtBenefit, language)}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className="card order-details-benefit-card"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 14,
              background: "var(--surface2)",
            }}
          >
            <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>
              {t("orders.benefitDetails", "Benefit Details")}
            </h4>

            <div
              className="order-details-benefit-summary"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>
                  {t("orders.totalOrderPrice", "Total Order Price")}
                </div>
                <strong>
                  {formatMoney(
                    benefitDetails?.totalOrderPrice ?? data.totalPrice ?? 0,
                    language,
                  )}
                </strong>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>
                  {t("orders.totalExpenses", "Total Expenses")}
                </div>
                <strong>{formatMoney(displayTotalExpenses, language)}</strong>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>
                  {t("orders.finalBenefit", "Final Total Benefit")}
                </div>
                <strong
                  style={{
                    color: displayTotalBenefit >= 0 ? "#15803D" : "#DC2626",
                  }}
                >
                  {formatMoney(displayTotalBenefit, language)}
                </strong>
              </div>
            </div>

            <div
              className="tbl-wrap order-details-expenses-table order-scroll-x"
              style={{ overflowX: "auto" }}
            >
              <table className="tbl" style={{ minWidth: 620 }}>
                <thead>
                  <tr>
                    <th>{t("common.description", "Description")}</th>
                    <th>{t("common.type", "Order Type")}</th>
                    <th>{t("common.amount", "Amount")}</th>
                    <th>{t("common.date", "Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {benefitExpenseRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center" }}>
                        {t("orders.noExpenses", "No expenses recorded yet.")}
                      </td>
                    </tr>
                  ) : (
                    benefitExpenseRows.map((entry) => (
                      <tr key={entry.key}>
                        <td>
                          {entry.labelKey
                            ? t(entry.labelKey, {
                                defaultValue: entry.label || "-",
                              })
                            : entry.label || "-"}
                        </td>
                        <td>
                          {entry.orderType
                            ? getOrderTypeLabel(entry.orderType, language)
                            : "-"}
                        </td>
                        <td>{formatMoney(entry.amount || 0, language)}</td>
                        <td>
                          {getBenefitEntryDate(entry)
                            ? formatSystemDate(
                                getBenefitEntryDate(entry),
                                language,
                              )
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="order-details-expenses-mobile">
              {benefitExpenseRows.length === 0 ? (
                <div className="order-details-expense-empty">
                  {t("orders.noExpenses", "No expenses recorded yet.")}
                </div>
              ) : (
                benefitExpenseRows.map((entry) => (
                  <div
                    key={`m-${entry.key}`}
                    className="order-details-expense-card"
                  >
                    <div className="order-details-expense-row">
                      <span>{t("common.description", "Description")}</span>
                      <strong>
                        {entry.labelKey
                          ? t(entry.labelKey, {
                              defaultValue: entry.label || "-",
                            })
                          : entry.label || "-"}
                      </strong>
                    </div>
                    <div className="order-details-expense-row">
                      <span>{t("common.type", "Order Type")}</span>
                      <strong>
                        {entry.orderType
                          ? getOrderTypeLabel(entry.orderType, language)
                          : "-"}
                      </strong>
                    </div>
                    <div className="order-details-expense-row">
                      <span>{t("common.amount", "Amount")}</span>
                      <strong>
                        {formatMoney(entry.amount || 0, language)}
                      </strong>
                    </div>
                    <div className="order-details-expense-row">
                      <span>{t("common.date", "Date")}</span>
                      <strong>
                        {getBenefitEntryDate(entry)
                          ? formatSystemDate(
                              getBenefitEntryDate(entry),
                              language,
                            )
                          : "-"}
                      </strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function RowDropdown({
  order,
  isAdmin,
  showAssign = false,
  onView,
  onAssign,
  onEdit,
  onDelete,
  isReadOnly = false,
  readOnlyReason = "",
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isRtlLanguage(language);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, inlineEnd: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const menuWidth = 176;
      const estimatedMenuItemHeight = 36;
      const estimatedMenuHeight = items.length * estimatedMenuItemHeight + 8;
      const minOffset = 8;
      const maxOffset = Math.max(minOffset, window.innerWidth - menuWidth - 8);
      const desiredOffset = isRtl ? rect.left : window.innerWidth - rect.right;
      const inlineEnd = Math.max(minOffset, Math.min(maxOffset, desiredOffset));
      const preferredTop = rect.bottom + 4;
      const maxTop = window.innerHeight - estimatedMenuHeight - 8;
      const top =
        preferredTop <= maxTop
          ? preferredTop
          : Math.max(8, rect.top - estimatedMenuHeight - 4);
      setPos({
        top,
        inlineEnd,
      });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (
        !menuRef.current?.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const items = [
    isAdmin && {
      label: t("common.details", "Details"),
      icon: <LuClipboardList size={13} />,
      onClick: onView,
      cls: "",
    },
    isAdmin && {
      label: t("common.edit"),
      icon: <LuPencil size={13} />,
      onClick: isReadOnly ? null : onEdit,
      cls: isReadOnly ? "disabled" : "",
      disabled: isReadOnly,
      title: isReadOnly ? readOnlyReason : undefined,
    },
    showAssign &&
      isAdmin && {
        label: order.assignedToId
          ? t("assignment.assignOrder")
          : t("assignment.assign"),
        icon: <LuUserCheck size={13} />,
        onClick: onAssign,
        cls: "",
      },
    isAdmin && {
      label: t("common.delete"),
      icon: <LuTrash2 size={13} />,
      onClick: isReadOnly ? null : onDelete,
      cls: isReadOnly ? "disabled" : "danger",
      disabled: isReadOnly,
      title: isReadOnly ? readOnlyReason : undefined,
    },
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="order-menu-btn"
        onClick={toggle}
        aria-label="Actions"
      >
        <LuEllipsisVertical size={15} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="order-dropdown"
            style={{ top: pos.top, insetInlineEnd: pos.inlineEnd }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                className={`order-dropdown-item${item.cls ? ` order-dropdown-item--${item.cls}` : ""}`}
                disabled={item.disabled}
                title={item.title}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick();
                  setOpen(false);
                }}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

const ORDER_TYPE_FILTER_VALUES = [
  "ALL",
  "OUTFIT",
  "KORTY",
  "WASKAT",
  "YAKHANQAQ",
];

export default function AllOrders({ filter, mode = "orders" }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = isRtlLanguage(language);
  const { user, isAdmin, isFinance } = useAuth();
  const { viewMonth, viewYear, getMonthAccessMode } = useMonth();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const canManageAssignments = mode === "assignment" && isAdmin;
  const remainingOnly = filter === "remaining";
  const statusFilter =
    filter === "pending"
      ? "pending"
      : filter === "completed"
        ? "completed"
        : "all";
  const [assignModal, setAssignModal] = useState(null);
  const [viewOrderId, setViewOrderId] = useState("");
  const [deleteOrderTarget, setDeleteOrderTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [searchBill, setSearchBill] = useState("");
  const [searchBillFilter, setSearchBillFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const orderTypeFilterOptions = useMemo(
    () =>
      ORDER_TYPE_FILTER_VALUES.map((value) => ({
        value,
        label:
          value === "ALL"
            ? t("orders.allTypes")
            : getOrderTypeLabel(value, language),
      })),
    [language, t],
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, remainingOnly]);

  // Reset to page 1 when month/year selection changes
  useEffect(() => {
    setPage(1);
  }, [viewMonth, viewYear]);

  useEffect(() => {
    const incomingSearch = location.state?.search;
    if (!incomingSearch) return;

    setSearch("");
    setSearchFilter(incomingSearch);
    setSearchBill("");
    setSearchBillFilter("");
    setPage(1);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "orders",
      statusFilter,
      remainingOnly,
      page,
      searchFilter,
      searchBillFilter,
      typeFilter,
      viewMonth,
      viewYear,
      user?.id,
      user?.accountType,
    ],
    queryFn: () =>
      api
        .get("/orders", {
          params: {
            status: statusFilter === "all" ? undefined : statusFilter,
            page,
            limit: 20,
            search: searchFilter,
            searchBill: searchBillFilter,
            type: typeFilter === "ALL" ? undefined : typeFilter,
            hasRemaining: remainingOnly ? true : undefined,
            month: isAdmin || isFinance ? viewMonth : undefined,
            year: isAdmin || isFinance ? viewYear : undefined,
          },
        })
        .then((r) => r.data),
  });

  const { data: financeCreatedStats } = useQuery({
    queryKey: ["orders", "finance-created-stats", user?.id],
    enabled: isFinance && Boolean(user?.id),
    queryFn: () => api.get("/orders/stats/finance-created").then((r) => r.data),
  });

  const refreshOrders = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["order-detail"] });
    qc.invalidateQueries({ queryKey: ["assignable-workers"] });
    qc.invalidateQueries({ queryKey: ["rakht-list"] });
    qc.invalidateQueries({ queryKey: ["rakht-detail"] });
    qc.invalidateQueries({ queryKey: ["rakht-revenue-summary"] });
    qc.invalidateQueries({ queryKey: ["analytics"] });
    qc.invalidateQueries({ queryKey: ["analytics-dashboard"] });
  };

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/orders/${id}`),
    onSuccess: () => {
      refreshOrders();
      toast.success(t("orders.deleted"));
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("orders.deleteFailed"))),
  });

  const totals = useMemo(() => {
    const orders = data?.data || [];
    return orders.reduce(
      (acc, order) => {
        acc.total += order.totalPrice || 0;
        acc.paid += order.paidAmount || 0;
        acc.remaining += order.remaining || 0;
        return acc;
      },
      { total: 0, paid: 0, remaining: 0 },
    );
  }, [data]);

  const title =
    mode === "assignment"
      ? t("assignment.assignOrder")
      : remainingOnly
        ? t("orders.titleRemaining", "Remaining Orders")
        : statusFilter === "pending"
          ? t("orders.titlePending")
          : statusFilter === "completed"
            ? t("orders.titleCompleted")
            : t("orders.titleAll");
  const getStatusBadgeMeta = (order) => getOrderCompletionStatus(order, t);

  // Always show newest orders at the top
  const orders = (data?.data || [])
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 20));
  const subtitle = data
    ? t("ui.pageSummary", {
        page,
        pages: totalPages,
        total: data.total,
        defaultValue: "Page {{page}} of {{pages}} · {{total}} total",
      })
    : "";

  const billEmergencyMeta = useMemo(() => {
    const firstOrderIdByBill = {};
    const hasEmergencyByBill = {};

    orders.forEach((order) => {
      const bill = order?.customer?.billNumber;
      if (bill === null || bill === undefined) return;
      if (!firstOrderIdByBill[bill]) {
        firstOrderIdByBill[bill] = order.id;
      }
      if (order.isEmergency) {
        hasEmergencyByBill[bill] = true;
      }
    });

    return { firstOrderIdByBill, hasEmergencyByBill };
  }, [orders]);

  const billCustomerNameByBill = useMemo(() => {
    const map = {};
    orders.forEach((order) => {
      const bill = order?.customer?.billNumber;
      const name = String(order?.customer?.firstName || "").trim();
      if (bill === null || bill === undefined || !name) return;
      if (!map[bill]) {
        map[bill] = name;
      }
    });
    return map;
  }, [orders]);

  return (
    <div
      className={`page all-orders-page ${
        isRtl ? "all-orders-page--rtl" : "all-orders-page--ltr"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <PageHeader title={title} subtitle={subtitle} />

      {(isAdmin || isFinance) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            marginBottom: 16,
            borderRadius: "var(--r)",
            background: "var(--success-soft)",
            border: "1px solid var(--success-soft-border)",
            fontSize: 13,
            color: "var(--success)",
            fontWeight: 500,
          }}
        >
          <LuCalendarCheck size={14} />
          <span>
            {t("orders.viewingMonth", "Viewing data for")}:{" "}
            <strong style={{ fontWeight: 700 }}>
              {formatMonthYearLabel(viewMonth, viewYear, language)}
            </strong>
          </span>
          {data?.total === 0 && (
            <span
              style={{
                marginInlineStart: "auto",
                fontSize: 11,
                opacity: 0.75,
              }}
            >
              {t("orders.noDataThisMonth", "No orders found for this month")}
            </span>
          )}
        </div>
      )}

      {(statusFilter === "completed" || statusFilter === "pending") && (
        <div
          className="g-stats all-orders-status-stats"
          style={{ marginBottom: 16 }}
        >
          <StatCard
            label={
              statusFilter === "completed"
                ? t("orders.titleCompleted")
                : t("orders.titlePending")
            }
            value={data?.total || 0}
            Icon={statusFilter === "completed" ? LuSquareCheck : LuClock}
            accent={statusFilter === "completed" ? "#16A34A" : "#2563EB"}
            sub={t("ui.pageSummary", {
              page,
              pages: totalPages,
              total: data?.total || 0,
              defaultValue: "Page {{page}} of {{pages}} · {{total}} total",
            })}
          />
        </div>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div className="all-orders-toolbar">
          <div className="all-orders-search">
            <LuSearch size={14} className="all-orders-search-icon" />
            <input
              className="inp all-orders-search-input"
              aria-label={t("orders.searchCustomers")}
              placeholder={t("orders.searchCustomers")}
              value={search}
              onChange={(e) => {
                const { value } = e.target;
                setSearch(value);
                setSearchFilter(value);
                setPage(1);
              }}
            />
          </div>

          <div className="all-orders-search">
            <LuSearch size={14} className="all-orders-search-icon" />
            <input
              className="inp all-orders-search-input"
              aria-label={t("orders.billNumber", "Bill Number")}
              placeholder={t("orders.billNumber", "Bill Number")}
              value={searchBill}
              onChange={(e) => {
                const { value } = e.target;
                setSearchBill(value);
                setSearchBillFilter(toAsciiDigits(value).replace(/\D/g, ""));
                setPage(1);
              }}
              inputMode="numeric"
            />
          </div>

          <select
            className="inp all-orders-type-select"
            aria-label={t("orders.allTypes")}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            {orderTypeFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="order-dashboard-strip" dir={isRtl ? "rtl" : "ltr"}>
        {isFinance && (
          <div className="order-dashboard-card order-dashboard-card--finance">
            <span className="order-dashboard-icon">
              <LuUserCheck size={16} />
            </span>
            <div className="order-dashboard-copy">
              <div className="order-dashboard-label">
                {t("orders.financeCreatedTotal", {
                  defaultValue: "Created by You",
                })}
              </div>
              <strong className="order-dashboard-value order-dashboard-value--finance">
                {formatNumberLocale(
                  financeCreatedStats?.totalCreated || 0,
                  language,
                )}
              </strong>
              <span className="order-dashboard-sub">
                {t("orders.financeCreatedTotalSub", {
                  defaultValue: "All orders from your Finance account",
                })}
              </span>
            </div>
          </div>
        )}
        <div className="order-dashboard-card order-dashboard-card--total">
          <span className="order-dashboard-icon">
            <AfCurrencyIcon size={16} />
          </span>
          <div className="order-dashboard-copy">
            <div className="order-dashboard-label">
              {t("orders.listedTotal")}
            </div>
            <strong className="order-dashboard-value">
              {formatMoney(totals.total, language)}
            </strong>
          </div>
        </div>
        <div className="order-dashboard-card order-dashboard-card--paid">
          <span className="order-dashboard-icon">
            <AfCurrencyIcon size={16} />
          </span>
          <div className="order-dashboard-copy">
            <div className="order-dashboard-label">
              {t("common.paid", "Paid")}
            </div>
            <strong className="order-dashboard-value order-dashboard-value--paid">
              {formatMoney(totals.paid, language)}
            </strong>
          </div>
        </div>
        <div className="order-dashboard-card order-dashboard-card--remaining">
          <span className="order-dashboard-icon">
            <LuPhone size={16} />
          </span>
          <div className="order-dashboard-copy">
            <div className="order-dashboard-label">
              {t("common.remaining", "Remaining")}
            </div>
            <strong
              className={`order-dashboard-value ${totals.remaining > 0 ? "order-dashboard-value--remaining" : "order-dashboard-value--paid"}`}
            >
              {formatMoney(totals.remaining, language)}
            </strong>
          </div>
        </div>
      </div>

      <Card noPad>
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            <div className="all-orders-desktop">
              <OrdersHorizontalScrollArea>
                <table className="tbl all-orders-table">
                  <thead>
                    <tr>
                      {[
                        "Bill #",
                        t("common.customer", "Customer"),
                        t("common.type", "Type"),
                        t("common.total", "Total"),
                        t("orders.totalBenefit", "Total Benefit"),
                        t("createOrder.discount", "Discount"),
                        t("common.paid", "Paid"),
                        t("common.remaining", "Remaining"),
                        t("common.status", "Status"),
                        t("orders.createdBy", "Created By"),
                        t("common.date", "Date"),
                        t("common.actions", "Actions"),
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={12}>
                          <EmptyState
                            message={t("orders.noOrders")}
                            Icon={LuClipboardList}
                          />
                        </td>
                      </tr>
                    ) : (
                      orders.map((o) => {
                        const orderLabel = getOrderLabelParts(o, language);
                        const displayTotalBenefit = getDisplayTotalBenefit(o);
                        const billNumber = o?.customer?.billNumber;
                        const resolvedCustomerName =
                          String(o?.customer?.firstName || "").trim() ||
                          (billNumber !== null && billNumber !== undefined
                            ? billCustomerNameByBill[billNumber] || ""
                            : "");
                        const showBillEmergencyBadge =
                          billNumber !== null &&
                          billNumber !== undefined &&
                          billEmergencyMeta.hasEmergencyByBill[billNumber] &&
                          billEmergencyMeta.firstOrderIdByBill[billNumber] ===
                            o.id;
                        return (
                          <tr key={o.id} className="all-orders-table-row">
                            <td>
                              <span className="order-bill-chip">
                                #{o.customer?.billNumber}
                              </span>
                            </td>
                            <td>
                              <div className="order-customer-name">
                                {getOrderPrimaryDisplayName(
                                  o,
                                  resolvedCustomerName,
                                  language,
                                )}
                              </div>
                              <div className="order-customer-phone">
                                {o.customer?.phoneNumber}
                              </div>
                            </td>
                            <td>
                              <Badge v={TV[o.type] || "gold"}>
                                {orderLabel.typeWithSequenceLabel}
                              </Badge>
                            </td>
                            <td className="order-money-cell order-money-cell--total">
                              {formatMoney(o.totalPrice, language)}
                            </td>
                            <td
                              className={`order-money-cell ${displayTotalBenefit >= 0 ? "order-money-cell--paid" : "order-money-cell--remaining"}`}
                            >
                              {formatMoney(displayTotalBenefit, language)}
                            </td>
                            <td className="order-money-cell order-money-cell--discount">
                              {formatMoney(o.discount, language)}
                            </td>
                            <td className="order-money-cell order-money-cell--paid">
                              {formatMoney(o.paidAmount, language)}
                            </td>
                            <td
                              className={`order-money-cell ${o.remaining > 0 ? "order-money-cell--remaining" : "order-money-cell--settled"}`}
                            >
                              {o.remaining > 0
                                ? formatMoney(o.remaining, language)
                                : t("orders.paidInFull")}
                            </td>
                            <td>
                              <div className="order-status-badges">
                                {showBillEmergencyBadge && (
                                  <Badge v="red">
                                    {t("createOrder.emergencyOrder")}
                                  </Badge>
                                )}
                                {(() => {
                                  const statusMeta = getStatusBadgeMeta(o);

                                  return (
                                    <>
                                      <Badge v={statusMeta.tone}>
                                        {statusMeta.label}
                                      </Badge>
                                      {statusMeta.detail ? (
                                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                          {statusMeta.detail}
                                        </span>
                                      ) : null}
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                            <td>
                              <OrderCreatorBadge order={o} compact />
                            </td>
                            <td className="order-date-text">
                              {formatSystemDate(o.createdAt, language)}
                            </td>
                            <td>
                              <div className="order-actions-row">
                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setViewOrderId(o.id)}
                                  >
                                    {t("common.details", "Details")}
                                  </button>
                                )}
                                <RowDropdown
                                  order={o}
                                  isAdmin={isAdmin}
                                  showAssign={canManageAssignments}
                                  onView={() => setViewOrderId(o.id)}
                                  onAssign={() => setAssignModal(o)}
                                  onEdit={() =>
                                    navigate(`/orders/${o.id}/edit`)
                                  }
                                  onDelete={() =>
                                    setDeleteOrderTarget({
                                      id: o.id,
                                      customerName: o.customer?.firstName || "",
                                      billNumber: o.customer?.billNumber,
                                    })
                                  }
                                  isReadOnly={
                                    getMonthAccessMode(
                                      o.entryMonth ?? viewMonth,
                                      o.entryYear ?? viewYear,
                                    ) !== "editable"
                                  }
                                  readOnlyReason={t(
                                    "navbar.pastMonthReadOnly",
                                    "Past months are read-only. No editing allowed.",
                                  )}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </OrdersHorizontalScrollArea>
            </div>

            <div className="all-orders-mobile">
              {orders.length === 0 ? (
                <EmptyState
                  message={t("orders.noOrders")}
                  Icon={LuClipboardList}
                />
              ) : (
                orders.map((o) => {
                  const orderLabel = getOrderLabelParts(o, language);
                  const displayTotalBenefit = getDisplayTotalBenefit(o);
                  const billNumber = o?.customer?.billNumber;
                  const resolvedCustomerName =
                    String(o?.customer?.firstName || "").trim() ||
                    (billNumber !== null && billNumber !== undefined
                      ? billCustomerNameByBill[billNumber] || ""
                      : "");
                  const showBillEmergencyBadge =
                    billNumber !== null &&
                    billNumber !== undefined &&
                    billEmergencyMeta.hasEmergencyByBill[billNumber] &&
                    billEmergencyMeta.firstOrderIdByBill[billNumber] === o.id;

                  return (
                    <div key={o.id} className="order-mobile-card">
                      <div className="order-mobile-head">
                        <span className="order-mobile-bill">
                          #{o.customer?.billNumber}
                        </span>
                        <div className="order-mobile-head-actions">
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setViewOrderId(o.id)}
                            >
                              {t("common.details", "Details")}
                            </button>
                          )}
                          <RowDropdown
                            order={o}
                            isAdmin={isAdmin}
                            showAssign={canManageAssignments}
                            onView={() => setViewOrderId(o.id)}
                            onAssign={() => setAssignModal(o)}
                            onEdit={() => navigate(`/orders/${o.id}/edit`)}
                            onDelete={() =>
                              setDeleteOrderTarget({
                                id: o.id,
                                customerName: o.customer?.firstName || "",
                                billNumber: o.customer?.billNumber,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="order-mobile-name">
                        {getOrderPrimaryDisplayName(
                          o,
                          resolvedCustomerName,
                          language,
                        )}
                      </div>
                      <div className="order-mobile-phone">
                        {o.customer?.phoneNumber}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <OrderCreatorBadge order={o} compact />
                      </div>

                      <div className="order-mobile-badges">
                        <Badge v={TV[o.type] || "gold"}>
                          {orderLabel.typeWithSequenceLabel}
                        </Badge>
                        {showBillEmergencyBadge && (
                          <Badge v="red">
                            {t("createOrder.emergencyOrder")}
                          </Badge>
                        )}
                        {(() => {
                          const statusMeta = getStatusBadgeMeta(o);

                          return (
                            <>
                              <Badge v={statusMeta.tone}>
                                {statusMeta.label}
                              </Badge>
                              {statusMeta.detail ? (
                                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                  {statusMeta.detail}
                                </span>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>

                      <div className="order-mobile-metrics">
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">
                            {t("common.total", "Total")}
                          </div>
                          <div className="order-mobile-value">
                            {formatMoney(o.totalPrice, language)}
                          </div>
                        </div>
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">
                            {t("orders.totalBenefit", "Total Benefit")}
                          </div>
                          <div
                            className={`order-mobile-value${displayTotalBenefit < 0 ? " order-mobile-value--remaining" : " order-mobile-value--paid"}`}
                          >
                            {formatMoney(displayTotalBenefit, language)}
                          </div>
                        </div>
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">
                            {t("createOrder.discount", "Discount")}
                          </div>
                          <div className="order-mobile-value">
                            {formatMoney(o.discount, language)}
                          </div>
                        </div>
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">
                            {t("common.paid", "Paid")}
                          </div>
                          <div className="order-mobile-value order-mobile-value--paid">
                            {formatMoney(o.paidAmount, language)}
                          </div>
                        </div>
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">
                            {t("common.remaining", "Remaining")}
                          </div>
                          <div
                            className={`order-mobile-value${
                              o.remaining > 0
                                ? " order-mobile-value--remaining"
                                : ""
                            }`}
                          >
                            {o.remaining > 0
                              ? formatMoney(o.remaining, language)
                              : t("orders.paidInFull")}
                          </div>
                        </div>
                      </div>

                      <div className="order-mobile-foot">
                        <span className="order-mobile-date">
                          {formatSystemDate(o.createdAt, language)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="all-orders-pagination-wrap">
              <Pagination
                page={page}
                total={data?.total || 0}
                limit={20}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {canManageAssignments && assignModal && (
        <AssignModal
          order={assignModal}
          onClose={() => setAssignModal(null)}
          onAssigned={async () => {
            await qc.cancelQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["orders"], stale: true });
            qc.invalidateQueries({ queryKey: ["order-detail"] });
            qc.invalidateQueries({ queryKey: ["assignable-workers"] });
            await new Promise((r) => setTimeout(r, 50));
            qc.refetchQueries({ queryKey: ["orders"], stale: true });
          }}
        />
      )}

      <ConfirmDeleteModal
        open={!!deleteOrderTarget}
        onClose={() => setDeleteOrderTarget(null)}
        onConfirm={() => {
          if (!deleteOrderTarget) return;
          deleteMut.mutate(deleteOrderTarget.id, {
            onSettled: () => setDeleteOrderTarget(null),
          });
        }}
        title={t("orders.deleteTitle", { defaultValue: t("common.delete") })}
        message={t("orders.deleteConfirm", {
          name: deleteOrderTarget?.customerName || "-",
          billNumber: deleteOrderTarget?.billNumber ?? "-",
          defaultValue:
            "Delete this order permanently? This action cannot be undone.",
        })}
        itemName={
          deleteOrderTarget
            ? `#${deleteOrderTarget.billNumber ?? "-"} ${deleteOrderTarget.customerName || ""}`.trim()
            : ""
        }
        isPending={deleteMut.isPending}
      />

      <OrderViewModal
        orderId={viewOrderId}
        open={!!viewOrderId}
        onClose={() => setViewOrderId("")}
      />
    </div>
  );
}
