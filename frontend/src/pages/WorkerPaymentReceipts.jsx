import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { LuClock3, LuLock, LuPencil, LuRefreshCcw, LuSearch } from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { parseNumberLocale } from "../lib/normalize.js";
import { formatCurrency } from "../lib/currency.js";
import { formatDateLocale, isRtlLanguage } from "../lib/locale.js";
import { useMonth } from "../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../lib/months.js";
import {
  Badge,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Pagination,
  Spinner,
  StatCard,
} from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import MobileFilterPanel from "../components/ui/MobileFilterPanel.jsx";

const LIMIT = 15;

function formatReceiptEditRemaining(ms, t) {
  const totalMs = Math.max(0, Number(ms || 0));
  if (!Number.isFinite(totalMs) || totalMs <= 0) {
    return t("workerReceipts.locked", "Locked");
  }

  const totalMinutes = Math.ceil(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return t("workerReceipts.remainingHoursMinutes", "{{hours}}h {{minutes}}m left", {
      hours,
      minutes,
    });
  }
  if (hours > 0) {
    return t("workerReceipts.remainingHours", "{{hours}}h left", { hours });
  }
  return t("workerReceipts.remainingMinutes", "{{minutes}}m left", {
    minutes: Math.max(1, minutes),
  });
}

function orderTypeLabel(type, t) {
  if (!type) return "-";
  if (type === "OUTFIT") return t("orderTypes.outfit", "Outfit");
  if (type === "WASKAT") return t("orderTypes.waskat", "Waskat");
  if (type === "KORTY") return t("orderTypes.korty", "Korty");
  if (type === "YAKHANQAQ") return t("orderTypes.yakhanqaq", "Yakhanqaq");
  return type;
}

function roleLabel(role, t) {
  if (role === "QICHIKAR")
    return t("completedWorkerOrders.qichikarRole", "Qichikar");
  if (role === "DOKHT") return t("completedWorkerOrders.dokhtRole", "Dokht");
  return t("common.worker", "Worker");
}

