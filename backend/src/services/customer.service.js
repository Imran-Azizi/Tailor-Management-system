import { prisma } from "../lib/prisma.js";
import { normalizeText, normalizePhone } from "../lib/normalize.js";

export const findByPhone = (phoneNumber) =>
  prisma.customer.findUnique({
    where: { phoneNumber: normalizePhone(phoneNumber) },
  });

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

export const deleteCustomer = (id) => prisma.customer.delete({ where: { id } });
