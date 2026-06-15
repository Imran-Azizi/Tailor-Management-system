import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuSearch, LuSend } from "react-icons/lu";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { formatCurrency } from "../lib/currency.js";
import {
  getOrderLabelParts,
  getOrderTypeLabel,
  getOrderTypeOptions,
} from "../lib/orderType.js";
import { isRtlLanguage } from "../lib/locale.js";
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
  const isRtl = isRtlLanguage(language);

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

  // Remove READY_MADE_WASKAT from clothes type dropdown
  const orderTypeOptions = useMemo(
    () =>
      getOrderTypeOptions(language).filter(
        (opt) => opt.value !== "READY_MADE_WASKAT",
      ),
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

  const selectedWorker = useMemo(
    () => workersForType.find((worker) => worker.id === workerId) || null,
    [workersForType, workerId],
  );

  const selectedWorkerType = WORKER_TYPES.find(
    (type) => type.value === workerType,
  );

  const selectedWorkerTypeLabel = workerType
    ? t(
        selectedWorkerType?.labelKey || "assignment.selectUserType",
        selectedWorkerType?.fallback || "Worker",
      )
    : t("assignment.selectUserType", "Select user type");

  const selectedClothesTypeLabel = clothesType
    ? getOrderTypeLabel(clothesType, language)
    : t("assignment.clothesType", "Clothes type");

  const selectedOrderLabel = useMemo(
    () => (selectedOrder ? getOrderLabelParts(selectedOrder, language) : null),
    [selectedOrder, language],
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
        throw new Error(
          t("assignment.completedReassignBlocked", {
            defaultValue:
              "This order is completed. You cannot assign it again.",
          }),
        );
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
      className={`page assign-orders-page ${
        isRtl ? "assign-orders-page--rtl" : "assign-orders-page--ltr"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <PageHeader
        title={t("assignment.assignOrder", "Assign Order")}
        subtitle={t(
          "assignment.assignPageSubtitle",
          "Assign pending orders to Dokht or Qichikar with a focused, fast workflow.",
        )}
      />

      <div className="assign-orders-stack">
        <Card title={t("assignment.assignmentSetup", "Assignment Setup")}>
          <div className="assign-orders-setup">
            <div className="assign-orders-form-grid">
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
                <div className="assign-orders-search-control">
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
                  >
                    <LuSearch size={14} />
                    <span>{t("common.search", "Search")}</span>
                  </button>
                </div>
              </Field>
            </div>
          </div>
        </Card>

        {loadingResult ? (
          <Card title={t("assignment.searchResult", "Search Result")}>
            <div className="assign-orders-loading">
              <Spinner />
              <p>{t("common.loading", "Loading...")}</p>
            </div>
          </Card>
        ) : !lookupResult ? (
          <Card title={t("assignment.searchResult", "Search Result")} noPad>
            <div className="assign-orders-empty">
              <EmptyState
                message={t(
                  "assignment.searchResultHint",
                  "Select clothes type and search by bill number to start assignment.",
                )}
                Icon={AfCurrencyIcon}
              />
            </div>
          </Card>
        ) : (
          <>
            <Card
              title={t("assignment.customerInfo", "Customer & Order Selection")}
            >
              <div className="assign-orders-results">
                <div className="assign-orders-customer-strip">
                  <div className="assign-orders-info-tile">
                    <span>{t("common.customer", "Customer")}</span>
                    <strong>{lookupResult.customer?.firstName || "-"}</strong>
                  </div>
                  <div className="assign-orders-info-tile">
                    <span>{t("orders.billNumber", "Bill Number")}</span>
                    <strong>#{lookupResult.customer?.billNumber || "-"}</strong>
                  </div>
                  <div className="assign-orders-info-tile">
                    <span>{t("assignment.clothesType", "Clothes type")}</span>
                    <strong>{selectedClothesTypeLabel}</strong>
                  </div>
                </div>

                {!matchedOrders.length ? (
                  <div className="assign-orders-empty">
                    <EmptyState
                      message={t(
                        "assignment.noMatchingPendingOrders",
                        "No pending orders found for the selected clothes type.",
                      )}
                    />
                  </div>
                ) : (
                  <div className="assign-orders-records">
                    <div className="assign-orders-records-table-wrap">
                      <table className="assign-orders-records-table">
                        <thead>
                          <tr>
                            <th>{t("common.type", "Type")}</th>
                            <th>{t("common.customer", "Customer")}</th>
                            <th>{t("assignment.quantity", "Quantity")}</th>
                            <th>{t("common.total", "Total")}</th>
                            <th>{t("common.action", "Action")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchedOrders.map((order, idx) => {
                            const orderLabel = getOrderLabelParts(
                              order,
                              language,
                            );
                            const active = selectedOrderId === order.id;
                            const orderName =
                              orderLabel.customName ||
                              order.customer?.firstName ||
                              t("assignment.noOrderName", "No custom name");

                            return (
                              <tr
                                key={order.id}
                                className={
                                  active
                                    ? "assign-orders-record-row--active"
                                    : ""
                                }
                              >
                                <td>
                                  <strong>
                                    {t(
                                      "assignment.orderLabelWithNumber",
                                      "Order #{{number}}",
                                      { number: idx + 1 },
                                    )}
                                  </strong>
                                  <span>{orderLabel.typeWithSequenceLabel}</span>
                                </td>
                                <td>{orderName}</td>
                                <td>{order.quantity || 1}</td>
                                <td>
                                  <span className="assign-orders-money">
                                    <AfCurrencyIcon size={13} />
                                    {formatMoney(order.totalPrice, language)}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className={
                                      active
                                        ? "btn btn-gold btn-sm"
                                        : "btn btn-outline btn-sm"
                                    }
                                    onClick={() => setSelectedOrderId(order.id)}
                                  >
                                    <span>
                                      {active
                                        ? t("assignment.selected", "Selected")
                                        : t("common.select", "Select")}
                                    </span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="assign-orders-record-cards">
                      {matchedOrders.map((order, idx) => {
                        const orderLabel = getOrderLabelParts(order, language);
                        const active = selectedOrderId === order.id;
                        const orderName =
                          orderLabel.customName ||
                          order.customer?.firstName ||
                          t("assignment.noOrderName", "No custom name");

                        return (
                          <button
                            key={order.id}
                            type="button"
                            className={`assign-orders-record-card ${
                              active ? "assign-orders-record-card--active" : ""
                            }`}
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            <div className="assign-orders-record-card__head">
                              <div>
                                <span className="assign-orders-record-kicker">
                                  {t(
                                    "assignment.orderLabelWithNumber",
                                    "Order #{{number}}",
                                    { number: idx + 1 },
                                  )}
                                </span>
                                <strong>
                                  {orderLabel.typeWithSequenceLabel}
                                </strong>
                                <p>{orderName}</p>
                              </div>
                              {active ? (
                                <span className="assign-orders-selected-label">
                                  {t("assignment.selected", "Selected")}
                                </span>
                              ) : null}
                            </div>
                            <div className="assign-orders-record-card__meta">
                              <span>
                                {t("assignment.quantity", "Quantity")}
                                <strong>{order.quantity || 1}</strong>
                              </span>
                              <span>
                                {t("common.total", "Total")}
                                <strong className="assign-orders-money">
                                  <AfCurrencyIcon size={13} />
                                  {formatMoney(order.totalPrice, language)}
                                </strong>
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {selectedOrder && (
              <Card
                title={t(
                  "assignment.selectedOrderSummary",
                  "Selected Order Summary",
                )}
              >
                <div className="assign-orders-assignment-panel">
                  <div className="assign-orders-assignment-grid">
                    <div className="assign-orders-worker-card">
                      <span>{selectedWorkerTypeLabel}</span>
                      <strong>
                        {selectedWorker?.name ||
                          t("assignment.chooseAccount", "Choose account")}
                      </strong>
                      {selectedWorker?.phoneNumber ? (
                        <p>{selectedWorker.phoneNumber}</p>
                      ) : null}
                    </div>

                    <div className="assign-orders-selected-card">
                      <span>{t("common.type", "Type")}</span>
                      <strong>
                        {selectedOrderLabel?.typeWithSequenceLabel}
                      </strong>
                      <p>
                        {selectedOrderLabel?.customName ||
                          selectedOrder.customer?.firstName ||
                          t("assignment.noOrderName", "No custom name")}
                      </p>
                    </div>
                  </div>

                  <div className="assign-orders-assignment-form">
                    <Field
                      label={t("assignment.priceForWorker", "Price for worker")}
                      required
                    >
                      <div className="assign-orders-money-field">
                        <span className="assign-orders-money-field__icon">
                          <AfCurrencyIcon size={13} />
                        </span>
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
                      </div>
                    </Field>

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

                    <div className="assign-orders-submit-wrap">
                      <button
                        type="button"
                        className="btn btn-gold"
                        onClick={() => assignMutation.mutate()}
                        disabled={
                          assignMutation.isPending || !workerType || !workerId
                        }
                      >
                        {assignMutation.isPending ? (
                          t("common.loading", "Loading...")
                        ) : (
                          <>
                            <LuSend size={14} />
                            <span>{t("assignment.send", "Send")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
