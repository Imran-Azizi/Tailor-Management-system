import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LuSearch,
  LuFilter,
  LuSquareCheck,
  LuTrash2,
  LuClipboardList,
  LuPhone,
  LuReceipt,
  LuBadgeDollarSign,
  LuUserCheck,
  LuX,
} from "react-icons/lu";
import toast from "react-hot-toast";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import {
  PageHeader,
  Spinner,
  Badge,
  Pagination,
  Card,
  EmptyState,
  Modal,
} from "../components/ui/index.jsx";
import { OrderDocumentPack } from "../components/order/OrderDocumentPack.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_COLORS = { QICHIKAR: "#D97706", DOKHT: "#DB2777" };

function AssignModal({ order, onClose, onAssigned }) {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState(
    order.assignedToId || "",
  );
  const [note, setNote] = useState(order.assignmentNote || "");
  const [saving, setSaving] = useState(false);

  const { data: workers = [] } = useQuery({
    queryKey: ["assignable-workers"],
    queryFn: () => api.get("/users/assignable").then((r) => r.data),
  });

  const handleAssign = async () => {
    setSaving(true);
    try {
      await api.patch(`/orders/${order.id}/assign`, {
        assignedToId: selectedUserId || null,
        assignmentNote: note || null,
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
          <strong>{order.customer?.firstName}</strong> — Bill #
          {order.customer?.billNumber} · {order.type}
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

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function OrderViewModal({ orderId, open, onClose }) {
  const { t } = useTranslation();
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
                    <Badge v={TV[data.type] || "gold"}>{data.type}</Badge>
                    <Badge v={data.isCompleted ? "green" : "amber"}>
                      {data.isCompleted ? "Completed" : "Pending"}
                    </Badge>
                    {data.isEmergency && <Badge v="red">Emergency</Badge>}
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
                    Created on {new Date(data.createdAt).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>
                    Bill Number
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
                <span>Phone</span>
                <strong>{data.customer?.phoneNumber || "-"}</strong>
              </div>
              <div className="order-view-summary-row">
                <span>Total</span>
                <strong>{formatMoney(data.totalPrice)}</strong>
              </div>
              <div className="order-view-summary-row">
                <span>Paid</span>
                <strong style={{ color: "#15803D" }}>
                  {formatMoney(data.paidAmount)}
                </strong>
              </div>
              <div className="order-view-summary-row">
                <span>Remaining</span>
                <strong
                  style={{ color: data.remaining > 0 ? "#DC2626" : "#15803D" }}
                >
                  {formatMoney(data.remaining)}
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

function RowDropdown({ order, isAdmin, onAssign, onComplete, onDelete }) {
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
    isAdmin && !order.assignedToId && {
      label: t("assignment.assign"),
      icon: <LuUserCheck size={13} />,
      onClick: onAssign,
      cls: "",
    },
    !order.isCompleted && {
      label: t("common.complete"),
      icon: <LuSquareCheck size={13} />,
      onClick: onComplete,
      cls: "success",
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
        <span style={{ fontSize: 15, lineHeight: 1 }}>⋮</span>
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

export default function AllOrders({ filter }) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [assignModal, setAssignModal] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [type, setType] = useState("");

  useEffect(() => {
    const incomingSearch = location.state?.search;
    if (!incomingSearch) return;

    setSearch("");
    setSearchFilter(incomingSearch);
    setPage(1);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", filter, page, searchFilter, type],
    queryFn: () =>
      api
        .get("/orders", {
          params: {
            status: filter,
            page,
            limit: 20,
            search: searchFilter,
            type,
          },
        })
        .then((r) => r.data),
  });

  const refreshOrders = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["order-detail"] });
  };

  const completeMut = useMutation({
    mutationFn: (id) => api.patch(`/orders/${id}/complete`),
    onSuccess: () => {
      refreshOrders();
      toast.success(t("orders.completedSuccess"));
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("orders.completeFailed"))),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/orders/${id}`),
    onSuccess: () => {
      refreshOrders();
      toast.success(t("orders.deleted"));
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, t("orders.deleteFailed"))),
  });

  // Complete modal / payment flow state
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedOrderForComplete, setSelectedOrderForComplete] =
    useState(null);
  const [payAmount, setPayAmount] = useState("");

  const payMut = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/orders/${id}`, payload),
    onSuccess: () => {
      refreshOrders();
      toast.success(t("orders.paymentRecorded") || "Payment recorded");
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(
          error,
          t("orders.paymentFailed") || "Payment failed",
        ),
      ),
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
    filter === "completed"
      ? t("orders.titleCompleted")
      : filter === "pending"
        ? t("orders.titlePending")
        : t("orders.titleAll");

  return (
    <div className="page">
      <PageHeader
        title={title}
        subtitle={data ? `${data.total} orders` : ""}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <LuSearch
                size={13}
                style={{
                  position: "absolute",
                  left: 11,
                  color: "var(--text3)",
                  pointerEvents: "none",
                }}
              />
              <input
                className="inp"
                style={{ paddingLeft: 32, width: 190, height: 36 }}
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
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <LuFilter
                size={13}
                style={{
                  position: "absolute",
                  left: 10,
                  color: "var(--text3)",
                  pointerEvents: "none",
                }}
              />
              <select
                className="inp"
                style={{
                  paddingLeft: 28,
                  width: 140,
                  height: 36,
                  fontSize: 13,
                }}
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">{t("orders.allTypes")}</option>
                {["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      <div className="order-dashboard-strip">
        <div className="order-dashboard-card">
          <LuReceipt size={18} />
          <div>
            <div className="order-dashboard-label">
              {t("orders.listedTotal")}
            </div>
            <strong>{formatMoney(totals.total)}</strong>
          </div>
        </div>
        <div className="order-dashboard-card">
          <LuBadgeDollarSign size={18} />
          <div>
            <div className="order-dashboard-label">{t("common.paid")}</div>
            <strong style={{ color: "#15803D" }}>
              {formatMoney(totals.paid)}
            </strong>
          </div>
        </div>
        <div className="order-dashboard-card">
          <LuPhone size={18} />
          <div>
            <div className="order-dashboard-label">{t("common.remaining")}</div>
            <strong
              style={{ color: totals.remaining > 0 ? "#DC2626" : "#15803D" }}
            >
              {formatMoney(totals.remaining)}
            </strong>
          </div>
        </div>
      </div>

      <Card noPad>
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="tbl">
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
                      t("assignment.assignedTo"),
                      t("common.date"),
                      t("common.actions"),
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!data?.data?.length ? (
                    <tr>
                      <td colSpan={10}>
                        <EmptyState
                          message={t("orders.noOrders")}
                          Icon={LuClipboardList}
                        />
                      </td>
                    </tr>
                  ) : (
                    data.data.map((o) => {
                      const blockedCompletion =
                        !o.isCompleted && o.remaining > 0;
                      return (
                        <tr key={o.id}>
                          <td>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--primary)",
                              }}
                            >
                              #{o.customer?.billNumber}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {o.customer?.firstName}
                            </div>
                            <div
                              style={{ fontSize: 11, color: "var(--text3)" }}
                            >
                              {o.customer?.phoneNumber}
                            </div>
                          </td>
                          <td>
                            <Badge v={TV[o.type] || "gold"}>{o.type}</Badge>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {formatMoney(o.totalPrice)}
                          </td>
                          <td
                            style={{ color: "var(--text3)", fontWeight: 600 }}
                          >
                            {formatMoney(o.discount)}
                          </td>
                          <td style={{ color: "#16A34A", fontWeight: 600 }}>
                            {formatMoney(o.paidAmount)}
                          </td>
                          <td
                            style={{
                              color:
                                o.remaining > 0 ? "#DC2626" : "var(--text3)",
                              fontWeight: o.remaining > 0 ? 600 : 400,
                            }}
                          >
                            {o.remaining > 0
                              ? formatMoney(o.remaining)
                              : t("orders.paidInFull")}
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                gap: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              {o.isEmergency && (
                                <Badge v="red">
                                  {t("createOrder.emergencyOrder")}
                                </Badge>
                              )}
                              <Badge v={o.isCompleted ? "green" : "amber"}>
                                {o.isCompleted
                                  ? t("orders.done")
                                  : t("orders.pending")}
                              </Badge>
                            </div>
                          </td>
                          <td>
                            {o.assignedTo ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: "2px 8px",
                                  borderRadius: 99,
                                  background:
                                    (ROLE_COLORS[o.assignedTo.accountType] ||
                                      "#888") + "18",
                                  color:
                                    ROLE_COLORS[o.assignedTo.accountType] ||
                                    "#888",
                                }}
                              >
                                {o.assignedTo.name}
                              </span>
                            ) : (
                              <span
                                style={{ fontSize: 12, color: "var(--text3)" }}
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              fontSize: 11,
                              color: "var(--text3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {new Date(o.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <RowDropdown
                              order={o}
                              isAdmin={isAdmin}
                              onAssign={() => setAssignModal(o)}
                              onComplete={() => {
                                if ((o.remaining || 0) > 0) {
                                  setSelectedOrderForComplete(o);
                                  setPayAmount(String(o.remaining));
                                  setCompleteModalOpen(true);
                                } else {
                                  completeMut.mutate(o.id);
                                }
                              }}
                              onDelete={() => {
                                if (confirm(t("common.delete") + "?"))
                                  deleteMut.mutate(o.id);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "0 20px 16px" }}>
              <Pagination
                page={page}
                total={data?.total || 0}
                limit={20}
                onChange={setPage}
              />
            </div>
            <Modal
              open={completeModalOpen}
              onClose={() => {
                setCompleteModalOpen(false);
                setSelectedOrderForComplete(null);
                setPayAmount("");
              }}
              title={t("orders.settleToComplete", {
                defaultValue: "Settle Balance to Complete Order",
              })}
              maxW={600}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderLeft: "3px solid #DC2626",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#DC2626",
                    fontWeight: 500,
                  }}
                >
                  {t("orders.blockedComplete", {
                    defaultValue:
                      "This order cannot be completed until the customer pays the remaining balance.",
                  })}
                </div>

                <div>
                  <div style={{ fontSize: 13, color: "var(--text3)" }}>
                    {t("common.remaining")}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: "#DC2626" }}>
                    {formatMoney(selectedOrderForComplete?.remaining)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                    {t("orders.enterPaymentAmount", { defaultValue: "Enter payment amount" })}
                  </div>
                  <input
                    className="inp"
                    style={{ width: "100%" }}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={String(
                      selectedOrderForComplete?.remaining || 0,
                    )}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setCompleteModalOpen(false);
                      setSelectedOrderForComplete(null);
                      setPayAmount("");
                    }}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={async () => {
                      if (!selectedOrderForComplete) return;
                      const amount = parseNumberLocale(payAmount);
                      if (Number.isNaN(amount) || amount < 0) {
                        toast.error(
                          t("orders.invalidAmount") || "Invalid amount",
                        );
                        return;
                      }

                      const remaining = Number(
                        selectedOrderForComplete.remaining || 0,
                      );
                      // require full remaining payment to proceed to completion
                      if (Math.abs(amount - remaining) > 0.001) {
                        toast.error(
                          t("orders.blockedComplete") ||
                            "This order cannot be completed until the customer pays the remaining balance.",
                        );
                        return;
                      }

                      const newPaid =
                        (selectedOrderForComplete.paidAmount || 0) + amount;

                      try {
                        await payMut.mutateAsync({
                          id: selectedOrderForComplete.id,
                          payload: { paidAmount: newPaid },
                        });
                        await completeMut.mutateAsync(
                          selectedOrderForComplete.id,
                        );
                        setCompleteModalOpen(false);
                        setSelectedOrderForComplete(null);
                        setPayAmount("");
                      } catch (e) {
                        // errors shown by mutations
                      }
                    }}
                    disabled={payMut.isLoading || completeMut.isLoading}
                  >
                    {t("orders.payAndComplete", {
                      defaultValue: "Pay & Complete",
                    })}
                  </button>
                </div>
              </div>
            </Modal>
          </>
        )}
      </Card>

      {assignModal && (
        <AssignModal
          order={assignModal}
          onClose={() => setAssignModal(null)}
          onAssigned={() => {
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["order-detail"] });
          }}
        />
      )}
    </div>
  );
}
