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

const toPositiveNumber = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 0 ? numeric : 0;
};

const round2 = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
};

const safeDivide = (num, den) => {
  const a = Number(num || 0);
  const b = Number(den || 0);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return 0;
  return a / b;
};

const withComputedFields = (rakht) => ({
  ...rakht,
  tonPrice: round2(safeDivide(rakht.totalPrice, rakht.tonQuantity)),
  remainingMoney: Math.max(
    0,
    toNonNegativeInt(rakht.totalPrice) - toNonNegativeInt(rakht.givenMoney),
  ),
  tons: (rakht.tons || []).map((ton) => ({
    ...ton,
    tonTotalPrice: round2(safeDivide(rakht.totalPrice, rakht.tonQuantity)),
    purchasePricePerMeter: round2(
      safeDivide(
        safeDivide(rakht.totalPrice, rakht.tonQuantity),
        toPositiveNumber(ton.totalMeters),
      ),
    ),
    availableMeters: Math.max(
      0,
      toNonNegativeInt(ton.totalMeters) - toNonNegativeInt(ton.usedMeters),
    ),
  })),
});

export const getRakhtRevenueSummary = async (options = {}) => {
  return getRakhtRevenueSummaryWithFilters(options);
};

const buildRakhtRevenueBaseWhere = (financeUserId) => ({
  ...(financeUserId ? { createdByFinanceId: String(financeUserId) } : {}),
  rakhtId: { not: null },
  rakhtRequiredMeters: { gt: 0 },
  rakhtPiecePrice: { gt: 0 },
});

const ORDER_TYPE_VALUES = ["OUTFIT", "WASKAT", "KORTY", "YAKHANQAQ"];

const deriveRakhtOrderFinancials = (order) => {
  const meters = Number(order.rakhtRequiredMeters || 0);
  const costPerMeter = Number(order.rakhtPiecePrice || 0);
  const sellingPerMeterRaw = Number(order.rakhtCustomerPricePerMeter || 0);
  const sellingTotalRaw = Number(order.rakhtTotalCustomerPrice || 0);

  const totalCost = meters * costPerMeter;
  const totalSelling =
    sellingTotalRaw > 0
      ? sellingTotalRaw
      : sellingPerMeterRaw > 0
        ? sellingPerMeterRaw * meters
        : totalCost;

  const sellingPerMeter =
    sellingPerMeterRaw > 0
      ? sellingPerMeterRaw
      : meters > 0
        ? safeDivide(totalSelling, meters)
        : 0;

  const benefit = totalSelling - totalCost;

  return {
    meters: round2(meters),
    costPerMeter: round2(costPerMeter),
    sellingPerMeter: round2(sellingPerMeter),
    totalCost: round2(totalCost),
    totalSelling: round2(totalSelling),
    benefit: round2(benefit),
  };
};

const toRevenueRow = (order) => {
  const financials = deriveRakhtOrderFinancials(order);

  return {
    orderId: order.id,
    orderType: order.type,
    customerName: order.customer?.firstName || "-",
    customerPhone: order.customer?.phoneNumber || "-",
    companyName: order.rakhtCompanyName || "Unknown",
    brandName: order.rakhtBrandName || "Unknown",
    tonId: order.rakhtTon?.id || null,
    tonName: order.rakhtTon?.name || "Unknown",
    ...financials,
    createdAt: order.createdAt,
  };
};

