import { prisma } from "../lib/prisma.js";
import {
  parseNumberLocale,
  normalizeText,
  normalizePhone,
} from "../lib/normalize.js";

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

export const enrichOrderAssignment = (order) => {
  if (!order || typeof order !== "object") return order;

  return {
    ...order,
    assignmentNote:
      typeof order.assignmentNote === "string"
        ? normalizeText(order.assignmentNote) || null
        : (order.assignmentNote ?? null),
  };
};

const enrichOrderListAssignment = (orders = []) =>
  orders.map((order) => enrichOrderAssignment(order));

const toPhoneDigits = (value) =>
  (normalizePhone(value || "") || "").replace(/[^0-9]/g, "");

const getPhoneLookupTokens = (digits) => {
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
  if (
    storedDigits.endsWith(inputDigits) ||
    inputDigits.endsWith(storedDigits)
  ) {
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

const pickBestCustomerMatch = (customers, inputDigits) => {
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

const findExistingCustomerByPhone = async (tx, phoneNumber) => {
  const normalizedPhone = normalizePhone(phoneNumber || "");
  const inputDigits = toPhoneDigits(normalizedPhone);
  if (!normalizedPhone || !inputDigits) return null;

  const exact = await tx.customer.findUnique({
    where: { phoneNumber: normalizedPhone },
  });
  if (exact) return exact;

  const tokens = getPhoneLookupTokens(inputDigits);
  if (tokens.length) {
    const fuzzyCandidates = await tx.customer.findMany({
      where: {
        OR: tokens.map((token) => ({ phoneNumber: { contains: token } })),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const bestFuzzy = pickBestCustomerMatch(fuzzyCandidates, inputDigits);
    if (bestFuzzy) return bestFuzzy;
  }

  const recentCustomers = await tx.customer.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return pickBestCustomerMatch(recentCustomers, inputDigits);
};

const ORDER_LIST_INCLUDE_BASE = {
  customer: true,
  box: true,
  outfit: true,
  waskat: true,
  korty: true,
  yakhanQaq: true,
  notifications: { orderBy: { createdAt: "desc" }, take: 1 },
  assignedTo: { select: { id: true, name: true, accountType: true } },
  qichikarAssignedTo: { select: { id: true, name: true, accountType: true } },
  dokhtAssignedTo: { select: { id: true, name: true, accountType: true } },
  assignedBy: { select: { id: true, name: true } },
  workerPaidBy: { select: { id: true, name: true } },
  qichikarPaidBy: { select: { id: true, name: true } },
  dokhtPaidBy: { select: { id: true, name: true } },
};

const ORDER_DETAIL_INCLUDE_BASE = {
  customer: true,
  box: true,
  outfit: true,
  waskat: true,
  korty: true,
  yakhanQaq: true,
  notifications: true,
  assignedTo: { select: { id: true, name: true, accountType: true } },
  qichikarAssignedTo: { select: { id: true, name: true, accountType: true } },
  dokhtAssignedTo: { select: { id: true, name: true, accountType: true } },
  assignedBy: { select: { id: true, name: true } },
  workerPaidBy: { select: { id: true, name: true } },
  qichikarPaidBy: { select: { id: true, name: true } },
  dokhtPaidBy: { select: { id: true, name: true } },
};

const getRolePaymentSnapshot = (order, role) => {
  if (role === "DOKHT") {
    return {
      status: order?.dokhtPaymentStatus ?? "UNPAID",
      amount: order?.dokhtPaymentAmount ?? null,
      paidAt: order?.dokhtPaidAt ?? null,
      paidBy: order?.dokhtPaidBy ?? null,
    };
  }
  if (role === "QICHIKAR") {
    return {
      status: order?.qichikarPaymentStatus ?? "UNPAID",
      amount: order?.qichikarPaymentAmount ?? null,
      paidAt: order?.qichikarPaidAt ?? null,
      paidBy: order?.qichikarPaidBy ?? null,
    };
  }
  return {
    status: order?.workerPaymentStatus ?? "UNPAID",
    amount: order?.workerPaymentAmount ?? null,
    paidAt: order?.workerPaidAt ?? null,
    paidBy: order?.workerPaidBy ?? null,
  };
};

const buildCompletedWorkerPaymentRows = (order) => {
  const rows = [];

  if (order?.qichikarCompletedAt && order?.qichikarAssignedTo) {
    const paymentSnapshot = getRolePaymentSnapshot(order, "QICHIKAR");
    rows.push({
      ...order,
      rowId: `${order.id}:QICHIKAR`,
      workerRole: "QICHIKAR",
      assignedTo: order.qichikarAssignedTo,
      completedAt: order.qichikarCompletedAt,
      workerPaymentStatus: paymentSnapshot.status,
      workerPaymentAmount: paymentSnapshot.amount,
      workerPaidAt: paymentSnapshot.paidAt,
      workerPaidBy: paymentSnapshot.paidBy,
    });
  }

  if (order?.dokhtCompletedAt && order?.dokhtAssignedTo) {
    const paymentSnapshot = getRolePaymentSnapshot(order, "DOKHT");
    rows.push({
      ...order,
      rowId: `${order.id}:DOKHT`,
      workerRole: "DOKHT",
      assignedTo: order.dokhtAssignedTo,
      completedAt: order.dokhtCompletedAt,
      workerPaymentStatus: paymentSnapshot.status,
      workerPaymentAmount: paymentSnapshot.amount,
      workerPaidAt: paymentSnapshot.paidAt,
      workerPaidBy: paymentSnapshot.paidBy,
    });
  }

  if (!rows.length && order?.isCompleted && order?.assignedTo) {
    const paymentSnapshot = getRolePaymentSnapshot(
      order,
      order.assignedTo.accountType,
    );
    rows.push({
      ...order,
      rowId: `${order.id}:${order.assignedTo.accountType || "WORKER"}`,
      workerRole: order.assignedTo.accountType || null,
      assignedTo: order.assignedTo,
      completedAt: order.updatedAt,
      workerPaymentStatus: paymentSnapshot.status,
      workerPaymentAmount: paymentSnapshot.amount,
      workerPaidAt: paymentSnapshot.paidAt,
      workerPaidBy: paymentSnapshot.paidBy,
    });
  }

  return rows;
};

const isMissingReceivedByError = (error) => {
  const message = String(error?.message || "");
  return (
    message.includes("receivedBy") &&
    (message.includes("Unknown field") ||
      message.includes("Unknown argument") ||
      message.includes("Available options"))
  );
};

const findManyOrdersSafe = async (
  args,
  includeBase = ORDER_LIST_INCLUDE_BASE,
) => {
  const includeWithReceivedBy = {
    ...includeBase,
    receivedBy: { select: { id: true, name: true, accountType: true } },
  };
  try {
    return await prisma.order.findMany({
      ...args,
      include: includeWithReceivedBy,
    });
  } catch (error) {
    if (!isMissingReceivedByError(error)) throw error;
    return prisma.order.findMany({
      ...args,
      include: includeBase,
    });
  }
};

const findUniqueOrderSafe = async ({
  where,
  includeBase = ORDER_DETAIL_INCLUDE_BASE,
}) => {
  const includeWithReceivedBy = {
    ...includeBase,
    receivedBy: { select: { id: true, name: true, accountType: true } },
  };
  try {
    return await prisma.order.findUnique({
      where,
      include: includeWithReceivedBy,
    });
  } catch (error) {
    if (!isMissingReceivedByError(error)) throw error;
    return prisma.order.findUnique({
      where,
      include: includeBase,
    });
  }
};

export const getAllOrders = async ({
  status,
  type,
  page = 1,
  limit = 20,
  search,
  searchBill,
  assignedToId,
  receivedById,
  roleType,
  roleReceivedById,
  workerBillSearch = false,
  workerClaimView = false,
  workerId,
  workerAccountType,
  workerRoleType,
} = {}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = {};
  if (status === "completed") {
    where.OR = [{ isCompleted: true }, { remaining: { lte: 0 } }];
  }
  if (status === "pending") {
    where.AND = [{ isCompleted: false }, { remaining: { gt: 0 } }];
  }
  if (type) where.type = type;
  if (search)
    where.customer = { firstName: { contains: search, mode: "insensitive" } };
  if (
    searchBill !== undefined &&
    searchBill !== null &&
    String(searchBill).trim() !== ""
  ) {
    const billValue = Math.trunc(parseNumberLocale(String(searchBill)));
    if (Number.isFinite(billValue)) {
      where.customer = {
        ...(where.customer || {}),
        billNumber: billValue,
      };
    } else {
      // Invalid bill search should return no rows rather than throwing
      where.customer = {
        ...(where.customer || {}),
        billNumber: -1,
      };
    }
  }
  if (assignedToId) {
    if (workerBillSearch) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [{ assignedToId: null }, { assignedToId }],
        },
      ];
    } else {
      where.assignedToId = assignedToId;
    }
  }
  if (receivedById) {
    where.receivedById = receivedById;
  }

  const roleAssignedToField =
    roleType === "QICHIKAR"
      ? "qichikarAssignedToId"
      : roleType === "DOKHT"
        ? "dokhtAssignedToId"
        : null;
  const roleReceivedByField =
    roleType === "QICHIKAR"
      ? "qichikarReceivedById"
      : roleType === "DOKHT"
        ? "dokhtReceivedById"
        : null;

  if (roleReceivedByField && roleReceivedById) {
    // Show orders the worker currently has active (received) OR has completed
    // (their role-specific completedAt is set and they were assigned).
    // This ensures completed orders remain visible in the worker's panel.
    const completedAtField =
      roleType === "QICHIKAR" ? "qichikarCompletedAt" : "dokhtCompletedAt";
    const completedAssignedField =
      roleType === "QICHIKAR" ? "qichikarAssignedToId" : "dokhtAssignedToId";

    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { [roleReceivedByField]: roleReceivedById },
          { [roleAssignedToField]: roleReceivedById },
          {
            AND: [
              { [completedAtField]: { not: null } },
              { [completedAssignedField]: roleReceivedById },
            ],
          },
        ],
      },
    ];
  }

  if (workerClaimView && workerId && workerAccountType) {
    const claimRole = workerRoleType || workerAccountType;
    const claimAssignedField =
      claimRole === "QICHIKAR"
        ? "qichikarAssignedToId"
        : claimRole === "DOKHT"
          ? "dokhtAssignedToId"
          : "assignedToId";
    const claimReceivedField =
      claimRole === "QICHIKAR"
        ? "qichikarReceivedById"
        : claimRole === "DOKHT"
          ? "dokhtReceivedById"
          : "receivedById";

    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { [claimAssignedField]: workerId },
          { [claimAssignedField]: null },
        ],
      },
      {
        NOT: {
          AND: [
            { [claimReceivedField]: { not: null } },
            { [claimReceivedField]: { not: workerId } },
          ],
        },
      },
    ];
  }

  const [data, total] = await Promise.all([
    findManyOrdersSafe(
      {
        where,
        skip,
        take: Number(limit),
        orderBy: [{ assignedToId: "desc" }, { createdAt: "desc" }],
      },
      ORDER_LIST_INCLUDE_BASE,
    ),
    prisma.order.count({ where }),
  ]);

  return {
    data: enrichOrderListAssignment(data),
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

export const lookupOrdersByBillOrPhone = async ({
  billNumber,
  phoneNumber,
} = {}) => {
  const normalizeLookupValue = (value) => {
    if (value === undefined || value === null) return "";
    const text = String(value).trim();
    if (!text) return "";
    const lower = text.toLowerCase();
    if (lower === "undefined" || lower === "null" || lower === "nan") {
      return "";
    }
    return text;
  };

  const normalizedBillNumber = normalizeLookupValue(billNumber);
  const normalizedPhoneNumber = normalizeLookupValue(phoneNumber);

  const hasBill = normalizedBillNumber !== "";
  const hasPhone = normalizedPhoneNumber !== "";

  if (!hasBill && !hasPhone) {
    throw Object.assign(new Error("billNumber or phoneNumber is required."), {
      status: 400,
    });
  }

  let parsedBillNumber = null;
  if (hasBill) {
    const n = Number(normalizedBillNumber);
    if (!Number.isFinite(n)) {
      if (hasPhone) {
        // If phone is also provided, ignore invalid bill input and continue with phone lookup.
        parsedBillNumber = null;
      } else {
        throw Object.assign(new Error("billNumber must be a valid number."), {
          status: 400,
        });
      }
    } else {
      parsedBillNumber = Math.trunc(n);
    }
  }

  let customer = null;

  if (parsedBillNumber !== null) {
    customer = await prisma.customer.findUnique({
      where: { billNumber: parsedBillNumber },
    });
  }

  if (!customer && hasPhone) {
    customer = await findExistingCustomerByPhone(prisma, normalizedPhoneNumber);
  }

  if (!customer) return null;

  const orders = await findManyOrdersSafe(
    {
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
    },
    {
      customer: true,
      box: { select: { id: true, boxName: true } },
      assignedTo: { select: { id: true, name: true, accountType: true } },
      assignedBy: { select: { id: true, name: true } },
    },
  );

  if (!orders.length) return null;

  return { customer, orders: enrichOrderListAssignment(orders) };
};

export const getOrderById = async (id) => {
  const order = await findUniqueOrderSafe({
    where: { id },
    includeBase: ORDER_DETAIL_INCLUDE_BASE,
  });
  return enrichOrderAssignment(order);
};

export const getCompletedOrdersFromWorkers = async ({
  page = 1,
  limit = 20,
  search = "",
  paymentStatus,
  qichikarUserId,
  dokhtUserId,
} = {}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = {
    AND: [
      {
        OR: [
          {
            qichikarCompletedAt: { not: null },
            qichikarAssignedToId: { not: null },
          },
          { dokhtCompletedAt: { not: null }, dokhtAssignedToId: { not: null } },
          {
            isCompleted: true,
            assignedToId: { not: null },
            assignedTo: { accountType: { in: ["QICHIKAR", "DOKHT"] } },
          },
        ],
      },
    ],
  };

  if (search && String(search).trim()) {
    const q = String(search).trim();
    const maybeBill = Number.parseInt(q, 10);
    where.AND.push({
      OR: [
        { customer: { firstName: { contains: q, mode: "insensitive" } } },
        { assignedTo: { name: { contains: q, mode: "insensitive" } } },
        { qichikarAssignedTo: { name: { contains: q, mode: "insensitive" } } },
        { dokhtAssignedTo: { name: { contains: q, mode: "insensitive" } } },
        ...(Number.isFinite(maybeBill)
          ? [{ customer: { billNumber: maybeBill } }]
          : []),
      ],
    });
  }

  const wantsPaymentStatusFilter =
    paymentStatus && ["UNPAID", "PAID_TO_WORKER"].includes(paymentStatus);

  if (qichikarUserId && String(qichikarUserId).trim()) {
    where.AND.push({
      qichikarAssignedToId: String(qichikarUserId).trim(),
      qichikarCompletedAt: { not: null },
    });
  }

  if (dokhtUserId && String(dokhtUserId).trim()) {
    where.AND.push({
      dokhtAssignedToId: String(dokhtUserId).trim(),
      dokhtCompletedAt: { not: null },
    });
  }

  const data = await findManyOrdersSafe(
    {
      where,
      orderBy: [
        { dokhtCompletedAt: "desc" },
        { qichikarCompletedAt: "desc" },
        { updatedAt: "desc" },
      ],
    },
    ORDER_LIST_INCLUDE_BASE,
  );

  const normalizedData = enrichOrderListAssignment(data)
    .flatMap((order) => buildCompletedWorkerPaymentRows(order))
    .filter((row) => {
      if (
        wantsPaymentStatusFilter &&
        row.workerPaymentStatus !== paymentStatus
      ) {
        return false;
      }

      if (
        qichikarUserId &&
        (row.workerRole !== "QICHIKAR" ||
          row.assignedTo?.id !== String(qichikarUserId).trim())
      ) {
        return false;
      }

      if (
        dokhtUserId &&
        (row.workerRole !== "DOKHT" ||
          row.assignedTo?.id !== String(dokhtUserId).trim())
      ) {
        return false;
      }

      if (!search || !String(search).trim()) {
        return true;
      }

      const q = String(search).trim().toLowerCase();
      const billNumber = String(row.customer?.billNumber || "").toLowerCase();
      const customerName = String(row.customer?.firstName || "").toLowerCase();
      const workerName = String(row.assignedTo?.name || "").toLowerCase();

      return (
        customerName.includes(q) ||
        workerName.includes(q) ||
        billNumber.includes(q)
      );
    })
    .sort((left, right) => {
      const leftTime = new Date(
        left.completedAt || left.updatedAt || left.createdAt || 0,
      ).getTime();
      const rightTime = new Date(
        right.completedAt || right.updatedAt || right.createdAt || 0,
      ).getTime();
      return rightTime - leftTime;
    });

  const total = normalizedData.length;
  const paginatedData = normalizedData.slice(skip, skip + Number(limit));

  const paidCount = normalizedData.filter(
    (order) => order.workerPaymentStatus === "PAID_TO_WORKER",
  ).length;
  const unpaidCount = normalizedData.length - paidCount;
  const totalPaidAmount = normalizedData.reduce(
    (sum, order) =>
      sum +
      (order.workerPaymentStatus === "PAID_TO_WORKER"
        ? Number(order.workerPaymentAmount || 0)
        : 0),
    0,
  );

  return {
    data: paginatedData,
    total,
    page: Number(page),
    limit: Number(limit),
    stats: {
      totalOrders: normalizedData.length,
      paidOrders: paidCount,
      unpaidOrders: unpaidCount,
      totalPaidAmount,
    },
  };
};

export const getOrderBillByOrderId = async (id) => {
  const order = await findUniqueOrderSafe({
    where: { id },
    includeBase: ORDER_DETAIL_INCLUDE_BASE,
  });
  if (!order) return null;

  const customer = await prisma.customer.findUnique({
    where: { id: order.customerId },
  });
  const orders = await findManyOrdersSafe(
    {
      where: { customerId: order.customerId },
      orderBy: { createdAt: "asc" },
    },
    ORDER_DETAIL_INCLUDE_BASE,
  );

  return { customer, orders: enrichOrderListAssignment(orders) };
};

const buildOrderUpdateData = (existingOrder, body) => {
  const totalPrice = body.totalPrice ?? existingOrder.totalPrice;
  const discount = body.discount ?? existingOrder.discount;
  const paidAmount = body.paidAmount ?? existingOrder.paidAmount;
  const quantity = body.quantity ?? existingOrder.quantity;
  const remaining = totalPrice - discount - paidAmount;
  const hasWorkerCompleted = Boolean(
    existingOrder.dokhtCompletedAt || existingOrder.qichikarCompletedAt,
  );
  const autoCompleteOnFullPayment = remaining <= 0 && hasWorkerCompleted;
  const nextIsCompleted =
    body.isCompleted ??
    (existingOrder.isCompleted || autoCompleteOnFullPayment);

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

  if (nextIsCompleted && remaining > 0) {
    throw Object.assign(
      new Error(
        "This order cannot be marked as completed until full payment is confirmed by admin.",
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
    ...(body.isCompleted !== undefined || autoCompleteOnFullPayment
      ? { isCompleted: body.isCompleted ?? autoCompleteOnFullPayment }
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
    ...(body.isCompleted === true || autoCompleteOnFullPayment
      ? { boxId: null }
      : {}),
  };
};

const resolveAutoBoxForNewOrder = async (tx, orderType) => {
  const boxes = await tx.box.findMany({
    where: { boxType: orderType },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  if (!boxes.length) {
    const err = new Error(
      `No box available for ${orderType}. Please create a box first.`,
    );
    err.code = "BOX_NOT_FOUND_FOR_TYPE";
    err.status = 400;
    throw err;
  }

  const available = boxes.find((box) => box._count.orders < box.capacity);
  if (!available) {
    const err = new Error(
      `All boxes are full for ${orderType}. Please create a new box.`,
    );
    err.code = "BOX_CAPACITY_FULL";
    err.boxName = boxes[0]?.boxName || null;
    err.status = 400;
    throw err;
  }

  const willBecomeFull = available._count.orders + 1 >= available.capacity;
  return {
    boxId: available.id,
    alertReason: willBecomeFull ? "BOX_NOW_FULL" : null,
    alertBoxName: available.boxName || null,
  };
};

const notifyAdminsToCreateBox = async (
  tx,
  { orderId, orderType, customerName, billNumber, boxName, reason },
) => {
  const admins = await tx.user.findMany({
    where: { accountType: "ADMIN" },
    select: { id: true },
  });

  if (!admins.length) return;

  const baseContext = `${customerName} - Bill #${billNumber} - ${orderType}.`;
  let message;

  if (reason === "BOX_NOT_FOUND_FOR_TYPE") {
    message = `No box found for ${orderType} orders. Please create a new box for this order type. ${baseContext}`;
  } else if (reason === "BOX_NOW_FULL") {
    const namePart = boxName ? ` (${boxName})` : "";
    message = `Box capacity is now full${namePart} for ${orderType}. Please create another box for this order type. ${baseContext}`;
  } else {
    const namePart = boxName ? ` (${boxName})` : "";
    message = `All boxes are full${namePart} for ${orderType}. Please create another box for this order type. ${baseContext}`;
  }

  await Promise.all(
    admins.map((admin) =>
      tx.userNotification.create({
        data: {
          userId: admin.id,
          orderId,
          message,
          type: "BOX_CAPACITY",
        },
      }),
    ),
  );
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
      const normalizedPhone = normalizePhone(customerInfo.phoneNumber || "");
      const normalizedFirstName = customerInfo.firstName
        ? normalizeText(customerInfo.firstName)
        : "";

      if (!toPhoneDigits(normalizedPhone)) {
        throw Object.assign(new Error("Phone number is required"), {
          status: 400,
        });
      }

      customer = await findExistingCustomerByPhone(tx, normalizedPhone);
      if (!customer) {
        if (!normalizedFirstName) {
          throw Object.assign(
            new Error("Customer name is required for new customers"),
            { status: 400 },
          );
        }

        const lastBill = await tx.customer.findFirst({
          orderBy: { billNumber: "desc" },
          select: { billNumber: true },
        });
        const billNumber = lastBill ? lastBill.billNumber + 1 : 1;

        customer = await tx.customer.create({
          data: {
            firstName: normalizedFirstName,
            phoneNumber: normalizedPhone,
            billNumber,
          },
        });
      }
    }

    const createdOrders = [];
    const alertedTypes = new Set();

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
      } = item;
      const normalizedMeasurements = sanitizeMeasurements(measurements);

      validateMeasurements(type, normalizedMeasurements, orderName);

      const remaining = totalPrice - discount - paidAmount;
      const autoBox = await resolveAutoBoxForNewOrder(tx, type);

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
          boxId: autoBox.boxId,
        },
        include: { box: true },
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

      if (autoBox.alertReason && !alertedTypes.has(type)) {
        await notifyAdminsToCreateBox(tx, {
          orderId: order.id,
          orderType: type,
          customerName: customer.firstName,
          billNumber: customer.billNumber,
          boxName: autoBox.alertBoxName,
          reason: autoBox.alertReason,
        });
        alertedTypes.add(type);
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
  const shouldSyncBillEmergency =
    body.isEmergency !== undefined || body.emergencyExpiry !== undefined;

  return prisma.$transaction(async (tx) => {
    const primaryUpdateData = { ...data };
    if (shouldSyncBillEmergency) {
      delete primaryUpdateData.isEmergency;
      delete primaryUpdateData.emergencyExpiry;
    }

    if (Object.keys(primaryUpdateData).length > 0) {
      await tx.order.update({
        where: { id },
        data: primaryUpdateData,
      });
    }

    if (shouldSyncBillEmergency) {
      await tx.order.updateMany({
        where: { customerId: existingOrder.customerId },
        data: {
          isEmergency: body.isEmergency ?? existingOrder.isEmergency ?? false,
          emergencyExpiry:
            body.emergencyExpiry !== undefined
              ? body.emergencyExpiry
                ? new Date(body.emergencyExpiry)
                : null
              : existingOrder.emergencyExpiry,
        },
      });
    }

    const updated = await findUniqueOrderSafe({
      where: { id },
      includeBase: ORDER_DETAIL_INCLUDE_BASE,
    });
    return enrichOrderAssignment(updated);
  });
};

const computeRemaining = ({ totalPrice, discount, paidAmount }) =>
  Number(totalPrice || 0) - Number(discount || 0) - Number(paidAmount || 0);

const upsertMeasurementsForType = async (tx, type, orderId, measurements) => {
  const normalized = sanitizeMeasurements(measurements);
  validateMeasurements(type, normalized);

  if (type === "OUTFIT") {
    await tx.outfit.upsert({
      where: { orderId },
      update: normalized,
      create: { orderId, ...normalized },
    });
  } else if (type === "WASKAT") {
    await tx.waskat.upsert({
      where: { orderId },
      update: normalized,
      create: { orderId, ...normalized },
    });
  } else if (type === "KORTY") {
    await tx.korty.upsert({
      where: { orderId },
      update: normalized,
      create: { orderId, ...normalized },
    });
  } else if (type === "YAKHANQAQ") {
    await tx.yakhanQaq.upsert({
      where: { orderId },
      update: normalized,
      create: { orderId, ...normalized },
    });
  }
};

export const updateOrderBill = async (
  orderId,
  { customerInfo, orders: items },
) => {
  const seed = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });
  if (!seed) throw Object.assign(new Error("Order not found"), { status: 404 });

  return prisma.$transaction(async (tx) => {
    // Update customer info (same bill/customer)
    const nextFirstName =
      customerInfo?.firstName !== undefined
        ? normalizeText(customerInfo.firstName)
        : undefined;
    const nextPhone =
      customerInfo?.phoneNumber !== undefined
        ? normalizePhone(customerInfo.phoneNumber)
        : undefined;

    if (nextPhone && !toPhoneDigits(nextPhone)) {
      throw Object.assign(new Error("Phone number is required"), {
        status: 400,
      });
    }

    const customerUpdate = {};
    if (nextFirstName !== undefined && nextFirstName)
      customerUpdate.firstName = nextFirstName;
    if (nextPhone !== undefined && nextPhone)
      customerUpdate.phoneNumber = nextPhone;

    const customer =
      Object.keys(customerUpdate).length > 0
        ? await tx.customer.update({
            where: { id: seed.customerId },
            data: customerUpdate,
          })
        : seed.customer;

    const existingOrders = await tx.order.findMany({
      where: { customerId: seed.customerId },
      select: { id: true, type: true, customerId: true },
    });
    const existingById = new Map(existingOrders.map((o) => [o.id, o]));

    const hasEmergency = (items || []).some((i) => !!i?.isEmergency);
    const emergencyExpiry = hasEmergency
      ? ((items || []).find((i) => !!i?.isEmergency)?.emergencyExpiry ?? null)
      : null;

    const updatedOrCreatedIds = [];

    for (const item of items || []) {
      const {
        id,
        type,
        orderName,
        totalPrice,
        discount = 0,
        paidAmount,
        quantity = 1,
        boxId,
        measurements,
      } = item;

      // enforce bill-level emergency settings
      const isEmergency = hasEmergency;
      const normalizedExpiry = hasEmergency ? emergencyExpiry : null;

      if (id) {
        const existing = existingById.get(id);
        if (!existing) {
          throw Object.assign(new Error("Order not found in this bill."), {
            status: 404,
          });
        }
        if (existing.customerId !== seed.customerId) {
          throw Object.assign(
            new Error("Order does not belong to this bill."),
            { status: 400 },
          );
        }
        if (existing.type !== type) {
          throw Object.assign(
            new Error("Changing order type is not supported."),
            { status: 400 },
          );
        }

        validateMeasurements(
          type,
          sanitizeMeasurements(measurements),
          orderName,
        );

        const remaining = computeRemaining({
          totalPrice,
          discount,
          paidAmount,
        });
        if (remaining < 0) {
          throw Object.assign(
            new Error("Paid amount cannot exceed total after discount."),
            {
              status: 400,
            },
          );
        }

        await tx.order.update({
          where: { id },
          data: {
            orderName: orderName || null,
            totalPrice,
            discount,
            paidAmount,
            remaining,
            quantity,
            ...(boxId !== undefined ? { boxId: boxId ?? null } : {}),
          },
        });

        await upsertMeasurementsForType(tx, type, id, measurements);
        updatedOrCreatedIds.push(id);
        continue;
      }

      // New item -> create new order under same customer
      const normalizedMeasurements = sanitizeMeasurements(measurements);
      validateMeasurements(type, normalizedMeasurements, orderName);

      const remaining = totalPrice - discount - paidAmount;
      const autoBox = await resolveAutoBoxForNewOrder(tx, type);

      const created = await tx.order.create({
        data: {
          customerId: seed.customerId,
          type,
          orderName: orderName || null,
          totalPrice,
          discount,
          paidAmount,
          remaining,
          quantity,
          isEmergency,
          emergencyExpiry: normalizedExpiry ? new Date(normalizedExpiry) : null,
          boxId: autoBox.boxId,
        },
      });

      await upsertMeasurementsForType(tx, type, created.id, measurements);
      updatedOrCreatedIds.push(created.id);
    }

    // sync emergency settings across all orders in bill
    await tx.order.updateMany({
      where: { customerId: seed.customerId },
      data: {
        isEmergency: hasEmergency,
        emergencyExpiry: emergencyExpiry ? new Date(emergencyExpiry) : null,
      },
    });

    const freshOrders = await findManyOrdersSafe(
      { where: { customerId: seed.customerId }, orderBy: { createdAt: "asc" } },
      ORDER_DETAIL_INCLUDE_BASE,
    );

    return { customer, orders: enrichOrderListAssignment(freshOrders) };
  });
};

const resolveCompletionBox = async (tx, order) => {
  if (order.boxId) {
    const existingBox = await tx.box.findUnique({
      where: { id: order.boxId },
      include: { _count: { select: { orders: true } } },
    });

    if (!existingBox) {
      throw Object.assign(new Error("Assigned box not found."), {
        status: 400,
      });
    }

    if (existingBox.boxType !== order.type) {
      throw Object.assign(
        new Error("Assigned box type does not match this order type."),
        { status: 400 },
      );
    }

    return existingBox;
  }

  const boxes = await tx.box.findMany({
    where: { boxType: order.type },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { orders: true } } },
  });

  if (!boxes.length) {
    throw Object.assign(new Error("No box found for this order type."), {
      status: 400,
      code: "BOX_NOT_FOUND_FOR_TYPE",
      orderType: order.type,
    });
  }

  const available = boxes.find((box) => box._count.orders < box.capacity);
  if (!available) {
    throw Object.assign(new Error("capacity of this box is full"), {
      status: 400,
      code: "BOX_CAPACITY_FULL",
      orderType: order.type,
      boxId: boxes[0]?.id || null,
      boxName: boxes[0]?.boxName || null,
    });
  }

  return available;
};

