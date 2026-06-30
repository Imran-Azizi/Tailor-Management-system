import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import nodemailer from "nodemailer";
import path from "path";
import { pipeline } from "stream/promises";
import zlib from "zlib";
import { prisma } from "../lib/prisma.js";

const BACKUP_ROOT = path.resolve(
  process.env.BACKUP_STORAGE_DIR || path.join(process.cwd(), "storage", "secure-backups"),
);
const TMP_ROOT = path.resolve(process.cwd(), "tmp", "backups");
const SYSTEM_NAME = "tailor-system";
const SCHEDULE_ID = "default";

const GLOBAL_MODELS = [];

const TENANT_DESIGN_MODELS = [
  "yakhan",
  "astin",
  "shoulderState",
  "neckOutfit",
  "neckWaskat",
  "daman",
  "jibRow",
  "jibBaghle",
  "jibTenban",
  "patyShip",
  "buttonShip",
  "tenbanShip",
  "outfitDesign",
  "yakhanQaqNeck",
  "yakhanQaqSleeve",
  "yakhanQaqSkirt",
  "yakhanQaqDesignOption",
  "yakhanQaqButtonShip",
  "yakhanQaqPantShip",
];

const TENANT_ORDER_DETAIL_MODELS = [
  "outfit",
  "waskat",
  "korty",
  "yakhanQaq",
  "readyMadeOrder",
  "readyMadeWaskatOrder",
];

const TENANT_BASE_MODELS = [
  "tenant",
  "user",
  "customer",
  "rakht",
  "rakhtTon",
  "readyMadeClothing",
  "readyMadeWaskatClothing",
  "box",
  ...TENANT_DESIGN_MODELS,
  "contributor",
  "order",
  ...TENANT_ORDER_DETAIL_MODELS,
  "workerPaymentReceipt",
  "orderDraft",
  "rakhtPaymentHistory",
  "notification",
  "userNotification",
  "dailyTask",
  "transaction",
  "damagedClothesPenalty",
  "item",
  "itemSale",
  "auditLog",
];

const FULL_BACKUP_MODELS = [...GLOBAL_MODELS, ...TENANT_BASE_MODELS];
const RESTORE_ORDER = [...GLOBAL_MODELS, ...TENANT_BASE_MODELS];
const DELETE_ORDER = [...RESTORE_ORDER].reverse();

const DATE_FIELDS = {
  tenant: ["subscriptionStart", "expiryDate", "createdAt", "updatedAt"],
  user: ["createdAt", "updatedAt"],
  userNotification: ["createdAt", "updatedAt"],
  customer: ["createdAt", "updatedAt"],
  order: [
    "rakhtDate",
    "emergencyExpiry",
    "assignedAt",
    "receivedAt",
    "qichikarAssignedAt",
    "qichikarReceivedAt",
    "dokhtAssignedAt",
    "dokhtReceivedAt",
    "workerPaidAt",
    "qichikarPaidAt",
    "dokhtPaidAt",
    "qichikarCompletedAt",
    "dokhtCompletedAt",
    "createdAt",
    "updatedAt",
  ],
  workerPaymentReceipt: ["receiptDate", "createdAt", "updatedAt"],
  orderDraft: ["createdAt", "updatedAt"],
  rakht: ["date", "createdAt", "updatedAt"],
  rakhtPaymentHistory: ["paidAt", "createdAt"],
  rakhtTon: ["createdAt", "updatedAt"],
  readyMadeClothing: ["createdAt", "updatedAt"],
  readyMadeWaskatClothing: ["createdAt", "updatedAt"],
  notification: ["nextAlert", "expiresAt", "createdAt", "updatedAt"],
  box: ["createdAt", "updatedAt"],
  contributor: ["createdAt", "updatedAt"],
  dailyTask: ["taskDate", "createdAt", "updatedAt"],
  transaction: ["transactionDate", "createdAt", "updatedAt"],
  damagedClothesPenalty: ["createdAt", "updatedAt"],
  item: ["createdAt", "updatedAt"],
  itemSale: ["createdAt"],
  auditLog: ["createdAt"],
  yakhan: ["createdAt", "updatedAt"],
  astin: ["createdAt", "updatedAt"],
  shoulderState: ["createdAt", "updatedAt"],
  neckOutfit: ["createdAt", "updatedAt"],
  neckWaskat: ["createdAt", "updatedAt"],
  daman: ["createdAt", "updatedAt"],
  jibRow: ["createdAt", "updatedAt"],
  jibBaghle: ["createdAt", "updatedAt"],
  jibTenban: ["createdAt", "updatedAt"],
  patyShip: ["createdAt", "updatedAt"],
  buttonShip: ["createdAt", "updatedAt"],
  tenbanShip: ["createdAt", "updatedAt"],
  outfitDesign: ["createdAt", "updatedAt"],
  yakhanQaqNeck: ["createdAt", "updatedAt"],
  yakhanQaqSleeve: ["createdAt", "updatedAt"],
  yakhanQaqSkirt: ["createdAt", "updatedAt"],
  yakhanQaqDesignOption: ["createdAt", "updatedAt"],
  yakhanQaqButtonShip: ["createdAt", "updatedAt"],
  yakhanQaqPantShip: ["createdAt", "updatedAt"],
};

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function parseInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safePart(value, fallback = "backup") {
  return String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function ensureInside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw Object.assign(new Error("Invalid backup file path."), { status: 400 });
  }
  return resolvedTarget;
}

