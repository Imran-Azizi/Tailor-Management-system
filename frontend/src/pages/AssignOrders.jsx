import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuSearch, LuUserCheck } from "react-icons/lu";
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
    <div className="page mx-auto max-w-[1240px] px-4 pb-14 pt-5">
      <PageHeader
        title={t("assignment.assignOrder", "Assign Order")}
        subtitle={t(
          "assignment.assignPageSubtitle",
          "Assign pending orders to Dokht or Qichikar with a focused, fast workflow.",
        )}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <Card noPad>
          <div className="border-b border-slate-200 bg-gradient-to-br from-sky-50 via-cyan-50 to-white px-5 py-4 dark:border-slate-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
            <h3 className="m-0 text-base font-extrabold text-slate-900 dark:text-slate-100">
              {t("assignment.assignmentSetup", "Assignment Setup")}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {t(
                "assignment.setupHint",
                "Pick clothes type, account type, user account, then search by bill number.",
              )}
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                <div className="flex gap-2">
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
                    style={{ whiteSpace: "nowrap" }}
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
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <Card title={t("assignment.searchResult", "Search Result")} noPad>
              <EmptyState
                message={t(
                  "assignment.searchResultHint",
                  "Select clothes type and search by bill number to start assignment.",
                )}
                Icon={AfCurrencyIcon}
              />
            </Card>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <Card
              title={t("assignment.customerInfo", "Customer & Order Selection")}
            >
              <div className="mb-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {t("common.customer", "Customer")}
                  </p>
                  <p className="font-extrabold text-slate-900 dark:text-slate-100">
                    {lookupResult.customer?.firstName || "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="mb-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {t("orders.billNumber", "Bill Number")}
                  </p>
                  <p className="font-extrabold text-slate-900 dark:text-slate-100">
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
                <div className="grid gap-2.5">
                  {matchedOrders.map((order, idx) => {
                    const orderLabel = getOrderLabelParts(order, language);
                    const active = selectedOrderId === order.id;
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`w-full cursor-pointer rounded-xl border px-3.5 py-3 text-left transition ${
                          active
                            ? "border-sky-500 bg-gradient-to-br from-sky-50 to-cyan-50 shadow-sm dark:border-sky-400 dark:from-slate-800 dark:to-slate-800"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                              {t(
                                "assignment.orderLabelWithNumber",
                                "Order #{{number}}",
                                {
                                  number: idx + 1,
                                },
                              )}{" "}
                              - {orderLabel.typeWithSequenceLabel}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {orderLabel.customName ||
                                t("assignment.noOrderName", "No custom name")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {t("assignment.quantity", "Quantity")}
                            </p>
                            <p className="mt-0.5 text-[13px] font-bold text-slate-700 dark:text-slate-200">
                              {order.quantity || 1}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {t("common.total", "Total")}
                            </p>
                            <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                              <AfCurrencyIcon size={13} />
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
                <div className="grid grid-cols-1 gap-4">
                  <Field
                    label={t("assignment.priceForWorker", "Price for worker")}
                    required
                    hint={t(
                      "assignment.priceForWorkerHint",
                      "Enter the sewing or cutting price before sending this order.",
                    )}
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-slate-500 dark:text-slate-300">
                        <AfCurrencyIcon size={13} />
                      </span>
                      <input
                        className="inp pl-9"
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

                  <div className="mt-3">
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

                  <div className="mt-1">
                    <button
                      type="button"
                      className="btn btn-gold"
                      onClick={() => assignMutation.mutate()}
                      disabled={
                        assignMutation.isPending || !workerType || !workerId
                      }
                      style={{ minWidth: 170, justifyContent: "center" }}
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
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