export const markComplete = async (id) => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order)
      throw Object.assign(new Error("Order not found"), { status: 404 });

    if (Number(order.remaining || 0) > 0) {
      throw Object.assign(
        new Error(
          "This order cannot be marked as completed until full payment is confirmed by admin.",
        ),
        { status: 400 },
      );
    }

    if (order.isCompleted) {
      return tx.order.findUnique({
        where: { id },
        include: { customer: true, box: true },
      });
    }

    const wasUnassigned = !order.boxId;
    const box = await resolveCompletionBox(tx, order);

    const updated = await tx.order.update({
      where: { id },
      data: {
        isCompleted: true,
        inProgress: false,
        boxId: null,
      },
      include: {
        customer: true,
        box: true,
      },
    });

    if (order.boxId) {
      const boxRecord = await tx.box.findUnique({ where: { id: order.boxId } });
      const currentCount = await tx.order.count({
        where: { boxId: order.boxId, isCompleted: false, id: { not: id } },
      });
      if (boxRecord && currentCount === boxRecord.capacity - 1) {
        const admins = await tx.user.findMany({
          where: { accountType: "ADMIN" },
          select: { id: true },
        });
        await Promise.all(
          admins.map((admin) =>
            tx.userNotification.create({
              data: {
                userId: admin.id,
                orderId: id,
                message: `Capacity available in ${boxRecord.boxName} (${order.type})`,
                type: "BOX_CAPACITY",
              },
            }),
          ),
        );
      }
    }

    return enrichOrderAssignment(updated);
  });
};

export const deleteOrder = async (id) =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id },
      select: { id: true, customerId: true },
    });

    if (!existing) {
      throw Object.assign(new Error("Order not found"), { status: 404 });
    }

    await tx.userNotification.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });

    const remainingOrders = await tx.order.count({
      where: { customerId: existing.customerId },
    });

    if (remainingOrders === 0) {
      await tx.customer.deleteMany({ where: { id: existing.customerId } });
    }
  });
