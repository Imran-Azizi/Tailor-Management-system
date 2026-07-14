import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../lib/currency.js";
import { formatNumberLocale } from "../../lib/locale.js";
import { Card } from "../ui/index.jsx";
import { CardSkeleton } from "../ui/Skeleton.jsx";

const ORDER_TYPE_COLORS = {
  OUTFIT: "#2563EB",
  WASKAT: "#16A34A",
  KORTY: "#F97316",
  YAKHANQAQ: "#7C3AED",
  READY_MADE: "#DC2626",
  READY_MADE_WASKAT: "#0891B2",
  FOREIGN_SHIPPING: "#64748B",
};

const CURRENCY_FORMAT_OPTIONS = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  trimTrailingZeros: true,
};

function formatMoney(value, language) {
  return formatCurrency(value, language, CURRENCY_FORMAT_OPTIONS);
}

const TooltipCard = ({ active, payload, label, language, t, isRtl }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "var(--sh-lg)",
        fontSize: 12,
        direction: isRtl ? "rtl" : "ltr",
        textAlign: isRtl ? "right" : "left",
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((item, index) => {
        const isCount = item?.dataKey === "count";
        return (
          <p key={`${item.name}-${index}`} style={{ color: item.color }}>
            {item.name}:{" "}
            <strong>
              {isCount
                ? formatNumberLocale(item.value, language)
                : formatMoney(item.value, language)}
            </strong>
          </p>
        );
      })}
      {payload[0]?.dataKey === "count" && (
        <p>{t("dashboardPage.tooltipOrders", { count: payload[0].value })}</p>
      )}
    </div>
  );
};

export default function DashboardCharts({
  monthlyChartData = [],
  ordersByTypeChartData = [],
  isRtl = false,
  language,
}) {
  const { t } = useTranslation();
  const lineChartTooltip = useMemo(
    () => <TooltipCard language={language} t={t} isRtl={isRtl} />,
    [language, t, isRtl],
  );

  if (!monthlyChartData.length && !ordersByTypeChartData.length) {
    return (
      <div className="g-charts dashboard-charts-grid mb-6">
        <CardSkeleton height={220} />
        <CardSkeleton height={220} />
      </div>
    );
  }

  return (
    <>
      <div className="g-charts dashboard-charts-grid mb-6">
        <Card title={t("dashboardPage.revenueTrend")}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={monthlyChartData}
              margin={{
                top: 4,
                right: isRtl ? 2 : 4,
                bottom: 0,
                left: isRtl ? 6 : 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: "var(--text3)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                orientation={isRtl ? "right" : "left"}
                tick={{ fontSize: 11, fill: "var(--text3)" }}
                axisLine={false}
                tickLine={false}
                width={54}
              />
              <Tooltip content={lineChartTooltip} />
              <Legend
                align={isRtl ? "right" : "center"}
                wrapperStyle={{
                  fontSize: 12,
                  color: "var(--text2)",
                  direction: isRtl ? "rtl" : "ltr",
                  textAlign: isRtl ? "right" : "center",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={false}
                name={t("dashboardPage.revenue")}
              />
              <Line
                type="monotone"
                dataKey="paid"
                stroke="#0891B2"
                strokeWidth={2}
                dot={false}
                name={t("dashboardPage.collectedLine")}
                strokeDasharray="4 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title={t("dashboardPage.ordersByType")}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ordersByTypeChartData}
                cx="50%"
                cy="50%"
                outerRadius={78}
                innerRadius={38}
                dataKey="value"
                paddingAngle={3}
              >
                {ordersByTypeChartData.map((orderType, index) => (
                  <Cell
                    key={`${orderType.type}-${index}`}
                    fill={
                      ORDER_TYPE_COLORS[orderType.type] ||
                      ORDER_TYPE_COLORS.FOREIGN_SHIPPING
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  t("dashboardPage.tooltipOrders", { count: value }),
                  name,
                ]}
                contentStyle={{
                  direction: isRtl ? "rtl" : "ltr",
                  textAlign: isRtl ? "right" : "left",
                }}
              />
              <Legend
                align={isRtl ? "right" : "center"}
                wrapperStyle={{
                  fontSize: 11,
                  direction: isRtl ? "rtl" : "ltr",
                  textAlign: isRtl ? "right" : "center",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title={t("dashboardPage.monthlyOrderVolume")} style={{ marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={monthlyChartData}
            barSize={20}
            margin={{
              top: 4,
              right: isRtl ? 2 : 4,
              bottom: 0,
              left: isRtl ? 4 : 0,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 11, fill: "var(--text3)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              orientation={isRtl ? "right" : "left"}
              tick={{ fontSize: 11, fill: "var(--text3)" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip content={lineChartTooltip} />
            <Bar
              dataKey="count"
              fill="#2563EB"
              radius={[4, 4, 0, 0]}
              name={t("dashboardPage.orders")}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
