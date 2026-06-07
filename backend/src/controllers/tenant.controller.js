import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma.js";

const SALT_ROUNDS = 12;
const DEFAULT_CURRENCY = "AFN";
const DEFAULT_LANGUAGE = "fa";
const DEFAULT_TIMEZONE = "Asia/Kabul";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_UPLOAD_DIR = path.join(process.cwd(), "uploads", "tenant-logos");
const LOGO_PUBLIC_DIR = "/uploads/tenant-logos";
const ALLOWED_LOGO_TYPES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/jpg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
]);

const tenantSelect = {
  id: true,
  tenantId: true,
  slug: true,
  businessName: true,
  systemName: true,
  address: true,
  phone: true,
  mobile: true,
  email: true,
  logoUrl: true,
  currency: true,
  language: true,
  timezone: true,
  subscriptionPlan: true,
  subscriptionStatus: true,
  subscriptionStart: true,
  expiryDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const ownerSelect = {
  id: true,
  name: true,
  phoneNumber: true,
  accountType: true,
  isActive: true,
};

const tenantWithOwnerSelect = {
  ...tenantSelect,
  users: {
    where: { accountType: "ADMIN" },
    orderBy: { createdAt: "asc" },
    take: 1,
    select: ownerSelect,
  },
};

function serializeTenant(tenant) {
  if (!tenant) return tenant;
  const { users, ...rest } = tenant;
  return {
    ...rest,
    owner: Array.isArray(users) ? users[0] || null : null,
  };
}

function slugify(value) {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || `tenant-${crypto.randomBytes(4).toString("hex")}`;
}

async function uniqueTenantSlug(baseValue) {
  const base = slugify(baseValue);
  let candidate = base;
  let suffix = 1;
  while (await prisma.tenant.findFirst({ where: { OR: [{ slug: candidate }, { tenantId: candidate }] }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base.slice(0, 56)}-${suffix}`;
  }
  return candidate;
}

function tenantPayload(body) {
  const data = {};
  [
    "businessName",
    "systemName",
    "address",
    "phone",
    "mobile",
    "email",
    "subscriptionPlan",
    "subscriptionStatus",
  ].forEach((key) => {
    if (body[key] !== undefined) data[key] = typeof body[key] === "string" ? body[key].trim() : body[key];
  });

  data.currency = DEFAULT_CURRENCY;
  data.language = DEFAULT_LANGUAGE;
  data.timezone = DEFAULT_TIMEZONE;

  if (body.expiryDate !== undefined) {
    data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
  }
  if (body.subscriptionStart !== undefined) {
    data.subscriptionStart = body.subscriptionStart ? new Date(body.subscriptionStart) : null;
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  return data;
}

function ownerPayload(body) {
  const data = {};
  if (body.ownerName !== undefined) data.name = String(body.ownerName || "").trim();
  if (body.ownerPhone !== undefined) data.phoneNumber = String(body.ownerPhone || "").trim();
  return data;
}

function extensionFromFileName(fileName = "") {
  return path.extname(String(fileName).toLowerCase());
}

function assertLogoPayload(upload) {
  if (!upload) return null;
  const mimeType = String(upload.mimeType || "").toLowerCase();
  const expectedExt = ALLOWED_LOGO_TYPES.get(mimeType);
  if (!expectedExt) {
    const error = new Error("Logo must be a PNG, JPG, JPEG, WEBP, or SVG image.");
    error.status = 400;
    throw error;
  }

  const rawData = String(upload.data || "");
  if (!rawData) {
    const error = new Error("Logo file data is missing.");
    error.status = 400;
    throw error;
  }

  const buffer = Buffer.from(rawData, "base64");
  if (!buffer.length || buffer.length > LOGO_MAX_BYTES) {
    const error = new Error("Logo file must be 2MB or smaller.");
    error.status = 400;
    throw error;
  }

  const fileExt = extensionFromFileName(upload.fileName) || expectedExt;
  const normalizedExt = fileExt === ".jpeg" ? ".jpg" : fileExt;
  if (![...ALLOWED_LOGO_TYPES.values(), ".jpeg"].includes(fileExt) || normalizedExt !== expectedExt) {
    const error = new Error("Logo file extension does not match its image type.");
    error.status = 400;
    throw error;
  }

  if (mimeType === "image/svg+xml") {
    const svg = buffer.toString("utf8").toLowerCase();
    if (svg.includes("<script") || svg.includes("javascript:") || /\son[a-z]+\s*=/.test(svg)) {
      const error = new Error("SVG logo contains unsafe content.");
      error.status = 400;
      throw error;
    }
  }

  return { buffer, ext: expectedExt };
}

async function saveLogo(upload) {
  const parsed = assertLogoPayload(upload);
  if (!parsed) return null;
  await fs.mkdir(LOGO_UPLOAD_DIR, { recursive: true });
  const fileName = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${parsed.ext}`;
  const absolutePath = path.join(LOGO_UPLOAD_DIR, fileName);
  await fs.writeFile(absolutePath, parsed.buffer, { flag: "wx" });
  return `${LOGO_PUBLIC_DIR}/${fileName}`;
}

async function deleteLogo(logoUrl) {
  if (!logoUrl || typeof logoUrl !== "string") return;
  if (!logoUrl.startsWith(`${LOGO_PUBLIC_DIR}/`)) return;
  const fileName = path.basename(logoUrl);
  const absolutePath = path.resolve(LOGO_UPLOAD_DIR, fileName);
  const uploadRoot = path.resolve(LOGO_UPLOAD_DIR);
  if (!absolutePath.startsWith(uploadRoot + path.sep)) return;
  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function writeAudit(req, action, entity, entityId, metadata = null) {
  await prisma.auditLog.create({
    data: {
      tenantId: req.user?.accountType === "SUPER_ADMIN" ? null : req.user?.tenantId,
      actorId: req.user?.id,
      action,
      entity,
      entityId,
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    },
  });
}

export async function listTenants(req, res, next) {
  try {
    const search = String(req.query.search || "").trim();
    const where = search
      ? {
          OR: [
            { businessName: { contains: search, mode: "insensitive" } },
            { systemName: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const tenants = await prisma.tenant.findMany({
      where,
      select: {
        ...tenantWithOwnerSelect,
        _count: { select: { users: true, customers: true, orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(tenants.map(serializeTenant));
  } catch (err) {
    next(err);
  }
}

export async function getTenant(req, res, next) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: {
        ...tenantWithOwnerSelect,
        _count: { select: { users: true, customers: true, orders: true } },
      },
    });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });
    res.json(serializeTenant(tenant));
  } catch (err) {
    next(err);
  }
}

export async function createTenant(req, res, next) {
  let savedLogoUrl = null;
  try {
    const { businessName, systemName, ownerName, ownerPhone, ownerPassword } = req.body;
    if (!businessName || !systemName || !ownerName || !ownerPhone) {
      return res.status(400).json({
        error: "businessName, systemName, ownerName and ownerPhone are required.",
      });
    }

    const tenantSlug = await uniqueTenantSlug(businessName);
    savedLogoUrl = await saveLogo(req.body.logoUpload);

    const password = ownerPassword || ownerPhone.trim();
    if (password.length < 6) {
      return res.status(400).json({ error: "Owner password must be at least 6 characters." });
    }

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          ...tenantPayload(req.body),
          tenantId: tenantSlug,
          slug: tenantSlug,
          businessName: businessName.trim(),
          systemName: systemName.trim(),
          logoUrl: savedLogoUrl,
        },
        select: tenantSelect,
      });

      const owner = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: ownerName.trim(),
          phoneNumber: ownerPhone.trim(),
          accountType: "ADMIN",
          password: await bcrypt.hash(password, SALT_ROUNDS),
        },
        select: { id: true, name: true, phoneNumber: true, accountType: true },
      });

      return { tenant, owner };
    });

    await writeAudit(req, "TENANT_CREATED", "Tenant", created.tenant.id, {
      ownerId: created.owner.id,
    });
    res.status(201).json(created);
  } catch (err) {
    if (savedLogoUrl) await deleteLogo(savedLogoUrl).catch(() => {});
    next(err);
  }
}

