import { prisma } from "../lib/prisma.js";
import {
  MONEY_SCALE,
  addScaled,
  subScaled,
  toNumberScaled,
} from "./decimal.js";
import { getAfghanMonthDateRange } from "./afghanistanDate.js";
import {
  getOrderDiscount,
  getOrderFinancialPaid,
  getOrderFinancialRemaining,
  getOrderFinancialTotal,
  getAggregateNetTotal,
} from "./orderFinancials.js";

export function parseMonthYear(month, year) {
  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;
  const isValid =
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear) &&
    parsedMonth >= 1 &&
    parsedMonth <= 12;

  if (!isValid) {
    return {
      month: null,
      year: null,
      hasMonthFilter: false,
      monthStart: null,
      monthEnd: null,
    };
  }

  const { start, end } = getAfghanMonthDateRange({
    month: parsedMonth,
    year: parsedYear,
  });

  return {
    month: parsedMonth,
    year: parsedYear,
    hasMonthFilter: true,
    monthStart: start,
    monthEnd: end,
  };
}

export function buildCurrentMonthScope({ month, year, monthStart, monthEnd }) {
  return {
    OR: [
      { entryMonth: month, entryYear: year },
      { entryMonth: null, createdAt: { gte: monthStart, lte: monthEnd } },
    ],
  };
}

export function buildPriorMonthScope({ month, year, monthStart }) {
  return {
    OR: [
      { entryYear: { lt: year } },
      { entryYear: year, entryMonth: { lt: month } },
      { entryMonth: null, createdAt: { lt: monthStart } },
    ],
  };
}

export function buildOpenOrdersScope({ month, year, monthEnd }) {
  return {
    isCompleted: false,
    OR: [
      { entryYear: { lt: year } },
      { entryYear: year, entryMonth: { lte: month } },
      { entryMonth: null, createdAt: { lte: monthEnd } },
    ],
  };
}

export function buildCarryForwardPendingScope(context) {
  const { month, year, monthStart } = context;
  return {
    isCompleted: false,
    ...buildPriorMonthScope({ month, year, monthStart }),
  };
}

export function buildCarryForwardUnsettledWorkerScope(context) {
  const { month, year, monthStart } = context;
  return {
    AND: [
      buildPriorMonthScope({ month, year, monthStart }),
      {
        OR: [
          {
            qichikarCompletedAt: { not: null },
            qichikarPaymentStatus: "UNPAID",
          },
          {
            dokhtCompletedAt: { not: null },
            dokhtPaymentStatus: "UNPAID",
          },
          { qichikarPaymentStatus: "PAID_TO_WORKER" },
          { dokhtPaymentStatus: "PAID_TO_WORKER" },
          {
            isCompleted: true,
            workerPaymentStatus: "UNPAID",
            assignedTo: { accountType: { in: ["QICHIKAR", "DOKHT"] } },
          },
          {
            isCompleted: true,
            workerPaymentStatus: "PAID_TO_WORKER",
            assignedTo: { accountType: { in: ["QICHIKAR", "DOKHT"] } },
          },
        ],
      },
    ],
  };
}

export function isPriorMonthOrder(
  order,
  { month, year, monthStart, monthEnd },
) {
  if (order?.entryMonth != null && order?.entryYear != null) {
    if (order.entryYear < year) return true;
    if (order.entryYear === year && order.entryMonth < month) return true;
    return false;
  }

  const createdAt = new Date(order?.createdAt || 0);
  if (Number.isNaN(createdAt.getTime())) return false;
  return createdAt < monthStart;
}

export function summarizeOrdersForMonthView(orders, context) {
  return orders.reduce(
    (summary, order) => {
      const priorMonth = context?.hasMonthFilter
        ? isPriorMonthOrder(order, context)
        : false;

      if (priorMonth && !order?.isCompleted) {
        const remaining = getOrderFinancialRemaining(order);
        summary.remaining = addScaled(
          summary.remaining,
          remaining,
          MONEY_SCALE,
        );
        summary.carriedForwardRemaining = addScaled(
          summary.carriedForwardRemaining,
          remaining,
          MONEY_SCALE,
        );
        return summary;
      }

      summary.total = addScaled(
        summary.total,
        getOrderFinancialTotal(order),
        MONEY_SCALE,
      );
      summary.discount = addScaled(
        summary.discount,
        getOrderDiscount(order),
        MONEY_SCALE,
      );
      summary.paid = addScaled(
        summary.paid,
        getOrderFinancialPaid(order),
        MONEY_SCALE,
      );
      summary.remaining = addScaled(
        summary.remaining,
        getOrderFinancialRemaining(order),
        MONEY_SCALE,
      );
      return summary;
    },
    {
      total: 0,
      discount: 0,
      paid: 0,
      remaining: 0,
      carriedForwardRemaining: 0,
    },
  );
}

