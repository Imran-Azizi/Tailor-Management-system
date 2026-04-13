import { prisma } from "../lib/prisma.js";
import { parseNumberLocale, normalizeText } from "../lib/normalize.js";

const NUMERIC_MEASUREMENT_FIELDS = new Set([
  "height",
  "shoulder",
  "sleeve",
  "neck",
  "chest",
  "armpit",
  "waist",
  "skirt",
  "tenban",
  "pantLeg",
  "arm",
  "calf",
  "sorain",
  "patlonHeight",
  "kamerPatlon",
  "doroBaghlePatlon",
  "sorainPatlon",
  "patPatlon",
  "pachaPatlon",
]);

const BOOLEAN_MEASUREMENT_FIELDS = new Set([
  "frontPocket",
  "sidePocket",
  "underPocket",
]);

const REQUIRED_MEASUREMENT_FIELDS = {
  OUTFIT: [
    "height",
    "shoulder",
    "sleeve",
    "neck",
    "chest",
    "armpit",
    "waist",
    "skirt",
    "tenban",
    "pantLeg",
    "arm",
    "calf",
  ],
  WASKAT: ["height", "shoulder", "neck", "chest", "waist", "sorain"],
  KORTY: [
    "height",
    "arm",
    "shoulder",
    "neck",
    "sleeve",
    "patlonHeight",
    "kamerPatlon",
    "doroBaghlePatlon",
    "waist",
    "sorainPatlon",
    "sorain",
    "patPatlon",
    "pachaPatlon",
  ],
  YAKHANQAQ: [
    "height",
    "sleeve",
    "shoulder",
    "neck",
    "armpit",
    "sorain",
    "chest",
  ],
};

export const getAllOrders = async ({
  status,
  type,
  page = 1,
  limit = 20,
  search,
  assignedToId,
} = {}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = {};
  if (status === "completed") where.isCompleted = true;
  if (status === "pending") where.isCompleted = false;
  if (type) where.type = type;
  if (search)
    where.customer = { firstName: { contains: search, mode: "insensitive" } };
  if (assignedToId) where.assignedToId = assignedToId;

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        box: true,
        outfit: true,
        waskat: true,
        korty: true,
        yakhanQaq: true,
        notifications: { orderBy: { createdAt: "desc" }, take: 1 },
        assignedTo: { select: { id: true, name: true, accountType: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
};

export const getOrderById = (id) =>
  prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      box: true,
      outfit: true,
      waskat: true,
      korty: true,
      yakhanQaq: true,
      notifications: true,
      assignedTo: { select: { id: true, name: true, accountType: true } },
      assignedBy: { select: { id: true, name: true } },
    },
  });

const buildOrderUpdateData = (existingOrder, body) => {
  const totalPrice = body.totalPrice ?? existingOrder.totalPrice;
  const discount = body.discount ?? existingOrder.discount;
  const paidAmount = body.paidAmount ?? existingOrder.paidAmount;
  const quantity = body.quantity ?? existingOrder.quantity;
  const remaining = totalPrice - discount - paidAmount;

  if (discount < 0 || paidAmount < 0) {
    throw Object.assign(
      new Error("Discount and paid amount cannot be negative."),
      { status: 400 },
    );
  }

  if (discount > totalPrice) {
    throw Object.assign(
      new Error("Discount cannot be greater than total price."),
      { status: 400 },
    );
  }

  if (paidAmount > totalPrice - discount) {
    throw Object.assign(
      new Error("Paid amount cannot be greater than the remaining balance."),
      { status: 400 },
    );
  }

  if (quantity < 1) {
    throw Object.assign(new Error("Quantity must be at least 1."), {
      status: 400,
    });
  }

  if ((body.isCompleted ?? existingOrder.isCompleted) && remaining > 0) {
    throw Object.assign(
      new Error(
        "This order cannot be completed until the customer pays the remaining balance.",
      ),
      { status: 400 },
    );
  }

  if (
    (body.isEmergency ?? existingOrder.isEmergency) &&
    !body.emergencyExpiry &&
    !existingOrder.emergencyExpiry &&
    body.emergencyExpiry !== null
  ) {
    throw Object.assign(
      new Error("Emergency expiry date is required for emergency orders."),
      { status: 400 },
    );
  }

  return {
    totalPrice,
    discount,
    paidAmount,
    remaining,
    quantity,
    ...(body.isCompleted !== undefined
      ? { isCompleted: body.isCompleted }
      : {}),
    ...(body.isEmergency !== undefined
      ? { isEmergency: body.isEmergency }
      : {}),
    ...(body.emergencyExpiry !== undefined
      ? {
          emergencyExpiry: body.emergencyExpiry
            ? new Date(body.emergencyExpiry)
            : null,
        }
      : {}),
    ...(body.boxId !== undefined ? { boxId: body.boxId } : {}),
  };
};

