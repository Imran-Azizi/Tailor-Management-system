import { prisma } from "../lib/prisma.js";
import { getMonthPolicy as getMonthPolicyCore } from "../lib/monthPolicy.js";
import {
  getAfghanMonthDateRange,
  getCurrentAfghanMonthYear,
} from "../lib/afghanistanDate.js";
import {
  MONEY_SCALE,
  METER_SCALE,
  toNumberScaled,
  mulScaled,
  subScaled,
  addScaled,
} from "../lib/decimal.js";

const AFGHAN_MONTH_LABELS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const computeRakhtBenefitRevenue = async (where) => {
  const rows = await prisma.order.findMany({
    where: {
      ...where,
      rakhtRequiredMeters: { gt: 0 },
      rakhtPiecePrice: { gt: 0 },
    },
    select: {
      rakhtRequiredMeters: true,
      rakhtPiecePrice: true,
      rakhtCustomerPricePerMeter: true,
      rakhtTotalCustomerPrice: true,
    },
  });

  let total = 0;
  for (const row of rows) {
    const meters = toNumberScaled(row.rakhtRequiredMeters || 0, METER_SCALE);
    const costPerMeter = toNumberScaled(row.rakhtPiecePrice || 0, MONEY_SCALE);
    const sellingPerMeter = toNumberScaled(
      row.rakhtCustomerPricePerMeter || 0,
      MONEY_SCALE,
    );
    const sellingTotal = toNumberScaled(
      row.rakhtTotalCustomerPrice || 0,
      MONEY_SCALE,
    );

    const totalCost = mulScaled(meters, costPerMeter, MONEY_SCALE);
    const totalSelling =
      sellingTotal > 0
        ? sellingTotal
        : sellingPerMeter > 0
          ? mulScaled(sellingPerMeter, meters, MONEY_SCALE)
          : totalCost;

    total = addScaled(
      total,
      subScaled(totalSelling, totalCost, MONEY_SCALE),
      MONEY_SCALE,
    );
  }

  return toNumberScaled(total, MONEY_SCALE);
};

export const getMonthPolicy = async () => getMonthPolicyCore({ tx: prisma });

