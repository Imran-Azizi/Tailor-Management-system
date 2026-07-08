import { prisma } from "../lib/prisma.js";
import { normalizeText, normalizePhone } from "../lib/normalize.js";

const ORDER_TYPE_LABELS_EN = {
  OUTFIT: "Outfit",
  WASKAT: "Waskat",
  KORTY: "Korty",
  YAKHANQAQ: "YakhanQaq",
};

const getOrderTypeLabelEn = (type) => ORDER_TYPE_LABELS_EN[type] || type || "-";

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
  const customName =
    typeof orderName === "string" ? normalizeText(orderName) || "" : "";

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

  const customerIds = data.map((customer) => customer.id);
  const orderTotals = customerIds.length
    ? await prisma.order.groupBy({
        by: ["customerId"],
        where: {
          customerId: { in: customerIds },
          damagedClothesPenalties: { none: {} },
        },
        _sum: {
          totalPrice: true,
          discount: true,
          paidAmount: true,
          remaining: true,
        },
      })
    : [];
  const totalsByCustomerId = new Map(
    orderTotals.map((row) => [
      row.customerId,
      {
        totalPrice: Number(row._sum?.totalPrice || 0),
        discount: Number(row._sum?.discount || 0),
        netTotal: Math.max(
          0,
          Number(row._sum?.totalPrice || 0) -
            Number(row._sum?.discount || 0),
        ),
        paidAmount: Number(row._sum?.paidAmount || 0),
        remaining: Number(row._sum?.remaining || 0),
      },
    ]),
  );

  return {
    data: data.map((customer) => ({
      ...customer,
      _sum: totalsByCustomerId.get(customer.id) || {
        totalPrice: 0,
        discount: 0,
        netTotal: 0,
        paidAmount: 0,
        remaining: 0,
      },
    })),
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

export const getCustomerById = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        include: {
          outfit: true,
          waskat: true,
          korty: true,
          yakhanQaq: true,
          readyMadeOrder: true,
          readyMadeWaskatOrder: true,
          box: true,
          foreignBox: true,
          damagedClothesPenalties: { select: { id: true }, take: 1 },
          assignedTo: { select: { id: true, name: true, accountType: true } },
          qichikarAssignedTo: {
            select: { id: true, name: true, accountType: true },
          },
          dokhtAssignedTo: {
            select: { id: true, name: true, accountType: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer) return null;

  return {
    ...customer,
    orders: await enrichOrdersWithDisplayMeta(customer.orders || []),
  };
};
