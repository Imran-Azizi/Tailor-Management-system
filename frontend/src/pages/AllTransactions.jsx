import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuArrowRightLeft,
  LuBadgeDollarSign,
  LuBuilding2,
  LuCalendarCheck,
  LuCalendarDays,
  LuFilter,
  LuRefreshCcw,
  LuSearch,
  LuUser,
  LuX,
} from "react-icons/lu";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { getMonthLabel } from "../lib/months.js";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  Spinner,
  StatCard,
} from "../components/ui/index.jsx";

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

function formatMoney(v) {
  return `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  const { isAdmin } = useAuth();
  const { viewMonth, viewYear } = useMonth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    setPage(1);
  }, [viewMonth, viewYear]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "transactions",
      page,
      search,
      typeFilter,
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
            month: isAdmin ? viewMonth : undefined,
            year: isAdmin ? viewYear : undefined,
          },
        })
        .then((r) => r.data),
  });

  const transactions = data?.data || [];
  const totalAmount = useMemo(
    () => transactions.reduce((s, tx) => s + Number(tx.amount || 0), 0),
    [transactions],
  );

  const ACCOUNT_TYPES = ["ADMIN", "DOKAN", "DOKHT", "QICHIKAR"];
  const activeFilterCount = [
    Boolean(search.trim()),
    Boolean(typeFilter),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setPage(1);
  };

  return (
    <div
      className="page"
      style={{ display: "grid", gap: 16, paddingBottom: 28 }}
    >
      <PageHeader
        title={t("transaction.allTitle", "All Transactions")}
        subtitle={t(
          "transaction.allSubtitle",
          "View and search all recorded transactions",
        )}
        action={
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
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                }}
              />
              <input
                className="inp"
                style={{ paddingLeft: 32 }}
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
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text3)",
                  pointerEvents: "none",
                }}
              />
              <select
                className="inp"
                style={{ paddingLeft: 32 }}
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
            disabled={!search && !typeFilter}
          >
            <LuX size={14} />
            {t("common.clear", "Clear")}
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
            {t("common.filters", "Filters")}: {activeFilterCount}
          </span>
          {search ? <span className="badge bg-gray">{search}</span> : null}
          {typeFilter ? (
            <span className="badge bg-gray">{typeFilter}</span>
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
          label={t("transaction.totalTransactions", "Total Transactions")}
          value={Number(data?.total || 0)}
          sub={t("transaction.resultsAcrossPages", "Across all pages")}
          Icon={LuArrowRightLeft}
          accent="#2563EB"
        />
        <StatCard
          label={t("transaction.totalAmount", "Total Amount")}
          value={formatMoney(totalAmount)}
          sub={t("transaction.currentPageTotal", "Current page total")}
          Icon={LuBadgeDollarSign}
          accent="#0F766E"
        />
      </div>

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
          <div className="tbl-wrap">
            <table
              className="tbl"
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                minWidth: 760,
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface2)" }}>
                  {[
                    "#",
                    t("transaction.userName", "User Name"),
                    t("transaction.accountType", "Account Type"),
                    t("transaction.type", "Type"),
                    t("transaction.amount", "Amount"),
                    t("transaction.transactionDate", "Transaction Date"),
                    t("transaction.note", "Note"),
                    t("transaction.createdBy", "Created By"),
                    t("common.date", "Date"),
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        padding: "12px 14px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text3)",
                        borderBottom: "1px solid var(--border)",
                        whiteSpace: "nowrap",
                        background: "var(--surface2)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      style={{
                        padding: "12px 14px",
                        color: "var(--text3)",
                        fontSize: 12,
                      }}
                    >
                      {(page - 1) * 20 + i + 1}
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background:
                              (ACCOUNT_TYPE_COLOR[tx.user?.accountType] ||
                                "#64748B") + "20",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
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
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: "var(--text1)",
                            }}
                          >
                            {tx.user?.name || "-"}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--text3)" }}>
                            {tx.user?.phoneNumber || "-"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <Badge v={BADGE_V[tx.accountType] || "gray"}>
                        {tx.accountType}
                      </Badge>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <Badge v="amber">
                        {formatTransactionKind(tx.kind, t)}
                      </Badge>
                    </td>

                    <td
                      style={{
                        padding: "12px 14px",
                        fontWeight: 800,
                        fontSize: 14,
                        color: getAmountColor(tx.kind),
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatMoney(tx.amount)}
                    </td>

                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: 13,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--text2)",
                        }}
                      >
                        <LuCalendarDays size={13} />
                        {formatDate(tx.transactionDate)}
                      </div>
                    </td>

                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: 12,
                        color: "var(--text2)",
                        maxWidth: 260,
                        whiteSpace: "normal",
                        lineHeight: 1.45,
                      }}
                    >
                      {tx.note || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: 12,
                        color: "var(--text2)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.createdBy?.name || "-"}
                    </td>

                    <td
                      style={{
                        padding: "12px 14px",
                        fontSize: 12,
                        color: "var(--text3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: "12px 18px 16px" }}>
          <Pagination
            page={page}
            total={data?.total || 0}
            limit={20}
            onChange={setPage}
          />
        </div>
      </Card>
    </div>
  );
}