export const createOrder = async ({ customerInfo, orders: orderItems }) => {
  return prisma.$transaction(async (tx) => {
    let customer;

    if (customerInfo.customerId) {
      customer = await tx.customer.findUnique({
        where: { id: customerInfo.customerId },
      });
      if (!customer)
        throw Object.assign(new Error("Customer not found"), { status: 404 });
    } else {
      const lastBill = await tx.customer.findFirst({
        orderBy: { billNumber: "desc" },
        select: { billNumber: true },
      });
      const billNumber = lastBill ? lastBill.billNumber + 1 : 1;

      customer = await tx.customer.upsert({
        where: { phoneNumber: customerInfo.phoneNumber },
        update: {},
        create: {
          firstName: customerInfo.firstName,
          phoneNumber: customerInfo.phoneNumber,
          billNumber,
        },
      });
    }

    const createdOrders = [];

    for (const item of orderItems) {
      const {
        type,
        orderName,
        totalPrice,
        discount = 0,
        paidAmount,
        isEmergency = false,
        emergencyExpiry,
        quantity = 1,
        measurements,
        boxId,
      } = item;
      const normalizedMeasurements = sanitizeMeasurements(measurements);

      validateMeasurements(type, normalizedMeasurements, orderName);

      const remaining = totalPrice - discount - paidAmount;

      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          type,
          orderName: orderName || null,
          totalPrice,
          discount,
          paidAmount,
          remaining,
          isEmergency,
          emergencyExpiry: emergencyExpiry ? new Date(emergencyExpiry) : null,
          quantity,
          boxId: boxId || null,
        },
      });

      if (type === "OUTFIT") {
        await tx.outfit.create({
          data: { orderId: order.id, ...normalizedMeasurements },
        });
      } else if (type === "WASKAT") {
        await tx.waskat.create({
          data: { orderId: order.id, ...normalizedMeasurements },
        });
      } else if (type === "KORTY") {
        await tx.korty.create({
          data: { orderId: order.id, ...normalizedMeasurements },
        });
      } else if (type === "YAKHANQAQ") {
        await tx.yakhanQaq.create({
          data: { orderId: order.id, ...normalizedMeasurements },
        });
      }

      // Emergency notification
      if (isEmergency) {
        await tx.notification.create({
          data: {
            orderId: order.id,
            message: `🚨 Emergency ${type} order for ${customer.firstName} (Bill #${customer.billNumber})`,
            nextAlert: new Date(Date.now() + 24 * 60 * 60 * 1000),
            expiresAt: emergencyExpiry ? new Date(emergencyExpiry) : null,
          },
        });
      }

      createdOrders.push(order);
    }

    return { customer, orders: createdOrders };
  });
};

const sanitizeMeasurements = (m) => {
  if (!m || typeof m !== "object") return {};
  const result = {};
  for (const [k, raw] of Object.entries(m)) {
    if (k === "__name") continue;
    if (raw === undefined || raw === null) continue;

    // Normalize strings first so whitespace-only values become empty and are skipped
    const v = typeof raw === "string" ? normalizeText(raw) : raw;
    if (v === "") continue;

    if (BOOLEAN_MEASUREMENT_FIELDS.has(k)) {
      if (typeof raw === "boolean") result[k] = raw;
      else if (typeof raw === "string") {
        const s = v.toLowerCase();
        result[k] = s === "true" || s === "1";
      } else result[k] = Boolean(raw);
      continue;
    }

    if (NUMERIC_MEASUREMENT_FIELDS.has(k)) {
      const n = typeof raw === "number" ? raw : parseNumberLocale(raw);
      if (!Number.isNaN(n)) result[k] = n;
      continue;
    }

    result[k] = typeof v === "string" ? v : String(v);
  }
  return result;
};

const validateMeasurements = (type, measurements, orderName) => {
  const requiredFields = REQUIRED_MEASUREMENT_FIELDS[type] || [];
  const missingFields = requiredFields.filter((field) => {
    const value = measurements[field];
    return typeof value !== "number" || Number.isNaN(value);
  });

  if (!missingFields.length) return;

  const orderLabel = orderName?.trim() ? `${type} (${orderName.trim()})` : type;
  throw Object.assign(
    new Error(
      `Missing required measurements for ${orderLabel}: ${missingFields.join(", ")}`,
    ),
    { status: 400 },
  );
};

export const updateOrder = async (id, body) => {
  const existingOrder = await prisma.order.findUnique({ where: { id } });
  if (!existingOrder)
    throw Object.assign(new Error("Order not found"), { status: 404 });

  const data = buildOrderUpdateData(existingOrder, body);

  return prisma.order.update({
    where: { id },
    data,
    include: {
      customer: true,
      box: true,
      outfit: true,
      waskat: true,
      korty: true,
      yakhanQaq: true,
      notifications: true,
    },
  });
};

export const markComplete = async (id) => {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order)
    throw Object.assign(new Error("Order not found"), { status: 404 });

  return prisma.order.update({ where: { id }, data: { isCompleted: true } });
};

export const deleteOrder = (id) => prisma.order.delete({ where: { id } });
