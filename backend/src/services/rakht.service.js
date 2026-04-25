import { prisma } from "../lib/prisma.js";
import { normalizeText } from "../lib/normalize.js";

const DEFAULT_COLOR_HEX = "#94A3B8";

const normalizeHexColor = (value, fallback = DEFAULT_COLOR_HEX) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : fallback;
};

const toNonNegativeInt = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.trunc(numeric));
};

const toPositiveInt = (value) => {
  const normalized = toNonNegativeInt(value);
  return normalized > 0 ? normalized : 1;
};

const withComputedFields = (rakht) => ({
  ...rakht,
  remainingMoney: Math.max(
    0,
    toNonNegativeInt(rakht.totalPrice) - toNonNegativeInt(rakht.givenMoney),
  ),
  tons: (rakht.tons || []).map((ton) => ({
    ...ton,
    availableMeters: Math.max(
      0,
      toNonNegativeInt(ton.totalMeters) - toNonNegativeInt(ton.usedMeters),
    ),
  })),
});

export const getAllRakht = async () => {
  const rows = await prisma.rakht.findMany({
    include: { tons: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ brandName: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(withComputedFields);
};

export const getRakhtPaymentHistory = async ({
  companyName,
  search = "",
  status = "",
  fromDate,
  toDate,
  month = null,
  year = null,
  sortBy = "paidAt",
  sortOrder = "desc",
  page = 1,
  limit = 20,
} = {}) => {
  const normalizedCompany = companyName ? normalizeText(companyName) : "";
  const normalizedSearch = normalizeText(search || "");
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;
  const safeSortOrder =
    String(sortOrder).toLowerCase() === "asc" ? "asc" : "desc";
  const sortableFields = new Set([
    "paidAt",
    "companyName",
    "paidAmount",
    "totalPriceBefore",
    "remainingAfter",
    "createdAt",
  ]);
  const safeSortBy = sortableFields.has(sortBy) ? sortBy : "paidAt";

  const paidAtFilter = {};

  // Month/year takes precedence over custom fromDate/toDate
  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;
  if (
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear)
  ) {
    paidAtFilter.gte = new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0);
    paidAtFilter.lte = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);
  } else {
    if (fromDate) {
      const parsedFrom = new Date(fromDate);
      if (!Number.isNaN(parsedFrom.getTime())) {
        paidAtFilter.gte = parsedFrom;
      }
    }
    if (toDate) {
      const parsedTo = new Date(toDate);
      if (!Number.isNaN(parsedTo.getTime())) {
        parsedTo.setHours(23, 59, 59, 999);
        paidAtFilter.lte = parsedTo;
      }
    }
  }

  const where = {
    ...(normalizedCompany ? { companyName: normalizedCompany } : {}),
    ...(normalizedSearch
      ? {
          OR: [
            {
              companyName: { contains: normalizedSearch, mode: "insensitive" },
            },
            {
              paidBy: {
                name: { contains: normalizedSearch, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
    ...(Object.keys(paidAtFilter).length ? { paidAt: paidAtFilter } : {}),
  };

  if (status === "PAID") {
    where.remainingAfter = { lte: 0 };
  } else if (status === "PARTIAL") {
    where.AND = [
      ...(where.AND || []),
      { remainingAfter: { gt: 0 } },
      { totalPaidAfter: { gt: 0 } },
    ];
  } else if (status === "REMAINING") {
    where.AND = [
      ...(where.AND || []),
      { remainingAfter: { gt: 0 } },
      { totalPaidAfter: { lte: 0 } },
    ];
  }

  const [data, total, aggregates] = await Promise.all([
    prisma.rakhtPaymentHistory.findMany({
      where,
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            accountType: true,
          },
        },
      },
      orderBy: { [safeSortBy]: safeSortOrder },
      skip,
      take: safeLimit,
    }),
    prisma.rakhtPaymentHistory.count({ where }),
    prisma.rakhtPaymentHistory.aggregate({
      where,
      _sum: {
        paidAmount: true,
        remainingAfter: true,
      },
    }),
  ]);

  return {
    data,
    total,
    page: safePage,
    limit: safeLimit,
    summary: {
      totalPaid: Number(aggregates._sum.paidAmount || 0),
      totalRemaining: Number(aggregates._sum.remainingAfter || 0),
    },
  };
};

export const createRakht = async (payload) => {
  const { tons, ...rest } = payload;
  const created = await prisma.rakht.create({
    data: {
      companyName: normalizeText(rest.companyName),
      brandName: normalizeText(rest.brandName),
      tonQuantity: toPositiveInt(rest.tonQuantity),
      totalPrice: toNonNegativeInt(rest.totalPrice),
      givenMoney: toNonNegativeInt(rest.givenMoney || 0),
      remainingMoney: Math.max(
        0,
        toNonNegativeInt(rest.totalPrice) -
          toNonNegativeInt(rest.givenMoney || 0),
      ),
      tons: {
        create: tons.map((ton) => ({
          name: normalizeText(ton.name),
          colorHex: normalizeHexColor(ton.colorHex),
          totalMeters: toPositiveInt(ton.totalMeters),
        })),
      },
    },
    include: { tons: { orderBy: { createdAt: "asc" } } },
  });
  return withComputedFields(created);
};

export const updateRakht = async (id, payload) => {
  const existing = await prisma.rakht.findUnique({
    where: { id },
    include: { tons: true },
  });
  if (!existing)
    throw Object.assign(new Error("Rakht not found"), { status: 404 });

  const { tons, ...rest } = payload;

  const companyName =
    rest.companyName !== undefined
      ? normalizeText(rest.companyName)
      : existing.companyName;
  const brandName =
    rest.brandName !== undefined
      ? normalizeText(rest.brandName)
      : existing.brandName;
  const tonQuantity =
    rest.tonQuantity !== undefined
      ? toPositiveInt(rest.tonQuantity)
      : toPositiveInt(existing.tonQuantity);
  const totalPrice =
    rest.totalPrice !== undefined
      ? toNonNegativeInt(rest.totalPrice)
      : toNonNegativeInt(existing.totalPrice);
  const givenMoney =
    rest.givenMoney !== undefined
      ? toNonNegativeInt(rest.givenMoney)
      : toNonNegativeInt(existing.givenMoney);
  const remainingMoney = Math.max(0, totalPrice - givenMoney);

  const updateData = {
    companyName,
    brandName,
    tonQuantity,
    totalPrice,
    givenMoney,
    remainingMoney,
  };

  if (tons !== undefined) {
    await prisma.rakhtTon.deleteMany({ where: { rakhtId: id } });
    updateData.tons = {
      create: tons.map((ton) => ({
        name: normalizeText(ton.name),
        colorHex: normalizeHexColor(ton.colorHex),
        totalMeters: toPositiveInt(ton.totalMeters),
      })),
    };
  }

  const updated = await prisma.rakht.update({
    where: { id },
    data: updateData,
    include: { tons: { orderBy: { createdAt: "asc" } } },
  });
  return withComputedFields(updated);
};

export const removeRakht = async (id) => {
  const existing = await prisma.rakht.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });

  if (!existing)
    throw Object.assign(new Error("Rakht not found"), { status: 404 });
  if ((existing._count?.orders || 0) > 0) {
    throw Object.assign(
      new Error("Cannot delete Rakht that is linked to orders."),
      { status: 400 },
    );
  }

  await prisma.rakht.delete({ where: { id } });
};

export const deleteRakhtCompany = async (companyName) => {
  const normalizedCompany = normalizeText(companyName);

  if (!normalizedCompany) {
    throw Object.assign(new Error("Company name is required"), { status: 400 });
  }

  const companyMatch = {
    equals: normalizedCompany,
    mode: "insensitive",
  };

  const rows = await prisma.rakht.findMany({
    where: { companyName: companyMatch },
    select: {
      id: true,
      _count: { select: { orders: true } },
    },
  });

  if (rows.length === 0) {
    throw Object.assign(new Error("Company not found"), { status: 404 });
  }

  const hasLinkedOrders = rows.some((row) => (row._count?.orders || 0) > 0);
  if (hasLinkedOrders) {
    throw Object.assign(
      new Error("Cannot delete company that is linked to orders."),
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const paymentHistory = await tx.rakhtPaymentHistory.deleteMany({
      where: { companyName: companyMatch },
    });
    const rakht = await tx.rakht.deleteMany({
      where: { companyName: companyMatch },
    });

    return {
      paymentHistoryDeletedCount: paymentHistory.count,
      rakhtDeletedCount: rakht.count,
    };
  });

  return {
    companyName: normalizedCompany,
    deletedCount: result.rakhtDeletedCount,
    paymentHistoryDeletedCount: result.paymentHistoryDeletedCount,
  };
};

export const payRemainingMoneyByCompany = async ({
  companyName,
  amount,
  paidById,
}) => {
  const normalizedCompany = normalizeText(companyName);
  const payAmount = toPositiveInt(amount);

  const rows = await prisma.rakht.findMany({
    where: { companyName: normalizedCompany },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  if (rows.length === 0) {
    throw Object.assign(new Error("Company not found"), { status: 404 });
  }

  const totalRemaining = rows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.remainingMoney || 0)),
    0,
  );

  if (totalRemaining <= 0) {
    throw Object.assign(new Error("No remaining amount for this company"), {
      status: 400,
    });
  }

  if (payAmount > totalRemaining) {
    throw Object.assign(
      new Error("Payment amount cannot exceed remaining amount"),
      {
        status: 400,
      },
    );
  }

  const totalPriceBefore = rows.reduce(
    (sum, row) => sum + toNonNegativeInt(row.totalPrice),
    0,
  );
  const totalPaidBefore = rows.reduce(
    (sum, row) => sum + toNonNegativeInt(row.givenMoney),
    0,
  );
  const remainingBefore = Math.max(0, totalPriceBefore - totalPaidBefore);

  let balance = payAmount;

  const historyRecord = await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (balance <= 0) break;

      const rowRemaining = Math.max(0, Number(row.remainingMoney || 0));
      if (rowRemaining <= 0) continue;

      const applied = Math.min(balance, rowRemaining);
      const nextGiven = toNonNegativeInt(row.givenMoney) + applied;
      const nextRemaining = Math.max(
        0,
        toNonNegativeInt(row.totalPrice) - nextGiven,
      );

      await tx.rakht.update({
        where: { id: row.id },
        data: {
          givenMoney: nextGiven,
          remainingMoney: nextRemaining,
        },
      });

      balance -= applied;
    }

    const refreshedInTx = await tx.rakht.findMany({
      where: { companyName: normalizedCompany },
    });

    const totalPriceAfter = refreshedInTx.reduce(
      (sum, row) => sum + toNonNegativeInt(row.totalPrice),
      0,
    );
    const totalPaidAfter = refreshedInTx.reduce(
      (sum, row) => sum + toNonNegativeInt(row.givenMoney),
      0,
    );
    const remainingAfter = Math.max(0, totalPriceAfter - totalPaidAfter);

    const history = await tx.rakhtPaymentHistory.create({
      data: {
        companyName: normalizedCompany,
        paidAmount: payAmount,
        totalPriceBefore,
        totalPaidBefore,
        remainingBefore,
        totalPriceAfter,
        totalPaidAfter,
        remainingAfter,
        paidById,
      },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            accountType: true,
          },
        },
      },
    });

    return {
      totalPriceAfter,
      totalPaidAfter,
      remainingAfter,
      history,
    };
  });

  return {
    companyName: normalizedCompany,
    totalPrice: historyRecord.totalPriceAfter,
    totalPaid: historyRecord.totalPaidAfter,
    remaining: historyRecord.remainingAfter,
    paidAmount: payAmount,
    paidAt: new Date().toISOString(),
    history: historyRecord.history,
  };
};
