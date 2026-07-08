import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { getReservedSubdomains } from "../lib/tenantHost.js";
import {
  getOrderFinancialPaid,
  getOrderFinancialRemaining,
  getOrderFinancialTotal,
} from "../lib/orderFinancials.js";
import { prepareTenantBackupDeletion } from "../services/backup.service.js";
import {
  countTenantUsers,
  countTenantUsersBatch,
  DEFAULT_USER_LIMIT,
  getTenantUserLimitInfo,
} from "../services/userLimit.service.js";

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
  latestPassword: true,
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
  const normalizedSystemName = rest.systemName || rest.businessName || "";
  return {
    ...rest,
    businessName: normalizedSystemName,
    systemName: normalizedSystemName,
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

async function assertTenantSlugAvailable(candidate, excludeTenantId = null) {
  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: candidate }, { tenantId: candidate }],
      ...(excludeTenantId ? { id: { not: excludeTenantId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    const error = new Error("This subdomain is already in use.");
    error.status = 409;
    error.code = "SUBDOMAIN_IN_USE";
    throw error;
  }
}

async function resolveTenantSlug(input, fallbackValue, excludeTenantId = null) {
  const raw = String(input || "").trim();
  const reserved = getReservedSubdomains();

  if (!raw) {
    return uniqueTenantSlug(fallbackValue);
  }

  const normalized = slugify(raw);
  if (reserved.has(normalized)) {
    const error = new Error("This subdomain is reserved. Please choose another one.");
    error.status = 400;
    error.code = "SUBDOMAIN_RESERVED";
    throw error;
  }

  await assertTenantSlugAvailable(normalized, excludeTenantId);
  return normalized;
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
  if (data.systemName && body.businessName === undefined) {
    data.businessName = data.systemName;
  }

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

async function verifySuperAdminPassword(req, password) {
  if (!password) {
    const error = new Error("Current password is required.");
    error.status = 400;
    throw error;
  }
  const account = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { password: true, accountType: true },
  });
  if (!account || account.accountType !== "SUPER_ADMIN") {
    const error = new Error("Super admin account not found.");
    error.status = 404;
    throw error;
  }
  if (!(await bcrypt.compare(String(password), account.password))) {
    const error = new Error("Current password is incorrect.");
    error.status = 401;
    error.code = "INVALID_CURRENT_PASSWORD";
    throw error;
  }
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

    const tenantSlug = await resolveTenantSlug(
      req.body.subdomain || req.body.slug,
      businessName,
    );
    if (!ownerPassword) {
      return res.status(400).json({ error: "Owner password is required." });
    }
    const password = String(ownerPassword);
    if (password.length < 6) {
      return res.status(400).json({ error: "Owner password must be at least 6 characters." });
    }
    savedLogoUrl = await saveLogo(req.body.logoUpload);

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
          latestPassword: password,
        },
        select: ownerSelect,
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

    const nextSlug =
      req.body.subdomain !== undefined || req.body.slug !== undefined
        ? await resolveTenantSlug(
            req.body.subdomain ?? req.body.slug,
            req.body.systemName || req.body.businessName || existing.id,
            existing.id,
          )
        : null;

    const tenant = await prisma.$transaction(async (tx) => {
      const updatedTenant = await tx.tenant.update({
        where: { id: req.params.id },
        data: {
          ...tenantPayload(req.body),
          ...(nextSlug ? { slug: nextSlug, tenantId: nextSlug } : {}),
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
              ? {
                  password: await bcrypt.hash(String(req.body.ownerPassword), SALT_ROUNDS),
                  latestPassword: String(req.body.ownerPassword),
                }
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
  let backupDeletion = null;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { id: true, logoUrl: true, systemName: true },
    });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });

    await verifySuperAdminPassword(req, req.body?.password);
    backupDeletion = await prepareTenantBackupDeletion(tenant.id);

    await prisma.$transaction(async (tx) => {
      if (backupDeletion.recordIds.length) {
        await tx.backupRecord.deleteMany({
          where: { id: { in: backupDeletion.recordIds } },
        });
      }
      await tx.tenant.delete({ where: { id: tenant.id } });
      await tx.auditLog.create({
        data: {
          tenantId: null,
          actorId: req.user.id,
          action: "TENANT_DELETED",
          entity: "Tenant",
          entityId: tenant.id,
          metadata: {
            systemName: tenant.systemName,
            deletedBackupCount: backupDeletion.recordIds.length,
          },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        },
      });
    });

    const cleanupWarnings = await backupDeletion.commit();
    backupDeletion = null;
    if (tenant.logoUrl) {
      try {
        await deleteLogo(tenant.logoUrl);
      } catch (error) {
        cleanupWarnings.push({
          type: "logo",
          error: error?.message || "Could not remove tenant logo.",
        });
      }
    }
    res.json({
      message: "Tenant deleted.",
      cleanupWarnings,
    });
  } catch (err) {
    if (backupDeletion) await backupDeletion.rollback();
    next(err);
  }
}