export default function WorkerPaymentReceipts() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isRtlLanguage(language);
  const { viewMonth, viewYear } = useMonth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [workerRole, setWorkerRole] = useState("");
  const [status, setStatus] = useState("RECEIVED");
  const [page, setPage] = useState(1);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [editReceiptAmount, setEditReceiptAmount] = useState("");

  const params = useMemo(() => {
    const next = {
      page,
      limit: LIMIT,
      month: viewMonth,
      year: viewYear,
    };
    if (search.trim()) next.search = search.trim();
    if (workerId) next.workerId = workerId;
    if (workerRole) next.workerRole = workerRole;
    if (status !== "ALL") next.status = status;
    return next;
  }, [page, search, status, viewMonth, viewYear, workerId, workerRole]);

  const { data: workerOptions = [], isLoading: isWorkersLoading } = useQuery({
    queryKey: ["assignable-workers"],
    queryFn: () => api.get("/users/assignable").then((r) => r.data),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["worker-payment-receipts", params],
    queryFn: () =>
      api.get("/orders/completed/receipts", { params }).then((r) => r.data),
    keepPreviousData: true,
  });

  const updateReceiptMut = useMutation({
    mutationFn: ({ receiptId, paidAmount }) =>
      api
        .patch(`/orders/completed/receipts/${receiptId}`, { paidAmount })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["worker-payment-receipts"] });
      qc.invalidateQueries({ queryKey: ["completed-worker-orders"] });
      qc.invalidateQueries({ queryKey: ["worker-panel-transaction-summary"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["analytics-dashboard"] });
      setEditingReceipt(null);
      setEditReceiptAmount("");
      toast.success(
        t("workerReceipts.receiptUpdated", "Receipt amount updated."),
      );
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          t("workerReceipts.receiptUpdateFailed", "Unable to update receipt."),
        ),
      );
    },
  });

  const rows = data?.data || [];
  const total = Number(data?.total || 0);
  const stats = data?.stats || {
    totalReceipts: 0,
    totalPaidAmount: 0,
  };
  const activeFilterCount = [
    Boolean(search.trim()),
    Boolean(workerId),
    Boolean(workerRole),
    status !== "RECEIVED",
  ].filter(Boolean).length;

  const onSearch = (e) => {
    e?.preventDefault?.();
    setPage(1);
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setWorkerId("");
    setWorkerRole("");
    setStatus("RECEIVED");
    setPage(1);
  };

  const openReceiptEditor = (row) => {
    if (!row?.canEditReceipt) {
      toast.error(
        t(
          "workerReceipts.receiptLockedMessage",
          "The 24-hour receipt edit window has expired. This receipt is permanently locked.",
        ),
      );
      return;
    }
    setEditingReceipt(row);
    setEditReceiptAmount(String(row.paidAmount ?? ""));
  };

  const submitReceiptUpdate = () => {
    const parsedAmount = parseNumberLocale(String(editReceiptAmount ?? ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error(
        t(
          "workerReceipts.invalidReceiptAmount",
          "Receipt amount must be a valid positive number.",
        ),
      );
      return;
    }
    updateReceiptMut.mutate({
      receiptId: editingReceipt.id,
      paidAmount: parsedAmount,
    });
  };

  return (
    <div
      className="page report-root professional-report-page worker-payment-receipts-page"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <PageHeader
        title={t("workerReceipts.title", "Worker Payment Receipt History")}
        subtitle={t(
          "workerReceipts.subtitle",
          "Track all worker payment receipts with monthly, role, and worker filters.",
        )}
      />

      <section
        className="worker-receipts-stats-grid"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <StatCard
          label={t("workerReceipts.totalReceipts", "Total Receipts")}
          value={stats.totalReceipts}
          Icon={AfCurrencyIcon}
          accent="#0F766E"
        />
        <StatCard
          label={t("workerReceipts.totalAmount", "Total Amount")}
          value={formatCurrency(stats.totalPaidAmount || 0, "en")}
          Icon={AfCurrencyIcon}
          accent="#2563EB"
        />
      </section>

      <MobileFilterPanel
        activeCount={activeFilterCount}
        className="worker-receipts-filter-panel"
        clearDisabled={activeFilterCount === 0}
        isApplying={isFetching}
        onApply={onSearch}
        onClear={resetFilters}
        title={t("common.filters", "Filters")}
      >
        <Card>
          <form
            onSubmit={onSearch}
            className="worker-receipts-filter-form"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
          <div className="worker-receipts-field">
            <label className="lbl">{t("common.search", "Search")}</label>
            <div className="worker-receipts-search-wrap">
              <LuSearch
                className="worker-receipts-search-icon"
                size={14}
                style={{
                  position: "absolute",
                  insetInlineStart: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                className="inp worker-receipts-search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t(
                  "workerReceipts.searchPlaceholder",
                  "Search by bill, worker, admin, customer",
                )}
                style={{ paddingInlineStart: 32 }}
              />
            </div>
          </div>

          <div className="worker-receipts-field">
            <label className="lbl">
              {t("workerReceipts.worker", "Worker")}
            </label>
            <select
              className="inp"
              value={workerId}
              onChange={(e) => {
                setWorkerId(e.target.value);
                setPage(1);
              }}
              disabled={isWorkersLoading}
            >
              <option value="">
                {t("workerReceipts.allWorkers", "All workers")}
              </option>
              {workerOptions
                .filter(
                  (worker) =>
                    worker.accountType === "QICHIKAR" ||
                    worker.accountType === "DOKHT",
                )
                .map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="worker-receipts-field">
            <label className="lbl">
              {t("workerReceipts.workerRole", "Worker Role")}
            </label>
            <select
              className="inp"
              value={workerRole}
              onChange={(e) => {
                setWorkerRole(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("common.all", "All")}</option>
              <option value="QICHIKAR">
                {t("completedWorkerOrders.qichikarRole", "Qichikar")}
              </option>
              <option value="DOKHT">
                {t("completedWorkerOrders.dokhtRole", "Dokht")}
              </option>
            </select>
          </div>

          <div className="worker-receipts-field">
            <label className="lbl">{t("common.status", "Status")}</label>
            <select
              className="inp"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">{t("common.all", "All")}</option>
              <option value="RECEIVED">
                {t("workerReceipts.received", "Received")}
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-outline worker-receipts-filter-btn"
            style={{ minWidth: 110, height: 40, fontWeight: 600, gap: 8 }}
          >
            <LuSearch size={14} />
            {t("common.search", "Search")}
          </button>

          <button
            type="button"
            className="btn btn-outline worker-receipts-filter-btn"
            onClick={resetFilters}
          >
            <LuRefreshCcw size={14} />
            {t("completedWorkerOrders.clearFilters", "Clear Filters")}
          </button>
          </form>

          <div
            className="worker-receipts-month-chip"
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              color: "var(--text3)",
              fontSize: 12,
            }}
          >
            <span>
              {t("common.viewingMonth", "Viewing data for")}:{" "}
              <b>{formatMonthYearLabel(viewMonth, viewYear, language)}</b>
            </span>
          </div>
        </Card>
      </MobileFilterPanel>

      <div
        className="worker-payment-receipts-table-section"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <Card
          title={t("workerReceipts.tableTitle", "Receipt Orders")}
          action={
            isFetching ? (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                {t("common.loading", "Loading...")}
              </span>
            ) : null
          }
        >
          {isLoading ? (
            <Spinner />
          ) : rows.length === 0 ? (
            <EmptyState
              Icon={AfCurrencyIcon}
              message={t("workerReceipts.empty", "No receipt records found.")}
            />
          ) : (
            <div className="tbl-wrap professional-report-table-wrap order-scroll-x worker-receipts-table-wrap">
              <table className="tbl professional-report-table worker-receipts-table">
                <thead>
                  <tr>
                    <th className="worker-receipts-cell--number">
                      {t("orders.billNumber", "Bill Number")}
                    </th>
                    <th>
                      {t("completedWorkerOrders.workerName", "Worker Name")}
                    </th>
                    <th>
                      {t("completedWorkerOrders.workerRole", "Worker Role")}
                    </th>
                    <th>{t("workerPanel.orderType", "Order Type")}</th>
                    <th className="worker-receipts-cell--amount">
                      {t("workerReceipts.paidAmount", "Paid Amount")}
                    </th>
                    <th className="worker-receipts-cell--date">
                      {t("workerReceipts.receiptDate", "Receipt Date")}
                    </th>
                    <th>{t("workerReceipts.editWindow", "Edit Window")}</th>
                    <th>{t("workerReceipts.adminName", "Admin Name")}</th>
                    <th>{t("common.status", "Status")}</th>
                    <th>{t("common.actions", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="worker-receipts-cell--number">
                        #{row.order?.customer?.billNumber || "-"}
                      </td>
                      <td>{row.worker?.name || "-"}</td>
                      <td>{roleLabel(row.workerRole, t)}</td>
                      <td>{orderTypeLabel(row.order?.type, t)}</td>
                      <td className="worker-receipts-cell--amount">
                        {formatCurrency(row.paidAmount || 0, "en")}
                      </td>
                      <td className="worker-receipts-cell--date">
                        {formatDateLocale(row.receiptDate, language)}
                      </td>
                      <td>
                        <div
                          style={{
                            display: "grid",
                            gap: 4,
                            minWidth: 150,
                          }}
                        >
                          {row.canEditReceipt ? (
                            <Badge v="amber">
                              <LuClock3 size={13} />
                              {formatReceiptEditRemaining(
                                row.receiptEditRemainingMs,
                                t,
                              )}
                            </Badge>
                          ) : (
                            <Badge v="gray">
                              <LuLock size={13} />
                              {t("workerReceipts.locked", "Locked")}
                            </Badge>
                          )}
                          <span
                            style={{
                              color: "var(--text3)",
                              fontSize: 11,
                              lineHeight: 1.4,
                            }}
                          >
                            {row.canEditReceipt
                              ? t(
                                  "workerReceipts.editableUntil",
                                  "Editable until {{time}}",
                                  {
                                    time: row.receiptEditExpiresAt
                                      ? formatDateLocale(
                                          row.receiptEditExpiresAt,
                                          language,
                                        )
                                      : "-",
                                  },
                                )
                              : t(
                                  "workerReceipts.lockedPermanent",
                                  "Permanently locked",
                                )}
                          </span>
                        </div>
                      </td>
                      <td>{row.receivedByAdmin?.name || "-"}</td>
                      <td>
                        <Badge v="green">
                          {t("workerReceipts.received", "Received")}
                        </Badge>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => openReceiptEditor(row)}
                          disabled={!row.canEditReceipt}
                        >
                          {row.canEditReceipt ? (
                            <LuPencil size={14} />
                          ) : (
                            <LuLock size={14} />
                          )}
                          {row.canEditReceipt
                            ? t("common.edit", "Edit")
                            : t("workerReceipts.locked", "Locked")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            total={total}
            limit={LIMIT}
            onChange={(nextPage) => setPage(nextPage)}
          />
        </Card>
      </div>

      <Modal
        open={!!editingReceipt}
        onClose={() => {
          if (updateReceiptMut.isPending) return;
          setEditingReceipt(null);
          setEditReceiptAmount("");
        }}
        title={t("workerReceipts.editReceiptTitle", "Edit Receipt Amount")}
        maxW={500}
        dir={isRtl ? "rtl" : "ltr"}
      >
        {editingReceipt ? (
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ margin: 0, color: "var(--text2)", fontSize: 13 }}>
              {t(
                "workerReceipts.editReceiptMessage",
                "This receipt amount can be corrected for 24 hours from the receipt time. After that, it will be permanently locked.",
              )}
            </p>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface2)",
                padding: 12,
                display: "grid",
                gap: 7,
                fontSize: 13,
              }}
            >
              <div>
                <b>{t("orders.billNumber", "Bill Number")}:</b> #
                {editingReceipt.order?.customer?.billNumber || "-"}
              </div>
              <div>
                <b>{t("completedWorkerOrders.workerName", "Worker Name")}:</b>{" "}
                {editingReceipt.worker?.name || "-"}
              </div>
              <div>
                <b>{t("completedWorkerOrders.workerRole", "Worker Role")}:</b>{" "}
                {roleLabel(editingReceipt.workerRole, t)}
              </div>
              <div>
                <b>{t("workerReceipts.currentAmount", "Current Amount")}:</b>{" "}
                {formatCurrency(editingReceipt.paidAmount || 0, "en")}
              </div>
              <div>
                <b>{t("workerReceipts.editWindow", "Edit Window")}:</b>{" "}
                {formatReceiptEditRemaining(
                  editingReceipt.receiptEditRemainingMs,
                  t,
                )}
              </div>
            </div>

            <label className="worker-receipts-field">
              <span className="lbl">
                {t("workerReceipts.newReceiptAmount", "New Receipt Amount")}
              </span>
              <input
                className="inp"
                value={editReceiptAmount}
                onChange={(e) => setEditReceiptAmount(e.target.value)}
                inputMode="decimal"
                autoFocus
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: isRtl ? "flex-start" : "flex-end",
                gap: 8,
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setEditingReceipt(null);
                  setEditReceiptAmount("");
                }}
                disabled={updateReceiptMut.isPending}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className="btn btn-gold"
                onClick={submitReceiptUpdate}
                disabled={updateReceiptMut.isPending}
              >
                {updateReceiptMut.isPending
                  ? t("common.saving", "Saving...")
                  : t("common.save", "Save")}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <style>{`
        .worker-payment-receipts-page {
          direction: ltr;
          text-align: start;
        }
        .worker-payment-receipts-page[dir="rtl"] {
          direction: rtl !important;
          text-align: right;
          font-family: var(--font-rtl);
        }
        .worker-payment-receipts-page[dir="rtl"] .page-hd,
        .worker-payment-receipts-page[dir="rtl"] .page-hd > div:first-child {
          direction: rtl;
          text-align: right;
        }
        .worker-payment-receipts-page[dir="rtl"] .page-hd {
          flex-direction: row !important;
          justify-content: flex-start;
        }
        .worker-payment-receipts-page[dir="rtl"] .page-hd h1,
        .worker-payment-receipts-page[dir="rtl"] .page-hd p,
        .worker-payment-receipts-page[dir="rtl"] .stat-card__label {
          letter-spacing: 0 !important;
          text-transform: none !important;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-stats-grid,
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-filter-panel,
        .worker-payment-receipts-page[dir="rtl"] .worker-payment-receipts-table-section {
          direction: rtl !important;
        }
        .worker-payment-receipts-page[dir="rtl"] .stat-card__shell {
          direction: rtl;
          flex-direction: row;
        }
        .worker-payment-receipts-page[dir="rtl"] .stat-card__copy,
        .worker-payment-receipts-page[dir="rtl"] .stat-card__label,
        .worker-payment-receipts-page[dir="rtl"] .stat-card__value,
        .worker-payment-receipts-page[dir="rtl"] .stat-card__sub {
          text-align: right !important;
        }
        .worker-payment-receipts-page[dir="rtl"] .stat-card__value {
          letter-spacing: 0 !important;
        }
        .worker-receipts-filter-panel .card {
          overflow: hidden;
        }
        .worker-receipts-filter-form {
          direction: inherit;
        }
        .worker-receipts-field,
        .worker-receipts-field .lbl {
          direction: inherit;
          text-align: start;
        }
        .worker-receipts-search-wrap {
          position: relative;
          direction: inherit;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-search-icon {
          inset-inline-start: auto !important;
          inset-inline-end: 10px !important;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-search-input {
          padding-inline-start: 12px !important;
          padding-inline-end: 32px !important;
          direction: rtl;
          text-align: right;
        }
        .worker-payment-receipts-page[dir="ltr"] .worker-receipts-search-input {
          direction: ltr;
          text-align: left;
        }
        .worker-payment-receipts-page[dir="rtl"] select.inp,
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-field .inp {
          direction: rtl;
          text-align: right;
        }
        .worker-receipts-filter-btn {
          justify-self: stretch;
          width: 100%;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-filter-btn,
        .worker-payment-receipts-page[dir="rtl"] .mobile-filter-panel__toggle,
        .worker-payment-receipts-page[dir="rtl"] .mobile-filter-panel__actions .btn {
          direction: rtl;
        }
        .worker-receipts-month-chip {
          direction: inherit;
          justify-content: flex-start;
          text-align: start;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-month-chip {
          text-align: right;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-payment-receipts-table-section .card-hd {
          direction: rtl;
          flex-direction: row !important;
          justify-content: space-between;
          text-align: right;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-payment-receipts-table-section .card-hd h3 {
          text-align: right;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-payment-receipts-table-section .card-body,
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-table-wrap,
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-table {
          direction: rtl !important;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-table th,
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-table td {
          text-align: right !important;
        }
        .worker-receipts-cell--number,
        .worker-receipts-cell--amount,
        .worker-receipts-cell--date {
          unicode-bidi: plaintext;
        }
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-cell--number,
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-cell--amount,
        .worker-payment-receipts-page[dir="rtl"] .worker-receipts-cell--date {
          direction: ltr;
          text-align: right !important;
        }
        .worker-payment-receipts-page[dir="rtl"] .badge {
          direction: rtl;
        }
        .worker-payment-receipts-page[dir="rtl"] .card-body > div:last-child {
          direction: rtl;
        }
        .worker-payment-receipts-page[dir="rtl"] .card-body > div:last-child .btn {
          direction: rtl;
        }

        @media (max-width: 767px) {
          .worker-payment-receipts-page[dir="rtl"] .page-hd {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .worker-receipts-filter-form {
            grid-template-columns: 1fr !important;
          }
          .worker-receipts-filter-btn {
            min-width: 0 !important;
          }
          .worker-receipts-month-chip {
            align-items: flex-start !important;
          }
        }

        @media (max-width: 520px) {
          .worker-payment-receipts-page .worker-receipts-stats-grid {
            grid-template-columns: 1fr !important;
          }
          .worker-payment-receipts-page .stat-card {
            min-height: 112px !important;
          }
          .worker-payment-receipts-page .mobile-filter-panel__toggle,
          .worker-payment-receipts-page .mobile-filter-panel__actions .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
