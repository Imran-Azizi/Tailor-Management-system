import { lazy, Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  LuShoppingBag,
  LuCircleCheck,
  LuClock,
  LuTriangleAlert,
  LuFactory,
  LuShieldAlert,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import api from "../lib/api.js";
import { PERMISSIONS } from "../lib/permissions.js";
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
import { visiblePollInterval } from "../lib/queryPoll.js";
import AfCurrencyIcon from "../components/ui/AfCurrencyIcon.jsx";
import { DashboardSkeleton, CardSkeleton } from "../components/ui/Skeleton.jsx";
import StatCard from "../components/monthlyReport/StatCard.jsx";
import ReportTable from "../components/monthlyReport/ReportTable.jsx";

const DashboardCharts = lazy(
  () => import("../components/dashboard/DashboardCharts.jsx"),
);

const CURRENCY_FORMAT_OPTIONS = {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  trimTrailingZeros: true,
};

function formatMoney(value, language) {
  return formatCurrency(value, language, CURRENCY_FORMAT_OPTIONS);
}

function getOrderRevenue(order) {
  if (order?.isDamageOrder) return 0;

  const finalTotalBenefit = Number(order?.finalTotalBenefit);
  if (Number.isFinite(finalTotalBenefit)) return finalTotalBenefit;

  return Number(order?.totalBenefit || 0);
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const isRtl = isRtlLanguage(language);
  const navigate = useNavigate();
  const { isAdmin, isFinance, user, hasPermission } = useAuth();
  const hasFullDashboardAccess =
    isAdmin || hasPermission(PERMISSIONS.DASHBOARD_VIEW);
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
    staleTime: 45_000,
    refetchInterval: visiblePollInterval(120_000),
  });

  const monthlyChartData = useMemo(
    () =>
      (dashboardData?.monthlyRevenue || []).map((item) => ({
        ...item,
        monthLabel:
          item.monthNumber && item.monthYear
            ? formatMonthYearLabel(item.monthNumber, item.monthYear, language)
            : item.month,
      })),
    [dashboardData?.monthlyRevenue, language],
  );

  const ordersByTypeChartData = useMemo(
    () =>
      (dashboardData?.ordersByType || []).map((orderType) => ({
        name: getOrderTypeLabel(orderType.type, language),
        value: orderType.count,
        type: orderType.type,
      })),
    [dashboardData?.ordersByType, language],
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const data = dashboardData || {};

  const totalRakhtRevenue = Number(data.totalRakhtRevenue ?? 0) || 0;
  const totalOrderBenefit = Number(data.totalOrderBenefit ?? 0) || 0;
  const totalAllOrdersBenefit =
    Number(data.totalAllOrdersBenefit ?? totalOrderBenefit) || 0;

  const otherItemsTotalProfit = Number(data.otherItemsTotalProfit ?? 0) || 0;
  const pendingPrepaymentIncome =
    Number(data.pendingPrepaymentIncome ?? 0) || 0;
  const totalExpenses =
    Number(data.totalExpenses ?? data.totalDailyExpenses ?? 0) || 0;
  const totalOrderExpenses =
    Number(data.totalOrderExpenses ?? data.orderDailyTaskExpenses ?? 0) || 0;
  const totalOtherExpenses =
    Number(data.totalOtherExpenses ?? data.otherDailyTaskExpenses ?? 0) || 0;
  const fallbackNetBenefit =
    totalRakhtRevenue +
    totalAllOrdersBenefit +
    pendingPrepaymentIncome +
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
      value: formatMoney(data.totalDiscount ?? 0, language),
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
      sub:
        Number(data.carriedForwardOrderRemaining || 0) > 0
          ? t("dashboardPage.carriedForwardOrderRemaining", {
              amount: formatMoney(data.carriedForwardOrderRemaining, language),
              defaultValue: "Includes {{amount}} carried from prior months",
            })
          : undefined,
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
      value: formatMoney(totalAllOrdersBenefit, language),
      Icon: AfCurrencyIcon,
      accent: "#7C3AED",
      adminOnly: true,
      onClick: () => navigate("/orders/completed"),
      ltrOrder: 21,
      rtlOrder: 21,
    },
    {
      key: "orderExpenses",
      label: t("dashboardPage.orderExpenses", "Order Expenses"),
      value: formatMoney(totalOrderExpenses, language),
      Icon: AfCurrencyIcon,
      accent: "#2563EB",
      onClick: () => navigate("/daily-tasks/all"),
      ltrOrder: 30,
      rtlOrder: 30,
    },
    {
      key: "otherExpenses",
      label: t("dashboardPage.otherExpenses", "Other Expenses"),
      value: formatMoney(totalOtherExpenses, language),
      Icon: AfCurrencyIcon,
      accent: "#64748B",
      adminOnly: true,
      onClick: () => navigate("/daily-tasks/all"),
      ltrOrder: 31,
      rtlOrder: 31,
    },
    {
      key: "totalLoan",
      label: t("dashboardPage.totalLoan", "Total Loan"),
      value: formatMoney(data.totalLoan ?? 0, language),
      Icon: AfCurrencyIcon,
      accent: "#D97706",
      onClick: () => navigate("/transactions?kind=LOAN"),
      ltrOrder: 32,
      rtlOrder: 32,
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
      ltrOrder: 33,
      rtlOrder: 33,
    },
    {
      key: "qichikarMoney",
      label: t(
        "dashboardPage.totalQichikarUsersMoney",
        "Total Money for Qichikar Workers",
      ),
      value: formatMoney(data.totalQichikarUsersMoney ?? 0, language),
      sub:
        Number(data.unpaidQichikarWorkerOrders || 0) > 0
          ? t("dashboardPage.unpaidQichikarWorkersHint", {
              count: data.unpaidQichikarWorkerOrders,
              defaultValue:
                "{{count}} unpaid worker orders awaiting settlement",
            })
          : undefined,
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
      sub:
        Number(data.unpaidDokhtWorkerOrders || 0) > 0
          ? t("dashboardPage.unpaidDokhtWorkersHint", {
              count: data.unpaidDokhtWorkerOrders,
              defaultValue:
                "{{count}} unpaid worker orders awaiting settlement",
            })
          : undefined,
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
      ltrOrder: 90,
      rtlOrder: 90,
    },
  ];

  const visibleStatCards = statCards
    .filter((card) => {
      if (!hasFullDashboardAccess) {
        const requiredPermission =
          {
            otherItemsTotalProfit: PERMISSIONS.FINANCE_PROFIT_VIEW,
            totalOrders: PERMISSIONS.ORDERS_VIEW,
            completedOrders: PERMISSIONS.ORDERS_VIEW,
            pendingOrders: PERMISSIONS.ORDERS_VIEW,
            totalAmount: PERMISSIONS.FINANCE_REVENUE_VIEW,
            collected: PERMISSIONS.FINANCE_REVENUE_VIEW,
            totalDiscounts: PERMISSIONS.FINANCE_PROFIT_VIEW,
            outstanding: PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
            rakhtRevenue: PERMISSIONS.FINANCE_REVENUE_VIEW,
            orderBenefit: PERMISSIONS.FINANCE_PROFIT_VIEW,
            orderExpenses: PERMISSIONS.FINANCE_VIEW,
            otherExpenses: PERMISSIONS.FINANCE_VIEW,
            totalLoan: PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
            damagedClothesMoney: PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
            qichikarMoney: PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
            dokhtMoney: PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
            emergency: PERMISSIONS.ORDERS_VIEW,
            damagedClothes: PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
          }[card.key] || null;
        if (requiredPermission && !hasPermission(requiredPermission))
          return false;
        if (card.adminOnly && !isAdmin && !requiredPermission) return false;
      }
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
        <div
          className={`dashboard-hero-row flex flex-col gap-4 lg:items-center ${isRtl ? "lg:flex-row" : "lg:flex-row lg:justify-between"}`}
        >
          <div
            className={`dashboard-hero-title ${isRtl ? "text-end" : "text-start"}`}
          >
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
          <div
            className={`dashboard-date-chip rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 ${isRtl ? "text-end lg:ms-auto" : "text-start"} dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300`}
          >
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
            sub={card.sub}
            Icon={card.Icon}
            accent={card.accent}
            onClick={card.onClick}
          />
        ))}
      </div>

      <Suspense
        fallback={
          <div className="g-charts dashboard-charts-grid mb-6">
            <CardSkeleton height={220} />
            <CardSkeleton height={220} />
          </div>
        }
      >
        <DashboardCharts
          monthlyChartData={monthlyChartData}
          ordersByTypeChartData={ordersByTypeChartData}
          isRtl={isRtl}
          language={language}
        />
      </Suspense>

      <section
        className="dashboard-recent-orders overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div
          className={`dashboard-recent-orders__head border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:px-5 ${isRtl ? "text-right" : ""}`}
        >
          <h3
            className={`text-base font-semibold text-gray-900 dark:text-slate-100 ${isRtl ? "text-right" : ""}`}
          >
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
