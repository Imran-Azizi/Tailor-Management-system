import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuBadgeDollarSign,
  LuFactory,
  LuRuler,
  LuShoppingBag,
} from "react-icons/lu";
import api from "../lib/api.js";
import {
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  StatCard,
} from "../components/ui/index.jsx";

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMeters(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function RakhtRevenue() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["rakht-revenue-summary"],
    queryFn: () => api.get("/rakhts/revenue/summary").then((res) => res.data),
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
    avgSellingPricePerMeter: 0,
    byCompany: [],
  };

  return (
    <div className="page">
      <PageHeader
        title={t("rakht.totalRevenue", { defaultValue: "Total Revenue" })}
        subtitle={t("rakht.totalRevenueSubtitle", {
          defaultValue:
            "Overall earnings from Rakht sales based on sold meters and selling price per meter.",
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
          value={`$${formatMoney(summary.totalRevenue)}`}
          Icon={LuBadgeDollarSign}
          accent="#0F766E"
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
          value={`$${formatMoney(summary.avgSellingPricePerMeter)}`}
          Icon={LuFactory}
          accent="#D97706"
        />
      </div>

      <Card
        title={t("rakht.revenueByCompany", {
          defaultValue: "Revenue by Company",
        })}
        noPad
      >
        {summary.byCompany?.length ? (
          <div className="tbl-wrap">
            <table
              className="tbl"
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr style={{ background: "var(--surface2)" }}>
                  <th>{t("rakht.companyName", { defaultValue: "Company" })}</th>
                  <th>
                    {t("rakht.totalRevenueOrders", { defaultValue: "Orders" })}
                  </th>
                  <th>
                    {t("rakht.totalSoldMeters", { defaultValue: "Meters" })}
                  </th>
                  <th>
                    {t("rakht.avgSellingPricePerMeter", {
                      defaultValue: "Avg Price / Meter",
                    })}
                  </th>
                  <th>
                    {t("rakht.totalRevenue", { defaultValue: "Revenue" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.byCompany.map((row) => (
                  <tr key={row.companyName}>
                    <td style={{ fontWeight: 700 }}>{row.companyName}</td>
                    <td>{Number(row.orderCount || 0)}</td>
                    <td>{formatMeters(row.metersSold)} m</td>
                    <td>${formatMoney(row.avgSellingPricePerMeter)}</td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>
                      ${formatMoney(row.revenue)}
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
      </Card>
    </div>
  );
}
