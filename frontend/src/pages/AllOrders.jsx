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
  LuReceipt,
  LuBadgeDollarSign,
  LuUserCheck,
  LuEllipsisVertical,
  LuX,
  LuPencil,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { formatCurrency } from "../lib/currency.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import {
  PageHeader,
  Spinner,
  Badge,
  Pagination,
  Card,
  EmptyState,
  Modal,
  ConfirmDeleteModal,
} from "../components/ui/index.jsx";
import { OrderDocumentPack } from "../components/order/OrderDocumentPack.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_COLORS = { QICHIKAR: "#D97706", DOKHT: "#DB2777" };

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
          <strong>{order.customer?.firstName}</strong> - Bill #
          {order.customer?.billNumber} | {getOrderTypeLabel(order.type, i18n.resolvedLanguage || i18n.language)}
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

function OrderViewModal({ orderId, open, onClose }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { data, isLoading } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => api.get(`/orders/${orderId}`).then((r) => r.data),
    enabled: open && !!orderId,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("orders.orderDetails")}
      maxW={1100}
    >
      {isLoading ? (
        <Spinner />
      ) : !data ? (
        <EmptyState message="Order not found" />
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          <div className="order-view-top-grid">
            <div className="order-view-spotlight">
              <div
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
                      {getOrderTypeLabel(data.type, language)}
                    </Badge>
                    {data.isEmergency && <Badge v="red">{t("orders.emergencyBadge")}</Badge>}
                  </div>
                  <h3 style={{ fontSize: 24, fontWeight: 900 }}>
                    {data.customer?.firstName}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text3)",
                      marginTop: 4,
                    }}
                  >
                    {t("orders.createdOn", { date: new Date(data.createdAt).toLocaleString() })}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>
                    {t("orders.billNumber")}
                  </div>
                  <div
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
            </div>

            <div className="order-view-summary-card">
              <div className="order-view-summary-row">
                <span>{t("common.phone")}</span>
                <strong>{data.customer?.phoneNumber || "-"}</strong>
              </div>
              <div className="order-view-summary-row">
                <span>{t("common.total")}</span>
                <strong>{formatMoney(data.totalPrice, language)}</strong>
              </div>
              <div className="order-view-summary-row">
                <span>{t("common.paid")}</span>
                <strong style={{ color: "#15803D" }}>
                  {formatMoney(data.paidAmount, language)}
                </strong>
              </div>
              <div className="order-view-summary-row">
                <span>{t("common.remaining")}</span>
                <strong
                  style={{ color: data.remaining > 0 ? "#DC2626" : "#15803D" }}
                >
                  {formatMoney(data.remaining, language)}
                </strong>
              </div>
            </div>
          </div>

          <OrderDocumentPack
            customer={data.customer}
            order={data}
            previewId={`order-view-${data.id}`}
          />
        </div>
      )}
    </Modal>
  );
}

