import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  LuArrowRightLeft,
  LuBuilding2,
  LuCalendarDays,
  LuFilter,
  LuFileText,
  LuRefreshCcw,
  LuSearch,
  LuUser,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { getApiErrorMessage } from "../lib/feedback.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { formatSystemDate, isRtlLanguage } from "../lib/locale.js";
import { formatReportMoney } from "../lib/currency.js";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  StatCard,
  TableHorizontalScroll,
} from "../components/ui/index.jsx";
import {
  ReportKpiGrid,
  ReportMonthBanner,
} from "../components/reports/ReportKit.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import MobileFilterPanel from "../components/ui/MobileFilterPanel.jsx";
import "./AllTransactions.css";

const ACCOUNT_TYPE_COLOR = {
  ADMIN: "#2563EB",
  DOKAN: "#7C3AED",
  DOKHT: "#DB2777",
  QICHIKAR: "#D97706",
};

const BADGE_V = {
  ADMIN: "teal",
  DOKAN: "gold",
  DOKHT: "red",
  QICHIKAR: "amber",
};

function formatMoney(v, language = "en") {
  return formatReportMoney(v, language);
}

function formatDate(iso, language) {
  return formatSystemDate(iso, language);
}

function formatTransactionKind(kind, t) {
  if (kind === "LOAN") return t("transaction.loanOption", "Is Loan");
  return kind || "-";
}

function getAmountColor(kind) {
  if (kind === "LOAN") return "#B45309";
  return "var(--text1)";
}

