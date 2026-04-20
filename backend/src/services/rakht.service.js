import { prisma } from "../lib/prisma.js";
import { normalizeText } from "../lib/normalize.js";

const toNumber = (value) => Number(value);
const DEFAULT_RAKHT_COLOR_HEX = "#94A3B8";

const normalizeHexColor = (value, fallback = DEFAULT_RAKHT_COLOR_HEX) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : fallback;
};

const normalizeRakhtPayload = (payload = {}, existing = null) => {
  const companyName =
    payload.companyName !== undefined
      ? normalizeText(payload.companyName)
      : existing?.companyName;
  const brandName =
    payload.brandName !== undefined
      ? normalizeText(payload.brandName)
      : existing?.brandName;
  const color =
    payload.color !== undefined
      ? normalizeText(payload.color)
      : existing?.color;
  const colorHex =
    payload.colorHex !== undefined
      ? normalizeHexColor(payload.colorHex, existing?.colorHex)
      : normalizeHexColor(existing?.colorHex, existing?.color);
  const metersPerTon =
    payload.metersPerTon !== undefined
      ? toNumber(payload.metersPerTon)
      : existing?.metersPerTon;
  const totalTons =
    payload.totalTons !== undefined
      ? toNumber(payload.totalTons)
      : existing?.totalTons;
  const price =
    payload.price !== undefined ? toNumber(payload.price) : existing?.price;

  const totalMeters = Number(metersPerTon || 0) * Number(totalTons || 0);

  return {
    companyName,
    brandName,
    color,
    colorHex,
    metersPerTon,
    totalTons,
    totalMeters,
    price,
  };
};

const withComputedAvailability = (rakht) => ({
  ...rakht,
  availableMeters: Math.max(
    0,
    Number(rakht.totalMeters || 0) - Number(rakht.usedMeters || 0),
  ),
});

export const getAllRakht = async () => {
  const rows = await prisma.rakht.findMany({
    orderBy: [{ brandName: "asc" }, { color: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(withComputedAvailability);
};

export const createRakht = async (payload) => {
  const data = normalizeRakhtPayload(payload);
  const created = await prisma.rakht.create({ data });
  return withComputedAvailability(created);
};

export const updateRakht = async (id, payload) => {
  const existing = await prisma.rakht.findUnique({ where: { id } });
  if (!existing)
    throw Object.assign(new Error("Rakht not found"), { status: 404 });

  const data = normalizeRakhtPayload(payload, existing);
  if (Number(data.totalMeters || 0) < Number(existing.usedMeters || 0)) {
    throw Object.assign(
      new Error("Total meters cannot be less than already consumed meters."),
      { status: 400 },
    );
  }

  const updated = await prisma.rakht.update({ where: { id }, data });
  return withComputedAvailability(updated);
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