export function summarizeOrderAggregateForMonthView(
  aggregate,
  { includeFinancialTotals = true } = {},
) {
  if (!includeFinancialTotals) {
    return {
      total: 0,
      discount: 0,
      paid: 0,
      remaining: toNumberScaled(aggregate?._sum?.remaining || 0, MONEY_SCALE),
      carriedForwardRemaining: toNumberScaled(
        aggregate?._sum?.remaining || 0,
        MONEY_SCALE,
      ),
    };
  }

  return {
    total: getAggregateNetTotal(aggregate),
    discount: toNumberScaled(aggregate?._sum?.discount || 0, MONEY_SCALE),
    paid: toNumberScaled(aggregate?._sum?.paidAmount || 0, MONEY_SCALE),
    remaining: toNumberScaled(aggregate?._sum?.remaining || 0, MONEY_SCALE),
    carriedForwardRemaining: 0,
  };
}

export function mergeMonthScopedSummaries(currentSummary, carryForwardSummary) {
  return {
    total: currentSummary.total,
    discount: currentSummary.discount,
    paid: currentSummary.paid,
    remaining: addScaled(
      currentSummary.remaining,
      carryForwardSummary.carriedForwardRemaining,
      MONEY_SCALE,
    ),
    carriedForwardRemaining: carryForwardSummary.carriedForwardRemaining,
  };
}

export function getRolePaymentSnapshot(order, role) {
  if (role === "DOKHT") {
    return {
      status: order?.dokhtPaymentStatus ?? "UNPAID",
      amount: toNumberScaled(order?.dokhtPaymentAmount || 0, MONEY_SCALE),
      paidAt: order?.dokhtPaidAt ?? null,
    };
  }

  if (role === "QICHIKAR") {
    return {
      status: order?.qichikarPaymentStatus ?? "UNPAID",
      amount: toNumberScaled(order?.qichikarPaymentAmount || 0, MONEY_SCALE),
      paidAt: order?.qichikarPaidAt ?? null,
    };
  }

  return {
    status: order?.workerPaymentStatus ?? "UNPAID",
    amount: toNumberScaled(order?.workerPaymentAmount || 0, MONEY_SCALE),
    paidAt: order?.workerPaidAt ?? null,
  };
}

export function computeWorkerOutstandingAmount(order, role, receiptAmount = 0) {
  const snapshot = getRolePaymentSnapshot(order, role);
  if (snapshot.status === "UNPAID") {
    return 0;
  }

  return Math.max(
    0,
    subScaled(snapshot.amount, receiptAmount, MONEY_SCALE),
  );
}

export function hasUnsettledWorkerCompletion(order) {
  return (
    (order?.qichikarCompletedAt &&
      order?.qichikarPaymentStatus !== "PAID_TO_WORKER") ||
    (order?.dokhtCompletedAt && order?.dokhtPaymentStatus !== "PAID_TO_WORKER") ||
    order?.qichikarPaymentStatus === "PAID_TO_WORKER" ||
    order?.dokhtPaymentStatus === "PAID_TO_WORKER" ||
    (order?.isCompleted &&
      ["QICHIKAR", "DOKHT"].includes(order?.assignedTo?.accountType) &&
      order?.workerPaymentStatus !== "PAID_TO_WORKER")
  );
}

export async function computeOutstandingWorkerMoneyByRole(role, financeWhere = {}) {
  const completedAtField =
    role === "DOKHT" ? "dokhtCompletedAt" : "qichikarCompletedAt";

  const orders = await prisma.order.findMany({
    where: {
      ...financeWhere,
      OR: [
        { [completedAtField]: { not: null } },
        {
          isCompleted: true,
          assignedTo: { accountType: role },
        },
      ],
    },
    select: {
      id: true,
      qichikarPaymentStatus: true,
      qichikarPaymentAmount: true,
      dokhtPaymentStatus: true,
      dokhtPaymentAmount: true,
      workerPaymentStatus: true,
      workerPaymentAmount: true,
      assignedTo: { select: { accountType: true } },
      isCompleted: true,
      qichikarCompletedAt: true,
      dokhtCompletedAt: true,
    },
  });

  const orderIds = orders.map((order) => order.id);
  const receipts = orderIds.length
    ? await prisma.workerPaymentReceipt.findMany({
        where: {
          orderId: { in: orderIds },
          workerRole: role,
        },
        select: {
          orderId: true,
          paidAmount: true,
        },
      })
    : [];

  const receiptByOrderId = new Map(
    receipts.map((receipt) => [
      receipt.orderId,
      toNumberScaled(receipt.paidAmount || 0, MONEY_SCALE),
    ]),
  );

  let outstanding = 0;
  let unpaidCount = 0;

  for (const order of orders) {
    const snapshot = getRolePaymentSnapshot(order, role);
    if (snapshot.status === "UNPAID") {
      unpaidCount += 1;
      continue;
    }

    const receiptAmount = receiptByOrderId.get(order.id) || 0;
    const rowOutstanding = computeWorkerOutstandingAmount(
      order,
      role,
      receiptAmount,
    );
    if (rowOutstanding > 0) {
      outstanding = addScaled(outstanding, rowOutstanding, MONEY_SCALE);
    }
  }

  return {
    outstanding: toNumberScaled(outstanding, MONEY_SCALE),
    unpaidCount,
  };
}
