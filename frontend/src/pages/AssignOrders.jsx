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
import { getOrderGrossTotal } from "../lib/orderFinancials.js";
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
import "./AssignOrders.css";

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

function getRoleAssignment(order, workerType) {
  if (workerType === "QICHIKAR") {
    return order?.qichikarAssignedTo || null;
  }
  if (workerType === "DOKHT") {
    return order?.dokhtAssignedTo || null;
  }
  return null;
}

function formatOrderDate(value, language) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(language || "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
  const [searchFieldErrors, setSearchFieldErrors] = useState({ clothesType: "", billNumber: "" });
  const [assignPriceError, setAssignPriceError] = useState("");

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
    const errors = { clothesType: "", billNumber: "" };

    if (!clothesType) errors.clothesType = t("assignment.selectClothesTypeFirst", "Select clothes type first.");
    if (!Number.isFinite(parsedBill) || parsedBill <= 0) errors.billNumber = t("assignment.invalidBillNumber", "Enter a valid bill number.");

    if (errors.clothesType || errors.billNumber) {
      setSearchFieldErrors(errors);
      return;
    }
    setSearchFieldErrors({ clothesType: "", billNumber: "" });
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
                error={searchFieldErrors.clothesType}
              >
                <select
                  className="inp"
                  value={clothesType}
                  onChange={(e) => {
                    setClothesType(e.target.value);
                    if (searchFieldErrors.clothesType) setSearchFieldErrors((prev) => ({ ...prev, clothesType: "" }));
                  }}
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

              <Field
                label={t("orders.billNumber", "Bill Number")}
                required
                error={searchFieldErrors.billNumber}
              >
                <div className="assign-orders-search-control">
                  <input
                    className={`inp${searchFieldErrors.billNumber ? " inp-err" : ""}`}
                    value={billNumber}
                    onChange={(e) => {
                      setBillNumber(e.target.value);
                      if (searchFieldErrors.billNumber) setSearchFieldErrors((prev) => ({ ...prev, billNumber: "" }));
                    }}
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

          <div className="assign-orders-unified-body">
            {loadingResult ? (
              <div className="ao-card">
                <div className="ao-loading">
                  <Spinner />
                  <p>{t("common.loading", "Loading...")}</p>
                </div>
              </div>
            ) : !lookupResult ? (
              <div className="ao-card">
                <EmptyState
                  message={t(
                    "assignment.searchResultHint",
                    "Select clothes type and search by bill number to start assignment.",
                  )}
                  Icon={AfCurrencyIcon}
                />
              </div>
            ) : (
              <div className="ao-card">
                <div className="ao-card-head">
                  <div className="ao-head-left">
                    <span className="ao-head-label">
                      {t("common.customer", "Customer")}
                    </span>
                    <strong className="ao-head-name">
                      {lookupResult.customer?.firstName || "-"}
                    </strong>
                  </div>
                  <div className="ao-head-right">
                    <span className="ao-pill ao-pill--neutral">
                      {t("orders.billNumber", "Bill")} #{lookupResult.customer?.billNumber || "-"}
                    </span>
                    <span className="ao-pill ao-pill--info">
                      {selectedClothesTypeLabel}
                    </span>
                  </div>
                </div>

                {!matchedOrders.length ? (
                  <div className="ao-empty">
                    <EmptyState
                      message={t(
                        "assignment.noMatchingPendingOrders",
                        "No pending orders found for the selected clothes type.",
                      )}
                    />
                  </div>
                ) : (
                  <div className="ao-table-wrap">
                    <table className="ao-table">
                      <thead>
                        <tr>
                          <th className="ao-th-num">#</th>
                          <th className="ao-th-customer">{t("common.customer", "Customer")}</th>
                          <th className="ao-th-type">{t("assignment.clothesType", "Type")}</th>
                          <th className="ao-th-qty">{t("assignment.quantity", "Qty")}</th>
                          <th className="ao-th-amount">{t("common.amount", "Amount")}</th>
                          <th className="ao-th-status">{t("assignment.status", "Status")}</th>
                          <th className="ao-th-action">{t("assignment.actions", "Actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchedOrders.map((order, idx) => {
                          const orderLabel = getOrderLabelParts(order, language);
                          const active = selectedOrderId === order.id;
                          const orderName =
                            orderLabel.customName ||
                            order.customer?.firstName ||
                            t("assignment.noOrderName", "No name");

                          return (
                            <tr
                              key={order.id}
                              className={active ? "ao-row--active" : ""}
                            >
                              <td className="ao-td-num">{idx + 1}</td>
                              <td className="ao-td-customer">
                                <span className="ao-customer-name">
                                  {order.customer?.firstName ||
                                    lookupResult.customer?.firstName ||
                                    "-"}
                                </span>
                                {orderName !==
                                  (order.customer?.firstName ||
                                    lookupResult.customer?.firstName) && (
                                  <span className="ao-customer-sub">{orderName}</span>
                                )}
                              </td>
                              <td className="ao-td-type">
                                <span className="ao-type-label">{orderLabel.typeWithSequenceLabel}</span>
                              </td>
                              <td className="ao-td-qty">{order.quantity || 1}</td>
                              <td className="ao-td-amount">
                                <AfCurrencyIcon size={12} />
                                <span>{formatMoney(getOrderGrossTotal(order), language)}</span>
                              </td>
                              <td className="ao-td-status">
                                {active ? (
                                  <span className="ao-badge ao-badge--selected">
                                    <span className="ao-badge-dot" />
                                    {t("assignment.selected", "Selected")}
                                  </span>
                                ) : (
                                  <span className="ao-badge ao-badge--ready">
                                    {t("assignment.readyToAssign", "Ready")}
                                  </span>
                                )}
                              </td>
                              <td className="ao-td-action">
                                <button
                                  type="button"
                                  className={active ? "ao-btn ao-btn--active" : "ao-btn ao-btn--outline"}
                                  onClick={() => setSelectedOrderId(order.id)}
                                >
                                  {active
                                    ? t("assignment.selected", "Selected")
                                    : t("common.select", "Select")}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedOrder && (
                  <div className="ao-assign">
                    <div className="ao-assign-sep" />
                    <div className="ao-assign-head">
                      <h4 className="ao-assign-title">
                        {t("assignment.send", "Assign Order")}
                      </h4>
                    </div>
                    <div className="ao-assign-body">
                      <div className="ao-assign-cards">
                        <div className="ao-assign-card">
                          <span className="ao-assign-card-label">{selectedWorkerTypeLabel}</span>
                          <strong className="ao-assign-card-value">
                            {selectedWorker?.name ||
                              t("assignment.chooseAccount", "Choose account")}
                          </strong>
                          {selectedWorker?.phoneNumber && (
                            <p className="ao-assign-card-sub">{selectedWorker.phoneNumber}</p>
                          )}
                        </div>
                        <div className="ao-assign-card">
                          <span className="ao-assign-card-label">{t("common.type", "Type")}</span>
                          <strong className="ao-assign-card-value">
                            {selectedOrderLabel?.typeWithSequenceLabel}
                          </strong>
                          <p className="ao-assign-card-sub">
                            {selectedOrderLabel?.customName ||
                              selectedOrder.customer?.firstName ||
                              t("assignment.noOrderName", "No name")}
                          </p>
                        </div>
                      </div>
                      <div className="ao-assign-fields">
                        <div className="ao-field">
                          <label className="ao-field-label">
                            {t("assignment.priceForWorker", "Price")}
                            <span className="ao-required">*</span>
                          </label>
                          <div className="ao-money-input">
                            <AfCurrencyIcon size={13} />
                            <input
                              className={`inp${assignPriceError ? " inp-err" : ""}`}
                              value={assignmentPrice}
                              onChange={(e) => {
                                setAssignmentPrice(e.target.value);
                                if (assignPriceError) setAssignPriceError("");
                              }}
                              placeholder={t("assignment.pricePlaceholder", "Enter price")}
                              inputMode="decimal"
                            />
                          </div>
                          {assignPriceError && (
                            <p className="err-msg" role="alert" aria-live="polite">
                              {assignPriceError}
                            </p>
                          )}
                        </div>
                        <div className="ao-field">
                          <label className="ao-field-label">
                            {t("assignment.note", "Note")}
                          </label>
                          <textarea
                            className="inp"
                            rows={2}
                            value={assignmentNote}
                            onChange={(e) => setAssignmentNote(e.target.value)}
                            placeholder={t("assignment.notePlaceholder", "Optional note")}
                            style={{ resize: "vertical" }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="ao-assign-footer">
                      <button
                        type="button"
                        className="btn btn-gold"
                        onClick={() => {
                          const parsedPrice = parseNumberLocale(assignmentPrice);
                          if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
                            setAssignPriceError(t("assignment.invalidPrice", "Price must be a valid non-negative number."));
                            return;
                          }
                          setAssignPriceError("");
                          assignMutation.mutate();
                        }}
                        disabled={assignMutation.isPending || !workerType || !workerId}
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
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
