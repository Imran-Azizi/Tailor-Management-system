import { prisma } from "../lib/prisma.js";
import { normalizeText } from "../lib/normalize.js";
import { getTenantContext } from "../lib/tenantContext.js";
import {
  MONEY_SCALE,
  METER_SCALE,
  toNumberScaled,
  addScaled,
  subScaled,
  mulScaled,
  divScaled,
  maxScaled,
  sumScaled,
} from "../lib/decimal.js";
import { getAfghanMonthDateRange } from "../lib/afghanistanDate.js";

const DEFAULT_COLOR_HEX = "#94A3B8";

const getActiveTenantId = () => getTenantContext()?.tenantId || null;

const withTenantId = (data, tenantId) =>
  tenantId ? { ...data, tenantId } : data;

const normalizeHexColor = (value, fallback = DEFAULT_COLOR_HEX) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : fallback;
};

const toNonNegativeInt = (value) => {
  return maxScaled(toNumberScaled(value, MONEY_SCALE), 0, MONEY_SCALE);
};

const toPositiveInt = (value) => {
  const normalized = toNonNegativeInt(value);
  return normalized > 0 ? normalized : 1;
};

const toPositiveNumber = (value) => {
  const numeric = toNumberScaled(value, METER_SCALE);
  return numeric > 0 ? numeric : 0;
};

const round2 = (value) => {
  return toNumberScaled(value, MONEY_SCALE);
};

const safeDivide = (num, den) => {
  return divScaled(num || 0, den || 0, MONEY_SCALE);
};