export async function updateTenant(req, res, next) {
  let newLogoUrl = null;
  try {
    const existing = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { id: true, logoUrl: true },
    });
    if (!existing) return res.status(404).json({ error: "Tenant not found." });

    if (req.body.ownerName !== undefined && !String(req.body.ownerName || "").trim()) {
      return res.status(400).json({ error: "Owner name is required." });
    }
    if (req.body.ownerPhone !== undefined && !String(req.body.ownerPhone || "").trim()) {
      return res.status(400).json({ error: "Owner phone is required." });
    }
    if (req.body.ownerPassword && String(req.body.ownerPassword).length < 6) {
      return res.status(400).json({ error: "Owner password must be at least 6 characters." });
    }

    const tenant = await prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: req.params.id },
        data: {
          ...tenantPayload(req.body),
          ...(req.body.logoUpload ? { logoUrl: (newLogoUrl = await saveLogo(req.body.logoUpload)) } : {}),
          ...(req.body.removeLogo ? { logoUrl: null } : {}),
        },
        select: tenantWithOwnerSelect,
      });

      const ownerData = ownerPayload(req.body);
      if (Object.keys(ownerData).length || req.body.ownerPassword) {
        const owner = updatedTenant.users[0];
        if (!owner) {
          const error = new Error("Tenant owner account was not found.");
          error.status = 404;
          throw error;
        }
        await tx.user.update({
          where: { id: owner.id },
          data: {
            ...ownerData,
            ...(req.body.ownerPassword
              ? { password: await bcrypt.hash(String(req.body.ownerPassword), SALT_ROUNDS) }
              : {}),
          },
        });
      }

      return tx.tenant.findUnique({
        where: { id: req.params.id },
        select: tenantWithOwnerSelect,
      });
    });
    if ((newLogoUrl || req.body.removeLogo) && existing.logoUrl) {
      await deleteLogo(existing.logoUrl);
    }
    await writeAudit(req, "TENANT_UPDATED", "Tenant", tenant.id);
    res.json(serializeTenant(tenant));
  } catch (err) {
    if (newLogoUrl) await deleteLogo(newLogoUrl).catch(() => {});
    next(err);
  }
}

