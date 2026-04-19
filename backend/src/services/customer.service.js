import { prisma } from "../lib/prisma.js";
import { normalizeText, normalizePhone } from "../lib/normalize.js";

const toPhoneDigits = (value) =>
  (normalizePhone(value || "") || "").replace(/[^0-9]/g, "");

const getPhoneSearchTokens = (digits) => {
  const tokens = new Set();
  if (!digits) return [];

  const last10 = digits.length >= 10 ? digits.slice(-10) : "";
  const last9 = digits.length >= 9 ? digits.slice(-9) : "";
  const last7 = digits.length >= 7 ? digits.slice(-7) : "";

  [digits, last10, last9, last7, last9 ? `0${last9}` : ""].forEach((token) => {
    if (token && token.length >= 7) tokens.add(token);
  });

  return Array.from(tokens);
};

const phoneMatchScore = (storedPhone, inputDigits) => {
  const storedDigits = toPhoneDigits(storedPhone);
  if (!storedDigits || !inputDigits) return 0;
  if (storedDigits === inputDigits) return 100;
  if (storedDigits.endsWith(inputDigits) || inputDigits.endsWith(storedDigits)) {
    return 90;
  }
  if (
    storedDigits.length >= 10 &&
    inputDigits.length >= 10 &&
    storedDigits.slice(-10) === inputDigits.slice(-10)
  ) {
    return 80;
  }
  if (
    storedDigits.length >= 9 &&
    inputDigits.length >= 9 &&
    storedDigits.slice(-9) === inputDigits.slice(-9)
  ) {
    return 70;
  }
  if (
    storedDigits.length >= 7 &&
    inputDigits.length >= 7 &&
    storedDigits.slice(-7) === inputDigits.slice(-7)
  ) {
    return 60;
  }
  return 0;
};

const pickBestPhoneMatch = (customers, inputDigits) => {
  let best = null;
  let bestScore = 0;
  for (const customer of customers) {
    const score = phoneMatchScore(customer.phoneNumber, inputDigits);
    if (score > bestScore) {
      best = customer;
      bestScore = score;
    }
  }
  return best;
};

export const findByPhone = async (phoneNumber) => {
  if (!phoneNumber) return null;
  const norm = normalizePhone(phoneNumber);
  const inputDigits = toPhoneDigits(norm);
  if (!inputDigits) return null;

  // Try exact normalized match first
  const exact = await prisma.customer.findUnique({
    where: { phoneNumber: norm },
  });
  if (exact) return exact;

  // Try database filtering by likely phone tokens first
  const tokens = getPhoneSearchTokens(inputDigits);
  if (tokens.length) {
    const fuzzyCandidates = await prisma.customer.findMany({
      where: { OR: tokens.map((token) => ({ phoneNumber: { contains: token } })) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const bestFuzzy = pickBestPhoneMatch(fuzzyCandidates, inputDigits);
    if (bestFuzzy) return bestFuzzy;
  }

  // Final fallback: compare normalized digits in memory for legacy mixed-format data
  const recentCustomers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return pickBestPhoneMatch(recentCustomers, inputDigits);
};

export const getAllCustomers = async ({
  search,
  page = 1,
  limit = 20,
} = {}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const q = search ? String(search).trim() : "";
  const norm = q ? normalizeText(q) : "";
  const where = q
    ? {
        OR: [
          { firstName: { contains: norm, mode: "insensitive" } },
          { phoneNumber: { contains: normalizePhone(q) } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
};

export const getCustomerById = (id) =>
  prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          outfit: true,
          waskat: true,
          korty: true,
          yakhanQaq: true,
          box: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

export const createCustomer = async (body) => {
  const lastBill = await prisma.customer.findFirst({
    orderBy: { billNumber: "desc" },
    select: { billNumber: true },
  });
  const billNumber = lastBill ? lastBill.billNumber + 1 : 1;
  const normalized = {
    ...body,
    firstName: body.firstName ? normalizeText(body.firstName) : body.firstName,
    phoneNumber: body.phoneNumber
      ? normalizePhone(body.phoneNumber)
      : body.phoneNumber,
  };
  return prisma.customer.create({ data: { ...normalized, billNumber } });
};

export const updateCustomer = (id, body) =>
  prisma.customer.update({
    where: { id },
    data: {
      ...body,
      firstName: body.firstName
        ? normalizeText(body.firstName)
        : body.firstName,
      phoneNumber: body.phoneNumber
        ? normalizePhone(body.phoneNumber)
        : body.phoneNumber,
    },
  });

export const deleteCustomer = async (id) =>
  prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!customer) {
      throw Object.assign(new Error("Customer not found"), { status: 404 });
    }

    const customerOrders = await tx.order.findMany({
      where: { customerId: id },
      select: { id: true },
    });
    const orderIds = customerOrders.map((order) => order.id);

    if (orderIds.length) {
      await tx.userNotification.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await tx.order.deleteMany({ where: { customerId: id } });
    }

    await tx.customer.delete({ where: { id } });
  });