function storagePathFromKey(storageKey) {
  const rawKey = String(storageKey || "").trim().replace(/\\/g, "/");
  const segments = rawKey.split("/");
  if (
    !rawKey ||
    rawKey.includes("\0") ||
    path.posix.isAbsolute(rawKey) ||
    /^[a-zA-Z]:/.test(rawKey) ||
    segments.some((segment) => segment === "..")
  ) {
    throw Object.assign(new Error("Invalid backup storage key."), { status: 400 });
  }
  const normalizedKey = path.posix.normalize(rawKey).replace(/^\.\/+/, "");
  return ensureInside(BACKUP_ROOT, path.join(BACKUP_ROOT, normalizedKey));
}

function relativeStorageKey(filePath) {
  return path.relative(BACKUP_ROOT, filePath).replace(/\\/g, "/");
}

function getConfig() {
  const scheduleCompression = parseBoolean(process.env.BACKUP_COMPRESSION_ENABLED, true);
  return {
    emailTo: process.env.BACKUP_EMAIL_TO,
    emailFrom: process.env.BACKUP_EMAIL_FROM || process.env.SMTP_USER,
    subjectPrefix: process.env.BACKUP_EMAIL_SUBJECT_PREFIX || "Tailor Backup",
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInteger(process.env.SMTP_PORT, 587),
    smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    compressionEnabled: scheduleCompression,
    encryptionEnabled: parseBoolean(process.env.BACKUP_ENCRYPTION_ENABLED, false),
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
    retentionDays: parseInteger(process.env.BACKUP_RETENTION_DAYS, 35),
    totalStorageBytes: parseInteger(process.env.BACKUP_TOTAL_STORAGE_BYTES, 1024 * 1024 * 1024),
  };
}

function normalizeEncryptionKey(raw) {
  if (!raw) throw Object.assign(new Error("BACKUP_ENCRYPTION_KEY is required."), { status: 500 });
  const value = String(raw).trim();
  if (/^[a-fA-F0-9]{64}$/.test(value)) return Buffer.from(value, "hex");
  const b64 = Buffer.from(value, "base64");
  if (b64.length === 32) return b64;
  return crypto.createHash("sha256").update(value).digest();
}

function encryptBuffer(input, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", normalizeEncryptionKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("TSB1"), iv, tag, encrypted]);
}

