import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  LuCalendar,
  LuChartPie,
  LuPhone,
  LuPrinter,
  LuShoppingBag,
  LuTrendingUp,
  LuUsers,
} from "react-icons/lu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import api from "../lib/api.js";
import { getOrderTypeLabel } from "../lib/orderType.js";
import { formatSystemDate } from "../lib/locale.js";
import { formatReportMoney } from "../lib/currency.js";
import {
  Card,
  EmptyState,
  Spinner,
  StatCard,
} from "../components/ui/index.jsx";
import {
  ReportKpiGrid,
  ReportNum,
  ReportShell,
  useReportLocale,
} from "../components/reports/ReportKit.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";

const PIE_COLORS = ["#2563EB", "#0D9488", "#D97706", "#DC2626", "#7C3AED"];

export default function CustomerReport() {
  const { t } = useTranslation();
  const { language, isRtl } = useReportLocale();

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: () => api.get("/analytics/dashboard").then((r) => r.data),
  });

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["customers-report"],
    queryFn: () =>
      api
        .get("/customers", { params: { limit: 10, page: 1 } })
        .then((r) => r.data),
  });

  const isLoading = analyticsLoading || customersLoading;
  const customers = customersData?.data || [];

  const typeBreakdown = analytics?.ordersByType || [];
  const pieData = typeBreakdown.map((item) => ({
    name: getOrderTypeLabel(item.type || item._id, language),
    value: item._count || item.count || item.value || 0,
  }));

  const monthly = analytics?.monthlyRevenue || [];

  return (
    <ReportShell
      className="customer-report-page"
      title={t("report.title", "Report")}
      subtitle={t("report.subtitle")}
      actions={
        <button
          type="button"
          className="btn btn-outline btn-sm no-print"
          onClick={() => window.print()}
        >
          <LuPrinter size={14} />
          {t("common.print")}
        </button>
      }
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <ReportKpiGrid>
            <StatCard
              label={t("report.totalCustomers")}
              value={customersData?.total ?? 0}
              Icon={LuUsers}
              accent="#2563EB"
            />
            <StatCard
              label={t("report.totalOrders")}
              value={analytics?.totalOrders ?? 0}
              Icon={LuShoppingBag}
              accent="#7C3AED"
            />
            <StatCard
              label={t("report.totalRevenue")}
              value={formatReportMoney(analytics?.totalRevenue, language)}
              Icon={AfCurrencyIcon}
              accent="#16A34A"
            />
            <StatCard
              label={t("report.totalPending")}
              value={formatReportMoney(
                analytics?.totalRemaining ?? analytics?.totalPending,
                language,
              )}
              Icon={AfCurrencyIcon}
              accent="#DC2626"
            />
          </ReportKpiGrid>

          <div
            className="report-chart-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            <Card
              title={
                <span
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <LuTrendingUp size={15} style={{ color: "var(--primary)" }} />
                  {t("report.monthlyRevenue")}
                </span>
              }
            >
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthly} barSize={18}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "var(--text3)" }}
                      reversed={isRtl}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--text3)" }}
                      orientation={isRtl ? "right" : "left"}
                    />
                    <Tooltip
                      formatter={(v) => formatReportMoney(v, language)}
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  message={t("common.noData")}
                  Icon={LuTrendingUp}
                />
              )}
            </Card>

            <Card
              title={
                <span
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <LuChartPie size={15} style={{ color: "var(--primary)" }} />
                  {t("report.ordersByType")}
                </span>
              }
            >
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                      fontSize={11}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message={t("common.noData")} Icon={LuChartPie} />
              )}
            </Card>
          </div>

          <Card
            title={
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <LuUsers size={15} style={{ color: "var(--primary)" }} />
                {t("report.topCustomers")}
              </span>
            }
            noPad
          >
            {customers.length === 0 ? (
              <EmptyState message={t("common.noData")} Icon={LuUsers} />
            ) : (
              <div className="tbl-wrap professional-report-table-wrap">
                <table className="tbl professional-report-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}>#</th>
                      <th>{t("common.customer")}</th>
                      <th>{t("common.phone", "Phone")}</th>
                      <th className="report-cell-num">
                        {t("report.orderCount")}
                      </th>
                      <th>{t("common.date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr key={c.id}>
                        <td style={{ color: "var(--text3)", fontWeight: 600 }}>
                          {i + 1}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: "50%",
                                background: "var(--primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 12,
                                flexShrink: 0,
                              }}
                            >
                              {String(c.firstName || "-")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13 }}>
                                {c.firstName}
                              </p>
                              <p
                                style={{
                                  fontSize: 11,
                                  color: "var(--text3)",
                                }}
                              >
                                <ReportNum>#{c.billNumber}</ReportNum>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--text2)" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <LuPhone size={11} />
                            <ReportNum>{c.phoneNumber}</ReportNum>
                          </span>
                        </td>
                        <td className="report-cell-num">
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 99,
                              background: "var(--primary-100)",
                              color: "var(--primary)",
                            }}
                          >
                            {c._count?.orders ?? 0}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text3)" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <LuCalendar size={11} />
                            {formatSystemDate(c.createdAt, language)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </ReportShell>
  );
}
