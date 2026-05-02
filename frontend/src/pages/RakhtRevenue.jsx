import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuBadgeDollarSign,
  LuFactory,
  LuFilter,
  LuRuler,
  LuShoppingBag,
} from "react-icons/lu";
import api from "../lib/api.js";
import { formatCurrency } from "../lib/currency.js";
import { formatDateLocale } from "../lib/locale.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import {
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
} from "../components/ui/index.jsx";
import { useMonth } from "../context/MonthContext.jsx";

function formatMeters(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

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
      <div className="page">
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

  return (
    <div className="page">
      <PageHeader
        title={t("rakht.totalRevenue", { defaultValue: "Total Revenue" })}
        subtitle={t("rakht.totalRevenueSubtitle", {
          defaultValue:
            "Revenue is calculated from Rakht Benefit: total customer selling amount minus total rakht cost.",
        })}
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
          value={formatCurrency(summary.totalRevenue, language)}
          Icon={LuBadgeDollarSign}
          accent="#0F766E"
          sub={t("rakht.benefit", { defaultValue: "Rakht Benefit" })}
        />
        <StatCard
          label={t("rakht.totalSoldMeters", {
            defaultValue: "Total Sold Meters",
          })}
          value={`${formatMeters(summary.totalMetersSold)} m`}
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
          value={formatCurrency(summary.avgSellingPricePerMeter, language)}
          Icon={LuFactory}
          accent="#D97706"
        />
      </div>

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
            <label className="lbl">{t("rakht.companyName", "Company")}</label>
            <select
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
              {summary.filters.companies.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">{t("rakht.brandName", "Brand")}</label>
            <select
              className="inp"
              value={filters.brandName}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  brandName: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">{t("common.all", "All")}</option>
              {summary.filters.brands.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">{t("rakht.tonName", "Ton")}</label>
            <select
              className="inp"
              value={filters.tonName}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  tonName: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">{t("common.all", "All")}</option>
              {summary.filters.tons.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">
              {t("createOrder.orderTypes", "Order Type")}
            </label>
            <select
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

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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

      <Card
        title={t("rakht.revenueDetails", {
          defaultValue: "Rakht Revenue Details",
        })}
        noPad
      >
        {summary.details?.length ? (
          <div className="tbl-wrap">
            <table className="tbl" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>{t("common.date", "Date")}</th>
                  <th>{t("orders.orderId", "Order ID")}</th>
                  <th>{t("createOrder.customerInfo", "Customer")}</th>
                  <th>{t("rakht.companyName", "Company")}</th>
                  <th>{t("rakht.brandName", "Brand")}</th>
                  <th>{t("rakht.tonName", "Ton")}</th>
                  <th>{t("createOrder.orderTypes", "Type")}</th>
                  <th>{t("rakht.requiredMeters", "Meters")}</th>
                  <th>{t("rakht.piecePrice", "Cost/Meter")}</th>
                  <th>{t("rakht.priceForCustomer", "Sell/Meter")}</th>
                  <th>{t("rakht.benefit", "Benefit")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.details.map((row) => (
                  <tr key={row.orderId}>
                    <td>
                      {formatDateLocale(row.createdAt, language, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>{row.orderId.slice(0, 8)}</td>
                    <td>{row.customerName}</td>
                    <td>{row.companyName}</td>
                    <td>{row.brandName}</td>
                    <td>{row.tonName}</td>
                    <td>{getOrderTypeLabel(row.orderType, language)}</td>
                    <td>{formatMeters(row.meters)}</td>
                    <td>{formatCurrency(row.costPerMeter, language)}</td>
                    <td>{formatCurrency(row.sellingPerMeter, language)}</td>
                    <td
                      style={{
                        color:
                          row.benefit >= 0 ? "var(--success)" : "var(--danger)",
                        fontWeight: 700,
                      }}
                    >
                      {formatCurrency(row.benefit, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            message={t("common.noData", { defaultValue: "No data found" })}
            Icon={LuFactory}
          />
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: 12,
            borderTop: "1px solid var(--border)",
          }}
        >
          <p style={{ fontSize: 12, color: "var(--text3)" }}>
            {t("common.page", "Page")} {summary.pagination.page} /{" "}
            {summary.pagination.totalPages} · {t("common.total", "Total")}:{" "}
            {summary.pagination.total}
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
              {t("common.previous", "Previous")}
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
              {t("common.next", "Next")}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
