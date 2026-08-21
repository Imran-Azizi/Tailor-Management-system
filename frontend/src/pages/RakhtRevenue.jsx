import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LuFactory, LuFilter, LuRuler, LuShoppingBag } from "react-icons/lu";
import api from "../lib/api.js";
import { formatReportMoney } from "../lib/currency.js";
import {
  formatDateLocale,
  isRtlLanguage,
} from "../lib/locale.js";
import { formatMeters } from "../lib/meters.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import {
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
  TableHorizontalScroll,
} from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import MobileFilterPanel from "../components/ui/MobileFilterPanel.jsx";
import { ReportMonthBanner } from "../components/reports/ReportKit.jsx";
import "./RakhtRevenue.css";

const DEFAULT_FILTERS = {
  search: "",
  companyName: "",
  brandName: "",
  tonName: "",
  orderType: "",
  page: 1,
  limit: 25,
};

export default function RakhtRevenue() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const isRtl = isRtlLanguage(language);
  const meterUnit = t("rakht.meterUnitShort", { defaultValue: "m" });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { viewMonth, viewYear } = useMonth();

  const queryParams = useMemo(() => {
    const params = {
      page: filters.page,
      limit: filters.limit,
    };

    if (filters.search) params.search = filters.search;
    if (filters.companyName) params.companyName = filters.companyName;
    if (filters.brandName) params.brandName = filters.brandName;
    if (filters.tonName) params.tonName = filters.tonName;
    if (filters.orderType) params.orderType = filters.orderType;
    params.month = viewMonth;
    params.year = viewYear;

    return params;
  }, [filters, viewMonth, viewYear]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["rakht-revenue-summary", queryParams],
    queryFn: () =>
      api
        .get("/rakhts/revenue/summary", { params: queryParams })
        .then((res) => res.data),
    keepPreviousData: true,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="page professional-report-page">
        <Spinner />
      </div>
    );
  }

  const summary = data || {
    totalOrders: 0,
    totalMetersSold: 0,
    totalRevenue: 0,
    totalSelling: 0,
    totalCost: 0,
    avgSellingPricePerMeter: 0,
    avgBenefitPerMeter: 0,
    byCompany: [],
    byTon: [],
    details: [],
    pagination: { page: 1, totalPages: 1, total: 0, limit: 25 },
    filters: { companies: [], brands: [], tons: [], orderTypes: [] },
  };
  const activeFilterCount = [
    Boolean(filters.search.trim()),
    Boolean(filters.companyName),
    Boolean(filters.brandName),
    Boolean(filters.tonName),
    Boolean(filters.orderType),
  ].filter(Boolean).length;
  const revenueColumns = {
    date: {
      header: t("common.date", "Date"),
      render: (row) =>
        formatDateLocale(row.createdAt, language, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    customer: {
      header: t("createOrder.customerInfo", "Customer"),
      render: (row) => row.customerName || "-",
    },
    company: {
      header: t("rakht.companyName", "Company"),
      render: (row) => row.companyName || "-",
    },
    brand: {
      header: t("rakht.brandName", "Brand"),
      render: (row) => row.brandName || "-",
    },
    ton: {
      header: t("rakht.tonName", "Ton Color Name"),
      render: (row) => row.tonName || "-",
    },
    orderType: {
      header: t("createOrder.orderTypes", "Order Type"),
      render: (row) => getOrderTypeLabel(row.orderType, language),
    },
    meters: {
      header: t("rakht.requiredMeters", "Meters"),
      render: (row) => formatMeters(row.meters),
      numeric: true,
    },
    costPerMeter: {
      header: t("rakht.piecePrice", "Cost/Meter"),
      render: (row) => formatReportMoney(row.costPerMeter, language),
      numeric: true,
    },
    sellingPerMeter: {
      header: t("rakht.priceForCustomer", "Sell/Meter"),
      render: (row) => formatReportMoney(row.sellingPerMeter, language),
      numeric: true,
    },
    benefit: {
      header: t("rakht.benefit", "Benefit"),
      render: (row) => formatReportMoney(row.benefit, language),
      numeric: true,
      benefit: true,
    },
  };
  const revenueColumnOrder = isRtl
    ? [
        "company",
        "brand",
        "ton",
        "customer",
        "orderType",
        "meters",
        "costPerMeter",
        "sellingPerMeter",
        "benefit",
        "date",
      ]
    : [
        "date",
        "customer",
        "company",
        "brand",
        "ton",
        "orderType",
        "meters",
        "costPerMeter",
        "sellingPerMeter",
        "benefit",
      ];

  return (
    <div
      className="page report-root professional-report-page rakht-revenue-page"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <PageHeader
        title={t("rakht.totalRevenue", { defaultValue: "Total Revenue" })}
        subtitle={t("rakht.totalRevenueSubtitle", {
          defaultValue:
            "Revenue is calculated from Rakht Benefit: total customer selling amount minus total rakht cost.",
        })}
      />

      <ReportMonthBanner
        isEmpty={!isFetching && Number(summary.pagination?.total || 0) === 0}
        style={{ marginBottom: 16 }}
      />

      <div
        className="g-stats"
        style={{
          marginBottom: 18,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <StatCard
          label={t("rakht.totalRevenue", { defaultValue: "Total Revenue" })}
          value={formatReportMoney(summary.totalRevenue, language)}
          Icon={AfCurrencyIcon}
          accent="#0F766E"
          sub={t("rakht.benefit", { defaultValue: "Rakht Benefit" })}
        />
        <StatCard
          label={t("rakht.totalSoldMeters", {
            defaultValue: "Total Sold Meters",
          })}
          value={`${formatMeters(summary.totalMetersSold)} ${meterUnit}`}
          Icon={LuRuler}
          accent="#2563EB"
        />
        <StatCard
          label={t("rakht.totalRevenueOrders", {
            defaultValue: "Orders Count",
          })}
          value={Number(summary.totalOrders || 0)}
          Icon={LuShoppingBag}
          accent="#7C3AED"
        />
        <StatCard
          label={t("rakht.avgSellingPricePerMeter", {
            defaultValue: "Avg Selling Price / Meter",
          })}
          value={formatReportMoney(summary.avgSellingPricePerMeter, language)}
          Icon={LuFactory}
          accent="#D97706"
        />
      </div>

      <MobileFilterPanel
        activeCount={activeFilterCount}
        clearDisabled={activeFilterCount === 0}
        isApplying={isFetching}
        onClear={() => setFilters(DEFAULT_FILTERS)}
        title={t("common.filters", "Filters")}
      >
        <Card
          title={t("rakht.advancedFilters", {
            defaultValue: "Advanced Filters",
          })}
          style={{ marginBottom: 18 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label className="lbl">{t("common.search", "Search")}</label>
              <input
                className="inp"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                    page: 1,
                  }))
                }
                placeholder={t("rakht.searchPlaceholder", {
                  defaultValue: "Order ID, customer, company, ton...",
                })}
              />
            </div>

            <div>
              <label className="lbl" htmlFor="companyName-select">
                {t("rakht.companyName", "Company")}
              </label>
              <select
                id="companyName-select"
                className="inp"
                value={filters.companyName}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    companyName: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">{t("common.all", "All")}</option>
                {summary.filters.companies.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="lbl" htmlFor="orderType-select">
                {t("createOrder.orderTypes", "Order Type")}
              </label>
              <select
                id="orderType-select"
                className="inp"
                value={filters.orderType}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    orderType: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">{t("common.all", "All")}</option>
                {summary.filters.orderTypes.map((type) => (
                  <option key={type} value={type}>
                    {getOrderTypeLabel(type, language)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              <LuFilter size={14} style={{ marginInlineEnd: 6 }} />
              {t("common.reset", "Reset")}
            </button>
            {isFetching && (
              <span style={{ fontSize: 12, color: "var(--text3)" }}>
                {t("common.loading", "Loading...")}
              </span>
            )}
          </div>
        </Card>
      </MobileFilterPanel>

      <div className="rakht-revenue-details-section" dir={isRtl ? "rtl" : "ltr"}>
        <Card
          title={t("rakht.revenueDetails", {
            defaultValue: "Rakht Revenue Details",
          })}
          noPad
        >
        {summary.details?.length ? (
          <TableHorizontalScroll
            viewportClassName="professional-report-table-wrap rakht-revenue-records-wrap"
            ariaLabel="Rakht revenue table horizontal scroll"
            minWidth="980px"
          >
            <table
              className="tbl professional-report-table rakht-revenue-records-table"
              data-language-direction={isRtl ? "rtl" : "ltr"}
            >
              <thead>
                <tr>
                  {revenueColumnOrder.map((columnKey) => (
                    <th
                      key={columnKey}
                      className={`rakht-revenue-col--${columnKey}${
                        revenueColumns[columnKey].numeric
                          ? " report-cell-num"
                          : ""
                      }`}
                    >
                      {revenueColumns[columnKey].header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.details.map((row) => (
                  <tr key={row.orderId}>
                    {revenueColumnOrder.map((columnKey) => {
                      const column = revenueColumns[columnKey];
                      return (
                        <td
                          key={columnKey}
                          className={`rakht-revenue-col--${columnKey}${
                            column.numeric
                              ? " rakht-revenue-number report-cell-num report-num"
                              : ""
                          }`}
                          style={
                            column.benefit
                              ? {
                                  color:
                                    row.benefit >= 0
                                      ? "var(--success)"
                                      : "var(--danger)",
                                  fontWeight: 700,
                                }
                              : undefined
                          }
                        >
                          {column.render(row)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableHorizontalScroll>
        ) : (
          <EmptyState
            message={t("common.noData", { defaultValue: "No data found" })}
            Icon={LuFactory}
          />
        )}

        <div
          className="report-pagination"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            padding: 12,
            borderTop: "1px solid var(--border)",
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text3)" }}>
            {t("ui.pageSummary", {
              defaultValue: "Page {{page}} of {{pages}} - {{total}} total",
              page: summary.pagination.page,
              pages: summary.pagination.totalPages,
              total: summary.pagination.total,
            })}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={summary.pagination.page <= 1}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.max(1, current.page - 1),
                }))
              }
            >
              {t("ui.prev", "Previous")}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={
                summary.pagination.page >= summary.pagination.totalPages
              }
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  page: Math.min(
                    summary.pagination.totalPages,
                    current.page + 1,
                  ),
                }))
              }
            >
              {t("ui.next", "Next")}
            </button>
          </div>
        </div>
        </Card>
      </div>
    </div>
  );
}
