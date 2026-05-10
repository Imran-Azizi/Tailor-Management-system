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
  LuCircleCheck,
  LuClock,
  LuTriangleAlert,
  LuCalendarCheck,
  LuUsers,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import api from "../lib/api.js";
import { formatCurrency } from "../lib/currency.js";
import {
  formatAfghanistanReportDate,
  formatDateLocale,
  formatNumberLocale,
} from "../lib/locale.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
  getOrderTypeLabel,
} from "../lib/orderType.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useMonth } from "../context/MonthContext.jsx";
import { formatMonthYearLabel } from "../lib/months.js";
import { Spinner, Card } from "../components/ui/index.jsx";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import StatCard from "../components/monthlyReport/StatCard.jsx";
import ReportTable from "../components/monthlyReport/ReportTable.jsx";

const ORDER_TYPE_COLORS = {
  OUTFIT: "#2563EB",
  WASKAT: "#0891B2",
  KORTY: "#7C3AED",
  YAKHANQAQ: "#DC2626",
};

const CURRENCY_FORMAT_OPTIONS = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = i18n.dir?.(language) === "rtl";
  const navigate = useNavigate();
  const { isAdmin, isFinance, user } = useAuth();
  const { viewMonth, viewYear } = useMonth();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["analytics", viewMonth, viewYear, isFinance ? user?.id : null],
    queryFn: () =>
      api
        .get("/analytics/dashboard", {
          params: {
            month: viewMonth,
            year: viewYear,
          },
        })
        .then((response) => response.data),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="page">
        <Spinner />
      </div>
    );
  }

  const data = dashboardData || {};
  const monthlyChartData = (data.monthlyRevenue || []).map((item) => ({
    ...item,
    monthLabel:
      item.monthNumber && item.monthYear
        ? formatMonthYearLabel(item.monthNumber, item.monthYear, language)
        : item.month,
  }));

  const totalRakhtRevenue = Number(data.totalRakhtRevenue ?? 0) || 0;
  const totalOrderBenefit = Number(data.totalOrderBenefit ?? 0) || 0;
  const totalReadyMadeProfit = Number(data.totalReadyMadeProfit ?? 0) || 0;
  const totalReadyMadeProfitAfterExpenses =
    Number(data.totalReadyMadeProfitAfterExpenses ?? totalReadyMadeProfit) || 0;
  const netBenefit =
    totalRakhtRevenue + totalOrderBenefit + totalReadyMadeProfitAfterExpenses;
  const netBenefitIsPositive = netBenefit >= 0;
  const monthLabel = formatMonthYearLabel(viewMonth, viewYear, language);
  const generatedAtLabel = formatAfghanistanReportDate(new Date(), language);

  // ltrOrder = position when reading left→right (English)
  // rtlOrder = position when reading right→left (Dari/Pashto)
  // In RTL grid (dir="rtl"), the item with rtlOrder:1 lands in the rightmost slot.
  const statCards = [
    {
      key: "totalOrders",
      label: t("dashboardPage.totalOrders"),
      value: formatNumberLocale(data.totalOrders || 0, language),
      sub: `${t("dashboardPage.today")}: ${formatNumberLocale(data.todayOrders || 0, language)} | ${t("dashboardPage.month")}: ${formatNumberLocale(data.monthOrders || 0, language)}`,
      Icon: LuShoppingBag,
      accent: "#2563EB",
      ltrOrder: 1,
      rtlOrder: 1,
    },
    {
      key: "completedOrders",
      label: t("common.completedOrders", "Completed Orders"),
      value: formatNumberLocale(data.completedOrders || 0, language),
      sub: t("sidebar.completed", "Completed"),
      Icon: LuCircleCheck,
      accent: "#16A34A",
      onClick: () => navigate("/orders/completed"),
      ltrOrder: 14,
      rtlOrder: 14,
    },
    {
      key: "pendingOrders",
      label: t("common.pendingOrders", "Pending Orders"),
      value: formatNumberLocale(data.allPendingOrders || 0, language),
      sub: `${t("dashboardPage.month")}: ${formatNumberLocale(data.pendingOrders || 0, language)}`,
      Icon: LuClock,
      accent: "#D97706",
      onClick: () => navigate("/orders/pending"),
      ltrOrder: 15,
      rtlOrder: 15,
    },
    {
      key: "totalAmount",
      label: t("dashboardPage.totalAmount"),
      value: formatMoney(data.totalRevenue, language),
      sub: t("dashboardPage.yearOrders", {
        count: formatNumberLocale(data.yearOrders || 0, language),
      }),
      Icon: AfCurrencyIcon,
      accent: "#0891B2",
      ltrOrder: 4,
      rtlOrder: 4,
    },
    {
      key: "collected",
      label: t("dashboardPage.collected"),
      value: formatMoney(data.totalPaid, language),
      sub: `${t("dashboardPage.discount")}: ${formatMoney(data.totalDiscount, language)}`,
      Icon: AfCurrencyIcon,
      accent: "#0891B2",
      ltrOrder: 5,
      rtlOrder: 5,
    },
    {
      key: "outstanding",
      label: t("dashboardPage.outstanding"),
      value: formatMoney(data.totalRemaining, language),
      sub: t("dashboardPage.remainingBalance"),
      Icon: AfCurrencyIcon,
      accent: "#DC2626",
      onClick: () => navigate("/orders/remaining"),
      ltrOrder: 6,
      rtlOrder: 6,
    },
    {
      key: "rakhtRevenue",
      label: t("dashboardPage.totalRakhtRevenue", {
        defaultValue: "Total Rakht Revenue",
      }),
      value: formatMoney(totalRakhtRevenue, language),
      sub: t("dashboardPage.netBenefitSub", {
        defaultValue: "Total Rakht Revenue + Total Order Benefit",
      }),
      Icon: AfCurrencyIcon,
      accent: "#0F766E",
      adminOnly: true,
      onClick: () => navigate("/rakhts/revenue"),
      ltrOrder: 7,
      rtlOrder: 7,
    },
    {
      key: "orderBenefit",
      label: t("dashboardPage.totalOrderBenefit", {
        defaultValue: "Total Order Benefit",
      }),
      value: formatMoney(totalOrderBenefit, language),
      sub: t("common.total", "Total"),
      Icon: AfCurrencyIcon,
      accent: "#7C3AED",
      adminOnly: true,
      onClick: () => navigate("/orders/completed"),
      ltrOrder: 8,
      rtlOrder: 8,
    },
    {
      key: "readyMadeProfit",
      label: t("dashboardPage.totalReadyMadeProfitAfterExpenses", {
        defaultValue: "Total Ready-Made Profit (After Expenses)",
      }),
      value: formatMoney(totalReadyMadeProfitAfterExpenses, language),
      sub: t("dashboardPage.afterAllExpenses", {
        defaultValue: "After all expenses",
      }),
      Icon: AfCurrencyIcon,
      accent: "#059669",
      adminOnly: true,
      onClick: () => navigate("/orders/completed?type=READY_MADE"),
      ltrOrder: 8.5,
      rtlOrder: 8.5,
    },
    {
      key: "dailyExpenses",
      label: t(
        "dashboardPage.totalDailyExpenses",
        "Total Amount of All Daily Expenses",
      ),
      value: formatMoney(data.totalDailyExpenses ?? 0, language),
      sub: t("sidebar.dailyTasks", "Daily Expenses"),
      Icon: AfCurrencyIcon,
      accent: "#2563EB",
      onClick: () => navigate("/daily-tasks/all"),
      ltrOrder: 9,
      rtlOrder: 9,
    },
    {
      key: "totalLoan",
      label: t("dashboardPage.totalLoan", "Total Loan"),
      value: formatMoney(data.totalLoan ?? 0, language),
      sub: t("transaction.loanOption", "Loan"),
      Icon: AfCurrencyIcon,
      accent: "#D97706",
      onClick: () => navigate("/transactions?kind=LOAN"),
      ltrOrder: 10,
      rtlOrder: 10,
    },
    {
      key: "qichikarMoney",
      label: t(
        "dashboardPage.totalQichikarUsersMoney",
        "Total Money for Qichikar Workers",
      ),
      value: formatMoney(data.totalQichikarUsersMoney ?? 0, language),
      sub: t("assignment.qichikarLabel", "Qichikar"),
      Icon: AfCurrencyIcon,
      accent: "#DB2777",
      onClick: () => navigate("/orders/completed-workers?workerRole=QICHIKAR"),
      ltrOrder: 11,
      rtlOrder: 11,
    },
    {
      key: "dokhtMoney",
      label: t(
        "dashboardPage.totalDokhtUsersMoney",
        "Total Money for Dokht Workers",
      ),
      value: formatMoney(data.totalDokhtUsersMoney ?? 0, language),
      sub: t("assignment.dokhtLabel", "Dokht"),
      Icon: AfCurrencyIcon,
      accent: "#7C3AED",
      onClick: () => navigate("/orders/completed-workers?workerRole=DOKHT"),
      ltrOrder: 12,
      rtlOrder: 12,
    },
    {
      key: "emergency",
      label: t("dashboardPage.emergency"),
      value: formatNumberLocale(data.emergencyOrders || 0, language),
      sub: t("dashboardPage.active"),
      Icon: LuTriangleAlert,
      accent: "#DC2626",
      hideWhenZero: true,
      ltrOrder: 13,
      rtlOrder: 13,
    },
  ];

  const visibleStatCards = statCards
    .filter((card) => {
      if (card.adminOnly && !isAdmin) return false;
      if (!card.hideWhenZero) return true;
      const numericValue = Number(String(card.value).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(numericValue) ? numericValue !== 0 : true;
    })
    .sort((a, b) =>
      isRtl
        ? (a.rtlOrder ?? 99) - (b.rtlOrder ?? 99)
        : (a.ltrOrder ?? 99) - (b.ltrOrder ?? 99),
    );

  const orderStatusClassName = (isCompleted) =>
    isCompleted
      ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300"
      : "inline-flex rounded-full border border-amber-200 bg-amber-50/70 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-300";

  const tableColumns = [
    {
      key: "bill",
      label: t("orders.billNumber", "Bill #"),
      width: "9rem",
      cellClassName:
        "font-mono text-xs font-semibold text-slate-700 dark:text-amber-300 whitespace-nowrap",
      render: (order) => `#${order?.customer?.billNumber || "-"}`,
    },
    {
      key: "customer",
      label: t("common.customer"),
      width: "16rem",
      render: (order) => (
        <span className="block truncate font-medium text-gray-800 dark:text-slate-100">
          {getOrderPrimaryDisplayName(
            order,
            order?.customer?.firstName || "-",
            language,
          )}
        </span>
      ),
    },
    {
      key: "type",
      label: t("common.type"),
      width: "13rem",
      render: (order) => (
        <span
          className="block max-w-[12rem] truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          title={getOrderLabelParts(order, language).typeWithSequenceLabel}
        >
          {getOrderLabelParts(order, language).typeWithSequenceLabel}
        </span>
      ),
    },
    {
      key: "total",
      label: t("common.total"),
      width: "10rem",
      isNumeric: true,
      cellClassName: "whitespace-nowrap font-medium",
      render: (order) => formatMoney(order.totalPrice, language),
    },
    {
      key: "paid",
      label: t("common.paid"),
      width: "10rem",
      isNumeric: true,
      cellClassName:
        "whitespace-nowrap font-medium text-emerald-700 dark:text-emerald-300",
      render: (order) => formatMoney(order.paidAmount, language),
    },
    {
      key: "remaining",
      label: t("common.remaining", "Remaining"),
      width: "10rem",
      isNumeric: true,
      cellClassName: "whitespace-nowrap font-medium",
      render: (order) => {
        const remainingValue = Number(order.remaining || 0);
        const colorClass =
          remainingValue > 0
            ? "text-rose-700 dark:text-rose-300"
            : "text-emerald-700 dark:text-emerald-300";
        return (
          <span className={colorClass}>
            {remainingValue > 0
              ? formatMoney(remainingValue, language)
              : t("orders.paidInFull")}
          </span>
        );
      },
    },
    {
      key: "status",
      label: t("common.status", "Status"),
      width: "10rem",
      render: (order) => (
        <div
          className={`flex flex-wrap items-center gap-1.5 ${
            isRtl ? "justify-start" : "justify-end"
          }`}
        >
          {order.isEmergency ? (
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-700/60 dark:bg-rose-900/30 dark:text-rose-300">
              !
            </span>
          ) : null}
          <span className={orderStatusClassName(order.isCompleted)}>
            {order.isCompleted
              ? t("dashboardPage.statusDone")
              : t("dashboardPage.statusPending")}
          </span>
        </div>
      ),
    },
    {
      key: "date",
      label: t("common.date"),
      width: "11rem",
      cellClassName:
        "text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap",
      render: (order) =>
        formatDateLocale(order.createdAt, language, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }),
    },
  ];

  return (
    <div
      className={`page report-root dashboard-shell leading-relaxed tracking-normal ${
        isRtl ? "dashboard-shell--rtl" : "dashboard-shell--ltr"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <section className="dashboard-hero mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className="dashboard-hero-row flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="dashboard-hero-title text-start">
            <h1 className="dashboard-hero-heading text-2xl font-bold text-gray-900 dark:text-slate-100">
              {t("dashboardPage.title")}
            </h1>
            <p className="dashboard-hero-sub mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("common.viewingMonth", "Viewing data for")}:{" "}
              <strong className={isRtl ? "rtl-number-inline" : ""}>
                {monthLabel}
              </strong>
            </p>
          </div>
          <div className="dashboard-date-chip rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 text-start dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {t("common.date", "Date")}:{" "}
            <span className={isRtl ? "rtl-number-inline" : ""}>
              {generatedAtLabel}
            </span>
          </div>
        </div>
      </section>

      <div
        className="dashboard-stats-grid mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <StatCard
          className="md:col-span-2 xl:col-span-3 2xl:col-span-4"
          label={t("dashboardPage.netBenefit", "Net Benefit")}
          value={formatMoney(netBenefit, language)}
          sub={t(
            "dashboardPage.netBenefitSub",
            "Total Rakht Revenue + Total Order Benefit",
          )}
          Icon={AfCurrencyIcon}
          accent={netBenefitIsPositive ? "#16A34A" : "#DC2626"}
          emphasize
        />

        {visibleStatCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={card.value}
            sub={card.sub}
            Icon={card.Icon}
            accent={card.accent}
            onClick={card.onClick}
          />
        ))}
      </div>

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
              <Tooltip
                content={
                  <TooltipCard language={language} t={t} isRtl={isRtl} />
                }
              />
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
                data={(data.ordersByType || []).map((orderType) => ({
                  name: getOrderTypeLabel(orderType.type, language),
                  value: orderType.count,
                }))}
                cx="50%"
                cy="50%"
                outerRadius={78}
                innerRadius={38}
                dataKey="value"
                paddingAngle={3}
              >
                {(data.ordersByType || []).map((orderType, index) => (
                  <Cell
                    key={`${orderType.type}-${index}`}
                    fill={ORDER_TYPE_COLORS[orderType.type] || "#2563EB"}
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

      <Card
        title={t("dashboardPage.monthlyOrderVolume")}
        style={{ marginBottom: 24 }}
      >
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
            <Tooltip
              content={<TooltipCard language={language} t={t} isRtl={isRtl} />}
            />
            <Bar
              dataKey="count"
              fill="#2563EB"
              radius={[4, 4, 0, 0]}
              name={t("dashboardPage.orders")}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <section className="dashboard-recent-orders overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="dashboard-recent-orders__head border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5">
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">
            {t("dashboardPage.recentOrders")}
          </h3>
        </div>

        <ReportTable
          isRtl={isRtl}
          columns={tableColumns}
          rows={data.recentOrders || []}
          emptyText={t("common.noData", { defaultValue: "No data found" })}
        />
      </section>
    </div>
  );
}
