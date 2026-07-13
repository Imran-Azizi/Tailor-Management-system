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
import {
  getOrderFinancialPaid,
  getOrderFinancialRemaining,
  getOrderFinancialTotal,
} from "../lib/orderFinancials.js";
import {
  buildCarryForwardPendingScope,
  buildCurrentMonthScope,
  buildOpenOrdersScope,
  computeOutstandingWorkerMoneyByRole,
  parseMonthYear,
} from "../lib/monthRollover.js";

const toPositiveMoney = (value) =>
  Math.max(0, toNumberScaled(value || 0, MONEY_SCALE));

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

const NON_DAMAGED_ORDER_WHERE = {
  damagedClothesPenalties: { none: {} },
};

const withNonDamagedOrders = (where = {}) => ({
  ...where,
  ...NON_DAMAGED_ORDER_WHERE,
});

const computeDisplayTotalBenefit = (order, linkedDailyExpenseAmount = 0) => {
  const isDamageOrder = Array.isArray(order?.damagedClothesPenalties)
    ? order.damagedClothesPenalties.length > 0
    : false;
  if (isDamageOrder) return 0;

  const purchaseTotal = mulScaled(
    order?.rakhtPiecePrice || 0,
    order?.rakhtRequiredMeters || 0,
    MONEY_SCALE,
  );
  const qichikarAmount =
    order?.qichikarPaymentStatus === "PAID_TO_WORKER"
      ? toPositiveMoney(order?.qichikarPaymentAmount)
      : 0;
  const dokhtAmount =
    order?.dokhtPaymentStatus === "PAID_TO_WORKER"
      ? toPositiveMoney(order?.dokhtPaymentAmount)
      : 0;
  const workerAmount =
    qichikarAmount <= 0 &&
    dokhtAmount <= 0 &&
    order?.workerPaymentStatus === "PAID_TO_WORKER"
      ? toPositiveMoney(order?.workerPaymentAmount)
      : 0;
  const totalExpenses = [
    purchaseTotal,
    qichikarAmount,
    dokhtAmount,
    workerAmount,
    linkedDailyExpenseAmount,
  ].reduce((total, amount) => addScaled(total, amount, MONEY_SCALE), 0);
  const totalBenefit = subScaled(
    getOrderFinancialTotal(order),
    totalExpenses,
    MONEY_SCALE,
  );

  return totalBenefit;
};