export default function AllTransactions() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = isRtlLanguage(language);
  const { isAdmin } = useAuth();
  const { viewMonth, viewYear } = useMonth();
  const [searchParams, setSearchParams] = useSearchParams();
  const kindFromQuery = (searchParams.get("kind") || "").trim();
  const initialKind = kindFromQuery === "LOAN" ? "LOAN" : "";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [kindFilter, setKindFilter] = useState(initialKind);
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    setPage(1);
  }, [viewMonth, viewYear]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "transactions",
      page,
      search,
      typeFilter,
      kindFilter,
      isAdmin ? viewMonth : null,
      isAdmin ? viewYear : null,
    ],
    queryFn: () =>
      api
        .get("/transactions", {
          params: {
            page,
            limit: 20,
            search,
            accountType: typeFilter,
            kind: kindFilter || undefined,
            month: isAdmin ? viewMonth : undefined,
            year: isAdmin ? viewYear : undefined,
          },
        })
        .then((r) => r.data),
  });

  const transactions = data?.data || [];
  const pageAmount = useMemo(
    () => transactions.reduce((s, tx) => s + Number(tx.amount || 0), 0),
    [transactions],
  );
  const totalAmount =
    data?.totalAmount != null ? Number(data.totalAmount) : pageAmount;

  const ACCOUNT_TYPES = ["ADMIN", "DOKAN", "DOKHT", "QICHIKAR"];
  const activeFilterCount = [
    Boolean(search.trim()),
    Boolean(typeFilter),
    Boolean(kindFilter),
  ].filter(Boolean).length;
  const transactionColumns = useMemo(() => {
    const columns = [
      { key: "index", heading: "#", className: "index" },
      {
        key: "user",
        heading: t("transaction.userName", "User Name"),
        className: "user",
      },
      {
        key: "account",
        heading: t("transaction.accountType", "Account Type"),
        className: "account",
      },
      {
        key: "type",
        heading: t("transaction.type", "Type"),
        className: "type",
      },
      {
        key: "amount",
        heading: t("transaction.amount", "Amount"),
        className: "amount",
      },
      {
        key: "transactionDate",
        heading: t("transaction.transactionDate", "Transaction Date"),
        className: "transaction-date",
      },
      {
        key: "note",
        heading: t("transaction.note", "Note"),
        className: "note",
      },
      {
        key: "creator",
        heading: t("transaction.createdBy", "Created By"),
        className: "creator",
      },
      {
        key: "createdDate",
        heading: t("common.date", "Date"),
        className: "created-date",
      },
    ];

    return isRtl ? [...columns].reverse() : columns;
  }, [isRtl, t]);

  useEffect(() => {
    const nextKind = (searchParams.get("kind") || "").trim();
    setKindFilter(nextKind === "LOAN" ? "LOAN" : "");
    setPage(1);
  }, [searchParams]);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setKindFilter("");
    setPage(1);
    if (searchParams.get("kind")) {
      const next = new URLSearchParams(searchParams);
      next.delete("kind");
      setSearchParams(next, { replace: true });
    }
  };

  const handleExportPdf = async () => {
    try {
      setExporting("pdf");
      const response = await api.get("/transactions/report/pdf", {
        params: {
          page,
          limit: 20,
          search,
          accountType: typeFilter,
          month: isAdmin ? viewMonth : undefined,
          year: isAdmin ? viewYear : undefined,
          kind: kindFilter || undefined,
          lang: language,
          _ts: Date.now(),
        },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "all-transactions-report.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          t("common.exportPdfFailed", "Failed to export PDF"),
        ),
      );
    } finally {
      setExporting("");
    }
  };

  return (
    <div
      className={`page report-root professional-report-page all-transactions-page ${
        isRtl ? "all-transactions-page--rtl" : "all-transactions-page--ltr"
      }`}
      style={{ display: "grid", gap: 16, paddingBottom: 28 }}
    >
      <PageHeader
        title={t("transaction.allTitle", "All Transactions")}
        subtitle={t(
          "transaction.allSubtitle",
          "View and search all recorded transactions",
        )}
        action={
          <>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <LuRefreshCcw size={14} />
              {isFetching
                ? t("common.loading", "Loading...")
                : t("common.refresh", "Refresh")}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleExportPdf}
              disabled={exporting === "pdf" || !transactions.length}
            >
              <LuFileText size={14} />
              {exporting === "pdf"
                ? t("common.loading", "Loading...")
                : t("common.exportPdf", "Export PDF")}
            </button>
          </>
        }
      />

      {isAdmin && (
        <ReportMonthBanner isEmpty={data?.total === 0 && !isLoading} />
      )}

      <ReportKpiGrid className="all-transactions-stats">
        <StatCard
          label={t("transaction.totalTransactions", "Total Transactions")}
          value={Number(data?.total || 0)}
          sub={t("transaction.resultsAcrossPages", "Across all pages")}
          Icon={LuArrowRightLeft}
          accent="#2563EB"
        />
        <StatCard
          label={t("transaction.totalAmount", "Total Amount")}
          value={formatMoney(totalAmount, language)}
          sub={
            data?.totalAmount != null
              ? t("transaction.resultsAcrossPages", "Across all pages")
              : t("transaction.currentPageTotal", "Current page total")
          }
          Icon={AfCurrencyIcon}
          accent="#0F766E"
        />
      </ReportKpiGrid>

      <MobileFilterPanel
        activeCount={activeFilterCount}
        clearDisabled={activeFilterCount === 0}
        isApplying={isFetching}
        onClear={clearFilters}
        className="all-transactions-filter-panel"
        title={t("common.filters", "Filters")}
      >
        <Card>
          <div className="all-transactions-filter-summary">
            <span className="badge bg-gray">
              {t("common.filters", "Filters")}: {activeFilterCount}
            </span>
          </div>
          <div
            className="all-transactions-filter-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 10,
              alignItems: "end",
            }}
          >
            <div>
              <label className="lbl">{t("common.search", "Search")}</label>
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
                  placeholder={t(
                    "transaction.searchPlaceholder",
                    "Search by user name",
                  )}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div>
              <label className="lbl">
                {t("transaction.accountType", "Account Type")}
              </label>
              <div style={{ position: "relative" }}>
                <LuBuilding2
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
                <select
                  className="inp"
                  style={{ paddingInlineStart: 32 }}
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">
                    {t("transaction.allTypes", "All types")}
                  </option>
                  {ACCOUNT_TYPES.map((at) => (
                    <option key={at} value={at}>
                      {at}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={clearFilters}
              disabled={activeFilterCount === 0}
            >
              <LuX size={14} />
              {t("common.clear", "Clear")}
            </button>
          </div>

          <div
            className="all-transactions-active-filters"
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
              {t("common.filters", "Filters")}: {activeFilterCount}
            </span>
            {search ? <span className="badge bg-gray">{search}</span> : null}
            {typeFilter ? (
              <span className="badge bg-gray">{typeFilter}</span>
            ) : null}
            {kindFilter ? (
              <span className="badge bg-gray">
                {formatTransactionKind(kindFilter, t)}
              </span>
            ) : null}
          </div>
        </Card>
      </MobileFilterPanel>

      <div className="all-transactions-table-section" dir={isRtl ? "rtl" : "ltr"}>
        <Card
          title={t("transaction.allTitle", "All Transactions")}
          action={
            isFetching ? (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                {t("common.loading", "Loading...")}
              </span>
            ) : null
          }
          noPad
        >
          {isLoading ? (
            <Spinner />
          ) : transactions.length === 0 ? (
            <EmptyState
              message={t("common.noData", "No data found")}
              Icon={LuArrowRightLeft}
            />
          ) : (
            <TableHorizontalScroll
              viewportClassName="professional-report-table-wrap all-transactions-table-wrap"
              ariaLabel="Transactions table horizontal scroll"
              minWidth="980px"
            >
              <table className="tbl professional-report-table all-transactions-table">
                <colgroup>
                  {transactionColumns.map((column) => (
                    <col
                      key={column.key}
                      className={`all-transactions-col all-transactions-col--${column.className}`}
                    />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {transactionColumns.map((column) => (
                      <th key={column.key}>{column.heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => {
                    const cells = {
                      index: (
                        <td
                          key="index"
                          className="all-transactions-index-cell"
                        >
                          {(page - 1) * 20 + i + 1}
                        </td>
                      ),
                      user: (
                        <td key="user">
                          <div className="all-transactions-user">
                            <div
                              className="all-transactions-user__avatar"
                              style={{
                                background:
                                  (ACCOUNT_TYPE_COLOR[tx.user?.accountType] ||
                                    "#64748B") + "20",
                              }}
                            >
                              <LuUser
                                size={14}
                                style={{
                                  color:
                                    ACCOUNT_TYPE_COLOR[tx.user?.accountType] ||
                                    "#64748B",
                                }}
                              />
                            </div>
                            <div className="all-transactions-user__copy">
                              <p className="all-transactions-user__name">
                                {tx.user?.name || "-"}
                              </p>
                              <p className="all-transactions-user__phone">
                                {tx.user?.phoneNumber || "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                      ),
                      account: (
                        <td key="account">
                          <Badge v={BADGE_V[tx.accountType] || "gray"}>
                            {tx.accountType}
                          </Badge>
                        </td>
                      ),
                      type: (
                        <td key="type">
                          <Badge v="amber">
                            {formatTransactionKind(tx.kind, t)}
                          </Badge>
                        </td>
                      ),
                      amount: (
                        <td
                          key="amount"
                          className="all-transactions-money report-num"
                          style={{
                            color: getAmountColor(tx.kind),
                          }}
                        >
                          {formatMoney(tx.amount, language)}
                        </td>
                      ),
                      transactionDate: (
                        <td key="transactionDate">
                          <div className="all-transactions-date">
                            <LuCalendarDays size={13} />
                            {formatDate(tx.transactionDate, language)}
                          </div>
                        </td>
                      ),
                      note: (
                        <td
                          key="note"
                          className="all-transactions-note-cell"
                        >
                          <span className="all-transactions-note">
                            {tx.note || "-"}
                          </span>
                        </td>
                      ),
                      creator: (
                        <td
                          key="creator"
                          className="all-transactions-secondary-cell"
                        >
                          {tx.createdBy?.name || "-"}
                        </td>
                      ),
                      createdDate: (
                        <td
                          key="createdDate"
                          className="all-transactions-created-cell"
                        >
                          {formatDate(tx.createdAt, language)}
                        </td>
                      ),
                    };

                    return (
                      <tr key={tx.id}>
                        {transactionColumns.map((column) => cells[column.key])}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableHorizontalScroll>
          )}

          <div className="all-transactions-pagination">
            <Pagination
              page={page}
              total={data?.total || 0}
              limit={20}
              onChange={setPage}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