export async function verifyTenantDeletionPassword(req, res, next) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!tenant) return res.status(404).json({ error: "Tenant not found." });
    await verifySuperAdminPassword(req, req.body?.password);
    res.json({ verified: true });
  } catch (err) {
    next(err);
  }
}

export async function tenantStats(req, res, next) {
  try {
    const tenantId = req.params.id;
    const [users, customers, orders, activeOrders, revenue, revenueOrders] =
      await Promise.all([
        prisma.user.count({ where: { tenantId } }),
        prisma.customer.count({ where: { tenantId } }),
        prisma.order.count({ where: { tenantId } }),
        prisma.order.count({ where: { tenantId, isCompleted: false } }),
        prisma.order.aggregate({
          where: { tenantId, damagedClothesPenalties: { none: {} } },
          _sum: {
            totalPrice: true,
            discount: true,
            paidAmount: true,
            remaining: true,
          },
        }),
        prisma.order.findMany({
          where: { tenantId, damagedClothesPenalties: { none: {} } },
          select: {
            type: true,
            totalPrice: true,
            totalBenefit: true,
            discount: true,
            paidAmount: true,
            readyMadeOriginalPrice: true,
            readyMadeWaskatOriginalPrice: true,
          },
        }),
      ]);

    res.json({
      users,
      customers,
      orders,
      activeOrders,
      revenue: {
        totalPrice: revenueOrders.reduce(
          (sum, order) => sum + getOrderFinancialTotal(order),
          0,
        ),
        discount: revenue._sum.discount || 0,
        paidAmount: revenueOrders.reduce(
          (sum, order) => sum + getOrderFinancialPaid(order),
          0,
        ),
        remaining: revenueOrders.reduce(
          (sum, order) => sum + getOrderFinancialRemaining(order),
          0,
        ),
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
      select: {
        ...tenantSelect,
        users: {
          where: { id: req.user.id },
          take: 1,
          select: ownerSelect,
        },
      },
    });

    if (!tenant) return res.status(404).json({ error: "Tenant settings not found." });
    res.json(serializeTenant(tenant));
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
    const ownerName = req.body.ownerName;
    const ownerPhone = req.body.ownerPhone;
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    const ownerData = {};

    if (ownerName !== undefined) {
      const name = String(ownerName || "").trim();
      if (!name) return res.status(400).json({ error: "Owner name is required." });
      ownerData.name = name;
    }
    if (ownerPhone !== undefined) {
      const phoneNumber = String(ownerPhone || "").trim();
      if (!phoneNumber) return res.status(400).json({ error: "Owner phone is required." });
      ownerData.phoneNumber = phoneNumber;
    }
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required." });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "New password and confirmation do not match." });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }
      ownerData.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
      ownerData.latestPassword = newPassword;
    }

    if (Object.keys(ownerData).length) {
      const account = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, tenantId: true, password: true, accountType: true },
      });
      if (!account || account.tenantId !== req.user.tenantId || account.accountType !== "ADMIN") {
        return res.status(404).json({ error: "Owner account not found." });
      }
      if (ownerData.password && !(await bcrypt.compare(currentPassword, account.password))) {
        return res.status(401).json({ code: "INVALID_CURRENT_PASSWORD", error: "Current password is incorrect." });
      }
      if (ownerData.phoneNumber) {
        const phoneOwner = await prisma.user.findFirst({
          where: {
            tenantId: req.user.tenantId,
            id: { not: account.id },
            phoneNumber: ownerData.phoneNumber,
          },
          select: { id: true },
        });
        if (phoneOwner) {
          return res.status(409).json({ code: "PHONE_IN_USE", error: "This phone number is already in use." });
        }
      }
    }

    const allowed = tenantPayload(req.body);
    delete allowed.subscriptionPlan;
    delete allowed.subscriptionStatus;
    delete allowed.subscriptionStart;
    delete allowed.expiryDate;
    delete allowed.isActive;

    const tenant = await prisma.$transaction(async (tx) => {
      if (Object.keys(ownerData).length) {
        await tx.user.update({
          where: { id: req.user.id },
          data: ownerData,
        });
      }
      return tx.tenant.update({
        where: { id: req.user.tenantId },
        data: {
          ...allowed,
          ...(req.body.logoUpload ? { logoUrl: (newLogoUrl = await saveLogo(req.body.logoUpload)) } : {}),
          ...(req.body.removeLogo ? { logoUrl: null } : {}),
        },
        select: {
          ...tenantSelect,
          users: {
            where: { id: req.user.id },
            take: 1,
            select: ownerSelect,
          },
        },
      });
    });
    if ((newLogoUrl || req.body.removeLogo) && existing?.logoUrl) {
      await deleteLogo(existing.logoUrl);
    }
    await writeAudit(req, "TENANT_SETTINGS_UPDATED", "Tenant", tenant.id);
    res.json(serializeTenant(tenant));
  } catch (err) {
    if (newLogoUrl) await deleteLogo(newLogoUrl).catch(() => {});
    next(err);
  }
}