const withComputedFields = (rakht) => ({
  ...rakht,
  tonPrice: divScaled(rakht.totalPrice, rakht.tonQuantity, MONEY_SCALE),
  remainingMoney: maxScaled(
    subScaled(rakht.totalPrice, rakht.givenMoney, MONEY_SCALE),
    0,
    MONEY_SCALE,
  ),
  tons: (rakht.tons || []).map((ton) => ({
    ...ton,
    tonTotalPrice: divScaled(rakht.totalPrice, rakht.tonQuantity, MONEY_SCALE),
    purchasePricePerMeter: divScaled(
      divScaled(rakht.totalPrice, rakht.tonQuantity, MONEY_SCALE),
      toPositiveNumber(ton.totalMeters),
      MONEY_SCALE,
    ),
    availableMeters: maxScaled(
      subScaled(ton.totalMeters, ton.usedMeters, METER_SCALE),
      0,
      METER_SCALE,
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
  const meters = toNumberScaled(order.rakhtRequiredMeters || 0, METER_SCALE);
  const costPerMeter = toNumberScaled(order.rakhtPiecePrice || 0, MONEY_SCALE);
  const sellingPerMeterRaw = toNumberScaled(
    order.rakhtCustomerPricePerMeter || 0,
    MONEY_SCALE,
  );
  const sellingTotalRaw = toNumberScaled(
    order.rakhtTotalCustomerPrice || 0,
    MONEY_SCALE,
  );

  const totalCost = mulScaled(meters, costPerMeter, MONEY_SCALE);
  const totalSelling =
    sellingTotalRaw > 0
      ? sellingTotalRaw
      : sellingPerMeterRaw > 0
        ? mulScaled(sellingPerMeterRaw, meters, MONEY_SCALE)
        : totalCost;

  const sellingPerMeter =
    sellingPerMeterRaw > 0
      ? sellingPerMeterRaw
      : meters > 0
        ? divScaled(totalSelling, meters, MONEY_SCALE)
        : 0;

  const benefit = subScaled(totalSelling, totalCost, MONEY_SCALE);

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
  month = null,
  year = null,
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

  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;
  const hasMonthFilter =
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear);

  if (hasMonthFilter) {
    const { start, end } = getAfghanMonthDateRange({
      month: parsedMonth,
      year: parsedYear,
    });
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { entryMonth: parsedMonth, entryYear: parsedYear },
          { entryMonth: null, createdAt: { gte: start, lte: end } },
        ],
      },
    ];
  } else {
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
    totalMetersSold = addScaled(totalMetersSold, row.meters, METER_SCALE);
    totalRevenue = addScaled(totalRevenue, row.benefit, MONEY_SCALE);
    totalSelling = addScaled(totalSelling, row.totalSelling, MONEY_SCALE);
    totalCost = addScaled(totalCost, row.totalCost, MONEY_SCALE);

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
    companyExisting.metersSold = addScaled(
      companyExisting.metersSold,
      row.meters,
      METER_SCALE,
    );
    companyExisting.totalSelling = addScaled(
      companyExisting.totalSelling,
      row.totalSelling,
      MONEY_SCALE,
    );
    companyExisting.totalCost = addScaled(
      companyExisting.totalCost,
      row.totalCost,
      MONEY_SCALE,
    );
    companyExisting.revenue = addScaled(
      companyExisting.revenue,
      row.benefit,
      MONEY_SCALE,
    );
    companyExisting.avgSellingPricePerMeter = divScaled(
      companyExisting.totalSelling,
      companyExisting.metersSold,
      MONEY_SCALE,
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
    tonExisting.metersSold = addScaled(
      tonExisting.metersSold,
      row.meters,
      METER_SCALE,
    );
    tonExisting.totalSelling = addScaled(
      tonExisting.totalSelling,
      row.totalSelling,
      MONEY_SCALE,
    );
    tonExisting.totalCost = addScaled(
      tonExisting.totalCost,
      row.totalCost,
      MONEY_SCALE,
    );
    tonExisting.revenue = addScaled(
      tonExisting.revenue,
      row.benefit,
      MONEY_SCALE,
    );
    tonExisting.avgSellingPricePerMeter = divScaled(
      tonExisting.totalSelling,
      tonExisting.metersSold,
      MONEY_SCALE,
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
    avgSellingPricePerMeter: divScaled(
      totalSelling,
      totalMetersSold,
      MONEY_SCALE,
    ),
    avgBenefitPerMeter: divScaled(totalRevenue, totalMetersSold, MONEY_SCALE),
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

export const getAllRakht = async ({ month = null, year = null } = {}) => {
  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;
  const where = {};

  if (
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear)
  ) {
    const { end } = getAfghanMonthDateRange({
      month: parsedMonth,
      year: parsedYear,
    });
    // Cumulative visibility: include fabrics created in previous months as well.
    where.date = { lte: end };
  }

  const rows = await prisma.rakht.findMany({
    where,
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

  const rakhtCreatedAtMs = new Date(rakhtWithComputed.createdAt).getTime();
  const originalTonWindowMs = 5000;

  const tonsDetailed = (rakhtWithComputed.tons || []).map((ton, index) => {
    const tonPrice = round2(
      safeDivide(rakhtWithComputed.totalPrice, rakhtWithComputed.tonQuantity),
    );
    const consumedMeters = toNonNegativeInt(ton.usedMeters);
    const totalMeters = toNonNegativeInt(ton.totalMeters);
    const remainingMeters = Math.max(0, totalMeters - consumedMeters);
    const tonCreatedAtMs = new Date(ton.createdAt).getTime();
    const isAddedTon =
      Number.isFinite(rakhtCreatedAtMs) &&
      Number.isFinite(tonCreatedAtMs) &&
      tonCreatedAtMs - rakhtCreatedAtMs > originalTonWindowMs;
    const sales = byTon.get(ton.id) || {
      profitGenerated: 0,
      metersSold: 0,
      orderCount: 0,
    };

    return {
      ...ton,
      tonIdentifier: `Ton ${index + 1}`,
      tonIndex: index + 1,
      isAddedTon,
      status: remainingMeters <= 0 ? "FINISHED" : "AVAILABLE",
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
  const totalMeters = tonsDetailed.reduce(
    (sum, ton) => sum + Number(ton.totalMeters || 0),
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
      totalMeters,
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
    const { start, end } = getAfghanMonthDateRange({
      month: parsedMonth,
      year: parsedYear,
    });
    paidAtFilter.gte = start;
    paidAtFilter.lte = end;
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
  const tenantId = getActiveTenantId();
  const created = await prisma.rakht.create({
    data: {
      ...(tenantId ? { tenantId } : {}),
      companyName: normalizeText(rest.companyName),
      brandName: normalizeText(rest.brandName),
      tonQuantity: toPositiveInt(rest.tonQuantity),
      totalPrice: toNonNegativeInt(rest.totalPrice),
      givenMoney: toNonNegativeInt(rest.givenMoney || 0),
      remainingMoney: maxScaled(
        subScaled(rest.totalPrice, rest.givenMoney || 0, MONEY_SCALE),
        0,
        MONEY_SCALE,
      ),
      tons: {
        create: tons.map((ton) =>
          withTenantId(
            {
              name: normalizeText(ton.name),
              colorHex: normalizeHexColor(ton.colorHex),
              totalMeters: maxScaled(
                toPositiveNumber(ton.totalMeters),
                0.01,
                METER_SCALE,
              ),
            },
            tenantId,
          ),
        ),
      },
    },
    include: { tons: { orderBy: { createdAt: "asc" } } },
  });
  return withComputedFields(created);
};

export const updateRakht = async (id, payload) => {
  const tenantId = getActiveTenantId();
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
  const remainingMoney = maxScaled(
    subScaled(totalPrice, givenMoney, MONEY_SCALE),
    0,
    MONEY_SCALE,
  );

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
      create: tons.map((ton) =>
        withTenantId(
          {
            name: normalizeText(ton.name),
            colorHex: normalizeHexColor(ton.colorHex),
            totalMeters: maxScaled(
              toPositiveNumber(ton.totalMeters),
              0.01,
              METER_SCALE,
            ),
          },
          tenantId || existing.tenantId,
        ),
      ),
    };
  }

  const updated = await prisma.rakht.update({
    where: { id },
    data: updateData,
    include: { tons: { orderBy: { createdAt: "asc" } } },
  });
  return withComputedFields(updated);
};

export const addRakhtTons = async (id, payload) => {
  const tenantId = getActiveTenantId();
  const existing = await prisma.rakht.findUnique({
    where: { id },
    include: { tons: true },
  });

  if (!existing) {
    throw Object.assign(new Error("Rakht not found"), { status: 404 });
  }

  const incomingTons = Array.isArray(payload?.tons) ? payload.tons : [];
  if (!incomingTons.length) {
    throw Object.assign(new Error("At least one ton is required."), {
      status: 400,
    });
  }

  const additionalTotalPrice = toNonNegativeInt(payload.totalPrice || 0);
  const additionalGivenMoney = toNonNegativeInt(payload.givenMoney || 0);

  if (additionalGivenMoney > additionalTotalPrice) {
    throw Object.assign(
      new Error("Given money cannot exceed total price."),
      { status: 400 },
    );
  }

  const nextTotalPrice = addScaled(
    existing.totalPrice || 0,
    additionalTotalPrice,
    MONEY_SCALE,
  );
  const nextGivenMoney = addScaled(
    existing.givenMoney || 0,
    additionalGivenMoney,
    MONEY_SCALE,
  );
  const nextTonQuantity = toPositiveInt(existing.tonQuantity) + incomingTons.length;

  const updated = await prisma.rakht.update({
    where: { id },
    data: {
      tonQuantity: nextTonQuantity,
      totalPrice: nextTotalPrice,
      givenMoney: nextGivenMoney,
      remainingMoney: maxScaled(
        subScaled(nextTotalPrice, nextGivenMoney, MONEY_SCALE),
        0,
        MONEY_SCALE,
      ),
      tons: {
        create: incomingTons.map((ton) =>
          withTenantId(
            {
              name: normalizeText(ton.name),
              colorHex: normalizeHexColor(ton.colorHex),
              totalMeters: maxScaled(
                toPositiveNumber(ton.totalMeters),
                0.01,
                METER_SCALE,
              ),
            },
            tenantId || existing.tenantId,
          ),
        ),
      },
    },
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

  const totalRemaining = sumScaled(
    rows.map((row) => maxScaled(row.remainingMoney || 0, 0, MONEY_SCALE)),
    MONEY_SCALE,
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

  const totalPriceBefore = sumScaled(
    rows.map((row) => toNonNegativeInt(row.totalPrice)),
    MONEY_SCALE,
  );
  const totalPaidBefore = sumScaled(
    rows.map((row) => toNonNegativeInt(row.givenMoney)),
    MONEY_SCALE,
  );
  const remainingBefore = maxScaled(
    subScaled(totalPriceBefore, totalPaidBefore, MONEY_SCALE),
    0,
    MONEY_SCALE,
  );

  let balance = payAmount;

  const historyRecord = await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      if (balance <= 0) break;

      const rowRemaining = maxScaled(row.remainingMoney || 0, 0, MONEY_SCALE);
      if (rowRemaining <= 0) continue;

      const applied = toNumberScaled(
        Math.min(balance, rowRemaining),
        MONEY_SCALE,
      );
      const nextGiven = addScaled(row.givenMoney || 0, applied, MONEY_SCALE);
      const nextRemaining = maxScaled(
        subScaled(row.totalPrice || 0, nextGiven, MONEY_SCALE),
        0,
        MONEY_SCALE,
      );

      await tx.rakht.update({
        where: { id: row.id },
        data: {
          givenMoney: nextGiven,
          remainingMoney: nextRemaining,
        },
      });

      balance = maxScaled(
        subScaled(balance, applied, MONEY_SCALE),
        0,
        MONEY_SCALE,
      );
    }

    const refreshedInTx = await tx.rakht.findMany({
      where: { companyName: normalizedCompany },
    });

    const totalPriceAfter = sumScaled(
      refreshedInTx.map((row) => toNonNegativeInt(row.totalPrice)),
      MONEY_SCALE,
    );
    const totalPaidAfter = sumScaled(
      refreshedInTx.map((row) => toNonNegativeInt(row.givenMoney)),
      MONEY_SCALE,
    );
    const remainingAfter = maxScaled(
      subScaled(totalPriceAfter, totalPaidAfter, MONEY_SCALE),
      0,
      MONEY_SCALE,
    );

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