const computeFinancialSummary = async (where) => {
  const rows = await prisma.order.findMany({
    where,
    select: {
      totalPrice: true,
      discount: true,
      paidAmount: true,
    },
  });

  return rows.reduce(
    (summary, order) => ({
      revenue: addScaled(
        summary.revenue,
        getOrderFinancialTotal(order),
        MONEY_SCALE,
      ),
      paid: addScaled(
        summary.paid,
        getOrderFinancialPaid(order),
        MONEY_SCALE,
      ),
      remaining: addScaled(
        summary.remaining,
        getOrderFinancialRemaining(order),
        MONEY_SCALE,
      ),
    }),
    { revenue: 0, paid: 0, remaining: 0 },
  );
};

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
  const monthContext = parseMonthYear(month, year);
  const {
    month: parsedMonth,
    year: parsedYear,
    hasMonthFilter,
    monthStart,
    monthEnd,
  } = monthContext;

  // Finance user data isolation: scope all order queries to their created orders.
  const financeWhere = financeUserId
    ? { createdByFinanceId: String(financeUserId) }
    : {};

  // Base where clause: when month/year are supplied, scope all counts to that month.
  // Use OR to handle legacy orders (entryMonth=null) via createdAt fallback
  let monthWhere;
  if (hasMonthFilter) {
    monthWhere = {
      ...financeWhere,
      ...buildCurrentMonthScope(monthContext),
    };
  } else {
    monthWhere = { ...financeWhere };
  }

  const recognizedProfitDateWhere = hasMonthFilter
    ? {
        gte: monthStart,
        lte: monthEnd,
      }
    : { not: null };

  const recognizedProfitWhere = {
    ...financeWhere,
    ...NON_DAMAGED_ORDER_WHERE,
    netProfitRecognizedAt: recognizedProfitDateWhere,
  };

  const carryForwardPendingWhere = hasMonthFilter
    ? {
        ...financeWhere,
        ...buildCarryForwardPendingScope(monthContext),
      }
    : { ...monthWhere, isCompleted: false };

  const pendingOrdersWhere = hasMonthFilter
    ? {
        ...financeWhere,
        ...buildOpenOrdersScope(monthContext),
      }
    : { ...financeWhere, isCompleted: false };

  const carryForwardRemainingWhere = hasMonthFilter
    ? carryForwardPendingWhere
    : { ...monthWhere, isCompleted: false };

  const currentMonthPendingWhere = hasMonthFilter
    ? {
        ...financeWhere,
        isCompleted: false,
        ...buildCurrentMonthScope(monthContext),
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

  const financialMonthWhere = withNonDamagedOrders(monthWhere);
  const financialCarryForwardRemainingWhere = withNonDamagedOrders(
    carryForwardRemainingWhere,
  );
  const financialCurrentMonthPendingWhere = withNonDamagedOrders(
    currentMonthPendingWhere,
  );

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const damagedClothesWhere = hasMonthFilter
    ? {
        createdAt: { gte: monthStart, lte: monthEnd },
      }
    : {};

  const [
    totalOrders,
    completedOrders,
    pendingOrders,
    allPendingOrders,
    emergencyOrders,
    todayOrders,
    revenueData,
    recentOrders,
    ordersByType,
    damagedClothesTotal,
    damagedClothesAmountAggregate,
    financialMonthSummary,
    financialCarryForwardRemainingSummary,
    financialCurrentMonthPendingSummary,
  ] = await Promise.all([
    prisma.order.count({ where: monthWhere }),
    prisma.order.count({ where: { ...monthWhere, isCompleted: true } }),
    prisma.order.count({ where: pendingOrdersWhere }),
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
      where: financialMonthWhere,
      _sum: { totalPrice: true, discount: true },
    }),
    prisma.order.findMany({
      where: recentOrdersWhere,
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        assignedTo: { select: { id: true, name: true, accountType: true } },
        qichikarAssignedTo: {
          select: { id: true, name: true, accountType: true },
        },
        dokhtAssignedTo: {
          select: { id: true, name: true, accountType: true },
        },
        damagedClothesPenalties: { select: { id: true }, take: 1 },
      },
    }),
    prisma.order.groupBy({
      by: ["type"],
      where: monthWhere,
      _count: { type: true },
    }),
    prisma.damagedClothesPenalty.count({ where: damagedClothesWhere }),
    prisma.damagedClothesPenalty.aggregate({
      where: damagedClothesWhere,
      _sum: { totalExpense: true },
    }),
    computeFinancialSummary(financialMonthWhere),
    computeFinancialSummary(financialCarryForwardRemainingWhere),
    computeFinancialSummary(financialCurrentMonthPendingWhere),
  ]);

  // Daily expense and rakht totals are month-scoped when filters are active.
  const dailyTaskWhere = {
    ...(financeUserId ? { createdById: String(financeUserId) } : {}),
    ...(hasMonthFilter
      ? {
          taskDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        }
      : {}),
  };
  const financialDailyTaskWhere = {
    ...dailyTaskWhere,
    OR: [{ orderId: null }, { order: { is: NON_DAMAGED_ORDER_WHERE } }],
  };
  const financialOrderDailyTaskWhere = {
    ...dailyTaskWhere,
    orderId: { not: null },
    order: { is: NON_DAMAGED_ORDER_WHERE },
  };
  const otherDailyTaskWhere = {
    ...dailyTaskWhere,
    orderId: null,
  };

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
    damagedClothesPenalty: null,
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

  const [
    dailyTaskTotal,
    dailyTaskAmount,
    orderDailyTaskAmount,
    otherDailyTaskAmount,
    rakhtPriceAggregate,
    loanAggregate,
  ] = await Promise.all([
      prisma.dailyTask.count({ where: dailyTaskWhere }),
      prisma.dailyTask.aggregate({
        where: financialDailyTaskWhere,
        _sum: { amount: true },
      }),
      prisma.dailyTask.aggregate({
        where: financialOrderDailyTaskWhere,
        _sum: { amount: true },
      }),
      prisma.dailyTask.aggregate({
        where: otherDailyTaskWhere,
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

  const dailyTaskExpenseTotal = Number(dailyTaskAmount._sum?.amount || 0);
  const orderDailyTaskExpenseTotal = Number(
    orderDailyTaskAmount._sum?.amount || 0,
  );
  const otherDailyTaskExpenseTotal = Number(
    otherDailyTaskAmount._sum?.amount || 0,
  );


  const [
    allOrdersBenefitAggregate,
    totalRakhtRevenue,
    linkedDailyExpenseAggregate,
    otherItemsProfitAggregate,
    pendingPrepaymentAggregate,
    qichikarOutstanding,
    dokhtOutstanding,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        ...recognizedProfitWhere,
      },
      _sum: { netProfitRecognizedAmount: true },
    }),
    computeRakhtBenefitRevenue(recognizedProfitWhere),
    prisma.dailyTask.aggregate({
      where: {
        ...(financeUserId ? { createdById: String(financeUserId) } : {}),
        orderId: { not: null },
        order: { is: recognizedProfitWhere },
      },
      _sum: { amount: true },
    }),
    prisma.itemSale.aggregate({
      where: {
        ...(financeUserId ? { createdById: String(financeUserId) } : {}),
        ...(hasMonthFilter
          ? {
              createdAt: {
                gte: monthStart,
                lte: monthEnd,
              },
            }
          : {}),
      },
      _sum: { profit: true },
    }),
    prisma.order.aggregate({
      where: {
        ...financialMonthWhere,
        isCompleted: false,
        paidAmount: { gt: 0 },
      },
      _sum: { paidAmount: true },
    }),
    computeOutstandingWorkerMoneyByRole("QICHIKAR", financeWhere),
    computeOutstandingWorkerMoneyByRole("DOKHT", financeWhere),
  ]);

  const totalOrderBenefit = Number(
    allOrdersBenefitAggregate._sum?.netProfitRecognizedAmount || 0,
  );
  const totalRakhtRevenueNumber = Number(totalRakhtRevenue || 0);
  const otherItemsTotalProfit = Number(
    otherItemsProfitAggregate._sum?.profit || 0,
  );
  const linkedDailyExpensesInRange = Number(
    linkedDailyExpenseAggregate._sum?.amount || 0,
  );
  const pendingPrepaymentIncome = Number(
    pendingPrepaymentAggregate._sum?.paidAmount || 0,
  );
  const totalProfitBeforeDailyExpenses =
    totalRakhtRevenueNumber +
    totalOrderBenefit +
    pendingPrepaymentIncome +
    otherItemsTotalProfit +
    linkedDailyExpensesInRange;
  const netProfit = totalProfitBeforeDailyExpenses - dailyTaskExpenseTotal;

  const recentOrderIds = recentOrders.map((order) => order.id).filter(Boolean);
  const recentDailyExpenseSums = recentOrderIds.length
    ? await prisma.dailyTask.groupBy({
        by: ["orderId"],
        where: { orderId: { in: recentOrderIds } },
        _sum: { amount: true },
      })
    : [];
  const recentDailyExpenseByOrderId = new Map(
    recentDailyExpenseSums.map((row) => [
      row.orderId,
      Number(row._sum?.amount || 0),
    ]),
  );
  const totalAllOrdersBenefit = totalOrderBenefit;

  const recentOrdersWithRevenue = recentOrders.map((order) => {
    const isDamageOrder = Array.isArray(order?.damagedClothesPenalties)
      ? order.damagedClothesPenalties.length > 0
      : false;
    const finalTotalBenefit = computeDisplayTotalBenefit(
      order,
      Number(recentDailyExpenseByOrderId.get(order.id) || 0),
    );

    return {
      ...order,
      isDamageOrder,
      customer: order.customer
        ? {
            ...order.customer,
            billNumber: order.billNumber ?? order.customer.billNumber,
          }
        : order.customer,
      finalTotalBenefit,
    };
  });

  const monthScopedSummary = hasMonthFilter
    ? {
        total: financialMonthSummary.revenue,
        discount: toNumberScaled(revenueData._sum?.discount || 0, MONEY_SCALE),
        paid: financialMonthSummary.paid,
        remaining: addScaled(
          financialCurrentMonthPendingSummary.remaining,
          financialCarryForwardRemainingSummary.remaining,
          MONEY_SCALE,
        ),
        carriedForwardRemaining:
          financialCarryForwardRemainingSummary.remaining,
      }
    : {
        total: financialMonthSummary.revenue,
        discount: toNumberScaled(revenueData._sum?.discount || 0, MONEY_SCALE),
        paid: financialMonthSummary.paid,
        remaining: financialMonthSummary.remaining,
        carriedForwardRemaining: 0,
      };

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
    damagedClothesTotal,
    totalDamagedClothesMoney:
      damagedClothesAmountAggregate._sum?.totalExpense || 0,
    todayOrders,
    // Legacy fields kept for non-filtered views
    monthOrders: hasMonthFilter ? totalOrders : completedOrders,
    yearOrders: totalOrders,
    totalRevenue: monthScopedSummary.total,
    totalGrossOrderPrice: revenueData._sum.totalPrice || 0,
    totalDiscount: monthScopedSummary.discount,
    totalPaid: monthScopedSummary.paid,
    totalRemaining: monthScopedSummary.remaining,
    carriedForwardOrderRemaining: monthScopedSummary.carriedForwardRemaining,
    recentOrders: recentOrdersWithRevenue,
    monthlyRevenue,
    ordersByType: ordersByType.map((o) => ({
      type: o.type,
      count: o._count.type,
    })),
    dailyTaskTotal,
    dailyTaskAmount: dailyTaskExpenseTotal,
    totalDailyExpenses: dailyTaskExpenseTotal,
    orderDailyTaskExpenses: orderDailyTaskExpenseTotal,
    totalOrderExpenses: orderDailyTaskExpenseTotal,
    otherDailyTaskExpenses: otherDailyTaskExpenseTotal,
    totalOtherExpenses: otherDailyTaskExpenseTotal,
    totalExpenses: dailyTaskExpenseTotal,
    totalRakhtPrice: rakhtPriceAggregate._sum?.totalPrice || 0,
    totalLoan: loanAggregate._sum?.amount || 0,
    totalQichikarUsersMoney: qichikarOutstanding.outstanding,
    totalDokhtUsersMoney: dokhtOutstanding.outstanding,
    unpaidQichikarWorkerOrders: qichikarOutstanding.unpaidCount,
    unpaidDokhtWorkerOrders: dokhtOutstanding.unpaidCount,
    totalOrderBenefit,
    pendingPrepaymentIncome,
    totalAllOrdersBenefit,
    totalRakhtRevenue: totalRakhtRevenueNumber,
    otherItemsTotalProfit,
    linkedDailyExpensesInRange,
    totalProfitBeforeDailyExpenses,
    netProfit,
    netBenefit: netProfit,
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

    const where = withNonDamagedOrders({
      ...financeWhere,
      OR: [
        { entryMonth: parsedMonth, entryYear: parsedYear },
        { entryMonth: null, createdAt: { gte: monthStart, lte: monthEnd } },
      ],
    });
    const [result, financialSummary] = await Promise.all([
      prisma.order.aggregate({
        where,
        _count: true,
      }),
      computeFinancialSummary(where),
    ]);

    const afghanLabel =
      AFGHAN_MONTH_LABELS_EN[(parsedMonth || 1) - 1] || String(parsedMonth);

    return [
      {
        month: `${afghanLabel} ${parsedYear}`,
        monthNumber: parsedMonth,
        monthYear: parsedYear,
        revenue: financialSummary.revenue,
        paid: financialSummary.paid,
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
      (async () => {
        const where = withNonDamagedOrders({
          ...financeWhere,
          createdAt: { gte: start, lte: end },
        });
        const [summary, financialSummary] = await Promise.all([
          prisma.order.aggregate({
            where,
            _count: true,
          }),
          computeFinancialSummary(where),
        ]);
        return { summary, financialSummary };
      })(),
    ),
  );

  return monthContexts.map(({ start }, index) => {
    const { summary: result, financialSummary } = results[index];
    const afghan = getCurrentAfghanMonthYear(start);
    const afghanLabel =
      AFGHAN_MONTH_LABELS_EN[(Number(afghan.month) || 1) - 1] ||
      String(afghan.month);

    return {
      month: `${afghanLabel} ${afghan.year}`,
      monthNumber: afghan.month,
      monthYear: afghan.year,
      revenue: financialSummary.revenue,
      paid: financialSummary.paid,
      count: result._count,
    };
  });
};
