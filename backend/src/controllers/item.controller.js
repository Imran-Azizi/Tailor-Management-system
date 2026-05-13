import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const ITEM_TYPES = ["WATCH", "PERFUME", "BOOT", "RING", "SLIPPER"];
const LOW_STOCK_LIMIT = 5;

function normalizeText(value) {
  return String(value || "").trim();
}

function parsePositiveInt(value, field, { allowZero = false } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < (allowZero ? 0 : 1)) {
    const err = new Error(`${field} must be a valid number.`);
    err.status = 400;
    throw err;
  }
  return number;
}

function parseMoney(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    const err = new Error(`${field} must be a valid amount.`);
    err.status = 400;
    throw err;
  }
  return number;
}

function validateType(type) {
  if (!ITEM_TYPES.includes(type)) {
    const err = new Error("Invalid item type.");
    err.status = 400;
    throw err;
  }
}

function buildItemPayload(body, { partial = false } = {}) {
  const type = normalizeText(body.type).toUpperCase();
  if (!partial || type) validateType(type);

  const name = normalizeText(body.name);
  const brand = normalizeText(body.brand);
  const code = normalizeText(body.code).toUpperCase();

  if (!partial && (!name || !brand || !code)) {
    const err = new Error("Item name, brand name, and code are required.");
    err.status = 400;
    throw err;
  }

  const data = {};
  if (type) data.type = type;
  if (name) data.name = name;
  if (brand) data.brand = brand;
  if (code) data.code = code;
  if (body.quantity !== undefined) {
    data.quantity = parsePositiveInt(body.quantity, "Quantity", {
      allowZero: true,
    });
  }
  if (body.originalPrice !== undefined) {
    data.originalPrice = parseMoney(body.originalPrice, "Original price");
  }
  if (body.notes !== undefined) data.notes = normalizeText(body.notes) || null;

  if (!partial && data.quantity === undefined) data.quantity = 0;
  if (!partial && data.originalPrice === undefined) {
    const err = new Error("Original price is required.");
    err.status = 400;
    throw err;
  }

  return data;
}

function getPagination(req) {
  const requestedPage = Number(req.query.page || 1);
  const requestedPageSize = Number(req.query.pageSize || 50);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(100, Math.max(1, requestedPageSize))
    : 50;
  return { page, pageSize };
}

function buildWhere(query) {
  const where = {};
  const type = normalizeText(query.type).toUpperCase();
  if (type) {
    validateType(type);
    where.type = type;
  }
  if (query.brand) where.brand = { contains: normalizeText(query.brand), mode: "insensitive" };
  if (query.name) where.name = { contains: normalizeText(query.name), mode: "insensitive" };
  if (query.code) where.code = { contains: normalizeText(query.code), mode: "insensitive" };
  if (query.search) {
    const search = normalizeText(query.search);
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }
  if (query.stockStatus === "out") where.quantity = { equals: 0 };
  if (query.stockStatus === "low") where.quantity = { gt: 0, lte: LOW_STOCK_LIMIT };
  if (query.lowStock) where.quantity = { lte: Number(query.lowStock) };
  return where;
}

export async function listItems(req, res, next) {
  try {
    const { page, pageSize } = getPagination(req);
    const where = buildWhere(req.query);
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, accountType: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ quantity: "asc" }, { updatedAt: "desc" }],
      }),
      prisma.item.count({ where }),
    ]);
    res.json({ items, total, page, pageSize, lowStockLimit: LOW_STOCK_LIMIT });
  } catch (error) {
    next(error);
  }
}

export async function createItem(req, res, next) {
  try {
    const data = buildItemPayload(req.body);
    const item = await prisma.item.create({
      data: { ...data, createdById: req.user.id },
    });
    res.status(201).json(item);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      error.status = 409;
      error.message = "Duplicate item code.";
    }
    next(error);
  }
}

export async function updateItem(req, res, next) {
  try {
    const data = buildItemPayload(req.body, { partial: true });
    const item = await prisma.item.update({
      where: { id: req.params.id },
      data,
    });
    res.json(item);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      error.status = 409;
      error.message = "Duplicate item code.";
    }
    next(error);
  }
}

export async function deleteItem(req, res, next) {
  try {
    await prisma.item.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getItem(req, res, next) {
  try {
    const item = await prisma.item.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, name: true, accountType: true } },
      },
    });
    if (!item) return res.status(404).json({ error: "Item not found." });
    res.json(item);
  } catch (error) {
    next(error);
  }
}
