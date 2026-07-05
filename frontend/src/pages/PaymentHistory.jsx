import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import toast from "react-hot-toast";
import {
  LuArrowUpDown,
  LuCalendarDays,
  LuDownload,
  LuFilter,
  LuHistory,
  LuRefreshCcw,
  LuSearch,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatReportMoney } from "../lib/currency.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { formatSystemDateTime, isRtlLanguage } from "../lib/locale.js";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
} from "../components/ui/index.jsx";
import {
  ReportKpiGrid,
  ReportMonthBanner,
} from "../components/reports/ReportKit.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import MobileFilterPanel from "../components/ui/MobileFilterPanel.jsx";
import "./PaymentHistory.css";

const PAGE_SIZE = 20;

function formatMoney(value, language = "en") {
  return formatReportMoney(value, language);
}

function formatDateTime(value, language) {
  if (!value) return "-";
  return formatSystemDateTime(value, language);
}

function formatDateValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getPaymentStatus(entry, t) {
  const remaining = Number(entry?.remainingAfter || 0);
  const paid = Number(entry?.totalPaidAfter || 0);

  if (remaining <= 0) {
    return {
      value: "PAID",
      label: t("rakht.statusPaid", { defaultValue: "Paid" }),
      variant: "green",
    };
  }
  if (paid > 0) {
    return {
      value: "PARTIAL",
      label: t("rakht.statusPartial", { defaultValue: "Partial" }),
      variant: "amber",
    };
  }
  return {
    value: "REMAINING",
    label: t("rakht.statusRemaining", { defaultValue: "Remaining" }),
    variant: "red",
  };
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function PaymentHistory() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = isRtlLanguage(language);
  const isTableRtl = isRtl;
  const { isAdmin } = useAuth();
  const { viewMonth, viewYear } = useMonth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("paidAt");

  useEffect(() => {
    setPage(1);
  }, [viewMonth, viewYear]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [exporting, setExporting] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const statusOptions = useMemo(
    () => [
      {
        value: "PAID",
        label: t("rakht.statusPaid", { defaultValue: "Paid" }),
      },
      {
        value: "PARTIAL",
        label: t("rakht.statusPartial", { defaultValue: "Partial" }),
      },
      {
        value: "REMAINING",
        label: t("rakht.statusRemaining", { defaultValue: "Remaining" }),
      },
    ],
    [t],
  );

  const queryParams = {
    page,
    limit: PAGE_SIZE,
    search: deferredSearch || undefined,
    companyName: companyFilter?.value || undefined,
    status: statusFilter?.value || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    month: isAdmin ? viewMonth : undefined,
    year: isAdmin ? viewYear : undefined,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "rakht-payment-history-page",
      page,
      deferredSearch,
      companyFilter?.value || "",
      statusFilter?.value || "",
      fromDate,
      toDate,
      isAdmin ? viewMonth : null,
      isAdmin ? viewYear : null,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      api
        .get("/rakhts/payment-history", { params: queryParams })
        .then((res) => res.data),
  });

  const { data: rakhtRows = [] } = useQuery({
    queryKey: ["rakht-list-company-options"],
    queryFn: () => api.get("/rakhts").then((res) => res.data),
  });

  const companyOptions = useMemo(() => {
    const uniqueCompanies = [
      ...new Set(rakhtRows.map((row) => row.companyName).filter(Boolean)),
    ];
    return uniqueCompanies
      .sort((a, b) => a.localeCompare(b))
      .map((companyName) => ({ value: companyName, label: companyName }));
  }, [rakhtRows]);

  const rows = Array.isArray(data?.data) ? data.data : [];
  const total = Number(data?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const summary = data?.summary || { totalPaid: 0, totalRemaining: 0 };
  const activeFilterCount = [
    Boolean(deferredSearch),
    Boolean(companyFilter?.value),
    Boolean(statusFilter?.value),
    Boolean(fromDate),
    Boolean(toDate),
  ].filter(Boolean).length;
  const hasFilterState =
    activeFilterCount > 0 || sortBy !== "paidAt" || sortOrder !== "desc";

  const clearFilters = () => {
    setSearch("");
    setCompanyFilter(null);
    setStatusFilter(null);
    setFromDate("");
    setToDate("");
    setSortBy("paidAt");
    setSortOrder("desc");
    setPage(1);
  };

  const handleSort = (field) => {
    setPage(1);
    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortOrder(field === "companyName" ? "asc" : "desc");
  };

  const handleExportPdf = async () => {
    try {
      setExporting("pdf");
      const response = await api.get("/rakhts/payment-history/pdf", {
        params: {
          ...queryParams,
          lang: language,
          _ts: Date.now(),
        },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `payment-history-${formatDateValue(new Date()) || "export"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("rakht.exportPdfFailed", { defaultValue: "Failed to export PDF." }),
        ),
      );
    } finally {
      setExporting("");
    }
  };

  const paymentHistoryColumnOrder = [
    "companyName",
    "totalPrice",
    "paidAmount",
    "remainingAmount",
    "status",
    "paidAt",
    "user",
  ];
  const numericColumns = new Set(["totalPrice", "paidAmount", "remainingAmount"]);

  const paymentHistoryHeaders = {
    companyName: (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ padding: 0, fontWeight: 700 }}
        onClick={() => handleSort("companyName")}
      >
        {t("rakht.companyName", { defaultValue: "Company Name" })}
        <LuArrowUpDown size={13} />
      </button>
    ),
    totalPrice: (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ padding: 0, fontWeight: 700 }}
        onClick={() => handleSort("totalPriceBefore")}
      >
        {t("rakht.totalPrice", { defaultValue: "Total Price" })}
        <LuArrowUpDown size={13} />
      </button>
    ),
    paidAmount: (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ padding: 0, fontWeight: 700 }}
        onClick={() => handleSort("paidAmount")}
      >
        {t("rakht.paidAmount", { defaultValue: "Paid Amount" })}
        <LuArrowUpDown size={13} />
      </button>
    ),
    remainingAmount: (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ padding: 0, fontWeight: 700 }}
        onClick={() => handleSort("remainingAfter")}
      >
        {t("rakht.remainingMoney", {
          defaultValue: "Remaining Amount",
        })}
        <LuArrowUpDown size={13} />
      </button>
    ),
    status: t("common.status", { defaultValue: "Status" }),
    paidAt: (
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ padding: 0, fontWeight: 700 }}
        onClick={() => handleSort("paidAt")}
      >
        {t("rakht.dateTime", {
          defaultValue: "Payment Date & Time",
        })}
        <LuArrowUpDown size={13} />
      </button>
    ),
    user: t("common.user", { defaultValue: "User" }),
  };

  return (
    <div
      className="page report-root professional-report-page payment-history-page"
      dir={isRtl ? "rtl" : "ltr"}
      style={{ display: "grid", gap: 16, paddingBottom: 28 }}
    >
      <PageHeader
        title={t("rakht.paymentHistory", { defaultValue: "Payment History" })}
        subtitle={t("rakht.paymentHistorySubtitle", {
          defaultValue:
            "Review payment records with filters, summaries, exports, and company-level detail.",
        })}
        action={
          <div className="page-hd-action">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <LuRefreshCcw size={14} />
              {isFetching
                ? t("common.loading", { defaultValue: "Loading..." })
                : t("common.refresh", { defaultValue: "Refresh" })}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleExportPdf}
              disabled={exporting === "pdf" || total === 0}
            >
              <LuDownload size={14} />
              {exporting === "pdf"
                ? t("common.loading", { defaultValue: "Loading..." })
                : t("rakht.exportPdf", { defaultValue: "Export PDF" })}
            </button>
          </div>
        }
      />

      {isAdmin && (
        <ReportMonthBanner isEmpty={data?.total === 0 && !isLoading} />
      )}

      <ReportKpiGrid>
        <StatCard
          label={t("rakht.totalRecords", { defaultValue: "Total Records" })}
          value={total}
          Icon={LuHistory}
          accent="#2563EB"
        />
        <StatCard
          label={t("rakht.totalPaidMoney", { defaultValue: "Total Paid Money" })}
          value={formatMoney(summary.totalPaid, language)}
          Icon={AfCurrencyIcon}
          accent="#0F766E"
        />
        <StatCard
          label={t("rakht.remainingMoney", { defaultValue: "Remaining Amount" })}
          value={formatMoney(summary.totalRemaining, language)}
          Icon={AfCurrencyIcon}
          accent="#B45309"
        />
      </ReportKpiGrid>

      <MobileFilterPanel
        activeCount={activeFilterCount}
        clearDisabled={!hasFilterState}
        isApplying={isFetching}
        onClear={clearFilters}
        title={t("common.filters", { defaultValue: "Filters" })}
      >
        <Card>
          <div
            className="payment-history-filter-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <label className="lbl">
                {t("common.search", { defaultValue: "Search" })}
              </label>
              <div style={{ position: "relative" }}>
                <LuSearch
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
                  className="inp"
                  style={{ paddingInlineStart: 32 }}
                  value={search}
                  placeholder={t("rakht.paymentHistorySearch", {
                    defaultValue: "Search by company or recorded user",
                  })}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div>
              <label className="lbl">
                {t("rakht.companyName", { defaultValue: "Company Name" })}
              </label>
              <Select
                classNamePrefix="rs"
                isRtl={isRtl}
                menuPosition="fixed"
                value={companyFilter}
                onChange={(option) => {
                  setCompanyFilter(option);
                  setPage(1);
                }}
                options={companyOptions}
                isClearable
                placeholder={t("common.all", { defaultValue: "All" })}
              />
            </div>

            <div>
              <label className="lbl">
                {t("common.status", { defaultValue: "Status" })}
              </label>
              <Select
                classNamePrefix="rs"
                isRtl={isRtl}
                menuPosition="fixed"
                value={statusFilter}
                onChange={(option) => {
                  setStatusFilter(option);
                  setPage(1);
                }}
                options={statusOptions}
                isClearable
                placeholder={t("common.all", { defaultValue: "All" })}
              />
            </div>

            <div>
              <label className="lbl">
                {t("rakht.fromDate", { defaultValue: "From Date" })}
              </label>
              <div style={{ position: "relative" }}>
                <LuCalendarDays
                  size={14}
                  style={{
                    position: "absolute",
                    insetInlineStart: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text3)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  className="inp"
                  type="date"
                  style={{ paddingInlineStart: 32 }}
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div>
              <label className="lbl">
                {t("rakht.toDate", { defaultValue: "To Date" })}
              </label>
              <div style={{ position: "relative" }}>
                <LuCalendarDays
                  size={14}
                  style={{
                    position: "absolute",
                    insetInlineStart: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text3)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  className="inp"
                  type="date"
                  style={{ paddingInlineStart: 32 }}
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={clearFilters}
              disabled={!hasFilterState}
            >
              <LuX size={14} />
              {t("common.clear", { defaultValue: "Clear" })}
            </button>
          </div>

          <div
            className="payment-history-active-filters"
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700 }}
            >
              <LuFilter
                size={12}
                style={{ marginInlineEnd: 4, verticalAlign: "middle" }}
              />
              {t("common.filters", { defaultValue: "Filters" })}:{" "}
              {activeFilterCount}
            </span>
            {deferredSearch ? (
              <span className="badge bg-gray">{deferredSearch}</span>
            ) : null}
            {companyFilter?.value ? (
              <span className="badge bg-gray">{companyFilter.value}</span>
            ) : null}
            {statusFilter?.label ? (
              <span className="badge bg-gray">{statusFilter.label}</span>
            ) : null}
          </div>
        </Card>
      </MobileFilterPanel>

      <div
        className="payment-history-table-section"
        dir={isTableRtl ? "rtl" : "ltr"}
      >
        <Card
          title={t("rakht.paymentHistory", { defaultValue: "Payment History" })}
          action={
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {isFetching
                ? t("common.loading", { defaultValue: "Loading..." })
                : null}
            </div>
          }
          noPad
        >
        {isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState
            message={t("rakht.noPaymentHistory", {
              defaultValue: "No payment history found.",
            })}
          />
        ) : (
          <div
            className="tbl-wrap professional-report-table-wrap payment-history-records-wrap"
            style={{ overflowX: "auto" }}
          >
            <table className="tbl professional-report-table payment-history-records-table">
              <thead>
                <tr>
                  {paymentHistoryColumnOrder.map((columnKey) => (
                    <th
                      key={columnKey}
                      className={`payment-history-col--${columnKey}${
                        numericColumns.has(columnKey) ? " report-cell-num" : ""
                      }`}
                    >
                      {paymentHistoryHeaders[columnKey]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = getPaymentStatus(row, t);
                  const cells = {
                    companyName: (
                      <td
                        key="companyName"
                        className="payment-history-col--companyName"
                        style={{ fontWeight: 700 }}
                      >
                        {row.companyName || "-"}
                      </td>
                    ),
                    totalPrice: (
                      <td
                        key="totalPrice"
                        className="payment-history-col--totalPrice report-cell-num"
                      >
                        <span className="payment-history-number report-num">
                          {formatMoney(row.totalPriceAfter, language)}
                        </span>
                      </td>
                    ),
                    paidAmount: (
                      <td
                        key="paidAmount"
                        className="payment-history-col--paidAmount report-cell-num"
                      >
                        <span className="payment-history-number report-num">
                          {formatMoney(row.paidAmount, language)}
                        </span>
                      </td>
                    ),
                    remainingAmount: (
                      <td
                        key="remainingAmount"
                        className="payment-history-col--remainingAmount report-cell-num"
                      >
                        <span className="payment-history-number report-num">
                          {formatMoney(row.remainingAfter, language)}
                        </span>
                      </td>
                    ),
                    status: (
                      <td key="status" className="payment-history-col--status">
                        <Badge v={status.variant}>{status.label}</Badge>
                      </td>
                    ),
                    paidAt: (
                      <td key="paidAt" className="payment-history-col--paidAt">
                        {formatDateTime(row.paidAt, language)}
                      </td>
                    ),
                    user: (
                      <td key="user" className="payment-history-col--user">
                        {row.paidBy?.name || "-"}
                      </td>
                    ),
                  };
                  return (
                    <tr key={row.id}>
                      {paymentHistoryColumnOrder.map(
                        (columnKey) => cells[columnKey],
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && rows.length > 0 ? (
          <div className="payment-history-mobile-records">
            {rows.map((row) => {
              const status = getPaymentStatus(row, t);
              return (
                <article className="payment-history-mobile-card" key={row.id}>
                  <div className="payment-history-mobile-card__head">
                    <strong>{row.companyName || "-"}</strong>
                    <Badge v={status.variant}>{status.label}</Badge>
                  </div>
                  <dl className="payment-history-mobile-card__details">
                    <div>
                      <dt>
                        {t("rakht.totalPrice", {
                          defaultValue: "Total Price",
                        })}
                      </dt>
                      <dd className="payment-history-number">
                        {formatMoney(row.totalPriceAfter, language)}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {t("rakht.paidAmount", {
                          defaultValue: "Paid Amount",
                        })}
                      </dt>
                      <dd className="payment-history-number">
                        {formatMoney(row.paidAmount, language)}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {t("rakht.remainingMoney", {
                          defaultValue: "Remaining Amount",
                        })}
                      </dt>
                      <dd className="payment-history-number">
                        {formatMoney(row.remainingAfter, language)}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {t("rakht.dateTime", {
                          defaultValue: "Payment Date & Time",
                        })}
                      </dt>
                      <dd>{formatDateTime(row.paidAt, language)}</dd>
                    </div>
                    <div>
                      <dt>{t("common.user", { defaultValue: "User" })}</dt>
                      <dd>{row.paidBy?.name || "-"}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        ) : null}

        <div className="payment-history-pagination">
          <span style={{ fontSize: 13, color: "var(--text3)" }}>
            {t("ui.pageSummary", {
              page,
              pages: totalPages,
              total,
              defaultValue: "Page {{page}} of {{pages}} · {{total}} total",
            })}
          </span>
          <div className="payment-history-pagination__actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              {t("ui.prev", { defaultValue: "Previous" })}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages}
            >
              {t("ui.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
        </Card>
      </div>
    </div>
  );
}
