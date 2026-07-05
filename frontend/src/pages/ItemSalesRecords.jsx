import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuFilter,
  LuPackageCheck,
  LuSearch,
  LuTrendingUp,
  LuWallet,
} from "react-icons/lu";
import api from "../lib/api.js";
import { formatCurrency } from "../lib/currency.js";
import { formatSystemDateTime } from "../lib/locale.js";
import {
  ITEM_CATEGORIES,
  getItemCategoryLabel,
} from "../components/design/ItemsTab.jsx";
import {
  PageHeader,
  StatCard,
  LoadingState,
  EmptyState,
} from "../components/ui/index.jsx";
import MobileFilterPanel from "../components/ui/MobileFilterPanel.jsx";

const EMPTY_FILTERS = {
  search: "",
  name: "",
  code: "",
  brand: "",
  type: "",
  stockStatus: "",
};

export default function ItemSalesRecords() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const activeFilters = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) =>
          String(value || "").trim(),
        ),
      ),
    [filters],
  );

  const salesQuery = useQuery({
    queryKey: ["item-sales", activeFilters],
    queryFn: () =>
      api
        .get("/item-sales", { params: { ...activeFilters, pageSize: 100 } })
        .then((res) => res.data),
  });

  const statsQuery = useQuery({
    queryKey: ["item-sales", "stats", activeFilters],
    queryFn: () =>
      api
        .get("/item-sales/stats", { params: activeFilters })
        .then((res) => res.data),
  });

  const sales = salesQuery.data?.sales || [];
  const stats = statsQuery.data || {};
  const activeFilterCount = Object.keys(activeFilters).length;

  const setFilter = (field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="page item-sales-records-page" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        title={t("items.records.title", { defaultValue: "Sold Item Records" })}
        subtitle={t("items.records.subtitle", {
          defaultValue:
            "Track revenue, profit, stock health, and item sales history.",
        })}
      />

      <div className="item-record-stats">
        <StatCard
          label={t("common.total", { defaultValue: "Total" })}
          value={formatCurrency(stats.totalRevenue, language)}
          Icon={LuWallet}
          accent="#2563EB"
        />
        <StatCard
          label={t("items.records.totalProfit", {
            defaultValue: "Total Profit",
          })}
          value={formatCurrency(stats.totalProfit, language)}
          Icon={LuTrendingUp}
          accent="#059669"
        />
        <StatCard
          label={t("items.records.totalSold", {
            defaultValue: "Total Sold Items",
          })}
          value={stats.totalSoldItems || 0}
          Icon={LuPackageCheck}
          accent="#7C3AED"
        />
      </div>

      <MobileFilterPanel
        activeCount={activeFilterCount}
        clearDisabled={activeFilterCount === 0}
        isApplying={salesQuery.isFetching || statsQuery.isFetching}
        onClear={() => setFilters(EMPTY_FILTERS)}
        title={t("common.filters", "Filters")}
      >
        <section className="card item-record-filters">
          <div className="item-record-filters-head">
            <h3>
              <LuFilter size={17} />
              {t("items.records.filters", { defaultValue: "Filters" })}
            </h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              {t("common.reset", { defaultValue: "Reset" })}
            </button>
          </div>
          <div className="item-record-filter-grid">
            <label className="items-field">
              <span>{t("common.search", { defaultValue: "Search" })}</span>
              <div className="items-code-search">
                <LuSearch size={16} />
                <input
                  className="inp"
                  value={filters.search}
                  onChange={(event) => setFilter("search", event.target.value)}
                  placeholder={t("items.records.searchAny", {
                    defaultValue: "Name, brand, or code",
                  })}
                />
              </div>
            </label>
            <label className="items-field">
              <span>{t("items.fields.name", { defaultValue: "Item Name" })}</span>
              <input
                className="inp"
                value={filters.name}
                onChange={(event) => setFilter("name", event.target.value)}
              />
            </label>
            <label className="items-field">
              <span>{t("items.fields.code", { defaultValue: "Code" })}</span>
              <input
                className="inp"
                value={filters.code}
                onChange={(event) => setFilter("code", event.target.value)}
              />
            </label>
            <label className="items-field">
              <span>
                {t("items.sell.itemType", { defaultValue: "Item Type" })}
              </span>
              <select
                className="inp"
                value={filters.type}
                onChange={(event) => setFilter("type", event.target.value)}
              >
                <option value="">
                  {t("common.all", { defaultValue: "All" })}
                </option>
                {ITEM_CATEGORIES.map((category) => (
                  <option key={category.key} value={category.key}>
                    {getItemCategoryLabel(category.key, t)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </MobileFilterPanel>

      <section className="card item-record-table-card">
        <header className="card-hd">
          <h3>
            {t("items.records.tableTitle", { defaultValue: "Sales Records" })}
          </h3>
        </header>
        {salesQuery.isLoading ? (
          <LoadingState
            message={t("common.loading", { defaultValue: "Loading..." })}
          />
        ) : sales.length ? (
          <div className="items-table-wrap">
            <table className="tbl items-table">
              <thead>
                <tr>
                  <th>{t("items.sell.itemType", { defaultValue: "Type" })}</th>
                  <th>{t("items.fields.name", { defaultValue: "Name" })}</th>
                  <th>{t("items.fields.brand", { defaultValue: "Brand" })}</th>
                  <th>{t("items.fields.code", { defaultValue: "Code" })}</th>
                  <th>
                    {t("items.fields.originalPrice", {
                      defaultValue: "Original Price",
                    })}
                  </th>
                  <th>
                    {t("items.sell.customerPrice", {
                      defaultValue: "Customer Price",
                    })}
                  </th>
                  <th>{t("items.sell.profit", { defaultValue: "Profit" })}</th>
                  <th>
                    {t("items.sell.quantitySold", {
                      defaultValue: "Quantity",
                    })}
                  </th>
                  <th>
                    {t("items.records.createdBy", {
                      defaultValue: "Created By",
                    })}
                  </th>
                  <th>
                    {t("items.records.date", { defaultValue: "Date & Time" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{getItemCategoryLabel(sale.type, t)}</td>
                    <td>
                      <strong>{sale.name}</strong>
                    </td>
                    <td>{sale.brand}</td>
                    <td>
                      <span className="code-chip">{sale.code}</span>
                    </td>
                    <td>{formatCurrency(sale.originalPrice, language)}</td>
                    <td>{formatCurrency(sale.customerPrice, language)}</td>
                    <td
                      className={
                        sale.profit >= 0 ? "profit-positive" : "profit-negative"
                      }
                    >
                      {formatCurrency(sale.profit, language)}
                    </td>
                    <td>{sale.quantitySold}</td>
                    <td>{sale.createdBy?.name || "-"}</td>
                    <td>{formatSystemDateTime(sale.createdAt, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            message={t("items.records.empty", {
              defaultValue: "No sold item records found.",
            })}
          />
        )}
      </section>
    </div>
  );
}