export const getDashboardStats = async ({
  month,
  year,
  financeUserId,
} = {}) => {
  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;

  const hasMonthFilter =
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear);

  const monthRange = hasMonthFilter
    ? getAfghanMonthDateRange({ month: parsedMonth, year: parsedYear })
    : null;
  const monthStart = monthRange?.start || null;
  const monthEnd = monthRange?.end || null;

  // Finance user data isolation — scope all order queries to their created orders
  const financeWhere = financeUserId
    ? { createdByFinanceId: String(financeUserId) }
    : {};

  // Base where clause — when month/year are supplied, scope ALL counts to that month
  // Use OR to handle legacy orders (entryMonth=null) via createdAt fallback
  let monthWhere;
  if (hasMonthFilter) {
    monthWhere = {
      ...financeWhere,
      OR: [
        { entryMonth: parsedMonth, entryYear: parsedYear },
        { entryMonth: null, createdAt: { gte: monthStart, lte: monthEnd } },
      ],
    };
  } else {
    monthWhere = { ...financeWhere };
  }

  const carryForwardPendingWhere = hasMonthFilter
    ? {
        ...financeWhere,
        isCompleted: false,
        OR: [
          { entryYear: { lt: parsedYear } },
          { entryYear: parsedYear, entryMonth: { lte: parsedMonth } },
          { entryMonth: null, createdAt: { lte: monthEnd } },
        ],
      }
    : { ...monthWhere, isCompleted: false };

  const carryForwardRemainingWhere = hasMonthFilter
    ? {
        ...financeWhere,
        isCompleted: false,
        OR: [
          { entryYear: { lt: parsedYear } },
          { entryYear: parsedYear, entryMonth: { lte: parsedMonth } },
          { entryMonth: null, createdAt: { lte: monthEnd } },
        ],
      }
    : { ...monthWhere, isCompleted: false };

  const recentOrdersWhere = hasMonthFilter
    ? {
        ...financeWhere,
        OR: [
          { entryMonth: parsedMonth, entryYear: parsedYear },
          { entryMonth: null, createdAt: { gte: monthStart, lte: monthEnd } },
          {
            AND: [
              { isCompleted: false },
              {
                OR: [
                  { entryYear: { lt: parsedYear } },
                  { entryYear: parsedYear, entryMonth: { lt: parsedMonth } },
                  { entryMonth: null, createdAt: { lt: monthStart } },
                ],
              },
            ],
          },
        ],
      }
    : monthWhere;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalOrders,
    completedOrders,
    pendingOrders,
    allPendingOrders,
    emergencyOrders,
    todayOrders,
    revenueData,
    paidData,
    remainingData,
    recentOrders,
    ordersByType,
  ] = await Promise.all([
    prisma.order.count({ where: monthWhere }),
    prisma.order.count({ where: { ...monthWhere, isCompleted: true } }),
    prisma.order.count({ where: carryForwardPendingWhere }),
    // Global pending: all incomplete orders regardless of month (carry-over support)
    prisma.order.count({ where: { ...financeWhere, isCompleted: false } }),
    prisma.order.count({
      where: { ...monthWhere, isEmergency: true, isCompleted: false },
    }),
    hasMonthFilter
      ? prisma.order.count({
          where: { ...monthWhere, createdAt: { gte: startOfDay } },
        })
      : prisma.order.count({
          where: { ...financeWhere, createdAt: { gte: startOfDay } },
        }),
    prisma.order.aggregate({
      where: monthWhere,
      _sum: { totalPrice: true, discount: true },
    }),
    prisma.order.aggregate({
      where: monthWhere,
      _sum: { paidAmount: true, remaining: true },
    }),
    prisma.order.aggregate({
      where: carryForwardRemainingWhere,
      _sum: { remaining: true },
    }),
    prisma.order.findMany({
      where: recentOrdersWhere,
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    prisma.order.groupBy({
      by: ["type"],
      where: monthWhere,
      _count: { type: true },
    }),
  ]);

  // Daily expense and rakht totals are month-scoped when filters are active.
  const dailyTaskWhere = hasMonthFilter
    ? {
        taskDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      }
    : {};

  const rakhtWhere = hasMonthFilter
    ? {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      }
    : {};

  const loanWhere = {
    source: "MANUAL",
    kind: "LOAN",
    ...(financeUserId ? { createdById: String(financeUserId) } : {}),
    ...(hasMonthFilter
      ? {
          transactionDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        }
      : {}),
  };

  const [dailyTaskTotal, dailyTaskAmount, rakhtPriceAggregate, loanAggregate] =
    await Promise.all([
      prisma.dailyTask.count({ where: dailyTaskWhere }),
      prisma.dailyTask.aggregate({
        where: dailyTaskWhere,
        _sum: { amount: true },
      }),
      prisma.rakht.aggregate({
        where: rakhtWhere,
        _sum: { totalPrice: true },
      }),
      prisma.transaction.aggregate({
        where: loanWhere,
        _sum: { amount: true },
      }),
    ]);

  const paidDateRange = hasMonthFilter
    ? {
        gte: monthStart,
        lte: monthEnd,
      }
    : undefined;

  const [
    qichikarPaidAggregate,
    dokhtPaidAggregate,
    legacyQichikarPaidAggregate,
    legacyDokhtPaidAggregate,
    allOrdersBenefitAggregate,
    readyMadeBenefitAggregate,
    readyMadeFinalProfitAggregate,
    readyMadeWaskatBenefitAggregate,
    readyMadeWaskatFinalProfitAggregate,
    totalRakhtRevenue,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        ...(financeUserId ? { createdByFinanceId: String(financeUserId) } : {}),
        qichikarPaymentStatus: "PAID_TO_WORKER",
        qichikarPaidAt: paidDateRange || { not: null },
      },
      _sum: { qichikarPaymentAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        ...(financeUserId ? { createdByFinanceId: String(financeUserId) } : {}),
        dokhtPaymentStatus: "PAID_TO_WORKER",
        dokhtPaidAt: paidDateRange || { not: null },
      },
      _sum: { dokhtPaymentAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        ...(financeUserId ? { createdByFinanceId: String(financeUserId) } : {}),
        workerPaymentStatus: "PAID_TO_WORKER",
        workerPaidAt: paidDateRange || { not: null },
        qichikarPaymentStatus: "UNPAID",
        assignedTo: { accountType: "QICHIKAR" },
      },
      _sum: { workerPaymentAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        ...(financeUserId ? { createdByFinanceId: String(financeUserId) } : {}),
        workerPaymentStatus: "PAID_TO_WORKER",
        workerPaidAt: paidDateRange || { not: null },
        dokhtPaymentStatus: "UNPAID",
        assignedTo: { accountType: "DOKHT" },
      },
      _sum: { workerPaymentAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        ...monthWhere,
        type: { notIn: ["READY_MADE", "READY_MADE_WASKAT"] },
      },
      _sum: { totalBenefit: true },
    }),
    prisma.order.aggregate({
      where: {
        ...monthWhere,
        type: "READY_MADE",
      },
      _sum: { totalBenefit: true },
    }),
    prisma.order.aggregate({
      where: {
        ...monthWhere,
        type: "READY_MADE",
      },
      _sum: { totalBenefit: true, readyMadeOriginalPrice: true },
    }),
    prisma.order.aggregate({
      where: {
        ...monthWhere,
        type: "READY_MADE_WASKAT",
      },
      _sum: { totalBenefit: true },
    }),
    prisma.order.aggregate({
      where: {
        ...monthWhere,
        type: "READY_MADE_WASKAT",
      },
      _sum: { totalBenefit: true, readyMadeWaskatOriginalPrice: true },
    }),
    computeRakhtBenefitRevenue(monthWhere),
  ]);

  const recentOrdersWithRevenue = recentOrders.map((order) => {
    const readyMadeOriginalPrice =
      order?.type === "READY_MADE"
        ? Number(order?.readyMadeOriginalPrice || 0)
        : order?.type === "READY_MADE_WASKAT"
          ? Number(order?.readyMadeWaskatOriginalPrice || 0)
          : 0;
    const baseBenefit = Number(order?.totalBenefit || 0);
    const finalTotalBenefit =
      order?.type === "READY_MADE" || order?.type === "READY_MADE_WASKAT"
        ? baseBenefit - readyMadeOriginalPrice
        : baseBenefit;

    return {
      ...order,
      finalTotalBenefit,
    };
  });

  const monthlyRevenue = await getMonthlyRevenue(financeUserId, {
    month: hasMonthFilter ? parsedMonth : null,
    year: hasMonthFilter ? parsedYear : null,
  });

  return {
    totalOrders,
    completedOrders,
    pendingOrders,
    allPendingOrders,
    emergencyOrders,
    todayOrders,
    // Legacy fields kept for non-filtered views
    monthOrders: hasMonthFilter ? totalOrders : completedOrders,
    yearOrders: totalOrders,
    totalRevenue: revenueData._sum.totalPrice || 0,
    totalDiscount: revenueData._sum.discount || 0,
    totalPaid: paidData._sum.paidAmount || 0,
    totalRemaining: remainingData._sum.remaining || 0,
    recentOrders: recentOrdersWithRevenue,
    monthlyRevenue,
    ordersByType: ordersByType.map((o) => ({
      type: o.type,
      count: o._count.type,
    })),
    dailyTaskTotal,
    dailyTaskAmount: dailyTaskAmount._sum?.amount || 0,
    totalDailyExpenses: dailyTaskAmount._sum?.amount || 0,
    totalRakhtPrice: rakhtPriceAggregate._sum?.totalPrice || 0,
    totalLoan: loanAggregate._sum?.amount || 0,
    totalQichikarUsersMoney:
      (qichikarPaidAggregate._sum?.qichikarPaymentAmount || 0) +
      (legacyQichikarPaidAggregate._sum?.workerPaymentAmount || 0),
    totalDokhtUsersMoney:
      (dokhtPaidAggregate._sum?.dokhtPaymentAmount || 0) +
      (legacyDokhtPaidAggregate._sum?.workerPaymentAmount || 0),
    totalOrderBenefit: Number(
      allOrdersBenefitAggregate._sum?.totalBenefit || 0,
    ),
    totalReadyMadeProfit: Number(
      readyMadeBenefitAggregate._sum?.totalBenefit || 0,
    ),
    totalReadyMadeProfitAfterExpenses:
      Number(readyMadeFinalProfitAggregate._sum?.totalBenefit || 0) -
      Number(readyMadeFinalProfitAggregate._sum?.readyMadeOriginalPrice || 0),
    totalReadyMadeWaskatProfit: Number(
      readyMadeWaskatBenefitAggregate._sum?.totalBenefit || 0,
    ),
    totalReadyMadeWaskatProfitAfterExpenses:
      Number(readyMadeWaskatFinalProfitAggregate._sum?.totalBenefit || 0) -
      Number(
        readyMadeWaskatFinalProfitAggregate._sum
          ?.readyMadeWaskatOriginalPrice || 0,
      ),
    totalRakhtRevenue: Number(totalRakhtRevenue || 0),
    isFiltered: hasMonthFilter,
    filteredMonth: hasMonthFilter ? parsedMonth : null,
    filteredYear: hasMonthFilter ? parsedYear : null,
  };
};