export async function deleteTenant(req, res, next) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { logoUrl: true },
    });
    await prisma.tenant.delete({ where: { id: req.params.id } });
    if (tenant?.logoUrl) await deleteLogo(tenant.logoUrl);
    await writeAudit(req, "TENANT_DELETED", "Tenant", req.params.id);
    res.json({ message: "Tenant deleted." });
  } catch (err) {
    next(err);
  }
}

export async function tenantStats(req, res, next) {
  try {
    const tenantId = req.params.id;
    const [users, customers, orders, activeOrders, revenue] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.customer.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId, isCompleted: false } }),
      prisma.order.aggregate({ where: { tenantId }, _sum: { totalPrice: true, paidAmount: true, remaining: true } }),
    ]);

    res.json({
      users,
      customers,
      orders,
      activeOrders,
      revenue: {
        totalPrice: revenue._sum.totalPrice || 0,
        paidAmount: revenue._sum.paidAmount || 0,
        remaining: revenue._sum.remaining || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyTenantSettings(req, res, next) {
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ error: "Tenant account is not configured." });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: tenantSelect,
    });

    if (!tenant) return res.status(404).json({ error: "Tenant settings not found." });
    res.json(tenant);
  } catch (err) {
    next(err);
  }
}

export async function updateMyTenantSettings(req, res, next) {
  let newLogoUrl = null;
  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ error: "Tenant account is not configured." });
    }
    const existing = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { logoUrl: true },
    });
    const allowed = tenantPayload(req.body);
    delete allowed.subscriptionPlan;
    delete allowed.subscriptionStatus;
    delete allowed.subscriptionStart;
    delete allowed.expiryDate;
    delete allowed.isActive;

    const tenant = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        ...allowed,
        ...(req.body.logoUpload ? { logoUrl: (newLogoUrl = await saveLogo(req.body.logoUpload)) } : {}),
        ...(req.body.removeLogo ? { logoUrl: null } : {}),
      },
      select: tenantSelect,
    });
    if ((newLogoUrl || req.body.removeLogo) && existing?.logoUrl) {
      await deleteLogo(existing.logoUrl);
    }
    await writeAudit(req, "TENANT_SETTINGS_UPDATED", "Tenant", tenant.id);
    res.json(tenant);
  } catch (err) {
    if (newLogoUrl) await deleteLogo(newLogoUrl).catch(() => {});
    next(err);
  }
}
