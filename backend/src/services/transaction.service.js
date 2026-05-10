import { prisma } from "../lib/prisma.js";
import { getAfghanMonthDateRange } from "../lib/afghanistanDate.js";
import { normalizePhone, normalizeText } from "../lib/normalize.js";
import { recalculateOrderBenefit } from "./order.service.js";

const USER_SELECT = {
  id: true,
  name: true,
  phoneNumber: true,
  accountType: true,
};

export const createTransaction = async (data, createdById) => {
  // Fetch the target user's accountType so we know whether to notify them
  const targetUser = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true, accountType: true },
  });

  const transaction = await prisma.transaction.create({
    data: {
      accountType: data.accountType,
      userId: data.userId,
      orderId: data.orderId || null,
      kind: "LOAN",
      source: "MANUAL",
      amount: data.amount,
      transactionDate: data.transactionDate,
      note: data.note || null,
      createdById,
    },
    include: {
      user: { select: USER_SELECT },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Notify worker users (DOKHT / QICHIKAR) when admin gives them money
  if (
    targetUser &&
    (targetUser.accountType === "DOKHT" ||
      targetUser.accountType === "QICHIKAR")
  ) {
    // Store the date as YYYY-MM-DD so the frontend can format it per locale
    const dateStr =
      data.transactionDate instanceof Date
        ? data.transactionDate.toISOString().split("T")[0]
        : String(data.transactionDate).split("T")[0];

    const message = `Admin has given you ${data.amount} on ${dateStr}.`;
    await prisma.userNotification.create({
      data: {
        userId: data.userId,
        message,
        type: "ADMIN_PAYMENT",
      },
    });
  }

  if (transaction.orderId) {
    await recalculateOrderBenefit(transaction.orderId);
  }

  return transaction;
};

export const getTransactionSummaryForUser = async (
  userId,
  accountType,
  { month = null, year = null } = {},
) => {
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
  const paidDateFilter = hasMonthFilter
    ? {
        gte: monthRange.start,
        lte: monthRange.end,
      }
    : null;

  const completedPaymentWhere =
    accountType === "DOKHT"
      ? {
          dokhtAssignedToId: userId,
          dokhtCompletedAt: { not: null },
          dokhtPaymentStatus: "PAID_TO_WORKER",
          ...(paidDateFilter ? { dokhtPaidAt: paidDateFilter } : {}),
        }
      : accountType === "QICHIKAR"
        ? {
            qichikarAssignedToId: userId,
            qichikarCompletedAt: { not: null },
            qichikarPaymentStatus: "PAID_TO_WORKER",
            ...(paidDateFilter ? { qichikarPaidAt: paidDateFilter } : {}),
          }
        : {
            assignedToId: userId,
            isCompleted: true,
            workerPaymentStatus: "PAID_TO_WORKER",
            ...(paidDateFilter ? { workerPaidAt: paidDateFilter } : {}),
          };

  const paymentSumField =
    accountType === "DOKHT"
      ? "dokhtPaymentAmount"
      : accountType === "QICHIKAR"
        ? "qichikarPaymentAmount"
        : "workerPaymentAmount";

  const receiptRole =
    accountType === "DOKHT"
      ? "DOKHT"
      : accountType === "QICHIKAR"
        ? "QICHIKAR"
        : "WORKER";

  const [
    loanAggregate,
    penaltyAggregate,
    completedPaymentsAggregate,
    receiptAggregate,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        kind: "LOAN",
        source: "MANUAL",
        damagedClothesPenalty: null,
        ...(paidDateFilter
          ? {
              transactionDate: paidDateFilter,
            }
          : {}),
      },
      _sum: { amount: true },
    }),
    prisma.damagedClothesPenalty.aggregate({
      where: {
        userId,
        ...(paidDateFilter
          ? {
              createdAt: paidDateFilter,
            }
          : {}),
      },
      _sum: { totalExpense: true },
    }),
    prisma.order.aggregate({
      where: completedPaymentWhere,
      _sum: { [paymentSumField]: true },
    }),
    prisma.workerPaymentReceipt.aggregate({
      where: {
        workerId: userId,
        workerRole: receiptRole,
        ...(paidDateFilter
          ? {
              receiptDate: paidDateFilter,
            }
          : {}),
      },
      _sum: { paidAmount: true },
    }),
  ]);

  const loanTotal = Number(loanAggregate._sum.amount || 0);
  const damagePenaltyTotal = Number(penaltyAggregate?._sum?.totalExpense || 0);
  const totalCompletedPaymentsGross = Number(
    completedPaymentsAggregate._sum?.[paymentSumField] || 0,
  );
  const moneyReceiptTotal = Number(receiptAggregate._sum?.paidAmount || 0);
  const totalCompletedPayments = Math.max(
    totalCompletedPaymentsGross - moneyReceiptTotal,
    0,
  );

  return {
    loanTotal,
    damagePenaltyTotal,
    totalCompletedPaymentsGross,
    totalCompletedPayments,
    moneyReceiptTotal,
    currentBalance: totalCompletedPayments - loanTotal - damagePenaltyTotal,
  };
};

export const getTransactions = async ({
  page = 1,
  limit = 20,
  search = "",
  accountType = "",
  kind = "",
  month = null,
  year = null,
}) => {
  const skip = (page - 1) * limit;
  const normalizedSearch = String(normalizeText(search || "") || "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizedPhoneSearch = normalizePhone(search || "");

  const where = { source: "MANUAL", damagedClothesPenalty: null };
  if (accountType) where.accountType = accountType;
  if (kind) where.kind = kind;
  if (normalizedSearch) {
    where.OR = [
      { user: { name: { contains: normalizedSearch, mode: "insensitive" } } },
      ...(normalizedPhoneSearch
        ? [{ user: { phoneNumber: { contains: normalizedPhoneSearch } } }]
        : []),
    ];
  }

  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;
  if (
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear)
  ) {
    const { start: monthStart, end: monthEnd } = getAfghanMonthDateRange({
      month: parsedMonth,
      year: parsedYear,
    });
    where.transactionDate = { gte: monthStart, lte: monthEnd };
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: USER_SELECT },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const getUsersByAccountType = async (accountType) => {
  return prisma.user.findMany({
    where: { accountType, isActive: true },
    select: USER_SELECT,
    orderBy: { name: "asc" },
  });
};
