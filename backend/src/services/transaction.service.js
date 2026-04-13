import { prisma } from '../lib/prisma.js';

const USER_SELECT = {
  id: true,
  name: true,
  phoneNumber: true,
  accountType: true,
};

export const createTransaction = async (data, createdById) => {
  return prisma.transaction.create({
    data: {
      accountType: data.accountType,
      userId:      data.userId,
      amount:      data.amount,
      transactionDate: data.transactionDate,
      note:        data.note || null,
      createdById,
    },
    include: {
      user:      { select: USER_SELECT },
      createdBy: { select: { id: true, name: true } },
    },
  });
};

export const getTransactions = async ({ page = 1, limit = 20, search = '', accountType = '' }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (accountType) where.accountType = accountType;
  if (search) {
    where.user = { name: { contains: search, mode: 'insensitive' } };
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      include: {
        user:      { select: USER_SELECT },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const getUsersByAccountType = async (accountType) => {
  return prisma.user.findMany({
    where: { accountType, isActive: true },
    select: USER_SELECT,
    orderBy: { name: 'asc' },
  });
};
