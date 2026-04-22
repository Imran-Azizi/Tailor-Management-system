import { prisma } from "../lib/prisma.js";
import { normalizeText } from "../lib/normalize.js";

const DEFAULT_COLOR_HEX = "#94A3B8";

const normalizeHexColor = (value, fallback = DEFAULT_COLOR_HEX) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : fallback;
};

const withComputedFields = (rakht) => ({
  ...rakht,
  remainingMoney: Math.max(
    0,
    Number(rakht.totalPrice || 0) - Number(rakht.givenMoney || 0),
  ),
  tons: (rakht.tons || []).map((ton) => ({
    ...ton,
    availableMeters: Math.max(
      0,
      Number(ton.totalMeters || 0) - Number(ton.usedMeters || 0),
    ),
  })),
});

export const getAllRakht = async () => {
  const rows = await prisma.rakht.findMany({
    include: { tons: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ brandName: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(withComputedFields);
};

export const createRakht = async (payload) => {
  const { tons, ...rest } = payload;
  const created = await prisma.rakht.create({
    data: {
      companyName: normalizeText(rest.companyName),
      brandName: normalizeText(rest.brandName),
      tonQuantity: rest.tonQuantity,
      totalPrice: Number(rest.totalPrice),
      givenMoney: Number(rest.givenMoney || 0),
      remainingMoney: Math.max(
        0,
        Number(rest.totalPrice) - Number(rest.givenMoney || 0),
      ),
      tons: {
        create: tons.map((ton) => ({
          name: normalizeText(ton.name),
          colorHex: normalizeHexColor(ton.colorHex),
          totalMeters: Number(ton.totalMeters),
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
    rest.tonQuantity !== undefined ? rest.tonQuantity : existing.tonQuantity;
  const totalPrice =
    rest.totalPrice !== undefined
      ? Number(rest.totalPrice)
      : existing.totalPrice;
  const givenMoney =
    rest.givenMoney !== undefined
      ? Number(rest.givenMoney)
      : existing.givenMoney;
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
        totalMeters: Number(ton.totalMeters),
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