export const getRakhtRevenueSummaryWithFilters = async ({
  financeUserId,
  search = "",
  companyName,
  brandName,
  tonName,
  orderType,
  fromDate,
  toDate,
  minMeters,
  maxMeters,
  page = 1,
  limit = 25,
} = {}) => {
  const normalizedSearch = normalizeText(search || "");
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const skip = (safePage - 1) * safeLimit;

  const where = buildRakhtRevenueBaseWhere(financeUserId);

  if (companyName) where.rakhtCompanyName = normalizeText(companyName);
  if (brandName) where.rakhtBrandName = normalizeText(brandName);
  if (tonName) where.rakhtTon = { is: { name: normalizeText(tonName) } };
  if (orderType && ORDER_TYPE_VALUES.includes(orderType))
    where.type = orderType;

  const metersFilter = {};
  const minMetersNumber = Number(minMeters);
  const maxMetersNumber = Number(maxMeters);
  if (Number.isFinite(minMetersNumber) && minMetersNumber > 0) {
    metersFilter.gte = minMetersNumber;
  }
  if (Number.isFinite(maxMetersNumber) && maxMetersNumber > 0) {
    metersFilter.lte = maxMetersNumber;
  }
  if (Object.keys(metersFilter).length) {
    where.rakhtRequiredMeters = {
      ...(where.rakhtRequiredMeters || {}),
      ...metersFilter,
    };
  }

  const createdAtFilter = {};
  if (fromDate) {
    const parsedFrom = new Date(fromDate);
    if (!Number.isNaN(parsedFrom.getTime())) {
      parsedFrom.setHours(0, 0, 0, 0);
      createdAtFilter.gte = parsedFrom;
    }
  }
  if (toDate) {
    const parsedTo = new Date(toDate);
    if (!Number.isNaN(parsedTo.getTime())) {
      parsedTo.setHours(23, 59, 59, 999);
      createdAtFilter.lte = parsedTo;
    }
  }
  if (Object.keys(createdAtFilter).length) {
    where.createdAt = createdAtFilter;
  }

  if (normalizedSearch) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { id: { contains: normalizedSearch, mode: "insensitive" } },
          {
            rakhtCompanyName: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          },
          {
            rakhtBrandName: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          },
          {
            customer: {
              firstName: { contains: normalizedSearch, mode: "insensitive" },
            },
          },
          {
            customer: {
              phoneNumber: {
                contains: normalizedSearch,
                mode: "insensitive",
              },
            },
          },
          {
            rakhtTon: {
              is: { name: { contains: normalizedSearch, mode: "insensitive" } },
            },
          },
        ],
      },
    ];
  }

  const selectClause = {
    id: true,
    type: true,
    rakhtCompanyName: true,
    rakhtBrandName: true,
    rakhtRequiredMeters: true,
    rakhtPiecePrice: true,
    rakhtCustomerPricePerMeter: true,
    rakhtTotalCustomerPrice: true,
    createdAt: true,
    customer: {
      select: {
        firstName: true,
        phoneNumber: true,
      },
    },
    rakhtTon: {
      select: {
        id: true,
        name: true,
      },
    },
  };

  const [allRowsRaw, paginatedRowsRaw, totalRows, companies, brands, tons] =
    await Promise.all([
      prisma.order.findMany({ where, select: selectClause }),
      prisma.order.findMany({
        where,
        select: selectClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.order.count({ where }),
      prisma.order.findMany({
        where: buildRakhtRevenueBaseWhere(financeUserId),
        select: { rakhtCompanyName: true },
        distinct: ["rakhtCompanyName"],
        orderBy: { rakhtCompanyName: "asc" },
      }),
      prisma.order.findMany({
        where: buildRakhtRevenueBaseWhere(financeUserId),
        select: { rakhtBrandName: true },
        distinct: ["rakhtBrandName"],
        orderBy: { rakhtBrandName: "asc" },
      }),
      prisma.rakhtTon.findMany({
        where: {
          orders: {
            some: buildRakhtRevenueBaseWhere(financeUserId),
          },
        },
        select: { name: true },
        distinct: ["name"],
        orderBy: { name: "asc" },
      }),
    ]);

  const allRows = allRowsRaw.map(toRevenueRow);
  const details = paginatedRowsRaw.map(toRevenueRow);

  const byCompanyMap = new Map();
  const byTonMap = new Map();
  let totalMetersSold = 0;
  let totalRevenue = 0;
  let totalSelling = 0;
  let totalCost = 0;

  for (const row of allRows) {
    totalMetersSold += row.meters;
    totalRevenue += row.benefit;
    totalSelling += row.totalSelling;
    totalCost += row.totalCost;

    const companyExisting = byCompanyMap.get(row.companyName) || {
      companyName: row.companyName,
      orderCount: 0,
      metersSold: 0,
      totalSelling: 0,
      totalCost: 0,
      revenue: 0,
      avgSellingPricePerMeter: 0,
    };
    companyExisting.orderCount += 1;
    companyExisting.metersSold += row.meters;
    companyExisting.totalSelling += row.totalSelling;
    companyExisting.totalCost += row.totalCost;
    companyExisting.revenue += row.benefit;
    companyExisting.avgSellingPricePerMeter = safeDivide(
      companyExisting.totalSelling,
      companyExisting.metersSold,
    );
    byCompanyMap.set(row.companyName, companyExisting);

    const tonExisting = byTonMap.get(row.tonName) || {
      tonName: row.tonName,
      orderCount: 0,
      metersSold: 0,
      totalSelling: 0,
      totalCost: 0,
      revenue: 0,
      avgSellingPricePerMeter: 0,
    };
    tonExisting.orderCount += 1;
    tonExisting.metersSold += row.meters;
    tonExisting.totalSelling += row.totalSelling;
    tonExisting.totalCost += row.totalCost;
    tonExisting.revenue += row.benefit;
    tonExisting.avgSellingPricePerMeter = safeDivide(
      tonExisting.totalSelling,
      tonExisting.metersSold,
    );
    byTonMap.set(row.tonName, tonExisting);
  }

  const byCompany = Array.from(byCompanyMap.values())
    .map((row) => ({
      ...row,
      metersSold: round2(row.metersSold),
      totalSelling: round2(row.totalSelling),
      totalCost: round2(row.totalCost),
      revenue: round2(row.revenue),
      avgSellingPricePerMeter: round2(row.avgSellingPricePerMeter),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const byTon = Array.from(byTonMap.values())
    .map((row) => ({
      ...row,
      metersSold: round2(row.metersSold),
      totalSelling: round2(row.totalSelling),
      totalCost: round2(row.totalCost),
      revenue: round2(row.revenue),
      avgSellingPricePerMeter: round2(row.avgSellingPricePerMeter),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalOrders: allRows.length,
    totalMetersSold: round2(totalMetersSold),
    totalRevenue: round2(totalRevenue),
    totalSelling: round2(totalSelling),
    totalCost: round2(totalCost),
    avgSellingPricePerMeter: round2(safeDivide(totalSelling, totalMetersSold)),
    avgBenefitPerMeter: round2(safeDivide(totalRevenue, totalMetersSold)),
    byCompany,
    byTon,
    details,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: totalRows,
      totalPages: Math.max(1, Math.ceil(totalRows / safeLimit)),
    },
    filters: {
      companies: companies.map((item) => item.rakhtCompanyName).filter(Boolean),
      brands: brands.map((item) => item.rakhtBrandName).filter(Boolean),
      tons: tons.map((item) => item.name).filter(Boolean),
      orderTypes: ORDER_TYPE_VALUES,
    },
  };
};

export const getAllRakht = async () => {
  const rows = await prisma.rakht.findMany({
    include: { tons: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ brandName: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(withComputedFields);
};

export const getRakhtDetailById = async (id) => {
  const rakht = await prisma.rakht.findUnique({
    where: { id },
    include: { tons: { orderBy: { createdAt: "asc" } } },
  });

  if (!rakht) {
    throw Object.assign(new Error("Rakht not found"), { status: 404 });
  }

  const rakhtWithComputed = withComputedFields(rakht);

  const orders = await prisma.order.findMany({
    where: { rakhtId: id },
    select: {
      id: true,
      rakhtTonId: true,
      rakhtRequiredMeters: true,
      rakhtPiecePrice: true,
      rakhtCustomerPricePerMeter: true,
      rakhtTotalCustomerPrice: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const byTon = new Map();
  let totalProfitGenerated = 0;

  for (const order of orders) {
    const financials = deriveRakhtOrderFinancials(order);
    totalProfitGenerated += Number(financials.benefit || 0);

    const tonKey = order.rakhtTonId || "UNASSIGNED";
    const current = byTon.get(tonKey) || {
      profitGenerated: 0,
      metersSold: 0,
      orderCount: 0,
    };
    current.profitGenerated += Number(financials.benefit || 0);
    current.metersSold += Number(financials.meters || 0);
    current.orderCount += 1;
    byTon.set(tonKey, current);
  }

  const tonsDetailed = (rakhtWithComputed.tons || []).map((ton, index) => {
    const tonPrice = round2(
      safeDivide(rakhtWithComputed.totalPrice, rakhtWithComputed.tonQuantity),
    );
    const consumedMeters = toNonNegativeInt(ton.usedMeters);
    const totalMeters = toNonNegativeInt(ton.totalMeters);
    const remainingMeters = Math.max(0, totalMeters - consumedMeters);
    const sales = byTon.get(ton.id) || {
      profitGenerated: 0,
      metersSold: 0,
      orderCount: 0,
    };

    return {
      ...ton,
      tonIdentifier: `Ton ${index + 1}`,
      tonIndex: index + 1,
      tonPrice,
      pricePerMeter: round2(
        safeDivide(tonPrice, toPositiveNumber(totalMeters)),
      ),
      consumedMeters,
      remainingMeters,
      profitGenerated: round2(sales.profitGenerated),
      metersSoldFromOrders: round2(sales.metersSold),
      orderCount: sales.orderCount,
    };
  });

  const totalConsumedMeters = tonsDetailed.reduce(
    (sum, ton) => sum + Number(ton.consumedMeters || 0),
    0,
  );
  const totalRemainingMeters = tonsDetailed.reduce(
    (sum, ton) => sum + Number(ton.remainingMeters || 0),
    0,
  );

  return {
    id: rakhtWithComputed.id,
    companyName: rakhtWithComputed.companyName,
    brandName: rakhtWithComputed.brandName,
    tonQuantity: rakhtWithComputed.tonQuantity,
    totalPrice: rakhtWithComputed.totalPrice,
    givenMoney: rakhtWithComputed.givenMoney,
    remainingMoney: rakhtWithComputed.remainingMoney,
    date: rakhtWithComputed.date,
    createdAt: rakhtWithComputed.createdAt,
    updatedAt: rakhtWithComputed.updatedAt,
    tons: tonsDetailed,
    summary: {
      totalConsumedMeters,
      totalRemainingMeters,
      totalProfitGenerated: round2(totalProfitGenerated),
      unassignedTonProfitGenerated: round2(
        Number(byTon.get("UNASSIGNED")?.profitGenerated || 0),
      ),
      linkedOrderCount: orders.length,
    },
  };
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
