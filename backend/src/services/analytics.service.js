import { prisma } from "../lib/prisma.js";

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

  // Finance user data isolation — scope all order queries to their created orders
  const financeWhere = financeUserId
    ? { createdByFinanceId: String(financeUserId) }
    : {};

  // Base where clause — when month/year are supplied, scope ALL counts to that month
  // Use OR to handle legacy orders (entryMonth=null) via createdAt fallback
  let monthWhere;
  if (hasMonthFilter) {
    const monthStart = new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);
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

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalOrders,
    completedOrders,
    pendingOrders,
    emergencyOrders,
    todayOrders,
    revenueData,
    paidData,
    recentOrders,
    ordersByType,
  ] = await Promise.all([
    prisma.order.count({ where: monthWhere }),
    prisma.order.count({ where: { ...monthWhere, isCompleted: true } }),
    prisma.order.count({ where: { ...monthWhere, isCompleted: false } }),
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
    prisma.order.findMany({
      where: monthWhere,
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

  // Daily task totals — Finance users do not have daily tasks, skip for them
  const dailyTaskWhere =
    hasMonthFilter && !financeUserId
      ? {
          taskDate: {
            gte: new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0),
            lte: new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999),
          },
        }
      : financeUserId
        ? null // Finance users don't own daily tasks
        : {};

  const [dailyTaskTotal, dailyTaskAmount] =
    dailyTaskWhere !== null
      ? await Promise.all([
          prisma.dailyTask.count({ where: dailyTaskWhere }),
          prisma.dailyTask.aggregate({
            where: dailyTaskWhere,
            _sum: { amount: true },
          }),
        ])
      : [0, { _sum: { amount: 0 } }];

  const monthlyRevenue = await getMonthlyRevenue(financeUserId);

  return {
    totalOrders,
    completedOrders,
    pendingOrders,
    emergencyOrders,
    todayOrders,
    // Legacy fields kept for non-filtered views
    monthOrders: hasMonthFilter ? totalOrders : completedOrders,
    yearOrders: totalOrders,
    totalRevenue: revenueData._sum.totalPrice || 0,
    totalDiscount: revenueData._sum.discount || 0,
    totalPaid: paidData._sum.paidAmount || 0,
    totalRemaining: paidData._sum.remaining || 0,
    recentOrders,
    monthlyRevenue,
    ordersByType: ordersByType.map((o) => ({
      type: o.type,
      count: o._count.type,
    })),
    dailyTaskTotal,
    dailyTaskAmount: dailyTaskAmount._sum?.amount || 0,
    isFiltered: hasMonthFilter,
    filteredMonth: hasMonthFilter ? parsedMonth : null,
    filteredYear: hasMonthFilter ? parsedYear : null,
  };
};

const getMonthlyRevenue = async (financeUserId) => {
  const financeWhere = financeUserId
    ? { createdByFinanceId: String(financeUserId) }
    : {};
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const result = await prisma.order.aggregate({
      where: { ...financeWhere, createdAt: { gte: start, lte: end } },
      _sum: { totalPrice: true, paidAmount: true },
      _count: true,
    });

    months.push({
      month: start.toLocaleString("default", { month: "short" }),
      revenue: result._sum.totalPrice || 0,
      paid: result._sum.paidAmount || 0,
      count: result._count,
    });
  }
  return months;
};
