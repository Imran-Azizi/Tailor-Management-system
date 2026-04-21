import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuReceipt, LuSearch, LuUserCheck } from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { formatCurrency } from "../lib/currency.js";
import { getOrderTypeLabel, getOrderTypeOptions } from "../lib/orderType.js";
import {
  Card,
  EmptyState,
  Field,
  PageHeader,
  Spinner,
} from "../components/ui/index.jsx";

const WORKER_TYPES = [
  { value: "DOKHT", labelKey: "assignment.dokhtLabel", fallback: "Dokht" },
  {
    value: "QICHIKAR",
    labelKey: "assignment.qichikarLabel",
    fallback: "Qichikar",
  },
];
const COMPLETED_REASSIGN_BLOCK_MESSAGE =
  "This order completed, you can not assign it again";

function isCompletedForWorkerType(order, type) {
  if (!order || !type) return false;
  if (order.isCompleted) return true;
  if (type === "QICHIKAR") return Boolean(order.qichikarCompletedAt);
  if (type === "DOKHT") return Boolean(order.dokhtCompletedAt);
  return false;
}

function formatMoney(value, language) {
  return formatCurrency(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function AssignOrders() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language;

  const [workerType, setWorkerType] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [clothesType, setClothesType] = useState("");
  const [billNumber, setBillNumber] = useState("");

  const [loadingResult, setLoadingResult] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [assignmentPrice, setAssignmentPrice] = useState("");
  const [assignmentNote, setAssignmentNote] = useState("");

  const { data: workers = [], isLoading: loadingWorkers } = useQuery({
    queryKey: ["assignable-workers"],
    queryFn: () => api.get("/users/assignable").then((r) => r.data),
  });

  const workersForType = useMemo(
    () => workers.filter((user) => user.accountType === workerType),
    [workers, workerType],
  );

  const orderTypeOptions = useMemo(
    () => getOrderTypeOptions(language),
    [language],
  );

  const matchedOrders = useMemo(() => {
    if (!lookupResult?.orders?.length || !clothesType) return [];
    return lookupResult.orders.filter(
      (order) =>
        order.type === clothesType &&
        !order.isCompleted &&
        !isCompletedForWorkerType(order, workerType),
    );
  }, [lookupResult, clothesType, workerType]);

  const selectedOrder = useMemo(
    () => matchedOrders.find((order) => order.id === selectedOrderId) || null,
    [matchedOrders, selectedOrderId],
  );

  useEffect(() => {
    setWorkerId("");
  }, [workerType]);

  useEffect(() => {
    if (!matchedOrders.length) {
      setSelectedOrderId("");
      setAssignmentPrice("");
      return;
    }

    if (!matchedOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(matchedOrders[0].id);
    }
  }, [matchedOrders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrder) return;

    setAssignmentPrice(
      selectedOrder.assignmentPrice != null
        ? String(selectedOrder.assignmentPrice)
        : "",
    );
    setAssignmentNote(selectedOrder.assignmentNote || "");
  }, [selectedOrder?.id]);

  const searchByBill = async () => {
    const parsedBill = parseNumberLocale(billNumber);

    if (!clothesType) {
      toast.error(
        t("assignment.selectClothesTypeFirst", "Select clothes type first."),
      );
      return;
    }

    if (!Number.isFinite(parsedBill) || parsedBill <= 0) {
      toast.error(
        t("assignment.invalidBillNumber", "Enter a valid bill number."),
      );
      return;
    }

    setLoadingResult(true);
    try {
      const { data } = await api.get("/orders/lookup", {
        params: { billNumber: Math.trunc(parsedBill) },
      });

      setLookupResult(data);

      if (!data?.orders?.length) {
        toast.error(
          t("assignment.noOrdersFound", "No orders found for this bill."),
        );
      } else if (
        !data.orders.some(
          (order) => order.type === clothesType && !order.isCompleted,
        )
      ) {
        toast.error(
          t(
            "assignment.noOrdersForType",
            "No pending orders found for the selected clothes type.",
          ),
        );
      }
    } catch (err) {
      setLookupResult(null);
      if (err?.response?.status === 404) {
        toast.error(
          t("assignment.noOrdersFound", "No orders found for this bill."),
        );
      } else {
        toast.error(
          getApiErrorMessage(
            err,
            t("assignment.searchFailed", "Search failed."),
          ),
        );
      }
    } finally {
      setLoadingResult(false);
    }
  };

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!workerType) {
        throw new Error(
          t("assignment.selectUserType", "Select user type first."),
        );
      }
      if (!workerId) {
        throw new Error(
          t("assignment.workerRequired", "Select a worker account first."),
        );
      }
      if (!selectedOrder) {
        throw new Error(
          t("assignment.orderRequired", "Select an order first."),
        );
      }

      if (isCompletedForWorkerType(selectedOrder, workerType)) {
        throw new Error(COMPLETED_REASSIGN_BLOCK_MESSAGE);
      }

      const parsedPrice = parseNumberLocale(assignmentPrice);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new Error(
          t(
            "assignment.invalidPrice",
            "Price must be a valid non-negative number.",
          ),
        );
      }

      const { data: assigned } = await api.patch(
        `/orders/${selectedOrder.id}/assign`,
        {
          assignedToId: workerId,
          assignmentPrice: parsedPrice,
          assignmentNote: assignmentNote.trim() || null,
        },
      );

      return assigned;
    },
    onSuccess: (assigned) => {
      setLookupResult((prev) => {
        if (!prev?.orders?.length) return prev;

        return {
          ...prev,
          orders: prev.orders.map((order) =>
            order.id === assigned.id
              ? {
                  ...order,
                  assignedToId: assigned.assignedToId,
                  assignedTo: assigned.assignedTo,
                  assignedAt: assigned.assignedAt,
                  assignmentPrice: assigned.assignmentPrice,
                  assignmentNote: assigned.assignmentNote,
                }
              : order,
          ),
        };
      });

      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-detail"] });
      qc.invalidateQueries({ queryKey: ["worker-panel-orders"] });
      qc.invalidateQueries({ queryKey: ["worker-panel-transaction-summary"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });

      toast.success(t("assignment.assigned", "Order assigned successfully."));
    },
    onError: (err) => {
      toast.error(
        getApiErrorMessage(
          err,
          t("assignment.failed", "Failed to assign order."),
        ),
      );
    },
  });

  return (
    <div
      className="page"
      style={{
        padding: "20px 18px 56px",
        maxWidth: 1240,
        margin: "0 auto",
      }}
    >
      <PageHeader
        title={t("assignment.assignOrder", "Assign Order")}
        subtitle={t(
          "assignment.assignPageSubtitle",
          "Assign pending orders to Dokht or Qichikar with a focused, fast workflow.",
        )}
      />

      <div
        style={{
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "var(--sh)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <Card noPad>
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid var(--border)",
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--primary) 10%, white), color-mix(in oklab, #0EA5E9 8%, white))",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                color: "var(--text1)",
              }}
            >
              {t("assignment.assignmentSetup", "Assignment Setup")}
            </h3>
            <p
              style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text2)" }}
            >
              {t(
                "assignment.setupHint",
                "Pick clothes type, account type, user account, then search by bill number.",
              )}
            </p>
          </div>

          <div style={{ padding: 18 }}>
            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
              <Field
                label={t("assignment.clothesType", "Clothes type")}
                required
              >
                <select
                  className="inp"
                  value={clothesType}
                  onChange={(e) => setClothesType(e.target.value)}
                >
                  <option value="">
                    {t("assignment.selectClothesType", "Select clothes type")}
                  </option>
                  {orderTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={t("assignment.selectUserType", "Select user type")}
                required
              >
                <select
                  className="inp"
                  value={workerType}
                  onChange={(e) => setWorkerType(e.target.value)}
                >
                  <option value="">
                    {t("assignment.chooseUserType", "Choose Dokht or Qichikar")}
                  </option>
                  {WORKER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {t(type.labelKey, type.fallback)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={t("assignment.selectUserAccount", "Select account")}
                required
                hint={
                  !workerType
                    ? t("assignment.chooseTypeFirst", "Choose user type first.")
                    : undefined
                }
              >
                <select
                  className="inp"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  disabled={loadingWorkers || !workerType}
                >
                  <option value="">
                    {t("assignment.chooseAccount", "Choose account")}
                  </option>
                  {workersForType.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name} - {worker.phoneNumber}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("orders.billNumber", "Bill Number")} required>
                <div style={{ display: "flex", gap: 8 }}>
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
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={searchByBill}
                    disabled={loadingResult || assignMutation.isPending}
                    style={{
                      whiteSpace: "nowrap",
                      padding: "0 14px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      opacity:
                        loadingResult || assignMutation.isPending ? 0.65 : 1,
                      height: 40,
                    }}
                  >
                    <LuSearch size={14} />
                    {t("common.search", "Search")}
                  </button>
                </div>
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        {loadingResult ? (
          <Spinner />
        ) : !lookupResult ? (
          <div
            style={{
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "var(--sh)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <Card title={t("assignment.searchResult", "Search Result")} noPad>
              <EmptyState
                message={t(
                  "assignment.searchResultHint",
                  "Select clothes type and search by bill number to start assignment.",
                )}
                Icon={LuReceipt}
              />
            </Card>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <Card
              title={t("assignment.customerInfo", "Customer & Order Selection")}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "11px 12px",
                    background: "var(--surface2)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text3)",
                      marginBottom: 3,
                    }}
                  >
                    {t("common.customer", "Customer")}
                  </p>
                  <p style={{ fontWeight: 800, color: "var(--text1)" }}>
                    {lookupResult.customer?.firstName || "-"}
                  </p>
                </div>

                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "11px 12px",
                    background: "var(--surface2)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text3)",
                      marginBottom: 3,
                    }}
                  >
                    {t("orders.billNumber", "Bill Number")}
                  </p>
                  <p style={{ fontWeight: 800, color: "var(--text1)" }}>
                    #{lookupResult.customer?.billNumber || "-"}
                  </p>
                </div>
              </div>

              {!matchedOrders.length ? (
                <EmptyState
                  message={t(
                    "assignment.noMatchingPendingOrders",
                    "No pending orders found for the selected clothes type.",
                  )}
                />
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {matchedOrders.map((order, idx) => {
                    const active = selectedOrderId === order.id;
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        style={{
                          width: "100%",
                          textAlign: "start",
                          transition:
                            "border-color .16s ease, box-shadow .16s ease, transform .16s ease",
                          border: active
                            ? "1px solid #0284C7"
                            : "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "12px 14px",
                          background: active
                            ? "linear-gradient(135deg, rgba(2,132,199,.10), rgba(15,118,110,.08))"
                            : "var(--surface)",
                          cursor: "pointer",
                          boxShadow: active
                            ? "0 8px 24px rgba(2,132,199,.13)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--text1)",
                              }}
                            >
                              {t(
                                "assignment.orderLabelWithNumber",
                                "Order #{{number}}",
                                {
                                  number: idx + 1,
                                },
                              )}{" "}
                              - {getOrderTypeLabel(order.type, language)}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                color: "var(--text3)",
                                marginTop: 2,
                              }}
                            >
                              {order.orderName ||
                                t("assignment.noOrderName", "No custom name")}
                            </p>
                          </div>
                          <div style={{ textAlign: "end" }}>
                            <p style={{ fontSize: 12, color: "var(--text3)" }}>
                              {t("assignment.quantity", "Quantity")}
                            </p>
                            <p
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "var(--text2)",
                                marginTop: 2,
                              }}
                            >
                              {order.quantity || 1}
                            </p>
                            <p style={{ fontSize: 12, color: "var(--text3)" }}>
                              {t("common.total", "Total")}
                            </p>
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: "var(--text1)",
                              }}
                            >
                              {formatMoney(order.totalPrice, language)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>

            {selectedOrder && (
              <Card
                title={t(
                  "assignment.selectedOrderSummary",
                  "Selected Order Summary",
                )}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 16,
                    gridTemplateColumns: "minmax(240px, 1fr)",
                    alignItems: "start",
                  }}
                >
                  <Field
                    label={t("assignment.priceForWorker", "Price for worker")}
                    required
                    hint={t(
                      "assignment.priceForWorkerHint",
                      "Enter the sewing or cutting price before sending this order.",
                    )}
                  >
                    <input
                      className="inp"
                      value={assignmentPrice}
                      onChange={(e) => setAssignmentPrice(e.target.value)}
                      placeholder={t(
                        "assignment.pricePlaceholder",
                        "Enter assignment price",
                      )}
                      inputMode="decimal"
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 12 }}>
                  <Field label={t("assignment.note", "Note")}>
                    <textarea
                      className="inp"
                      rows={3}
                      value={assignmentNote}
                      onChange={(e) => setAssignmentNote(e.target.value)}
                      placeholder={t(
                        "assignment.notePlaceholder",
                        "Add note (optional)",
                      )}
                      style={{ resize: "vertical" }}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={() => assignMutation.mutate()}
                    disabled={
                      assignMutation.isPending || !workerType || !workerId
                    }
                    style={{
                      minWidth: 170,
                      justifyContent: "center",
                    }}
                  >
                    {assignMutation.isPending ? (
                      t("common.loading", "Loading...")
                    ) : (
                      <>
                        <LuUserCheck size={14} />
                        <span>{t("assignment.send", "Send")}</span>
                      </>
                    )}
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
