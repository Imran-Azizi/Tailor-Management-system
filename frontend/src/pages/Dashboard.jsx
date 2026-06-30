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
  LuFactory,
  LuShieldAlert,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import api from "../lib/api.js";
import { formatCurrency } from "../lib/currency.js";
import { getOrderGrossTotal } from "../lib/orderFinancials.js";
import {
  formatAfghanistanReportDate,
  formatDateLocale,
  formatNumberLocale,
  isRtlLanguage,
} from "../lib/locale.js";
import {
  getOrderLabelParts,
  getOrderPrimaryDisplayName,
  getOrderTypeLabel,
} from "../lib/orderType.js";
import {
  getOrderCompletionBadgeStyle,
  getOrderCompletionStatus,
} from "../lib/orderCompletionStatus.js";
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

function getOrderRevenue(order) {
  if (order?.isDamageOrder) return 0;

  const finalTotalBenefit = Number(order?.finalTotalBenefit);
  if (Number.isFinite(finalTotalBenefit)) return finalTotalBenefit;

  const baseBenefit = Number(order?.totalBenefit || 0);
  if (order?.type !== "READY_MADE" && order?.type !== "READY_MADE_WASKAT") {
    return baseBenefit;
  }

  const readyMadeOriginalPrice = Number(
    order?.type === "READY_MADE"
      ? order?.readyMadeOriginalPrice || 0
      : order?.readyMadeWaskatOriginalPrice || 0,
  );

  return baseBenefit - readyMadeOriginalPrice;
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
  const isRtl = isRtlLanguage(language);
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
  const totalReadyMadeWaskatProfit =
    Number(data.totalReadyMadeWaskatProfit ?? 0) || 0;
  const totalReadyMadeWaskatProfitAfterExpenses =
    Number(
      data.totalReadyMadeWaskatProfitAfterExpenses ??
        totalReadyMadeWaskatProfit,
    ) || 0;

  const otherItemsTotalProfit = Number(data.otherItemsTotalProfit ?? 0) || 0;
  const totalExpenses =
    Number(data.totalExpenses ?? data.totalDailyExpenses ?? 0) || 0;
  const fallbackNetBenefit =
    totalRakhtRevenue +
    totalOrderBenefit +
    totalReadyMadeProfitAfterExpenses +
    totalReadyMadeWaskatProfitAfterExpenses +
    otherItemsTotalProfit -
    totalExpenses;
  const netBenefit =
    Number(data.netProfit ?? data.netBenefit ?? fallbackNetBenefit) || 0;
  const netBenefitIsPositive = netBenefit >= 0;
  const monthLabel = formatMonthYearLabel(viewMonth, viewYear, language);
  const generatedAtLabel = formatAfghanistanReportDate(new Date(), language);

  // ltrOrder = position when reading left→right (English)
  // rtlOrder = position when reading right→left (Dari/Pashto)
  // In RTL grid (dir="rtl"), the item with rtlOrder:1 lands in the rightmost slot.
  const statCards = [
    {
      key: "otherItemsTotalProfit",
      label: t(
        "dashboardPage.otherItemsTotalProfit",
        "Other Items Total Profit",
      ),
      value: formatMoney(otherItemsTotalProfit, language),
      Icon: LuFactory,
      accent: "#F59E42",
      adminOnly: true,
      onClick: () => navigate("/item-sales/records"),
      ltrOrder: 22,
      rtlOrder: 22,
    },
    {
      key: "totalOrders",
      label: t("dashboardPage.totalOrders"),
      value: formatNumberLocale(data.totalOrders || 0, language),
      Icon: LuShoppingBag,
      accent: "#2563EB",
      ltrOrder: 1,
      rtlOrder: 1,
    },
    {
      key: "completedOrders",
      label: t("common.completedOrders", "Completed Orders"),
      value: formatNumberLocale(data.completedOrders || 0, language),
      Icon: LuCircleCheck,
      accent: "#16A34A",
      onClick: () => navigate("/orders/completed"),
      ltrOrder: 2,
      rtlOrder: 2,
    },
    {
      key: "pendingOrders",
      label: t("common.pendingOrders", "Pending Orders"),
      value: formatNumberLocale(data.allPendingOrders || 0, language),
      Icon: LuClock,
      accent: "#D97706",
      onClick: () => navigate("/orders/pending"),
      ltrOrder: 3,
      rtlOrder: 3,
    },
    {
      key: "totalAmount",
      label: t("dashboardPage.totalAmount"),
      value: formatMoney(
        data.totalGrossOrderPrice ?? data.totalRevenue ?? 0,
        language,
      ),
      Icon: AfCurrencyIcon,
      accent: "#0891B2",
      ltrOrder: 4,
      rtlOrder: 4,
    },
    {
      key: "collected",
      label: t("dashboardPage.collected"),
      value: formatMoney(data.totalPaid, language),
      Icon: AfCurrencyIcon,
      accent: "#0891B2",
      ltrOrder: 5,
      rtlOrder: 5,
    },
    {
      key: "totalDiscounts",
      label: t("dashboardPage.totalDiscounts", "Total Discounts"),
      value: formatMoney(
        data.totalDiscountAllOrders ?? data.totalDiscount ?? 0,
        language,
      ),
      Icon: AfCurrencyIcon,
      accent: "#9333EA",
      adminOnly: true,
      ltrOrder: 6,
      rtlOrder: 6,
    },
    {
      key: "outstanding",
      label: t("dashboardPage.outstanding"),
      value: formatMoney(data.totalRemaining, language),
      Icon: AfCurrencyIcon,
      accent: "#DC2626",
      onClick: () => navigate("/orders/remaining"),
      ltrOrder: 7,
      rtlOrder: 7,
    },
    {
      key: "rakhtRevenue",
      label: t("dashboardPage.totalRakhtRevenue", {
        defaultValue: "Total Rakht Revenue",
      }),
      value: formatMoney(totalRakhtRevenue, language),
      Icon: AfCurrencyIcon,
      accent: "#0F766E",
      adminOnly: true,
      onClick: () => navigate("/rakhts/revenue"),
      ltrOrder: 20,
      rtlOrder: 20,
    },
    {
      key: "orderBenefit",
      label: t("dashboardPage.totalOrderBenefit", {
        defaultValue: "Total Order Benefit",
      }),
      value: formatMoney(totalOrderBenefit, language),
      Icon: AfCurrencyIcon,
      accent: "#7C3AED",
      adminOnly: true,
      onClick: () => navigate("/orders/completed"),
      ltrOrder: 21,
      rtlOrder: 21,
    },
    {
      key: "readyMadeProfit",
      label: t("dashboardPage.totalReadyMadeProfitAfterExpenses", {
        defaultValue: "Total Ready-Made Profit (After Expenses)",
      }),
      value: formatMoney(totalReadyMadeProfitAfterExpenses, language),
      Icon: AfCurrencyIcon,
      accent: "#059669",
      adminOnly: true,
      onClick: () => navigate("/orders/completed?type=READY_MADE"),
      ltrOrder: 23,
      rtlOrder: 23,
    },
    {
      key: "readyMadeWaskatProfit",
      label: t("dashboardPage.totalReadyMadeWaskatProfitAfterExpenses", {
        defaultValue: "Total Ready-Made Waskat Profit (After Expenses)",
      }),
      value: formatMoney(totalReadyMadeWaskatProfitAfterExpenses, language),
      Icon: AfCurrencyIcon,
      accent: "#0284C7",
      adminOnly: true,
      onClick: () => navigate("/orders/completed?type=READY_MADE_WASKAT"),
      ltrOrder: 24,
      rtlOrder: 24,
    },
    {
      key: "dailyExpenses",
      label: t(
        "dashboardPage.totalExpenses",
        "Total Expenses",
      ),
      value: formatMoney(totalExpenses, language),
      Icon: AfCurrencyIcon,
      accent: "#2563EB",
      onClick: () => navigate("/daily-tasks/all"),
      ltrOrder: 30,
      rtlOrder: 30,
    },
    {
      key: "totalLoan",
      label: t("dashboardPage.totalLoan", "Total Loan"),
      value: formatMoney(data.totalLoan ?? 0, language),
      Icon: AfCurrencyIcon,
      accent: "#D97706",
      onClick: () => navigate("/transactions?kind=LOAN"),
      ltrOrder: 31,
      rtlOrder: 31,
    },
    {
      key: "damagedClothesMoney",
      label: t(
        "dashboardPage.damagedClothesMoney",
        "Total Money of Damaged Orders",
      ),
      value: formatMoney(data.totalDamagedClothesMoney ?? 0, language),
      Icon: AfCurrencyIcon,
      accent: "#B91C1C",
      adminOnly: true,
      onClick: () => navigate("/damaged-clothes"),
      ltrOrder: 32,
      rtlOrder: 32,
    },
    {
      key: "qichikarMoney",
      label: t(
        "dashboardPage.totalQichikarUsersMoney",
        "Total Money for Qichikar Workers",
      ),
      value: formatMoney(data.totalQichikarUsersMoney ?? 0, language),
      Icon: AfCurrencyIcon,
      accent: "#DB2777",
      onClick: () => navigate("/orders/completed-workers?workerRole=QICHIKAR"),
      ltrOrder: 40,
      rtlOrder: 40,
    },
    {
      key: "dokhtMoney",
      label: t(
        "dashboardPage.totalDokhtUsersMoney",
        "Total Money for Dokht Workers",
      ),
      value: formatMoney(data.totalDokhtUsersMoney ?? 0, language),
      Icon: AfCurrencyIcon,
      accent: "#7C3AED",
      onClick: () => navigate("/orders/completed-workers?workerRole=DOKHT"),
      ltrOrder: 41,
      rtlOrder: 41,
    },
    {
      key: "emergency",
      label: t("dashboardPage.emergency"),
      value: formatNumberLocale(data.emergencyOrders || 0, language),
      Icon: LuTriangleAlert,
      accent: "#DC2626",
      hideWhenZero: true,
      ltrOrder: 8,
      rtlOrder: 8,
    },
    {
      key: "damagedClothes",
      label: t("dashboardPage.damagedClothes", "Damaged Clothes"),
      value: formatNumberLocale(data.damagedClothesTotal || 0, language),
      Icon: LuShieldAlert,
      accent: "#B91C1C",
      adminOnly: true,
      onClick: () => navigate("/damaged-clothes"),
      ltrOrder: 9,
      rtlOrder: 9,
    },
  ];

  const visibleStatCards = statCards
    .filter((card) => {
      if (card.adminOnly && !isAdmin) return false;
      if (!card.hideWhenZero) return true;
      const numericValue = Number(String(card.value).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(numericValue) ? numericValue !== 0 : true;
    })
    .sort((a, b) => {
      const orderKey = isRtl ? "rtlOrder" : "ltrOrder";
      return (a[orderKey] ?? 99) - (b[orderKey] ?? 99);
    });

  const orderStatusClassName =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold";

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
      render: (order) => formatMoney(getOrderGrossTotal(order), language),
    },
    {
      key: "revenue",
      label: t("dashboardPage.revenue", "Revenue"),
      width: "10rem",
      isNumeric: true,
      cellClassName: "whitespace-nowrap font-medium",
      render: (order) => formatMoney(getOrderRevenue(order), language),
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
          {(() => {
            const status = getOrderCompletionStatus(order, t);
            return (
              <span
                className={orderStatusClassName}
                style={getOrderCompletionBadgeStyle(status)}
                title={status.detail || status.label}
              >
                {status.label}
              </span>
            );
          })()}
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
  const displayColumns = tableColumns;

  return (
    <div
      className={`page report-root professional-report-page dashboard-shell leading-relaxed tracking-normal ${
        isRtl ? "dashboard-shell--rtl" : "dashboard-shell--ltr"
      }`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <section className="dashboard-hero mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div className={`dashboard-hero-row flex flex-col gap-4 lg:items-center ${isRtl ? 'lg:flex-row' : 'lg:flex-row lg:justify-between'}`}>
          <div className={`dashboard-hero-title ${isRtl ? 'text-end' : 'text-start'}`}>
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
          <div className={`dashboard-date-chip rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 ${isRtl ? 'text-end lg:ms-auto' : 'text-start'} dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
            {t("common.date", "Date")}:{" "}
            <span className={isRtl ? "rtl-number-inline" : ""}>
              {generatedAtLabel}
            </span>
          </div>
        </div>
      </section>

      <div
        className="dashboard-stats-grid mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <StatCard
          className="md:col-span-2 xl:col-span-3"
          label={t("dashboardPage.netBenefit", "Net Benefit")}
          value={formatMoney(netBenefit, language)}
          Icon={AfCurrencyIcon}
          accent={netBenefitIsPositive ? "#16A34A" : "#DC2626"}
          emphasize
        />

        {visibleStatCards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={card.value}
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

      <section
        className="dashboard-recent-orders overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className={`dashboard-recent-orders__head border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5 ${isRtl ? 'text-right' : ''}`}>
          <h3 className={`text-base font-semibold text-gray-900 dark:text-slate-100 ${isRtl ? 'text-right' : ''}`}>
            {t("dashboardPage.recentOrders")}
          </h3>
        </div>

        <ReportTable
          isRtl={isRtl}
          columnFlow={isRtl ? "rtl" : "ltr"}
          columns={displayColumns}
          rows={data.recentOrders || []}
          emptyText={t("common.noData", { defaultValue: "No data found" })}
        />
      </section>
    </div>
  );
}
