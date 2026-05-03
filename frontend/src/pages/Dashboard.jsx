import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
import {
  LuShoppingBag,
  LuSquareCheck,
  LuClock,
  LuTriangleAlert,
  LuCalendar,
  LuTrendingUp,
  LuBanknote,
  LuCalendarCheck,
  LuUser,
  LuUsers,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import api from "../lib/api.js";
import { formatCurrency } from "../lib/currency.js";
import { formatDateLocale } from "../lib/locale.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
  getOrderTypeLabel,
} from "../lib/orderType.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../lib/months.js";
import {
  StatCard,
  Spinner,
  PageHeader,
  Card,
} from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";

const TC = {
  OUTFIT: "#2563EB",
  WASKAT: "#0891B2",
  KORTY: "#7C3AED",
  YAKHANQAQ: "#DC2626",
};
const TV = { OUTFIT: "gold", WASKAT: "teal", KORTY: "amber", YAKHANQAQ: "red" };

const Tip = ({ active, payload, label, language, t }) => {
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
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}:{" "}
          <strong>
            {typeof p.value === "number"
              ? formatCurrency(p.value, language, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              : p.value}
          </strong>
        </p>
      ))}
      {payload[0]?.dataKey === "count" && (
        <p>{t("dashboardPage.tooltipOrders", { count: payload[0].value })}</p>
      )}
    </div>
  );
};

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const navigate = useNavigate();
  const { isAdmin, isFinance, user } = useAuth();
  const { viewMonth, viewYear } = useMonth();

  const { data: d, isLoading } = useQuery({
    queryKey: ["analytics", viewMonth, viewYear, isFinance ? user?.id : null],
    queryFn: () =>
      api
        .get("/analytics/dashboard", {
          params: {
            month: viewMonth,
            year: viewYear,
          },
        })
        .then((r) => r.data),
    refetchInterval: 60_000,
  });

  if (isLoading)
    return (
      <div className="page">
        <Spinner />
      </div>
    );

  const todayLabel = formatDateLocale(new Date(), language, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const monthlyChartData = (d.monthlyRevenue || []).map((item) => ({
    ...item,
    monthLabel:
      item.monthNumber && item.monthYear
        ? formatMonthYearLabel(item.monthNumber, item.monthYear, language)
        : item.month,
  }));
  const totalRakhtRevenue = Number(d.totalRakhtRevenue ?? 0) || 0;
  const totalOrderBenefit = Number(d.totalOrderBenefit ?? 0) || 0;
  const netBenefit = totalRakhtRevenue + totalOrderBenefit;
  const netBenefitIsPositive = netBenefit >= 0;

  return (
    <div className="page">
      <PageHeader title={t("dashboardPage.title")} subtitle={todayLabel} />

      {(isAdmin || isFinance) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            marginBottom: 16,
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
        </div>
      )}

      <section
        className={`dashboard-net-card${netBenefitIsPositive ? "" : " dashboard-net-card--negative"}`}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="dashboard-net-card__main">
          <p
            className={`dashboard-net-card__label${isRtl ? " dashboard-net-card__label--rtl" : ""}`}
          >
            {t("dashboardPage.netBenefit", "Net Benefit")}
          </p>
          <p className="dashboard-net-card__value">
            {formatCurrency(netBenefit, language)}
          </p>
          <p className="dashboard-net-card__sub">
            {t(
              "dashboardPage.netBenefitSub",
              "Total Rakht Revenue + Total Order Benefit",
            )}
          </p>
        </div>

        <div className="dashboard-net-card__icon" aria-hidden="true">
          <AfCurrencyIcon size={34} />
        </div>
      </section>

      <div className="g-stats" style={{ marginBottom: 20 }}>
        <StatCard
          label={t("dashboardPage.totalOrders")}
          value={d.totalOrders}
          Icon={LuShoppingBag}
          accent="#2563EB"
          sub={`${t("dashboardPage.today")}: ${d.todayOrders} · ${t("dashboardPage.month")}: ${d.monthOrders}`}
        />
        <StatCard
          label={t("dashboardPage.totalAmount")}
          value={formatCurrency(d.totalRevenue, language)}
          Icon={AfCurrencyIcon}
          accent="#16A34A"
          sub={t("dashboardPage.yearOrders", { count: d.yearOrders })}
        />
        <StatCard
          label={t("dashboardPage.collected")}
          value={formatCurrency(d.totalPaid, language)}
          Icon={LuBanknote}
          accent="#0891B2"
          sub={`${t("dashboardPage.discount")}: ${formatCurrency(d.totalDiscount, language)}`}
        />
        <StatCard
          label={t("dashboardPage.outstanding")}
          value={formatCurrency(d.totalRemaining, language)}
          Icon={LuTrendingUp}
          accent="#DC2626"
          sub={t("dashboardPage.remainingBalance")}
          onClick={() => navigate("/orders/remaining")}
        />
        <StatCard
          label={t(
            "dashboardPage.totalDailyExpenses",
            "Total Amount of All Daily Expenses",
          )}
          value={formatCurrency(d.totalDailyExpenses ?? 0, language)}
          Icon={LuSquareCheck}
          accent="#16A34A"
          sub={t("sidebar.dailyTasks", "Daily Expenses")}
        />
        <StatCard
          label={t(
            "dashboardPage.totalRakhtPrice",
            "Total Price of All Rakhts",
          )}
          value={formatCurrency(d.totalRakhtPrice ?? 0, language)}
          Icon={LuClock}
          accent="#2563EB"
          sub={t("common.total", "Total")}
        />
        <StatCard
          label={t("dashboardPage.totalLoan", "Total Loan")}
          value={formatCurrency(d.totalLoan ?? 0, language)}
          Icon={AfCurrencyIcon}
          accent="#D97706"
          sub={t("transaction.loanOption", "Loan")}
        />
        <StatCard
          label={t(
            "dashboardPage.totalQichikarUsersMoney",
            "Total Money for Qichikar Users",
          )}
          value={formatCurrency(d.totalQichikarUsersMoney ?? 0, language)}
          Icon={LuUser}
          accent="#D97706"
          sub={t("assignment.qichikarLabel", "Qichikar")}
        />
        <StatCard
          label={t(
            "dashboardPage.totalDokhtUsersMoney",
            "Total Money for Dokht Users",
          )}
          value={formatCurrency(d.totalDokhtUsersMoney ?? 0, language)}
          Icon={LuUsers}
          accent="#DB2777"
          sub={t("assignment.dokhtLabel", "Dokht")}
        />
        <StatCard
          label={t("dashboardPage.emergency")}
          value={d.emergencyOrders}
          Icon={LuTriangleAlert}
          accent="#DC2626"
          sub={t("dashboardPage.active")}
        />
        <StatCard
          label={t("dashboardPage.thisYear")}
          value={d.yearOrders}
          Icon={LuCalendar}
          accent="#7C3AED"
        />
      </div>

      <div className="g-charts" style={{ marginBottom: 20 }}>
        <Card title={t("dashboardPage.revenueTrend")}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={monthlyChartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: "var(--text3)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text3)" }}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              <Tooltip content={<Tip language={language} t={t} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--text2)" }} />
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
                data={d.ordersByType.map((o) => ({
                  name: getOrderTypeLabel(o.type, language),
                  value: o.count,
                }))}
                cx="50%"
                cy="50%"
                outerRadius={78}
                innerRadius={38}
                dataKey="value"
                paddingAngle={3}
              >
                {d.ordersByType.map((o, i) => (
                  <Cell key={i} fill={TC[o.type] || "#2563EB"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n) => [
                  t("dashboardPage.tooltipOrders", { count: v }),
                  n,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card
        title={t("dashboardPage.monthlyOrderVolume")}
        style={{ marginBottom: 20 }}
      >
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            data={monthlyChartData}
            barSize={20}
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
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
              tick={{ fontSize: 11, fill: "var(--text3)" }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<Tip language={language} t={t} />} />
            <Bar
              dataKey="count"
              fill="#2563EB"
              radius={[4, 4, 0, 0]}
              name={t("dashboardPage.orders")}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title={t("dashboardPage.recentOrders")} noPad>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {[
                  "Bill #",
                  t("common.customer"),
                  t("common.type"),
                  t("common.total"),
                  t("common.paid"),
                  t("common.status", "Status"),
                  t("common.date"),
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--primary)",
                      }}
                    >
                      #{o.customer.billNumber}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>
                      {getOrderPrimaryDisplayName(
                        o,
                        o.customer.firstName,
                        language,
                      )}
                    </span>
                  </td>
                  <td>
                    <span className={`badge bg-${TV[o.type] || "gold"}`}>
                      {getOrderLabelParts(o, language).baseTypeLabel}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {formatCurrency(o.totalPrice, language)}
                  </td>
                  <td style={{ color: "#16A34A", fontWeight: 500 }}>
                    {formatCurrency(o.paidAmount, language)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {o.isEmergency && <span className="badge bg-red">!</span>}
                      <span
                        className={`badge ${o.isCompleted ? "bg-green" : "bg-amber"}`}
                      >
                        {o.isCompleted
                          ? t("dashboardPage.statusDone")
                          : t("dashboardPage.statusPending")}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text3)" }}>
                    {formatDateLocale(o.createdAt, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
