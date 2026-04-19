import { prisma } from "../lib/prisma.js";

const USER_SELECT = {
  id: true,
  name: true,
  phoneNumber: true,
  accountType: true,
};

const WORKER_PAYMENT_NOTE_PREFIX = "Worker completion payment -";

export const createTransaction = async (data, createdById) => {
  return prisma.transaction.create({
    data: {
      accountType: data.accountType,
      userId: data.userId,
      kind: "LOAN",
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
};

export const getTransactionSummaryForUser = async (userId, accountType) => {
  const completedPaymentWhere =
    accountType === "DOKHT"
      ? {
          dokhtAssignedToId: userId,
          dokhtCompletedAt: { not: null },
          dokhtPaymentStatus: "PAID_TO_WORKER",
        }
      : accountType === "QICHIKAR"
        ? {
            qichikarAssignedToId: userId,
            qichikarCompletedAt: { not: null },
            qichikarPaymentStatus: "PAID_TO_WORKER",
          }
        : {
            assignedToId: userId,
            workerPaymentStatus: "PAID_TO_WORKER",
          };

  const paymentSumField =
    accountType === "DOKHT"
      ? "dokhtPaymentAmount"
      : accountType === "QICHIKAR"
        ? "qichikarPaymentAmount"
        : "workerPaymentAmount";

  const [grouped, completedPayments] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["kind"],
      where: {
        userId,
        NOT: {
          note: { startsWith: WORKER_PAYMENT_NOTE_PREFIX },
        },
      },
      _sum: { amount: true },
    }),
    prisma.order.aggregate({
      where: completedPaymentWhere,
      _sum: { [paymentSumField]: true },
    }),
  ]);

  const summary = grouped.reduce(
    (summary, row) => {
      const total = Number(row._sum.amount || 0);
      if (row.kind === "LOAN") {
        summary.loanTotal = total;
      }
      return summary;
    },
    {
      loanTotal: 0,
      totalCompletedPayments: 0,
    },
  );

  summary.totalCompletedPayments = Number(
    completedPayments._sum?.[paymentSumField] || 0,
  );

  return summary;
};

export const getTransactions = async ({
  page = 1,
  limit = 20,
  search = "",
  accountType = "",
}) => {
  const skip = (page - 1) * limit;

  const where = {
    NOT: {
      note: { startsWith: WORKER_PAYMENT_NOTE_PREFIX },
    },
  };
  if (accountType) where.accountType = accountType;
  if (search) {
    where.user = { name: { contains: search, mode: "insensitive" } };
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
