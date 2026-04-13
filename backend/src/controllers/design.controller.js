import { prisma } from "../lib/prisma.js";

// Map URL param to Prisma model key
const MODEL_MAP = {
  yakhan: "yakhan",
  astin: "astin",
  daman: "daman",
  shoulderstate: "shoulderState",
  neckoutfit: "neckOutfit",
  neckwaskat: "neckWaskat",
  jibrow: "jibRow",
  jibbaghle: "jibBaghle",
  jibtenban: "jibTenban",
  patyship: "patyShip",
  buttonship: "buttonShip",
  tenbanship: "tenbanShip",
};

const getModel = (name) => {
  const key = MODEL_MAP[name.toLowerCase()];
  if (!key)
    throw Object.assign(new Error(`Design model "${name}" not found`), {
      status: 404,
    });
  const model = prisma[key];
  if (!model || typeof model.findMany !== "function") {
    const err = new Error(
      `Prisma model "${key}" is not available on the Prisma client. Did you run 'npx prisma generate' after updating schema?`,
    );
    err.status = 500;
    throw err;
  }
  return model;
};

export const getAll = async (req, res, next) => {
  try {
    res.json(
      await getModel(req.params.model).findMany({ orderBy: { name: "asc" } }),
    );
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    if (!req.body.name)
      return res.status(400).json({ error: "name is required" });
    res.status(201).json(
      await getModel(req.params.model).create({
        data: { name: req.body.name },
      }),
    );
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    if (!req.body.name)
      return res.status(400).json({ error: "name is required" });
    res.json(
      await getModel(req.params.model).update({
        where: { id: req.params.id },
        data: { name: req.body.name },
      }),
    );
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    await getModel(req.params.model).delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

// Get all design types at once (for dropdowns)
export const getAllDesigns = async (req, res, next) => {
  try {
    const [
      yakhan,
      astin,
      daman,
      neckOutfit,
      neckWaskat,
      shoulderState,
      jibRow,
      jibBaghle,
      jibTenban,
      patyShip,
      buttonShip,
      tenbanShip,
    ] = await Promise.all([
      prisma.yakhan.findMany({ orderBy: { name: "asc" } }),
      prisma.astin.findMany({ orderBy: { name: "asc" } }),
      prisma.daman.findMany({ orderBy: { name: "asc" } }),
      prisma.neckOutfit.findMany({ orderBy: { name: "asc" } }),
      prisma.neckWaskat.findMany({ orderBy: { name: "asc" } }),
      prisma.shoulderState.findMany({ orderBy: { name: "asc" } }),
      prisma.jibRow.findMany({ orderBy: { name: "asc" } }),
      prisma.jibBaghle.findMany({ orderBy: { name: "asc" } }),
      prisma.jibTenban.findMany({ orderBy: { name: "asc" } }),
      prisma.patyShip.findMany({ orderBy: { name: "asc" } }),
      prisma.buttonShip.findMany({ orderBy: { name: "asc" } }),
      prisma.tenbanShip.findMany({ orderBy: { name: "asc" } }),
    ]);
    res.json({
      yakhan,
      astin,
      daman,
      neckOutfit,
      neckWaskat,
      shoulderState,
      jibRow,
      jibBaghle,
      jibTenban,
      patyShip,
      buttonShip,
      tenbanShip,
    });
  } catch (e) {
    next(e);
  }
};
