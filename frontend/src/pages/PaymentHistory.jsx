import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import toast from "react-hot-toast";
import {
  LuArrowUpDown,
  LuBadgeDollarSign,
  LuBuilding2,
  LuCalendarCheck,
  LuCalendarDays,
  LuChartColumn,
  LuDownload,
  LuEye,
  LuFilter,
  LuHistory,
  LuRefreshCcw,
  LuSearch,
  LuWallet,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { getMonthLabel } from "../lib/months.js";
import {
  Badge,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  Spinner,
  StatCard,
} from "../components/ui/index.jsx";

const PAGE_SIZE = 20;

function formatMoney(value) {
  return Math.round(Number(value || 0)).toLocaleString();
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
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
  const [detailCompany, setDetailCompany] = useState(null);
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

  const { data: companyDetailData, isLoading: isCompanyDetailLoading } =
    useQuery({
      queryKey: ["rakht-payment-history-company-detail", detailCompany],
      enabled: Boolean(detailCompany),
      queryFn: () =>
        api
          .get("/rakhts/payment-history", {
            params: {
              companyName: detailCompany,
              page: 1,
              limit: 50,
              sortBy: "paidAt",
              sortOrder: "desc",
            },
          })
          .then((res) => res.data),
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
  const detailRows = Array.isArray(companyDetailData?.data)
    ? companyDetailData.data
    : [];
  const detailSummary = companyDetailData?.summary || {
    totalPaid: 0,
    totalRemaining: 0,
  };

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
            formatMoney(row.totalPriceAfter),
            formatMoney(row.paidAmount),
            formatMoney(row.remainingAfter),
            formatDateTime(row.paidAt),
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
      const allRows = await exportRows();
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 48;

      const writeLine = (text, options = {}) => {
        const nextY = y + (options.gapBefore || 0);
        if (nextY > pageHeight - 48) {
          doc.addPage();
          y = 48;
        } else {
          y = nextY;
        }
        doc.setFont("helvetica", options.bold ? "bold" : "normal");
        doc.setFontSize(options.size || 10);
        doc.text(String(text), options.x || 40, y, {
          maxWidth: options.maxWidth || pageWidth - 80,
        });
        y += options.lineHeight || 16;
      };

      writeLine(
        t("rakht.paymentHistory", { defaultValue: "Payment History" }),
        {
          bold: true,
          size: 16,
          lineHeight: 24,
        },
      );
      writeLine(
        `${t("rakht.totalPaidMoney", { defaultValue: "Total Paid" })}: ${formatMoney(summary.totalPaid)} | ${t("rakht.remainingMoney", { defaultValue: "Remaining" })}: ${formatMoney(summary.totalRemaining)}`,
        { size: 11, lineHeight: 20 },
      );
      writeLine(
        `${t("common.filters", { defaultValue: "Filters" })}: ${activeFilterCount || 0}`,
        { size: 10, lineHeight: 18 },
      );

      allRows.forEach((row, index) => {
        const status = getPaymentStatus(row, t).label;
        writeLine(`${index + 1}. ${row.companyName || "-"}`, {
          bold: true,
          gapBefore: 8,
        });
        writeLine(
          `${t("rakht.totalPrice", { defaultValue: "Total Price" })}: ${formatMoney(row.totalPriceAfter)} | ${t("rakht.paidAmount", { defaultValue: "Paid Amount" })}: ${formatMoney(row.paidAmount)} | ${t("rakht.remainingMoney", { defaultValue: "Remaining" })}: ${formatMoney(row.remainingAfter)}`,
        );
        writeLine(
          `${t("common.status", { defaultValue: "Status" })}: ${status} | ${t("rakht.dateTime", { defaultValue: "Date & Time" })}: ${formatDateTime(row.paidAt)} | ${t("common.user", { defaultValue: "User" })}: ${row.paidBy?.name || "-"}`,
          { lineHeight: 18 },
        );
      });

      doc.save(
        `payment-history-${formatDateValue(new Date()) || "export"}.pdf`,
      );
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
              {getMonthLabel(viewMonth, language)} {viewYear}
            </strong>
          </span>
          {data?.total === 0 && !isLoading && (
            <span
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
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                className="inp"
                style={{ paddingLeft: 32 }}
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
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                  pointerEvents: "none",
                }}
              />
              <input
                className="inp"
                type="date"
                style={{ paddingLeft: 32 }}
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
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                  pointerEvents: "none",
                }}
              />
              <input
                className="inp"
                type="date"
                style={{ paddingLeft: 32 }}
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
              style={{ marginRight: 4, verticalAlign: "middle" }}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard
          label={t("rakht.totalRecords", { defaultValue: "Total Records" })}
          value={total}
          sub={t("rakht.filteredResults", { defaultValue: "Filtered results" })}
          Icon={LuHistory}
          accent="#2563EB"
        />
        <StatCard
          label={t("rakht.totalPaidMoney", {
            defaultValue: "Total Paid Money",
          })}
          value={formatMoney(summary.totalPaid)}
          sub={t("rakht.filteredSummary", {
            defaultValue: "Across the current filter set",
          })}
          Icon={LuWallet}
          accent="#15803D"
        />
        <StatCard
          label={t("rakht.remainingMoney", {
            defaultValue: "Remaining Amount",
          })}
          value={formatMoney(summary.totalRemaining)}
          sub={t("rakht.filteredSummary", {
            defaultValue: "Across the current filter set",
          })}
          Icon={LuBadgeDollarSign}
          accent="#B45309"
        />
        <StatCard
          label={t("rakht.currentPage", { defaultValue: "Current Page" })}
          value={rows.length}
          sub={`${t("common.page", { defaultValue: "Page" })} ${page} / ${totalPages}`}
          Icon={LuChartColumn}
          accent="#7C3AED"
        />
      </div>

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
                  <th>{t("common.actions", { defaultValue: "Actions" })}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = getPaymentStatus(row, t);
                  return (
                    <tr key={row.id}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setDetailCompany(row.companyName)}
                          style={{
                            background: "none",
                            border: 0,
                            padding: 0,
                            cursor: "pointer",
                            color: "var(--primary)",
                            fontWeight: 700,
                          }}
                        >
                          {row.companyName || "-"}
                        </button>
                      </td>
                      <td>{formatMoney(row.totalPriceAfter)}</td>
                      <td>{formatMoney(row.paidAmount)}</td>
                      <td>{formatMoney(row.remainingAfter)}</td>
                      <td>
                        <Badge v={status.variant}>{status.label}</Badge>
                      </td>
                      <td>{formatDateTime(row.paidAt)}</td>
                      <td>{row.paidBy?.name || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setDetailCompany(row.companyName)}
                        >
                          <LuEye size={13} />
                          {t("common.view", { defaultValue: "View" })}
                        </button>
                      </td>
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

      <Modal
        open={Boolean(detailCompany)}
        onClose={() => setDetailCompany(null)}
        title={t("rakht.companyHistoryTitle", {
          defaultValue: `${detailCompany || ""} Payment History`,
        })}
        maxW={860}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <div className="stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "#2563EB18",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LuBuilding2 size={18} style={{ color: "#2563EB" }} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--text3)",
                      fontWeight: 700,
                    }}
                  >
                    {t("rakht.companyName", { defaultValue: "Company Name" })}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>
                    {detailCompany || "-"}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <p
                style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700 }}
              >
                {t("rakht.totalPaidMoney", {
                  defaultValue: "Total Paid Money",
                })}
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#15803D" }}>
                {formatMoney(detailSummary.totalPaid)}
              </p>
            </div>
            <div className="stat-card">
              <p
                style={{ fontSize: 12, color: "var(--text3)", fontWeight: 700 }}
              >
                {t("rakht.remainingMoney", {
                  defaultValue: "Remaining Amount",
                })}
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#B45309" }}>
                {formatMoney(detailSummary.totalRemaining)}
              </p>
            </div>
          </div>

          {isCompanyDetailLoading ? (
            <Spinner />
          ) : detailRows.length === 0 ? (
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
                      {t("rakht.paidAmount", { defaultValue: "Paid Amount" })}
                    </th>
                    <th>
                      {t("rakht.remainingBefore", {
                        defaultValue: "Remaining Before",
                      })}
                    </th>
                    <th>
                      {t("rakht.remainingAfter", {
                        defaultValue: "Remaining After",
                      })}
                    </th>
                    <th>{t("common.status", { defaultValue: "Status" })}</th>
                    <th>
                      {t("rakht.dateTime", { defaultValue: "Date & Time" })}
                    </th>
                    <th>{t("common.user", { defaultValue: "User" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.map((row) => {
                    const status = getPaymentStatus(row, t);
                    return (
                      <tr key={row.id}>
                        <td>{formatMoney(row.paidAmount)}</td>
                        <td>{formatMoney(row.remainingBefore)}</td>
                        <td>{formatMoney(row.remainingAfter)}</td>
                        <td>
                          <Badge v={status.variant}>{status.label}</Badge>
                        </td>
                        <td>{formatDateTime(row.paidAt)}</td>
                        <td>{row.paidBy?.name || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
