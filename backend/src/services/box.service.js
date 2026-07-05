import { prisma } from "../lib/prisma.js";

const ORDER_TYPE_LABELS_EN = {
  OUTFIT: "Outfit",
  WASKAT: "Waskat",
  KORTY: "Korty",
  YAKHANQAQ: "YakhanQaq",
};

const getOrderTypeLabelEn = (type) => ORDER_TYPE_LABELS_EN[type] || type || "-";
// Patch: Remove READY_MADE and READY_MADE_WASKAT as valid box types
const BOX_TYPE_VALUES = new Set([
  "OUTFIT",
  "WASKAT",
  "KORTY",
  "YAKHANQAQ",
  "FOREIGN_COUNTRY",
  // "READY_MADE", // removed
  // "READY_MADE_WASKAT", // removed
]);

const normalizeNameForCompare = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const stripRepeatedBasePrefix = (customName, baseLabel) => {
  const escapedBase = escapeRegex(baseLabel);
  const matcher = new RegExp(`^${escapedBase}(?:\\s*[-:|]\\s*|\\s+)(.+)$`, "i");
  const match = String(customName || "").match(matcher);
  return match?.[1]?.trim() || "";
};

const isRedundantOrderLabel = (name, typeLabel, sequence) => {
  const normalizeCompact = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[\s\-_]+/g, "")
      .trim();

  const n = normalizeCompact(name);
  if (!n) return true;

  const seq =
    Number.isFinite(Number(sequence)) && Number(sequence) > 0
      ? String(Number(sequence))
      : "1";
  const typeN = normalizeCompact(typeLabel);
  const canonicalA = normalizeCompact(`${typeLabel} ${seq}`);
  const canonicalB = normalizeCompact(`${seq} ${typeLabel}`);

  return n === typeN || n === canonicalA || n === canonicalB;
};

const buildOrderDisplayName = ({
  type,
  orderName,
  sequence = 1,
  total = 1,
}) => {
  const typeLabel = getOrderTypeLabelEn(type);
  const normalizedTotal =
    Number.isFinite(Number(total)) && Number(total) > 0 ? Number(total) : 1;
  const normalizedSequence =
    Number.isFinite(Number(sequence)) && Number(sequence) > 0
      ? Number(sequence)
      : 1;
  const baseLabel =
    normalizedTotal > 1 ? `${typeLabel} ${normalizedSequence}` : typeLabel;
  const customName = typeof orderName === "string" ? orderName.trim() : "";

  if (!customName) return baseLabel;
  if (isRedundantOrderLabel(customName, typeLabel, normalizedSequence)) {
    return baseLabel;
  }

  const normalizedBase = normalizeNameForCompare(baseLabel);
  const normalizedCustom = normalizeNameForCompare(customName);
  if (!normalizedCustom || normalizedCustom === normalizedBase) {
    return baseLabel;
  }

  const strippedCustom = stripRepeatedBasePrefix(customName, baseLabel);
  if (strippedCustom) {
    if (isRedundantOrderLabel(strippedCustom, typeLabel, normalizedSequence)) {
      return baseLabel;
    }
    const normalizedStripped = normalizeNameForCompare(strippedCustom);
    if (normalizedStripped && normalizedStripped !== normalizedBase) {
      return `${baseLabel} - ${strippedCustom}`;
    }
    return baseLabel;
  }

  if (normalizedCustom === normalizeNameForCompare(typeLabel)) {
    return baseLabel;
  }

  return `${baseLabel} - ${customName}`;
};

