import { prisma } from "../lib/prisma.js";
import bcrypt from "bcryptjs";
import { getDashboardStats } from "../services/analytics.service.js";
import {
  createContributorSchema,
  deleteContributorSchema,
  updateContributorSchema,
} from "../validators/contributor.validator.js";

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

const PERCENTAGE_LIMIT_ERROR =
  "Total contributor percentage cannot be greater than 100%.";
const CONTRIBUTOR_PASSWORD_ERROR = "Invalid contributor password.";
const SALT_ROUNDS = 10;

const parseMonthYear = (req) => {
  const monthRaw = req.query?.month;
  const yearRaw = req.query?.year;
  const parsedMonth = monthRaw != null ? Number(monthRaw) : null;
  const parsedYear = yearRaw != null ? Number(yearRaw) : null;

  const month = Number.isFinite(parsedMonth) ? parsedMonth : null;
  const year = Number.isFinite(parsedYear) ? parsedYear : null;

  return { month, year };
};

const getNetBenefit = async (req) => {
  const { month, year } = parseMonthYear(req);
  const isFinance = req.user?.accountType === "FINANCE";
  const stats = await getDashboardStats({
    month,
    year,
    financeUserId: isFinance ? req.user?.id : null,
  });

  return (
    Number(stats.totalRakhtRevenue || 0) + Number(stats.totalOrderBenefit || 0)
  );
};

const getCurrentTotalPercentage = async (excludeId = null) => {
  const aggregate = await prisma.contributor.aggregate({
    where: excludeId ? { NOT: { id: excludeId } } : undefined,
    _sum: { percentage: true },
  });

  return Number(aggregate._sum?.percentage || 0);
};

const ensurePercentageLimit = async (newPercentage, excludeId = null) => {
  const currentTotal = await getCurrentTotalPercentage(excludeId);
  const nextTotal = currentTotal + Number(newPercentage || 0);

  if (nextTotal > 100) {
    const err = new Error(PERCENTAGE_LIMIT_ERROR);
    err.status = 400;
    throw err;
  }

  return currentTotal;
};

const buildContributorListResponse = async (req) => {
  const [contributors, netBenefit] = await Promise.all([
    prisma.contributor.findMany({
      select: {
        id: true,
        name: true,
        fatherName: true,
        phoneNumber: true,
        percentage: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    }),
    getNetBenefit(req),
  ]);

  const totalPercentage = contributors.reduce(
    (sum, contributor) => sum + Number(contributor.percentage || 0),
    0,
  );

  return {
    netBenefit,
    totalPercentage,
    contributors: contributors.map((contributor) => ({
      ...contributor,
      contributorMoney:
        (netBenefit * Number(contributor.percentage || 0)) / 100,
    })),
  };
};

const sanitizeContributor = (contributor) => ({
  id: contributor.id,
  name: contributor.name,
  fatherName: contributor.fatherName,
  phoneNumber: contributor.phoneNumber,
  percentage: contributor.percentage,
  createdAt: contributor.createdAt,
  updatedAt: contributor.updatedAt,
});

const assertContributorPassword = async ({ contributorId, password }) => {
  const contributor = await prisma.contributor.findUnique({
    where: { id: contributorId },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!contributor) {
    const err = new Error("Record not found.");
    err.status = 404;
    throw err;
  }

  const isValid = contributor.passwordHash
    ? await bcrypt.compare(password, contributor.passwordHash)
    : false;

  if (!isValid) {
    const err = new Error(CONTRIBUTOR_PASSWORD_ERROR);
    err.status = 401;
    throw err;
  }
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

export const listContributors = async (req, res, next) => {
  try {
    res.json(await buildContributorListResponse(req));
  } catch (e) {
    next(e);
  }
};

export const createContributor = async (req, res, next) => {
  try {
    const body = createContributorSchema.parse(req.body);
    await ensurePercentageLimit(body.percentage);
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const created = await prisma.contributor.create({
      data: {
        name: body.name,
        fatherName: body.fatherName,
        phoneNumber: body.phoneNumber,
        percentage: body.percentage,
        passwordHash,
      },
    });

    res.status(201).json(sanitizeContributor(created));
  } catch (e) {
    next(e);
  }
};

export const updateContributor = async (req, res, next) => {
  try {
    const body = updateContributorSchema.parse(req.body);
    await assertContributorPassword({
      contributorId: req.params.id,
      password: body.password,
    });
    await ensurePercentageLimit(body.percentage, req.params.id);

    const updated = await prisma.contributor.update({
      where: { id: req.params.id },
      data: {
        name: body.name,
        fatherName: body.fatherName,
        phoneNumber: body.phoneNumber,
        percentage: body.percentage,
      },
    });

    res.json(sanitizeContributor(updated));
  } catch (e) {
    next(e);
  }
};

export const deleteContributor = async (req, res, next) => {
  try {
    const body = deleteContributorSchema.parse(req.body);
    await assertContributorPassword({
      contributorId: req.params.id,
      password: body.password,
    });
    await prisma.contributor.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const verifyContributorPassword = async (req, res, next) => {
  try {
    const body = deleteContributorSchema.parse(req.body);
    await assertContributorPassword({
      contributorId: req.params.id,
      password: body.password,
    });
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