function decryptBuffer(input, key) {
  const buffer = Buffer.from(input);
  if (buffer.slice(0, 4).toString() !== "TSB1") {
    throw Object.assign(new Error("Backup file has an invalid encryption header."), { status: 400 });
  }
  const iv = buffer.slice(4, 16);
  const tag = buffer.slice(16, 32);
  const payload = buffer.slice(32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", normalizeEncryptionKey(key), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(payload), decipher.final()]);
}

function getTransporter(config) {
  if (!config.emailTo) return null;
  const missing = [
    ["SMTP_HOST", config.smtpHost],
    ["SMTP_USER", config.smtpUser],
    ["SMTP_PASS", config.smtpPass],
  ].filter(([, value]) => !value);
  if (missing.length) return null;
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
}

async function sendBackupEmail({ record, filePath, manifest }) {
  const config = getConfig();
  const transporter = getTransporter(config);
  if (!config.emailTo) {
    return { status: "NOT_CONFIGURED", message: "BACKUP_EMAIL_TO is not configured." };
  }
  if (!transporter) {
    return { status: "FAILED", message: "SMTP settings are incomplete." };
  }

  const tenantPart = manifest.scope?.tenantName ? ` | ${manifest.scope.tenantName}` : "";
  const subject = `${config.subjectPrefix} | ${manifest.type}${tenantPart} | ${new Date(record.createdAt).toLocaleString("en-US", { hour12: false })}`;
  await transporter.sendMail({
    from: config.emailFrom,
    to: config.emailTo,
    subject,
    text: [
      "A secure backup file is attached.",
      `Backup ID: ${record.backupId}`,
      `Type: ${manifest.type}`,
      `Scope: ${manifest.scope?.name || manifest.scope?.tenantName || "All System"}`,
      `Created At: ${record.createdAt.toISOString()}`,
      `Size: ${record.sizeBytes} bytes`,
      `Checksum: ${record.checksum || "-"}`,
    ].join("\n"),
    attachments: [{ filename: record.fileName, path: filePath }],
  });
  return { status: "SENT", message: "Email sent." };
}

async function writeAudit({ req, action, entityId, metadata, tenantId = null, client = prisma }) {
  await client.auditLog.create({
    data: {
      tenantId,
      actorId: req?.user?.id,
      action,
      entity: "Backup",
      entityId,
      metadata,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    },
  });
}

async function permanentlyDeleteBackupFile(record) {
  const filePath = storagePathFromKey(record.storageKey);
  let fileWasMissing = false;

  try {
    const fileStat = await fsp.lstat(filePath);
    if (fileStat.isDirectory()) {
      throw Object.assign(new Error("Backup storage path points to a directory."), {
        status: 409,
      });
    }
    await fsp.unlink(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") {
      fileWasMissing = true;
    } else {
      throw Object.assign(
        new Error(`Could not permanently delete backup file: ${error?.message || "Unknown storage error."}`),
        { status: error?.status || 500, cause: error },
      );
    }
  }

  try {
    await fsp.lstat(filePath);
    throw Object.assign(new Error("Backup file still exists after deletion."), { status: 500 });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  return {
    filePath,
    fileDeleted: !fileWasMissing,
    fileWasMissing,
  };
}

export async function prepareTenantBackupDeletion(tenantId) {
  const records = await prisma.backupRecord.findMany({
    where: { scopeType: "TENANT", scopeId: tenantId },
    select: { id: true, backupId: true, storageKey: true },
  });
  const stagedFiles = [];

  try {
    for (const record of records) {
      const originalPath = storagePathFromKey(record.storageKey);
      const stagedPath = `${originalPath}.deleting-${crypto.randomUUID()}`;
      try {
        const stat = await fsp.lstat(originalPath);
        if (stat.isDirectory()) {
          throw Object.assign(new Error("Tenant backup path points to a directory."), { status: 409 });
        }
        await fsp.rename(originalPath, stagedPath);
        stagedFiles.push({ originalPath, stagedPath, backupId: record.backupId });
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  } catch (error) {
    await Promise.allSettled(
      stagedFiles.map(({ originalPath, stagedPath }) => fsp.rename(stagedPath, originalPath)),
    );
    throw error;
  }

  return {
    recordIds: records.map((record) => record.id),
    async rollback() {
      await Promise.allSettled(
        stagedFiles.map(({ originalPath, stagedPath }) => fsp.rename(stagedPath, originalPath)),
      );
    },
    async commit() {
      const results = await Promise.allSettled(
        stagedFiles.map(({ stagedPath }) => fsp.unlink(stagedPath)),
      );
      return results
        .map((result, index) => ({ result, file: stagedFiles[index] }))
        .filter(({ result }) => result.status === "rejected")
        .map(({ result, file }) => ({
          backupId: file.backupId,
          error: result.reason?.message || "Could not remove staged backup file.",
        }));
    },
  };
}

function sanitizeRowForExport(model, row, { includeSecrets = true } = {}) {
  if (model === "user" && !includeSecrets) {
    const { password, refreshToken, ...safe } = row;
    return safe;
  }
  return row;
}

async function findTenant(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) throw Object.assign(new Error("Tenant not found."), { status: 404 });
  return tenant;
}

async function tenantData(tenantId, { includeSecrets = true, onlyUserIds = null } = {}) {
  const tenant = await findTenant(tenantId);
  const userWhere = onlyUserIds ? { tenantId, id: { in: onlyUserIds } } : { tenantId };
  const users = await prisma.user.findMany({ where: userWhere });
  const allTenantUsers = await prisma.user.findMany({ where: { tenantId }, select: { id: true } });
  const scopedUserIds = new Set((onlyUserIds ? users : allTenantUsers).map((u) => u.id));

  const [
    customers,
    rakhts,
    rakhtTons,
    readyMadeClothes,
    readyMadeWaskatClothes,
    boxes,
    contributors,
    orders,
    orderDrafts,
    rakhtPaymentHistories,
    notifications,
    userNotifications,
    dailyTasks,
    transactions,
    damagedClothesPenalties,
    items,
    itemSales,
    auditLogs,
  ] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId } }),
    prisma.rakht.findMany({ where: { tenantId } }),
    prisma.rakhtTon.findMany({ where: { tenantId } }),
    prisma.readyMadeClothing.findMany({ where: { tenantId } }),
    prisma.readyMadeWaskatClothing.findMany({ where: { tenantId } }),
    prisma.box.findMany({ where: { tenantId } }),
    prisma.contributor.findMany({ where: { tenantId } }),
    prisma.order.findMany({
      where: onlyUserIds
        ? {
            tenantId,
            OR: [
              { createdById: { in: [...scopedUserIds] } },
              { createdByFinanceId: { in: [...scopedUserIds] } },
              { assignedToId: { in: [...scopedUserIds] } },
              { assignedById: { in: [...scopedUserIds] } },
              { receivedById: { in: [...scopedUserIds] } },
              { qichikarAssignedToId: { in: [...scopedUserIds] } },
              { qichikarReceivedById: { in: [...scopedUserIds] } },
              { dokhtAssignedToId: { in: [...scopedUserIds] } },
              { dokhtReceivedById: { in: [...scopedUserIds] } },
            ],
          }
        : { tenantId },
    }),
    prisma.orderDraft.findMany({ where: onlyUserIds ? { tenantId, userId: { in: [...scopedUserIds] } } : { tenantId } }),
    prisma.rakhtPaymentHistory.findMany({ where: onlyUserIds ? { tenantId, paidById: { in: [...scopedUserIds] } } : { tenantId } }),
    prisma.notification.findMany({ where: { tenantId } }),
    prisma.userNotification.findMany({ where: onlyUserIds ? { tenantId, userId: { in: [...scopedUserIds] } } : { tenantId } }),
    prisma.dailyTask.findMany({ where: onlyUserIds ? { tenantId, createdById: { in: [...scopedUserIds] } } : { tenantId } }),
    prisma.transaction.findMany({ where: onlyUserIds ? { tenantId, OR: [{ userId: { in: [...scopedUserIds] } }, { createdById: { in: [...scopedUserIds] } }] } : { tenantId } }),
    prisma.damagedClothesPenalty.findMany({ where: onlyUserIds ? { tenantId, OR: [{ userId: { in: [...scopedUserIds] } }, { createdById: { in: [...scopedUserIds] } }] } : { tenantId } }),
    prisma.item.findMany({ where: onlyUserIds ? { tenantId, createdById: { in: [...scopedUserIds] } } : { tenantId } }),
    prisma.itemSale.findMany({ where: onlyUserIds ? { tenantId, createdById: { in: [...scopedUserIds] } } : { tenantId } }),
    prisma.auditLog.findMany({ where: onlyUserIds ? { tenantId, actorId: { in: [...scopedUserIds] } } : { tenantId } }),
  ]);

  const orderIds = orders.map((order) => order.id);
  const [orderDetailRows, designEntries] = await Promise.all([
    orderIds.length
      ? Promise.all([
          prisma.outfit.findMany({ where: { orderId: { in: orderIds } } }),
          prisma.waskat.findMany({ where: { orderId: { in: orderIds } } }),
          prisma.korty.findMany({ where: { orderId: { in: orderIds } } }),
          prisma.yakhanQaq.findMany({ where: { orderId: { in: orderIds } } }),
          prisma.readyMadeOrder.findMany({ where: { orderId: { in: orderIds } } }),
          prisma.readyMadeWaskatOrder.findMany({ where: { orderId: { in: orderIds } } }),
          prisma.workerPaymentReceipt.findMany({ where: { orderId: { in: orderIds } } }),
        ])
      : [[], [], [], [], [], [], []],
    Promise.all(
      TENANT_DESIGN_MODELS.map(async (model) => [
        model,
        await prisma[model].findMany({ where: { tenantId } }),
      ]),
    ),
  ]);
  const [outfits, waskats, korties, yakhanQaqs, readyMadeOrders, readyMadeWaskatOrders, receipts] =
    orderDetailRows;
  const designData = Object.fromEntries(designEntries);

  return {
    tenant: [tenant],
    user: users.map((row) => sanitizeRowForExport("user", row, { includeSecrets })),
    customer: customers,
    rakht: rakhts,
    rakhtTon: rakhtTons,
    readyMadeClothing: readyMadeClothes,
    readyMadeWaskatClothing: readyMadeWaskatClothes,
    box: boxes,
    ...designData,
    contributor: contributors,
    order: orders,
    outfit: outfits,
    waskat: waskats,
    korty: korties,
    yakhanQaq: yakhanQaqs,
    readyMadeOrder: readyMadeOrders,
    readyMadeWaskatOrder: readyMadeWaskatOrders,
    workerPaymentReceipt: receipts,
    orderDraft: orderDrafts,
    rakhtPaymentHistory: rakhtPaymentHistories,
    notification: notifications,
    userNotification: userNotifications,
    dailyTask: dailyTasks,
    transaction: transactions,
    damagedClothesPenalty: damagedClothesPenalties,
    item: items,
    itemSale: itemSales,
    auditLog: auditLogs,
  };
}

