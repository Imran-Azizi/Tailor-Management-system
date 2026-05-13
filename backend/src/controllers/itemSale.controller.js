// (file reverted to blank as per undo request)
import { prisma } from "../lib/prisma.js";
import { ITEM_TYPES } from "./item.controller.js";

const LOW_STOCK_LIMIT = 5;

function normalizeText(value) {
  return String(value || "").trim();
}

function monthRange(monthValue) {
  if (!monthValue) return null;
  const [year, month] = String(monthValue).split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { gte: start, lt: end };
}

function dateEnd(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

function buildWhere(query) {
  const where = {};
  const type = normalizeText(query.type).toUpperCase();
  if (type) {
    if (!ITEM_TYPES.includes(type)) {
      const err = new Error("Invalid item type.");
      err.status = 400;
      throw err;
    }
    where.type = type;
  }
  if (query.brand)
    where.brand = { contains: normalizeText(query.brand), mode: "insensitive" };
  if (query.name)
    where.name = { contains: normalizeText(query.name), mode: "insensitive" };
  if (query.code)
    where.code = { contains: normalizeText(query.code), mode: "insensitive" };
  if (query.search) {
    const search = normalizeText(query.search);
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const createdAt = {};
  const range = monthRange(query.month);
  if (range) Object.assign(createdAt, range);
  if (query.dateFrom) createdAt.gte = new Date(query.dateFrom);
  if (query.dateTo) {
    const end = dateEnd(query.dateTo);
    if (end) createdAt.lte = end;
  }
  if (Object.keys(createdAt).length) where.createdAt = createdAt;

  if (query.profitMin || query.profitMax) {
    where.profit = {};
    if (query.profitMin) where.profit.gte = Number(query.profitMin);
    if (query.profitMax) where.profit.lte = Number(query.profitMax);
  }

  if (query.stockStatus === "out") where.item = { is: { quantity: 0 } };
  if (query.stockStatus === "low") {
    where.item = { is: { quantity: { gt: 0, lte: LOW_STOCK_LIMIT } } };
  }

  return where;
}

function pagination(query) {
  const requestedPage = Number(query.page || 1);
  const requestedPageSize = Number(query.pageSize || 50);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(100, Math.max(1, requestedPageSize))
    : 50;
  return { page, pageSize };
}

export async function listSales(req, res, next) {
  try {
    const where = buildWhere(req.query);
    const { page, pageSize } = pagination(req.query);
    const [sales, total] = await Promise.all([
      prisma.itemSale.findMany({
        where,
        include: {
          item: { select: { quantity: true } },
          createdBy: { select: { id: true, name: true, accountType: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.itemSale.count({ where }),
    ]);
    res.json({ sales, total, page, pageSize });
  } catch (error) {
    next(error);
  }
}

export async function createSale(req, res, next) {
  try {
    const itemId = normalizeText(req.body.itemId);
    const customerPrice = Number(req.body.customerPrice);
    const quantitySold = Number(req.body.quantitySold || 1);

    if (!itemId) return res.status(400).json({ error: "Item is required." });
    if (!Number.isFinite(customerPrice) || customerPrice < 0) {
      return res.status(400).json({ error: "Customer price must be valid." });
    }
    if (!Number.isInteger(quantitySold) || quantitySold < 1) {
      return res.status(400).json({ error: "Quantity sold must be valid." });
    }

    const sale = await prisma.$transaction(async (tx) => {
      const item = await tx.item.findUnique({ where: { id: itemId } });
      if (!item) {
        const err = new Error("Item not found.");
        err.status = 404;
        throw err;
      }
      if (item.quantity <= 0) {
        const err = new Error("This item is out of stock.");
        err.status = 400;
        throw err;
      }
      if (item.quantity < quantitySold) {
        const err = new Error("Not enough stock.");
        err.status = 400;
        throw err;
      }

      const unitProfit = customerPrice - item.originalPrice;
      const created = await tx.itemSale.create({
        data: {
          itemId,
          type: item.type,
          name: item.name,
          brand: item.brand,
          code: item.code,
          originalPrice: item.originalPrice,
          customerPrice,
          profit: unitProfit * quantitySold,
          quantitySold,
          createdById: req.user.id,
        },
      });

      await tx.item.update({
        where: { id: itemId },
        data: { quantity: { decrement: quantitySold } },
      });

      return created;
    });

    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
}

export async function stats(req, res, next) {
  try {
    const where = buildWhere(req.query);
    const [
      salesRows,
      salesCount,
      lowStockItems,
      inventory,
      salesByType,
      byType,
    ] = await Promise.all([
      prisma.itemSale.findMany({
        where,
        select: { customerPrice: true, profit: true, quantitySold: true },
      }),
      prisma.itemSale.count({ where }),
      prisma.item.count({ where: { quantity: { lte: LOW_STOCK_LIMIT } } }),
      prisma.item.findMany({
        select: { quantity: true, originalPrice: true, type: true },
      }),
      prisma.itemSale.groupBy({
        by: ["type"],
        where,
        _sum: { customerPrice: true, profit: true, quantitySold: true },
      }),
      prisma.item.groupBy({
        by: ["type"],
        _sum: { quantity: true },
        _count: { _all: true },
      }),
    ]);

    const totalInventoryValue = inventory.reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0) * Number(item.originalPrice || 0),
      0,
    );
    const totals = salesRows.reduce(
      (acc, sale) => {
        const qty = Number(sale.quantitySold || 0);
        acc.revenue += Number(sale.customerPrice || 0) * qty;
        acc.profit += Number(sale.profit || 0);
        acc.sold += qty;
        return acc;
      },
      { revenue: 0, profit: 0, sold: 0 },
    );

    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
    );
    const monthlyRows = await prisma.itemSale.findMany({
      where: {
        ...where,
        createdAt: { ...(where.createdAt || {}), gte: start },
      },
      select: {
        createdAt: true,
        customerPrice: true,
        profit: true,
        quantitySold: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const monthlySummary = monthlyRows.reduce((acc, row) => {
      const key = row.createdAt.toISOString().slice(0, 7);
      acc[key] ||= { month: key, revenue: 0, profit: 0, sold: 0 };
      acc[key].revenue +=
        Number(row.customerPrice || 0) * Number(row.quantitySold || 0);
      acc[key].profit += Number(row.profit || 0);
      acc[key].sold += Number(row.quantitySold || 0);
      return acc;
    }, {});

    res.json({
      totalRevenue: totals.revenue,
      totalProfit: totals.profit,
      totalSoldItems: totals.sold,
      saleRecords: salesCount,
      lowStockItems,
      totalInventoryValue,
      monthlySummary: Object.values(monthlySummary),
      salesByType,
      inventoryByType: byType,
      lowStockLimit: LOW_STOCK_LIMIT,
    });
  } catch (error) {
    next(error);
  }
}
