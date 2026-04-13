import { prisma } from '../lib/prisma.js';

export const getDashboardStats = async () => {
  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear  = new Date(now.getFullYear(), 0, 1);

  const [
    totalOrders,
    completedOrders,
    pendingOrders,
    emergencyOrders,
    todayOrders,
    monthOrders,
    yearOrders,
    revenueData,
    paidData,
    recentOrders,
    ordersByType,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { isCompleted: true } }),
    prisma.order.count({ where: { isCompleted: false } }),
    prisma.order.count({ where: { isEmergency: true, isCompleted: false } }),
    prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfYear } } }),
    prisma.order.aggregate({ _sum: { totalPrice: true, discount: true } }),
    prisma.order.aggregate({ _sum: { paidAmount: true, remaining: true } }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    }),
    prisma.order.groupBy({ by: ['type'], _count: { type: true } }),
  ]);

  const monthlyRevenue = await getMonthlyRevenue();

  return {
    totalOrders,
    completedOrders,
    pendingOrders,
    emergencyOrders,
    todayOrders,
    monthOrders,
    yearOrders,
    totalRevenue:    revenueData._sum.totalPrice  || 0,
    totalDiscount:   revenueData._sum.discount    || 0,
    totalPaid:       paidData._sum.paidAmount     || 0,
    totalRemaining:  paidData._sum.remaining      || 0,
    recentOrders,
    monthlyRevenue,
    ordersByType: ordersByType.map(o => ({ type: o.type, count: o._count.type })),
  };
};

const getMonthlyRevenue = async () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const result = await prisma.order.aggregate({
      where: { createdAt: { gte: start, lte: end } },
      _sum: { totalPrice: true, paidAmount: true },
      _count: true,
    });

    months.push({
      month:   start.toLocaleString('default', { month: 'short' }),
      revenue: result._sum.totalPrice  || 0,
      paid:    result._sum.paidAmount  || 0,
      count:   result._count,
    });
  }
  return months;
};