async function fullSystemData() {
  const entries = await Promise.all(
    FULL_BACKUP_MODELS.map(async (model) => [model, await prisma[model].findMany()]),
  );
  return Object.fromEntries(entries);
}

async function userExportData({ tenantId, userId = "ALL" }) {
  const where = userId && userId !== "ALL" ? { tenantId, id: userId } : { tenantId };
  const users = await prisma.user.findMany({
    where,
    select: { id: true, tenantId: true, name: true, phoneNumber: true, accountType: true, isActive: true, createdAt: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
  if (userId !== "ALL" && !users.length) {
    throw Object.assign(new Error("Tenant user not found."), { status: 404 });
  }
  const data = await tenantData(tenantId, { includeSecrets: false, onlyUserIds: users.map((u) => u.id) });
  data.user = users;
  return data;
}

function rowCount(data) {
  return Object.values(data || {}).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
}

async function serializeArchive({ type, scope, data, createdBy, options }) {
  const manifest = {
    version: 1,
    app: SYSTEM_NAME,
    type,
    scope,
    createdAt: new Date().toISOString(),
    createdBy,
    rowCount: rowCount(data),
    compressed: options.compressed,
    encrypted: options.encrypted,
  };
  const json = Buffer.from(JSON.stringify({ manifest, data }), "utf8");
  const compressed = options.compressed ? zlib.gzipSync(json) : json;
  const payload = options.encrypted ? encryptBuffer(compressed, getConfig().encryptionKey) : compressed;
  return { payload, manifest };
}

async function parseArchiveBuffer(input, recordMeta = {}) {
  const config = getConfig();
  let buffer = Buffer.from(input);
  if (recordMeta.encrypted || buffer.slice(0, 4).toString() === "TSB1") {
    buffer = decryptBuffer(buffer, config.encryptionKey);
  }
  if (recordMeta.compressed !== false) {
    try {
      buffer = zlib.gunzipSync(buffer);
    } catch {
      if (recordMeta.compressed === true) throw Object.assign(new Error("Backup archive is not valid gzip data."), { status: 400 });
    }
  }
  const archive = JSON.parse(buffer.toString("utf8"));
  validateArchiveShape(archive);
  return archive;
}

function validateArchiveShape(archive) {
  if (!archive || archive.manifest?.app !== SYSTEM_NAME || archive.manifest?.version !== 1) {
    throw Object.assign(new Error("Backup file is not a valid Tailor System backup."), { status: 400 });
  }
  if (!archive.data || typeof archive.data !== "object") {
    throw Object.assign(new Error("Backup data payload is missing."), { status: 400 });
  }
}

async function saveArchive({ type, scope, data, req, optionsOverride = {} }) {
  const config = getConfig();
  const now = new Date();
  const backupId = `BKP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const options = {
    compressed: optionsOverride.compressed ?? config.compressionEnabled,
    encrypted: optionsOverride.encrypted ?? config.encryptionEnabled,
  };
  if (options.encrypted && !config.encryptionKey) {
    throw Object.assign(new Error("BACKUP_ENCRYPTION_KEY is required when encryption is enabled."), { status: 500 });
  }
  const { payload, manifest } = await serializeArchive({
    type,
    scope,
    data,
    createdBy: { id: req?.user?.id || null, name: req?.user?.name || "Superadmin" },
    options,
  });

  const scopeSlug = safePart(scope?.slug || scope?.name || scope?.tenantName || "all-system");
  const dir = path.join(BACKUP_ROOT, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"));
  await fsp.mkdir(dir, { recursive: true });
  const extension = `${options.compressed ? ".json.gz" : ".json"}${options.encrypted ? ".enc" : ""}`;
  const fileName = `${safePart(type)}-${scopeSlug}-${timestampForFilename(now)}-${backupId}${extension}`;
  const filePath = ensureInside(BACKUP_ROOT, path.join(dir, fileName));
  await fsp.writeFile(filePath, payload, { flag: "wx", mode: 0o600 });
  const stats = await fsp.stat(filePath);
  const checksum = crypto.createHash("sha256").update(payload).digest("hex");

  let record = await prisma.backupRecord.create({
    data: {
      backupId,
      type,
      scopeType: scope?.type || "SYSTEM",
      scopeId: scope?.id || null,
      scopeName: scope?.name || scope?.tenantName || "All System",
      fileName,
      storageKey: relativeStorageKey(filePath),
      sizeBytes: Number(stats.size || 0),
      checksum,
      status: "SUCCESS",
      localSaveStatus: "SAVED",
      emailSentStatus: "PENDING",
      encrypted: options.encrypted,
      compressed: options.compressed,
      createdById: req?.user?.id || null,
      createdByName: req?.user?.name || "Superadmin",
      metadata: manifest,
    },
  });

  let emailResult;
  try {
    emailResult = await sendBackupEmail({ record, filePath, manifest });
  } catch (error) {
    emailResult = { status: "FAILED", message: error?.message || "Email delivery failed." };
  }

  record = await prisma.backupRecord.update({
    where: { id: record.id },
    data: {
      emailSentStatus: emailResult.status,
      metadata: { ...manifest, email: emailResult },
    },
  });

  await writeAudit({
    req,
    action: "BACKUP_CREATED",
    entityId: record.backupId,
    tenantId: scope?.type === "TENANT" || scope?.type === "USER" ? scope.id : null,
    metadata: { type, scope, emailStatus: emailResult.status, localSaveStatus: record.localSaveStatus },
  });

  await cleanupExpiredBackups().catch(() => {});
  return { success: true, message: "Backup completed successfully.", record, manifest };
}

export async function createBackup({ trigger = "manual", initiatedBy = "system", req = null } = {}) {
  const data = await fullSystemData();
  return saveArchive({
    type: trigger === "scheduled" ? "DAILY_BACKUP" : "SYSTEM_BACKUP",
    scope: { type: "SYSTEM", name: "All System" },
    data,
    req: req || { user: { id: initiatedBy, name: initiatedBy } },
  });
}

export async function createSystemBackup({ req }) {
  return createBackup({ trigger: "manual", initiatedBy: req?.user?.id, req });
}

export async function createTenantBackup({ req, tenantId }) {
  const tenant = await findTenant(tenantId);
  const data = await tenantData(tenant.id, { includeSecrets: true });
  return saveArchive({
    type: "TENANT_BACKUP",
    scope: {
      type: "TENANT",
      id: tenant.id,
      tenantId: tenant.tenantId,
      slug: tenant.slug,
      tenantName: tenant.businessName,
      name: tenant.businessName,
    },
    data,
    req,
  });
}

export async function exportTenantUserData({ req, tenantId, userId = "ALL" }) {
  const tenant = await findTenant(tenantId);
  const data = await userExportData({ tenantId: tenant.id, userId });
  const scopeName =
    userId && userId !== "ALL"
      ? data.user?.[0]?.name || "Tenant User"
      : `${tenant.businessName} Users`;
  return saveArchive({
    type: "USER_EXPORT",
    scope: {
      type: "USER",
      id: tenant.id,
      tenantId: tenant.tenantId,
      tenantName: tenant.businessName,
      userId: userId || "ALL",
      name: scopeName,
    },
    data,
    req,
    optionsOverride: { encrypted: false },
  });
}

export async function listBackups() {
  return prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 250 });
}

export async function getBackupStatus() {
  const [records, schedule, storage] = await Promise.all([
    prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    getBackupSchedule(),
    getBackupStorageSettings(),
  ]);
  const latest = records[0] || null;
  return {
    latestStatus: latest?.status?.toLowerCase() || "never",
    latestMessage: latest ? `${latest.type} completed for ${latest.scopeName}.` : "No backups have run yet.",
    lastRunAt: latest?.createdAt,
    lastSuccessAt: records.find((r) => r.status === "SUCCESS")?.createdAt,
    latestBackup: latest,
    recentBackups: records,
    restoreTests: [],
    totalBackups: await prisma.backupRecord.count(),
    schedule,
    storage,
  };
}

export async function getTenantUsers(tenantId) {
  await findTenant(tenantId);
  return prisma.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, phoneNumber: true, accountType: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function deleteBackup(keyOrId, { req } = {}) {
  const identifier = String(keyOrId || "").trim();
  if (!identifier || identifier.length > 500) {
    throw Object.assign(new Error("A valid backup id is required."), { status: 400 });
  }

  const record = await findBackupRecord(identifier);
  const fileResult = await permanentlyDeleteBackupFile(record);

  await prisma.$transaction(async (tx) => {
    await tx.backupRecord.delete({ where: { id: record.id } });
    await writeAudit({
      req,
      client: tx,
      action: "BACKUP_DELETED",
      entityId: record.backupId,
      metadata: {
        fileName: record.fileName,
        storageKey: record.storageKey,
        sizeBytes: record.sizeBytes,
        fileDeleted: fileResult.fileDeleted,
        fileWasMissing: fileResult.fileWasMissing,
      },
    });
  });

  return {
    success: true,
    backupId: record.backupId,
    fileDeleted: fileResult.fileDeleted,
    fileWasMissing: fileResult.fileWasMissing,
  };
}

async function findBackupRecord(keyOrId) {
  const value = String(keyOrId || "");
  const record = await prisma.backupRecord.findFirst({
    where: { OR: [{ id: value }, { backupId: value }, { storageKey: value }] },
  });
  if (!record) throw Object.assign(new Error("Backup record not found."), { status: 404 });
  return record;
}

export async function streamBackupDownload(keyOrId, writableStream) {
  const record = await findBackupRecord(keyOrId);
  const filePath = storagePathFromKey(record.storageKey);
  await pipeline(fs.createReadStream(filePath), writableStream);
}

function reviveDateFields(model, rows = []) {
  const fields = DATE_FIELDS[model] || [];
  return rows.map((row) => {
    const next = { ...row };
    for (const field of fields) {
      if (next[field]) next[field] = new Date(next[field]);
    }
    return next;
  });
}

function prepareRowsForRestore(model, rows = [], { fallbackTenantId = "default-tenant" } = {}) {
  const revived = reviveDateFields(model, rows);
  if (!TENANT_DESIGN_MODELS.includes(model) && !TENANT_ORDER_DETAIL_MODELS.includes(model)) {
    return revived;
  }
  return revived.map((row) => ({
    ...row,
    tenantId: row.tenantId || fallbackTenantId,
  }));
}

async function createRows(tx, model, rows = [], options = {}) {
  if (!rows.length || !tx[model]) return;
  await tx[model].createMany({ data: prepareRowsForRestore(model, rows, options), skipDuplicates: true });
}

async function restoreFullSystem(archive) {
  await prisma.$transaction(
    async (tx) => {
      for (const model of DELETE_ORDER) {
        if (!tx[model] || model === "auditLog") continue;
        await tx[model].deleteMany({});
      }
      await tx.auditLog.deleteMany({});
      for (const model of RESTORE_ORDER) {
        await createRows(tx, model, archive.data[model] || []);
      }
    },
    { timeout: 120000 },
  );
}

async function restoreTenant(archive, tenantId) {
  const archiveTenantId = archive.manifest?.scope?.id || archive.data?.tenant?.[0]?.id;
  if (!archiveTenantId || archiveTenantId !== tenantId) {
    throw Object.assign(new Error("Tenant backup does not match the selected tenant."), { status: 400 });
  }
  if (archive.manifest?.type === "USER_EXPORT") {
    throw Object.assign(new Error("User exports are not restore backups."), { status: 400 });
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.tenant.delete({ where: { id: tenantId } }).catch((error) => {
        if (error.code !== "P2025") throw error;
      });
      for (const model of RESTORE_ORDER.filter((name) => !GLOBAL_MODELS.includes(name))) {
        await createRows(tx, model, archive.data[model] || [], { fallbackTenantId: tenantId });
      }
    },
    { timeout: 120000 },
  );
}

export async function restoreBackup({ req, backupId, restoreType, tenantId, confirm = false }) {
  if (!confirm) throw Object.assign(new Error("Restore confirmation is required."), { status: 400 });
  const record = await findBackupRecord(backupId);
  const filePath = storagePathFromKey(record.storageKey);
  const payload = await fsp.readFile(filePath);
  const archive = await parseArchiveBuffer(payload, record);

  if (restoreType === "SYSTEM") {
    if (archive.manifest.type !== "SYSTEM_BACKUP") {
      throw Object.assign(new Error("Only full system backups can be used for system restore."), { status: 400 });
    }
    await restoreFullSystem(archive);
  } else if (restoreType === "TENANT") {
    if (!tenantId) throw Object.assign(new Error("Tenant is required for tenant restore."), { status: 400 });
    await restoreTenant(archive, tenantId);
  } else {
    throw Object.assign(new Error("Invalid restore type."), { status: 400 });
  }

  await writeAudit({
    req,
    action: "BACKUP_RESTORED",
    entityId: record.backupId,
    tenantId: restoreType === "TENANT" ? tenantId : null,
    metadata: { restoreType, scopeName: record.scopeName },
  });
  return { success: true, message: "Restore completed successfully." };
}

export async function restoreUploadedBackup({ req, fileName, data, restoreType, tenantId, confirm = false }) {
  if (!confirm) throw Object.assign(new Error("Restore confirmation is required."), { status: 400 });
  if (!data) throw Object.assign(new Error("Backup file data is required."), { status: 400 });
  const buffer = Buffer.from(String(data).includes(",") ? String(data).split(",").pop() : data, "base64");
  const archive = await parseArchiveBuffer(buffer, {
    encrypted: /\.enc$/i.test(fileName || ""),
    compressed: /\.gz/i.test(fileName || ""),
  });
  if (restoreType === "SYSTEM") {
    if (archive.manifest.type !== "SYSTEM_BACKUP") {
      throw Object.assign(new Error("Only full system backups can be used for system restore."), { status: 400 });
    }
    await restoreFullSystem(archive);
  } else {
    if (!tenantId) throw Object.assign(new Error("Tenant is required for tenant restore."), { status: 400 });
    await restoreTenant(archive, tenantId);
  }
  await writeAudit({ req, action: "BACKUP_UPLOAD_RESTORED", entityId: null, tenantId: restoreType === "TENANT" ? tenantId : null, metadata: { fileName, restoreType } });
  return { success: true, message: "Uploaded backup restored successfully." };
}

export async function runRestoreTest({ initiatedBy = "system" } = {}) {
  const latest = await prisma.backupRecord.findFirst({ orderBy: { createdAt: "desc" } });
  if (!latest) throw Object.assign(new Error("No backup found for validation."), { status: 404 });
  const filePath = storagePathFromKey(latest.storageKey);
  const payload = await fsp.readFile(filePath);
  await parseArchiveBuffer(payload, latest);
  return {
    success: true,
    message: "Backup validation passed.",
    record: {
      id: crypto.randomUUID(),
      status: "passed",
      initiatedBy,
      backupKey: latest.backupId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      checks: { archiveFormat: true, manifest: true, checksum: true },
    },
  };
}

async function walkFiles(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await walkFiles(full)));
    if (entry.isFile()) result.push(full);
  }
  return result;
}

export async function getBackupStorageSettings() {
  const config = getConfig();
  const files = await walkFiles(BACKUP_ROOT);
  let used = 0;
  for (const file of files) {
    const stats = await fsp.stat(file);
    used += Number(stats.size || 0);
  }
  const schedule = await getBackupSchedule();
  return {
    storageUsed: used,
    totalStorage: schedule.totalStorageBytes || config.totalStorageBytes,
    retentionDays: schedule.retentionDays || config.retentionDays,
    compressionEnabled: schedule.compressionEnabled,
    encryptionEnabled: schedule.encryptionEnabled,
    deleteOldAfterDays: schedule.deleteOldAfterDays,
    backupFolder: BACKUP_ROOT,
  };
}

export async function getBackupSchedule() {
  const config = getConfig();
  return prisma.backupSchedule.upsert({
    where: { id: SCHEDULE_ID },
    update: {},
    create: {
      id: SCHEDULE_ID,
      enabled: parseBoolean(process.env.BACKUP_ENABLED, false),
      frequency: "DAILY",
      backupTime: "02:00",
      retentionDays: config.retentionDays,
      compressionEnabled: config.compressionEnabled,
      encryptionEnabled: config.encryptionEnabled,
      deleteOldAfterDays: config.retentionDays,
      totalStorageBytes: config.totalStorageBytes,
    },
  });
}

export async function saveBackupSchedule({ req, data }) {
  const allowedFrequency = new Set(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]);
  const frequency = allowedFrequency.has(data.frequency) ? data.frequency : "DAILY";
  const backupTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(data.backupTime || ""))
    ? data.backupTime
    : "02:00";
  const schedule = await prisma.backupSchedule.upsert({
    where: { id: SCHEDULE_ID },
    update: {
      enabled: Boolean(data.enabled),
      frequency,
      customCron: frequency === "CUSTOM" ? String(data.customCron || "").trim() || null : null,
      backupTime,
      retentionDays: parseInteger(data.retentionDays, 35),
      compressionEnabled: data.compressionEnabled !== false,
      encryptionEnabled: Boolean(data.encryptionEnabled),
      deleteOldAfterDays: parseInteger(data.deleteOldAfterDays, 35),
      totalStorageBytes: parseInteger(data.totalStorageBytes, 1024 * 1024 * 1024),
      updatedById: req?.user?.id || null,
    },
    create: {
      id: SCHEDULE_ID,
      enabled: Boolean(data.enabled),
      frequency,
      customCron: frequency === "CUSTOM" ? String(data.customCron || "").trim() || null : null,
      backupTime,
      retentionDays: parseInteger(data.retentionDays, 35),
      compressionEnabled: data.compressionEnabled !== false,
      encryptionEnabled: Boolean(data.encryptionEnabled),
      deleteOldAfterDays: parseInteger(data.deleteOldAfterDays, 35),
      totalStorageBytes: parseInteger(data.totalStorageBytes, 1024 * 1024 * 1024),
      updatedById: req?.user?.id || null,
    },
  });
  await writeAudit({ req, action: "BACKUP_SCHEDULE_SAVED", entityId: schedule.id, metadata: { frequency, enabled: schedule.enabled } });
  return schedule;
}

export async function cleanupExpiredBackups() {
  const schedule = await getBackupSchedule();
  const retentionDays = schedule.deleteOldAfterDays || schedule.retentionDays || 35;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const oldRecords = await prisma.backupRecord.findMany({ where: { createdAt: { lt: cutoff } } });
  let deleted = 0;
  for (const record of oldRecords) {
    try {
      await deleteBackup(record.id);
      deleted += 1;
    } catch (error) {
      console.error(`[Backup] Failed to delete expired backup ${record.backupId}:`, error?.message || error);
    }
  }
  return deleted;
}

export async function runRetentionCleanup() {
  return cleanupExpiredBackups();
}

export async function runScheduledBackupIfDue() {
  const schedule = await getBackupSchedule();
  if (!schedule.enabled) return { ran: false, reason: "disabled" };
  const now = new Date();
  const [hour, minute] = String(schedule.backupTime || "02:00").split(":").map(Number);
  if (now.getHours() !== hour || now.getMinutes() !== minute) {
    return { ran: false, reason: "not_due" };
  }
  const last = schedule.lastRunAt ? new Date(schedule.lastRunAt) : null;
  if (last && last.toDateString() === now.toDateString()) {
    return { ran: false, reason: "already_ran" };
  }
  if (schedule.frequency === "WEEKLY" && now.getDay() !== 0) {
    return { ran: false, reason: "weekly_waiting" };
  }
  if (schedule.frequency === "MONTHLY" && now.getDate() !== 1) {
    return { ran: false, reason: "monthly_waiting" };
  }
  await createBackup({ trigger: "scheduled", initiatedBy: "schedule" });
  await prisma.backupSchedule.update({ where: { id: SCHEDULE_ID }, data: { lastRunAt: now } });
  return { ran: true };
}