function serializeTenantUserLimitRow(tenant, limitInfo) {
  return {
    id: tenant.id,
    tenantId: tenant.tenantId,
    slug: tenant.slug,
    businessName: tenant.systemName || tenant.businessName,
    systemName: tenant.systemName || tenant.businessName,
    isActive: tenant.isActive,
    ...limitInfo,
  };
}

/** GET /api/tenants/user-limits */
export async function listTenantUserLimits(req, res, next) {
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
        id: true,
        tenantId: true,
        slug: true,
        businessName: true,
        systemName: true,
        isActive: true,
        extraUserLimit: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const userCounts = await countTenantUsersBatch(tenants.map((t) => t.id));

    const rows = tenants.map((tenant) => {
      const currentUserCount = userCounts.get(tenant.id) || 0;
      const limitInfo = {
        defaultLimit: DEFAULT_USER_LIMIT,
        extraUserLimit: tenant.extraUserLimit,
        totalAllowed: DEFAULT_USER_LIMIT + tenant.extraUserLimit,
        currentUserCount,
        remaining: Math.max(
          0,
          DEFAULT_USER_LIMIT + tenant.extraUserLimit - currentUserCount,
        ),
        isAtLimit:
          currentUserCount >= DEFAULT_USER_LIMIT + tenant.extraUserLimit,
      };
      return serializeTenantUserLimitRow(tenant, limitInfo);
    });

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/tenants/:id/user-limit */
export async function updateTenantUserLimit(req, res, next) {
  try {
    const { extraUserLimit, note } = req.body;
    if (extraUserLimit === undefined || extraUserLimit === null) {
      return res.status(400).json({ error: "extraUserLimit is required." });
    }

    const parsedExtra = Number(extraUserLimit);
    if (!Number.isInteger(parsedExtra) || parsedExtra < 0) {
      return res.status(400).json({
        error: "extraUserLimit must be a non-negative whole number.",
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        tenantId: true,
        slug: true,
        businessName: true,
        systemName: true,
        isActive: true,
        extraUserLimit: true,
      },
    });
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found." });
    }

    const currentUserCount = await countTenantUsers(tenant.id);
    const newTotalAllowed = DEFAULT_USER_LIMIT + parsedExtra;
    if (currentUserCount > newTotalAllowed) {
      return res.status(400).json({
        code: "TENANT_USER_LIMIT_TOO_LOW",
        error: `Cannot set total limit to ${newTotalAllowed}. This tenant already has ${currentUserCount} users.`,
        currentUserCount,
        requestedTotalAllowed: newTotalAllowed,
      });
    }

    if (parsedExtra === tenant.extraUserLimit) {
      const limitInfo = await getTenantUserLimitInfo(tenant.id);
      return res.json(serializeTenantUserLimitRow(tenant, limitInfo));
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.tenantUserLimitHistory.create({
        data: {
          tenantId: tenant.id,
          previousExtraLimit: tenant.extraUserLimit,
          newExtraLimit: parsedExtra,
          defaultLimit: DEFAULT_USER_LIMIT,
          changedById: req.user.id,
          note: note ? String(note).trim() : null,
        },
      });

      return tx.tenant.update({
        where: { id: tenant.id },
        data: { extraUserLimit: parsedExtra },
        select: {
          id: true,
          tenantId: true,
          slug: true,
          businessName: true,
          systemName: true,
          isActive: true,
          extraUserLimit: true,
        },
      });
    });

    await writeAudit(req, "TENANT_USER_LIMIT_UPDATED", "Tenant", tenant.id, {
      previousExtraLimit: tenant.extraUserLimit,
      newExtraLimit: parsedExtra,
      defaultLimit: DEFAULT_USER_LIMIT,
      currentUserCount,
      note: note ? String(note).trim() : null,
    });

    const limitInfo = await getTenantUserLimitInfo(updated.id);
    res.json(serializeTenantUserLimitRow(updated, limitInfo));
  } catch (err) {
    next(err);
  }
}

/** GET /api/tenants/:id/user-limit/history */
export async function getTenantUserLimitHistory(req, res, next) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found." });
    }

    const history = await prisma.tenantUserLimitHistory.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        previousExtraLimit: true,
        newExtraLimit: true,
        defaultLimit: true,
        note: true,
        createdAt: true,
        changedBy: {
          select: { id: true, name: true, phoneNumber: true },
        },
      },
    });

    res.json(history);
  } catch (err) {
    next(err);
  }
}