function RowDropdown({
  order,
  isAdmin,
  showAssign = false,
  onAssign,
  onEdit,
  onDelete,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
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
      label: t("common.edit"),
      icon: <LuPencil size={13} />,
      onClick: onEdit,
      cls: "",
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
      onClick: onDelete,
      cls: "danger",
    },
  ].filter(Boolean);

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
            style={{ top: pos.top, right: pos.right }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                className={`order-dropdown-item${item.cls ? ` order-dropdown-item--${item.cls}` : ""}`}
                onClick={() => {
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

const ORDER_TYPE_FILTER_VALUES = ["ALL", "OUTFIT", "KORTY", "WASKAT", "YAKHANQAQ"];

export default function AllOrders({ filter, mode = "orders" }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const canManageAssignments = mode === "assignment" && isAdmin;
  const statusFilter =
    filter === "pending"
      ? "pending"
      : filter === "completed"
        ? "completed"
        : "all";
  const [assignModal, setAssignModal] = useState(null);
  const [deleteOrderTarget, setDeleteOrderTarget] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
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
  }, [statusFilter]);

  useEffect(() => {
    const incomingSearch = location.state?.search;
    if (!incomingSearch) return;

    setSearch("");
    setSearchFilter(incomingSearch);
    setPage(1);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", statusFilter, page, searchFilter, typeFilter],
    queryFn: () =>
      api
        .get("/orders", {
          params: {
            status: statusFilter === "all" ? undefined : statusFilter,
            page,
            limit: 20,
            search: searchFilter,
            type: typeFilter === "ALL" ? undefined : typeFilter,
          },
        })
        .then((r) => r.data),
  });

  const refreshOrders = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["order-detail"] });
    qc.invalidateQueries({ queryKey: ["assignable-workers"] });
    setTimeout(() => {
      qc.refetchQueries({ queryKey: ["orders"] });
    }, 100);
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
      : statusFilter === "pending"
        ? t("orders.titlePending")
        : statusFilter === "completed"
          ? t("orders.titleCompleted")
          : t("orders.titleAll");
  const completedStatusLabel = t(
    "common.completed",
    t("sidebar.completed", "Completed"),
  );

  const orders = data?.data || [];
  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / 20));
  const subtitle = data
    ? t("ui.pageSummary", { page, pages: totalPages, total: data.total })
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

  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} />

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
                const value = e.target.value;
                setSearch(value);
                setSearchFilter(value);
                setPage(1);
              }}
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

      <div className="order-dashboard-strip">
        <div className="order-dashboard-card order-dashboard-card--total">
          <span className="order-dashboard-icon">
            <LuReceipt size={16} />
          </span>
          <div className="order-dashboard-copy">
            <div className="order-dashboard-label">{t("orders.listedTotal")}</div>
            <strong className="order-dashboard-value">
              {formatMoney(totals.total, language)}
            </strong>
          </div>
        </div>
        <div className="order-dashboard-card order-dashboard-card--paid">
          <span className="order-dashboard-icon">
            <LuBadgeDollarSign size={16} />
          </span>
          <div className="order-dashboard-copy">
            <div className="order-dashboard-label">{t("common.paid")}</div>
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
            <div className="order-dashboard-label">{t("common.remaining")}</div>
            <strong className={`order-dashboard-value ${totals.remaining > 0 ? "order-dashboard-value--remaining" : "order-dashboard-value--paid"}`}>
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
              <div className="tbl-wrap all-orders-table-wrap">
              <table className="tbl all-orders-table">
                <thead>
                  <tr>
                    {[
                      "Bill #",
                      t("common.customer"),
                      t("common.type"),
                      t("common.total"),
                      t("createOrder.discount"),
                      t("common.paid"),
                      t("common.remaining"),
                      t("common.status"),
                      t("common.date"),
                      t("common.actions"),
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!orders.length ? (
                    <tr>
                      <td colSpan={10}>
                        <EmptyState
                          message={t("orders.noOrders")}
                          Icon={LuClipboardList}
                        />
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const billNumber = o?.customer?.billNumber;
                      const showBillEmergencyBadge =
                        billNumber !== null &&
                        billNumber !== undefined &&
                        billEmergencyMeta.hasEmergencyByBill[billNumber] &&
                        billEmergencyMeta.firstOrderIdByBill[billNumber] === o.id;
                      return (
                        <tr key={o.id}>
                          <td>
                            <span className="order-bill-chip">#{o.customer?.billNumber}</span>
                          </td>
                          <td>
                            <div className="order-customer-name">
                              {o.customer?.firstName}
                            </div>
                            <div className="order-customer-phone">
                              {o.customer?.phoneNumber}
                            </div>
                          </td>
                          <td>
                            <Badge v={TV[o.type] || "gold"}>
                              {getOrderTypeLabel(o.type, language)}
                            </Badge>
                          </td>
                          <td className="order-money-cell order-money-cell--total">
                            {formatMoney(o.totalPrice, language)}
                          </td>
                          <td className="order-money-cell order-money-cell--discount">
                            {formatMoney(o.discount, language)}
                          </td>
                          <td className="order-money-cell order-money-cell--paid">
                            {formatMoney(o.paidAmount, language)}
                          </td>
                          <td className={`order-money-cell ${o.remaining > 0 ? "order-money-cell--remaining" : "order-money-cell--settled"}`}>
                            {o.remaining > 0
                              ? formatMoney(o.remaining, language)
                              : t("orders.paidInFull")}
                          </td>
                          <td>
                            <div className="order-status-badges">
                              {showBillEmergencyBadge && (
                                <Badge v="red">{t("createOrder.emergencyOrder")}</Badge>
                              )}
                              <Badge
                                v={
                                  statusFilter === "completed"
                                    ? "red"
                                    : o.remaining > 0
                                      ? "amber"
                                      : "green"
                                }
                              >
                                {statusFilter === "completed"
                                  ? completedStatusLabel
                                  : o.remaining > 0
                                    ? t("delivery.notFullyPaidBadge", "Not fully paid")
                                    : t("delivery.fullyPaidBadge", "Fully paid")}
                              </Badge>
                            </div>
                          </td>
                          <td className="order-date-text">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <RowDropdown
                              order={o}
                              isAdmin={isAdmin}
                              showAssign={canManageAssignments}
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
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </div>

            <div className="all-orders-mobile">
              {!orders.length ? (
                <EmptyState message={t("orders.noOrders")} Icon={LuClipboardList} />
              ) : (
                orders.map((o) => {
                  const billNumber = o?.customer?.billNumber;
                  const showBillEmergencyBadge =
                    billNumber !== null &&
                    billNumber !== undefined &&
                    billEmergencyMeta.hasEmergencyByBill[billNumber] &&
                    billEmergencyMeta.firstOrderIdByBill[billNumber] === o.id;

                  return (
                    <div key={o.id} className="order-mobile-card">
                      <div className="order-mobile-head">
                        <span className="order-mobile-bill">#{o.customer?.billNumber}</span>
                        <RowDropdown
                          order={o}
                          isAdmin={isAdmin}
                          showAssign={canManageAssignments}
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

                      <div className="order-mobile-name">
                        {o.customer?.firstName}
                      </div>
                      <div className="order-mobile-phone">
                        {o.customer?.phoneNumber}
                      </div>

                      <div className="order-mobile-badges">
                        <Badge v={TV[o.type] || "gold"}>
                          {getOrderTypeLabel(o.type, language)}
                        </Badge>
                        {showBillEmergencyBadge && (
                          <Badge v="red">{t("createOrder.emergencyOrder")}</Badge>
                        )}
                        <Badge
                          v={
                            statusFilter === "completed"
                              ? "red"
                              : o.remaining > 0
                                ? "amber"
                                : "green"
                          }
                        >
                          {statusFilter === "completed"
                            ? completedStatusLabel
                            : o.remaining > 0
                              ? t("delivery.notFullyPaidBadge", "Not fully paid")
                              : t("delivery.fullyPaidBadge", "Fully paid")}
                        </Badge>
                      </div>

                      <div className="order-mobile-metrics">
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">{t("common.total")}</div>
                          <div className="order-mobile-value">
                            {formatMoney(o.totalPrice, language)}
                          </div>
                        </div>
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">{t("createOrder.discount")}</div>
                          <div className="order-mobile-value">
                            {formatMoney(o.discount, language)}
                          </div>
                        </div>
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">{t("common.paid")}</div>
                          <div className="order-mobile-value order-mobile-value--paid">
                            {formatMoney(o.paidAmount, language)}
                          </div>
                        </div>
                        <div className="order-mobile-metric">
                          <div className="order-mobile-label">{t("common.remaining")}</div>
                          <div
                            className={`order-mobile-value${
                              o.remaining > 0 ? " order-mobile-value--remaining" : ""
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
                          {new Date(o.createdAt).toLocaleDateString()}
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
            await new Promise(r => setTimeout(r, 50));
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
    </div>
  );
}

