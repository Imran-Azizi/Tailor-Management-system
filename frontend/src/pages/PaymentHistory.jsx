import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import toast from "react-hot-toast";
import {
  LuArrowUpDown,
  LuCalendarCheck,
  LuCalendarDays,
  LuDownload,
  LuFilter,
  LuHistory,
  LuRefreshCcw,
  LuSearch,
  LuWallet,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { formatCurrency } from "../lib/currency.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../lib/months.js";
import { formatSystemDateTime } from "../lib/locale.js";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Spinner,
} from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";

const PAGE_SIZE = 20;

function formatMoney(value, language = "en") {
  return formatCurrency(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function toCsvValue(value) {
  const safe = String(value ?? "");
  return `"${safe.replaceAll('"', '""')}"`;
}

export default function PaymentHistory() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
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

  const exportRows = async () => {
    const exportLimit = Math.min(Math.max(total || PAGE_SIZE, PAGE_SIZE), 5000);
    const response = await api.get("/rakhts/payment-history", {
      params: {
        ...queryParams,
        page: 1,
        limit: exportLimit,
      },
    });
    return Array.isArray(response.data?.data) ? response.data.data : [];
  };

  const handleExportCsv = async () => {
    try {
      setExporting("csv");
      const allRows = await exportRows();
      const header = [
        "Company Name",
        "Total Price",
        "Paid Amount",
        "Remaining Amount",
        "Payment Date & Time",
        "Status",
        "User",
      ];
      const csvLines = [header.map(toCsvValue).join(",")];

      allRows.forEach((row) => {
        const status = getPaymentStatus(row, t).label;
        csvLines.push(
          [
            row.companyName,
            formatMoney(row.totalPriceAfter, language),
            formatMoney(row.paidAmount, language),
            formatMoney(row.remainingAfter, language),
            formatDateTime(row.paidAt, language),
            status,
            row.paidBy?.name || "-",
          ]
            .map(toCsvValue)
            .join(","),
        );
      });

      downloadBlob(
        new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" }),
        `payment-history-${formatDateValue(new Date()) || "export"}.csv`,
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("rakht.exportCsvFailed", { defaultValue: "Failed to export CSV." }),
        ),
      );
    } finally {
      setExporting("");
    }
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

  return (
    <div
      className="page"
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
              onClick={handleExportCsv}
              disabled={exporting === "csv" || total === 0}
            >
              <LuDownload size={14} />
              {exporting === "csv"
                ? t("common.loading", { defaultValue: "Loading..." })
                : t("rakht.exportCsv", { defaultValue: "Export CSV" })}
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
        <div
          className="month-info-banner"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            marginBottom: 4,
            borderRadius: "var(--r)",
            background: "var(--success-soft, #F0FDF4)",
            border: "1px solid var(--success-soft-border, #BBF7D0)",
            fontSize: 13,
            color: "var(--success, #16A34A)",
            fontWeight: 500,
          }}
        >
          <LuCalendarCheck size={14} />
          <span>
            {t("common.viewingMonth", "Viewing data for")}:{" "}
            <strong style={{ fontWeight: 700 }}>
              {formatMonthYearLabel(viewMonth, viewYear, language)}
            </strong>
          </span>
          {data?.total === 0 && !isLoading && (
            <span
              className="month-info-empty"
              style={{ marginInlineStart: "auto", fontSize: 11, opacity: 0.75 }}
            >
              {t("common.noDataThisMonth", "No data found for this month")}
            </span>
          )}
        </div>
      )}

      <Card>
        <div
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
            disabled={
              activeFilterCount === 0 &&
              sortBy === "paidAt" &&
              sortOrder === "desc"
            }
          >
            <LuX size={14} />
            {t("common.clear", { defaultValue: "Clear" })}
          </button>
        </div>

        <div
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

      <Card>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span className="badge bg-gray">
            {t("rakht.totalRecords", { defaultValue: "Total Records" })}:{" "}
            {total}
          </span>
          <span className="badge bg-green">
            {t("rakht.totalPaidMoney", { defaultValue: "Total Paid Money" })}:{" "}
            {formatMoney(summary.totalPaid, language)}
          </span>
          <span className="badge bg-gold">
            {t("rakht.remainingMoney", { defaultValue: "Remaining Amount" })}:{" "}
            {formatMoney(summary.totalRemaining, language)}
          </span>
          <span className="badge bg-gray">
            {t("common.page", { defaultValue: "Page" })}: {page} / {totalPages}
          </span>
        </div>
      </Card>

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
          <div className="tbl-wrap" style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 0, fontWeight: 700 }}
                      onClick={() => handleSort("companyName")}
                    >
                      {t("rakht.companyName", { defaultValue: "Company Name" })}
                      <LuArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 0, fontWeight: 700 }}
                      onClick={() => handleSort("totalPriceBefore")}
                    >
                      {t("rakht.totalPrice", { defaultValue: "Total Price" })}
                      <LuArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 0, fontWeight: 700 }}
                      onClick={() => handleSort("paidAmount")}
                    >
                      {t("rakht.paidAmount", { defaultValue: "Paid Amount" })}
                      <LuArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>
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
                  </th>
                  <th>{t("common.status", { defaultValue: "Status" })}</th>
                  <th>
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
                  </th>
                  <th>{t("common.user", { defaultValue: "User" })}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = getPaymentStatus(row, t);
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 700 }}>
                        {row.companyName || "-"}
                      </td>
                      <td>{formatMoney(row.totalPriceAfter, language)}</td>
                      <td>{formatMoney(row.paidAmount, language)}</td>
                      <td>{formatMoney(row.remainingAfter, language)}</td>
                      <td>
                        <Badge v={status.variant}>{status.label}</Badge>
                      </td>
                      <td>{formatDateTime(row.paidAt, language)}</td>
                      <td>{row.paidBy?.name || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: 16,
            borderTop: "1px solid var(--border)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text3)" }}>
            {t("rakht.pageSummary", {
              defaultValue: `Page ${page} of ${totalPages} • ${total} record(s)`,
            })}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
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
  );
}