const enrichOrdersWithDisplayMeta = async (orders = [], tx = prisma) => {
  if (!Array.isArray(orders) || !orders.length) return orders;

  const customerIds = Array.from(
    new Set(
      orders
        .map((order) => order?.customerId)
        .filter((customerId) => typeof customerId === "string" && customerId),
    ),
  );

  if (!customerIds.length) {
    return orders.map((order) => ({
      ...order,
      orderTypeSequence: 1,
      orderTypeTotal: 1,
      orderDisplayName: buildOrderDisplayName({
        type: order?.type,
        orderName: order?.orderName,
      }),
    }));
  }

  const siblingOrders = await tx.order.findMany({
    where: { customerId: { in: customerIds } },
    select: {
      id: true,
      customerId: true,
      type: true,
    },
    orderBy: [
      { customerId: "asc" },
      { type: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });

  const totalsByKey = new Map();
  for (const sibling of siblingOrders) {
    const key = `${sibling.customerId}:${sibling.type}`;
    totalsByKey.set(key, (totalsByKey.get(key) || 0) + 1);
  }

  const sequenceByKey = new Map();
  const metaByOrderId = new Map();
  for (const sibling of siblingOrders) {
    const key = `${sibling.customerId}:${sibling.type}`;
    const nextSequence = (sequenceByKey.get(key) || 0) + 1;
    sequenceByKey.set(key, nextSequence);
    metaByOrderId.set(sibling.id, {
      sequence: nextSequence,
      total: totalsByKey.get(key) || 1,
    });
  }

  return orders.map((order) => {
    const meta = metaByOrderId.get(order?.id) || { sequence: 1, total: 1 };
    return {
      ...order,
      orderTypeSequence: meta.sequence,
      orderTypeTotal: meta.total,
      orderDisplayName: buildOrderDisplayName({
        type: order?.type,
        orderName: order?.orderName,
        sequence: meta.sequence,
        total: meta.total,
      }),
    };
  });
};

export const getAllBoxes = async ({ type } = {}) => {
  const requestedType =
    typeof type === "string" && type.trim() ? type.trim().toUpperCase() : null;
  const normalizedType =
    requestedType && BOX_TYPE_VALUES.has(requestedType) ? requestedType : null;

  const boxes = await prisma.box.findMany({
    ...(normalizedType ? { where: { boxType: normalizedType } } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { orders: true, foreignOrders: true } },
      orders: {
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      },
      foreignOrders: {
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const allOrders = boxes.flatMap((box) => [
    ...(box.orders || []),
    ...(box.foreignOrders || []),
  ]);
  const enrichedOrders = await enrichOrdersWithDisplayMeta(allOrders);
  const enrichedById = new Map(
    enrichedOrders.map((order) => [order.id, order]),
  );

  return boxes.map((box) => {
    const sourceOrders =
      box.boxType === "FOREIGN_COUNTRY"
        ? (box.foreignOrders || []).filter((order) => order?.isForeignOrder)
        : (box.orders || []).filter((order) => !order?.isForeignOrder);
    const mappedOrders = sourceOrders.map(
      (order) => enrichedById.get(order.id) || order,
    );
    const normalizedCount = mappedOrders.length;

    return {
      ...box,
      orders: mappedOrders,
      _count: {
        ...(box._count || {}),
        orders: normalizedCount,
      },
    };
  });
};

export const getBoxById = async (id) => {
  const box = await prisma.box.findUnique({
    where: { id: Number(id) },
    include: {
      _count: { select: { orders: true, foreignOrders: true } },
      orders: {
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      },
      foreignOrders: {
        include: { customer: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!box) return null;

  const sourceOrders =
    box.boxType === "FOREIGN_COUNTRY"
      ? (box.foreignOrders || []).filter((order) => order?.isForeignOrder)
      : (box.orders || []).filter((order) => !order?.isForeignOrder);
  const normalizedCount = sourceOrders.length;

  return {
    ...box,
    orders: await enrichOrdersWithDisplayMeta(sourceOrders || []),
    _count: {
      ...(box._count || {}),
      orders: normalizedCount,
    },
  };
};

export const createBox = (body) => prisma.box.create({ data: body });

export const updateBox = (id, body) =>
  prisma.box.update({ where: { id: Number(id) }, data: body });

export const deleteBox = (id) =>
  prisma.box.delete({ where: { id: Number(id) } });

export const assignOrderToBox = async (orderId, boxId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }

  // Always assign ready-made orders to their matching physical box type.
  let effectiveBoxId = boxId;
  const readyMadeBoxType =
    order.type === "READY_MADE"
      ? "OUTFIT"
      : order.type === "READY_MADE_WASKAT"
        ? "WASKAT"
        : null;
  if (readyMadeBoxType) {
    const readyMadeBox = await prisma.box.findFirst({
      where: { boxType: readyMadeBoxType },
      orderBy: { createdAt: "asc" },
    });
    if (!readyMadeBox) {
      throw Object.assign(
        new Error(`No ${readyMadeBoxType} box found for ${order.type} order.`),
        { status: 404 },
      );
    }
    effectiveBoxId = readyMadeBox.id;
  }

  if (!effectiveBoxId) {
    return prisma.order.update({
      where: { id: orderId },
      data: { boxId: null },
      include: { customer: true, box: true },
    });
  }

  const numericBoxId = Number(effectiveBoxId);
  const box = await prisma.box.findUnique({
    where: { id: numericBoxId },
    include: { _count: { select: { orders: true } } },
  });
  if (!box) {
    throw Object.assign(new Error("Box not found"), { status: 404 });
  }

  if (readyMadeBoxType && box.boxType !== readyMadeBoxType) {
    throw Object.assign(
      new Error(`${order.type} orders must be assigned to ${readyMadeBoxType} box.`),
      { status: 400 },
    );
  }

  if (!readyMadeBoxType && box.boxType !== order.type) {
    throw Object.assign(new Error("Order type and box type do not match."), {
      status: 400,
    });
  }

  const isAlreadyInBox = order.boxId === numericBoxId;
  if (!isAlreadyInBox && box._count.orders >= box.capacity) {
    throw Object.assign(new Error("capacity of this box is full"), {
      status: 400,
      code: "BOX_CAPACITY_FULL",
      boxId: box.id,
      boxName: box.boxName,
      orderType: order.type,
    });
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { boxId: numericBoxId },
    include: { customer: true, box: true },
  });
};