const getMonthlyRevenue = async (
  financeUserId,
  { month = null, year = null } = {},
) => {
  const financeWhere = financeUserId
    ? { createdByFinanceId: String(financeUserId) }
    : {};

  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;
  const hasSelectedMonth =
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear);

  if (hasSelectedMonth) {
    const { start: monthStart, end: monthEnd } = getAfghanMonthDateRange({
      month: parsedMonth,
      year: parsedYear,
    });

    const result = await prisma.order.aggregate({
      where: {
        ...financeWhere,
        OR: [
          { entryMonth: parsedMonth, entryYear: parsedYear },
          { entryMonth: null, createdAt: { gte: monthStart, lte: monthEnd } },
        ],
      },
      _sum: { totalPrice: true, paidAmount: true },
      _count: true,
    });

    const afghanLabel =
      AFGHAN_MONTH_LABELS_EN[(parsedMonth || 1) - 1] || String(parsedMonth);

    return [
      {
        month: `${afghanLabel} ${parsedYear}`,
        monthNumber: parsedMonth,
        monthYear: parsedYear,
        revenue: result._sum.totalPrice || 0,
        paid: result._sum.paidAmount || 0,
        count: result._count,
      },
    ];
  }

  const monthContexts = Array.from({ length: 6 }, (_, index) => {
    const i = 5 - index;
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  });

  const results = await Promise.all(
    monthContexts.map(({ start, end }) =>
      prisma.order.aggregate({
        where: { ...financeWhere, createdAt: { gte: start, lte: end } },
        _sum: { totalPrice: true, paidAmount: true },
        _count: true,
      }),
    ),
  );

  return monthContexts.map(({ start }, index) => {
    const result = results[index];
    const afghan = getCurrentAfghanMonthYear(start);
    const afghanLabel =
      AFGHAN_MONTH_LABELS_EN[(Number(afghan.month) || 1) - 1] ||
      String(afghan.month);

    return {
      month: `${afghanLabel} ${afghan.year}`,
      monthNumber: afghan.month,
      monthYear: afghan.year,
      revenue: result._sum.totalPrice || 0,
      paid: result._sum.paidAmount || 0,
      count: result._count,
    };
  });
};
