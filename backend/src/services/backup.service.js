import { spawn, execFileSync } from "child_process";
import crypto from "crypto";
import { google } from "googleapis";
import nodemailer from "nodemailer";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const BACKUP_STATE_DIR = path.resolve(process.cwd(), "storage", "backup");
const BACKUP_STATE_FILE = path.join(BACKUP_STATE_DIR, "backup-state.json");
const TEMP_BACKUP_DIR = path.resolve(process.cwd(), "tmp", "backups");
const RESTORE_TEST_RETENTION_MS = 48 * 60 * 60 * 1000;
const EMAIL_ARCHIVE_DIR = path.resolve(
  process.cwd(),
  "storage",
  "backup",
  "email-archive",
);
const SYSTEM_NAME = "tailor";
const SERVICE_DIR = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(SERVICE_DIR, "..", "..");

function logInfo(message, extra = "") {
  console.log(`[Backup] ${message}${extra ? ` ${extra}` : ""}`);
}

function logError(message, err) {
  const safeMessage = err?.message || "Unknown error";
  console.error(`[Backup] ${message}: ${safeMessage}`);
}

function parseBoolean(value, defaultValue = false) {
  if (value == null) return defaultValue;
  return String(value).toLowerCase() === "true";
}

function parseInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ensureDir(dirPath) {
  return fsp.mkdir(dirPath, { recursive: true });
}

function timestampForFilename(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}-${h}-${mm}`;
}

function maskSensitiveError(error) {
  if (!error) return "Unknown error";
  return String(error.message || error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgresql://***")
    .replace(/password=[^\s]+/gi, "password=***");
}

function mapStorageError(error, config) {
  const raw = String(error?.message || error || "Unknown error");

  if (config?.storageProvider === "r2") {
    if (
      /sslv3 alert handshake failure|write eproto|certificate|tls/i.test(raw)
    ) {
      return new Error(
        "Cloudflare R2 connection failed (TLS handshake). Verify BACKUP_ENDPOINT format is https://<ACCOUNT_ID>.r2.cloudflarestorage.com and that ACCOUNT_ID is correct.",
      );
    }

    if (
      /invalidaccesskeyid|signaturedoesnotmatch|accessdenied|forbidden/i.test(
        raw,
      )
    ) {
      return new Error(
        "Cloudflare R2 authentication failed. Verify BACKUP_ACCESS_KEY_ID, BACKUP_SECRET_ACCESS_KEY, bucket permissions, and BACKUP_BUCKET_NAME.",
      );
    }
  }

  return error;
}

function getConfig() {
  const requestedProvider = process.env.BACKUP_STORAGE_PROVIDER;
  const hasGoogleAliases = Boolean(
    process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_PATH ||
    process.env.GOOGLE_OAUTH_TOKEN_PATH,
  );
  const storageProvider = (
    requestedProvider || (hasGoogleAliases ? "gdrive" : "s3")
  ).toLowerCase();
  return {
    enabled: parseBoolean(process.env.BACKUP_ENABLED, true),
    cron: process.env.BACKUP_CRON || "0 2 * * *",
    timezone: process.env.BACKUP_TIMEZONE || "Asia/Kabul",
    envName: process.env.NODE_ENV || "development",
    databaseUrl: process.env.BACKUP_DATABASE_URL || process.env.DATABASE_URL,
    stagingDatabaseUrl: process.env.STAGING_DATABASE_URL,
    storageProvider,
    bucketName: process.env.BACKUP_BUCKET_NAME,
    region: process.env.BACKUP_REGION || "auto",
    accessKeyId: process.env.BACKUP_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKUP_SECRET_ACCESS_KEY,
    endpoint: process.env.BACKUP_ENDPOINT,
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
    dailyDays: parseInteger(process.env.BACKUP_RETENTION_DAILY_DAYS, 35),
    weeklyDays: parseInteger(process.env.BACKUP_RETENTION_WEEKLY_DAYS, 90),
    monthlyDays: parseInteger(process.env.BACKUP_RETENTION_MONTHLY_DAYS, 365),
    healthcheckUrl:
      process.env.BACKUP_HEALTHCHECK_URL ||
      `http://localhost:${process.env.PORT || 8000}/api/health`,
    gdriveAuthMode: (
      process.env.BACKUP_GDRIVE_AUTH_MODE || "oauth"
    ).toLowerCase(),
    gdriveFolderId:
      process.env.BACKUP_GDRIVE_FOLDER_ID ||
      process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID,
    gdriveClientEmail: process.env.BACKUP_GDRIVE_CLIENT_EMAIL,
    gdrivePrivateKey: process.env.BACKUP_GDRIVE_PRIVATE_KEY,
    gdriveOauthClientPath: process.env.GOOGLE_OAUTH_CLIENT_PATH,
    gdriveOauthTokenPath: process.env.GOOGLE_OAUTH_TOKEN_PATH,
    backupEmailTo: process.env.BACKUP_EMAIL_TO,
    backupEmailCc: process.env.BACKUP_EMAIL_CC,
    backupEmailBcc: process.env.BACKUP_EMAIL_BCC,
    backupEmailFrom: process.env.BACKUP_EMAIL_FROM,
    backupEmailSubjectPrefix:
      process.env.BACKUP_EMAIL_SUBJECT_PREFIX || "Tailor Backup",
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInteger(process.env.SMTP_PORT, 587),
    smtpSecure: parseBoolean(process.env.SMTP_SECURE, false),
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    emailArchiveEnabled: parseBoolean(
      process.env.BACKUP_EMAIL_ARCHIVE_ENABLED,
      true,
    ),
  };
}

function assertConfigured(config) {
  if (!config.enabled) {
    throw Object.assign(new Error("Backup system is disabled."), {
      status: 400,
    });
  }
  if (!config.databaseUrl) {
    throw Object.assign(
      new Error("BACKUP_DATABASE_URL or DATABASE_URL is required."),
      { status: 500 },
    );
  }
  if (!["s3", "r2", "gdrive", "email"].includes(config.storageProvider)) {
    throw Object.assign(
      new Error("BACKUP_STORAGE_PROVIDER must be s3, r2, gdrive, or email."),
      { status: 500 },
    );
  }
  if (!config.encryptionKey) {
    throw Object.assign(
      new Error("BACKUP_ENCRYPTION_KEY is required for backup operations."),
      { status: 500 },
    );
  }
  if (config.storageProvider === "email") {
    const required = [
      ["BACKUP_EMAIL_TO", config.backupEmailTo],
      ["SMTP_HOST", config.smtpHost],
      ["SMTP_PORT", config.smtpPort],
      ["SMTP_USER", config.smtpUser],
      ["SMTP_PASS", config.smtpPass],
    ];
    for (const [name, value] of required) {
      if (!value) {
        throw Object.assign(
          new Error(`${name} is required for email backup operations.`),
          { status: 500 },
        );
      }
    }
  } else if (config.storageProvider === "gdrive") {
    if (!["oauth", "service_account", "auto"].includes(config.gdriveAuthMode)) {
      throw Object.assign(
        new Error(
          "BACKUP_GDRIVE_AUTH_MODE must be oauth, service_account, or auto.",
        ),
        { status: 500 },
      );
    }

    if (!config.gdriveFolderId) {
      throw Object.assign(
        new Error(
          "BACKUP_GDRIVE_FOLDER_ID or GOOGLE_DRIVE_BACKUP_FOLDER_ID is required for Google Drive backup.",
        ),
        { status: 500 },
      );
    }

    const hasServiceAccountAuth =
      Boolean(config.gdriveClientEmail) && Boolean(config.gdrivePrivateKey);
    const hasOauthAuth =
      Boolean(config.gdriveOauthClientPath) &&
      Boolean(config.gdriveOauthTokenPath);

    if (!hasServiceAccountAuth && !hasOauthAuth) {
      throw Object.assign(
        new Error(
          "Set either BACKUP_GDRIVE_CLIENT_EMAIL + BACKUP_GDRIVE_PRIVATE_KEY or GOOGLE_OAUTH_CLIENT_PATH + GOOGLE_OAUTH_TOKEN_PATH for Google Drive backup.",
        ),
        { status: 500 },
      );
    }
  } else {
    const required = [
      ["BACKUP_BUCKET_NAME", config.bucketName],
      ["BACKUP_ACCESS_KEY_ID", config.accessKeyId],
      ["BACKUP_SECRET_ACCESS_KEY", config.secretAccessKey],
    ];
    for (const [name, value] of required) {
      if (!value) {
        throw Object.assign(
          new Error(`${name} is required for backup operations.`),
          { status: 500 },
        );
      }
    }
  }
}

function buildEmailArchiveKey(category, filename, createdAt = new Date()) {
  const year = String(createdAt.getFullYear());
  const month = String(createdAt.getMonth() + 1).padStart(2, "0");
  return `email/${category}/${year}/${month}/${filename}.enc`;
}

function resolveEmailArchivePath(key) {
  const normalized = String(key || "")
    .replace(/^email\//, "")
    .replace(/\.\./g, "");
  return path.join(EMAIL_ARCHIVE_DIR, normalized);
}

function parseCsvEmails(value) {
  if (!value) return undefined;
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function getEmailTransporter(config) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

async function sendBackupEmail({
  config,
  trigger,
  categories,
  filename,
  encryptedPath,
  encryptedSize,
}) {
  const transporter = getEmailTransporter(config);
  const createdAt = new Date().toISOString();
  const subject = `${config.backupEmailSubjectPrefix} | ${config.envName} | ${categories.join(",")}`;
  const to = parseCsvEmails(config.backupEmailTo);
  const cc = parseCsvEmails(config.backupEmailCc);
  const bcc = parseCsvEmails(config.backupEmailBcc);

  const from = config.backupEmailFrom || config.smtpUser;
  await transporter.sendMail({
    from,
    to,
    cc,
    bcc,
    subject,
    text: [
      "Automated encrypted database backup attached.",
      `Environment: ${config.envName}`,
      `Trigger: ${trigger}`,
      `Categories: ${categories.join(", ")}`,
      `CreatedAt: ${createdAt}`,
      `File: ${filename}.enc`,
      `Size(bytes): ${encryptedSize}`,
    ].join("\n"),
    attachments: [
      {
        filename: `${filename}.enc`,
        path: encryptedPath,
        contentType: "application/octet-stream",
      },
    ],
  });
}

async function saveEmailArchive({ sourcePath, archiveKey }) {
  const archivePath = resolveEmailArchivePath(archiveKey);
  await ensureDir(path.dirname(archivePath));
  await fsp.copyFile(sourcePath, archivePath);
  const stats = await fsp.stat(archivePath);
  return Number(stats.size || 0);
}

async function listEmailArchives() {
  const results = [];
  const categories = ["daily", "weekly", "monthly", "manual"];

  for (const type of categories) {
    const baseDir = path.join(EMAIL_ARCHIVE_DIR, type);
    if (!fs.existsSync(baseDir)) continue;

    const years = await fsp.readdir(baseDir, { withFileTypes: true });
    for (const year of years) {
      if (!year.isDirectory()) continue;
      const yearDir = path.join(baseDir, year.name);
      const months = await fsp.readdir(yearDir, { withFileTypes: true });
      for (const month of months) {
        if (!month.isDirectory()) continue;
        const monthDir = path.join(yearDir, month.name);
        const files = await fsp.readdir(monthDir, { withFileTypes: true });
        for (const file of files) {
          if (!file.isFile() || !file.name.endsWith(".enc")) continue;
          const archivePath = path.join(monthDir, file.name);
          const stats = await fsp.stat(archivePath);
          results.push({
            key: `email/${type}/${year.name}/${month.name}/${file.name}`,
            filename: file.name,
            type,
            size: Number(stats.size || 0),
            createdAt: stats.mtime?.toISOString() || null,
            status: "emailed",
            encrypted: true,
          });
        }
      }
    }
  }

  return results.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );
}

async function deleteEmailArchive(key) {
  const archivePath = resolveEmailArchivePath(key);
  await fsp.unlink(archivePath);
}

async function streamEmailArchiveDownload(key, writableStream) {
  const archivePath = resolveEmailArchivePath(key);
  await pipeline(fs.createReadStream(archivePath), writableStream);
}

async function copyEmailArchiveToPath(key, destinationPath) {
  const archivePath = resolveEmailArchivePath(key);
  await ensureDir(path.dirname(destinationPath));
  await pipeline(
    fs.createReadStream(archivePath),
    fs.createWriteStream(destinationPath),
  );
}

function normalizeEncryptionKey(raw) {
  if (!raw) throw new Error("BACKUP_ENCRYPTION_KEY is required");

  const trimmed = String(raw).trim();

  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  try {
    const b64 = Buffer.from(trimmed, "base64");
    if (b64.length === 32) return b64;
  } catch {
    // ignore and hash fallback
  }

  return crypto.createHash("sha256").update(trimmed).digest();
}

function buildBackupFilename(envName, timestamp) {
  return `${SYSTEM_NAME}-backup-${envName}-${timestamp}.dump`;
}

function getBackupCategories(trigger, now = new Date()) {
  if (trigger === "manual") return ["manual"];

  const categories = ["daily"];
  if (now.getDay() === 0) categories.push("weekly");
  if (now.getDate() === 1) categories.push("monthly");
  return categories;
}

function buildStorageKey(category, filename, createdAt = new Date()) {
  const year = String(createdAt.getFullYear());
  const month = String(createdAt.getMonth() + 1).padStart(2, "0");
  return `backups/${category}/${year}/${month}/${filename}.enc`;
}

function getS3Client(config) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

// ─── Google Drive helpers ────────────────────────────────────────────────────

function getGDriveClient(config) {
  const hasServiceAccountAuth =
    Boolean(config.gdriveClientEmail) && Boolean(config.gdrivePrivateKey);
  const hasOauthAuth =
    Boolean(config.gdriveOauthClientPath) &&
    Boolean(config.gdriveOauthTokenPath);
  const authMode = config.gdriveAuthMode || "oauth";

  if (authMode === "service_account") {
    if (!hasServiceAccountAuth) {
      throw new Error(
        "BACKUP_GDRIVE_AUTH_MODE=service_account requires BACKUP_GDRIVE_CLIENT_EMAIL and BACKUP_GDRIVE_PRIVATE_KEY.",
      );
    }
    const rawKey = String(config.gdrivePrivateKey || "");
    const privateKey = rawKey.includes("\\n")
      ? rawKey.replace(/\\n/g, "\n")
      : rawKey;
    const auth = new google.auth.JWT({
      email: config.gdriveClientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return google.drive({ version: "v3", auth });
  }

  // OAuth mode (default): require OAuth files and token for predictable behavior.
  if (authMode === "oauth") {
    if (!hasOauthAuth) {
      throw new Error(
        "OAuth mode requires GOOGLE_OAUTH_CLIENT_PATH and GOOGLE_OAUTH_TOKEN_PATH. Run: npm run backup:gdrive-oauth",
      );
    }

    const clientPath = path.resolve(
      process.cwd(),
      config.gdriveOauthClientPath,
    );
    const tokenPath = path.resolve(process.cwd(), config.gdriveOauthTokenPath);

    if (!fs.existsSync(clientPath) || !fs.existsSync(tokenPath)) {
      throw new Error(
        `OAuth files missing. client=${clientPath}, token=${tokenPath}. Run: npm run backup:gdrive-oauth`,
      );
    }

    const clientRaw = fs.readFileSync(clientPath, "utf8");
    const tokenRaw = fs.readFileSync(tokenPath, "utf8");
    const clientJson = JSON.parse(clientRaw);
    const tokenJson = JSON.parse(tokenRaw);

    const oauthClient = clientJson.installed || clientJson.web || clientJson;
    const clientId = oauthClient.client_id;
    const clientSecret = oauthClient.client_secret;
    const redirectUri = Array.isArray(oauthClient.redirect_uris)
      ? oauthClient.redirect_uris[0]
      : oauthClient.redirect_uri;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Google OAuth client file is missing client_id, client_secret, or redirect URI.",
      );
    }

    const refreshToken = tokenJson.refresh_token;
    if (!refreshToken) {
      throw new Error(
        "OAuth token file has no refresh_token. Re-run: npm run backup:gdrive-oauth",
      );
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    auth.setCredentials({
      refresh_token: refreshToken,
      access_token: tokenJson.access_token,
      expiry_date: tokenJson.expiry_date,
      token_type: tokenJson.token_type,
      scope: tokenJson.scope,
    });
    return google.drive({ version: "v3", auth });
  }

  // auto mode: try OAuth first, then service account.
  if (hasOauthAuth) {
    const clientPath = path.resolve(
      process.cwd(),
      config.gdriveOauthClientPath,
    );
    const tokenPath = path.resolve(process.cwd(), config.gdriveOauthTokenPath);

    if (fs.existsSync(clientPath) && fs.existsSync(tokenPath)) {
      const clientRaw = fs.readFileSync(clientPath, "utf8");
      const tokenRaw = fs.readFileSync(tokenPath, "utf8");
      const clientJson = JSON.parse(clientRaw);
      const tokenJson = JSON.parse(tokenRaw);

      const oauthClient = clientJson.installed || clientJson.web || clientJson;
      const clientId = oauthClient.client_id;
      const clientSecret = oauthClient.client_secret;
      const redirectUri = Array.isArray(oauthClient.redirect_uris)
        ? oauthClient.redirect_uris[0]
        : oauthClient.redirect_uri;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
          "Google OAuth client file is missing client_id, client_secret, or redirect URI.",
        );
      }

      const refreshToken = tokenJson.refresh_token;
      if (refreshToken) {
        const auth = new google.auth.OAuth2(
          clientId,
          clientSecret,
          redirectUri,
        );
        auth.setCredentials({
          refresh_token: refreshToken,
          access_token: tokenJson.access_token,
          expiry_date: tokenJson.expiry_date,
          token_type: tokenJson.token_type,
          scope: tokenJson.scope,
        });
        return google.drive({ version: "v3", auth });
      }
      // Token file exists but has no refresh_token — fall through to service account
    }
    // Token file(s) missing — fall through to service account if available
  }

  if (hasServiceAccountAuth) {
    // .env stores \n as literal \n — normalize to real newlines
    const rawKey = String(config.gdrivePrivateKey || "");
    const privateKey = rawKey.includes("\\n")
      ? rawKey.replace(/\\n/g, "\n")
      : rawKey;
    const auth = new google.auth.JWT({
      email: config.gdriveClientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return google.drive({ version: "v3", auth });
  }

  throw new Error("Google Drive auth is not configured.");
}

function mapGoogleDriveError(error, config) {
  const raw = String(error?.message || error || "Unknown Google Drive error");
  if (/service accounts do not have storage quota/i.test(raw)) {
    if ((config.gdriveAuthMode || "oauth") === "service_account") {
      return new Error(
        "Google Drive upload failed: service accounts need a Shared Drive. Add BACKUP_GDRIVE_CLIENT_EMAIL as Content manager on a Shared Drive, set BACKUP_GDRIVE_FOLDER_ID to a folder inside that Shared Drive, then retry.",
      );
    }
    return new Error(
      `Google Drive upload failed: service account quota limitation. Use OAuth user tokens by setting BACKUP_GDRIVE_AUTH_MODE=oauth and generating token via \"npm run backup:gdrive-oauth\". Current mode: ${config.gdriveAuthMode || "oauth"}`,
    );
  }

  if (
    /insufficient permissions|insufficientfilepermissions|file not found|not found/i.test(
      raw,
    )
  ) {
    return new Error(
      "Google Drive access failed for BACKUP_GDRIVE_FOLDER_ID. Ensure this folder exists inside a Shared Drive and that BACKUP_GDRIVE_CLIENT_EMAIL has Content manager access to that Shared Drive.",
    );
  }

  return error;
}

async function gdrive_ensureFolder(drive, parentId, name) {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  if (res.data.files.length > 0) return res.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  return folder.data.id;
}

async function gdrive_upload(drive, config, category, filename, filePath) {
  try {
    const catFolderId = await gdrive_ensureFolder(
      drive,
      config.gdriveFolderId,
      category,
    );
    const res = await drive.files.create({
      requestBody: {
        name: `${filename}.enc`,
        parents: [catFolderId],
      },
      media: {
        mimeType: "application/octet-stream",
        body: fs.createReadStream(filePath),
      },
      fields: "id,size,createdTime",
      supportsAllDrives: true,
    });
    return {
      key: `gdrive:${res.data.id}`,
      size: Number(res.data.size || 0),
    };
  } catch (error) {
    throw mapGoogleDriveError(error, config);
  }
}

async function gdrive_listAll(drive, config) {
  const categories = ["daily", "weekly", "monthly", "manual"];
  const all = [];
  for (const category of categories) {
    const folderRes = await drive.files.list({
      q: `'${config.gdriveFolderId}' in parents and name='${category}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });
    if (!folderRes.data.files.length) continue;
    const catFolderId = folderRes.data.files[0].id;
    let pageToken;
    do {
      const res = await drive.files.list({
        q: `'${catFolderId}' in parents and name contains '.enc' and trashed=false`,
        fields: "nextPageToken, files(id,name,size,createdTime)",
        spaces: "drive",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageToken,
      });
      for (const file of res.data.files || []) {
        all.push({
          key: `gdrive:${file.id}`,
          filename: file.name,
          type: category,
          size: Number(file.size || 0),
          createdAt: file.createdTime || null,
        });
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);
  }
  return all.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );
}

async function gdrive_delete(drive, fileId) {
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

async function gdrive_getStream(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" },
  );
  return res.data;
}

function gdrive_extractFileId(key) {
  return String(key).replace(/^gdrive:/, "");
}

/**
 * Resolve the full path to a PostgreSQL binary (pg_dump, pg_restore, etc.).
 * Priority:
 *   1. PG_BIN_DIR env var — set this in .env to override everything
 *   2. Binary already reachable on PATH
 *   3. Known Windows install paths  (PostgreSQL 18 → 10)
 *   4. Known Linux/Railway paths (/usr/bin, /usr/lib/postgresql/<ver>/bin)
 */
function resolvePgBin(binary) {
  // 1. Explicit override via env
  const envDir = process.env.PG_BIN_DIR;
  if (envDir) {
    return path.join(envDir, binary);
  }

  // 2. Check PATH using where/which
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    execFileSync(cmd, [binary], { stdio: "ignore" });
    return binary;
  } catch {
    // not on PATH — scan well-known install directories
  }

  if (process.platform === "win32") {
    const pgRoot = "C:\\Program Files\\PostgreSQL";
    for (const ver of [18, 17, 16, 15, 14, 13, 12, 11, 10]) {
      const candidate = path.join(pgRoot, String(ver), "bin", `${binary}.exe`);
      if (fs.existsSync(candidate)) return candidate;
    }
  } else {
    // Linux — Railway, Render, Ubuntu, Debian
    const candidates = [`/usr/bin/${binary}`, `/usr/local/bin/${binary}`];
    for (const ver of [17, 16, 15, 14, 13, 12, 11]) {
      candidates.push(`/usr/lib/postgresql/${ver}/bin/${binary}`);
    }
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }

  // Last resort — return plain name so the OS error message names the binary
  return binary;
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
      shell: false,
      ...options,
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const error = new Error(
          `Command failed with code ${code}. ${stderr}`.trim(),
        );
        error.code = code;
        reject(error);
      }
    });
  });
}

async function runPgDump({ databaseUrl, outputFile }) {
  const args = [
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    outputFile,
    databaseUrl,
  ];

  await runCommand(resolvePgBin("pg_dump"), args, {
    env: {
      ...process.env,
      PGPASSWORD: undefined,
    },
  });
}

async function runPgRestore({ databaseUrl, inputFile }) {
  const args = [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--dbname",
    databaseUrl,
    inputFile,
  ];

  await runCommand(resolvePgBin("pg_restore"), args);
}

async function encryptDumpFile(sourcePath, encryptedPath, rawKey) {
  const key = normalizeEncryptionKey(rawKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  await ensureDir(path.dirname(encryptedPath));
  await fsp.writeFile(encryptedPath, iv);
  await pipeline(
    fs.createReadStream(sourcePath),
    cipher,
    fs.createWriteStream(encryptedPath, { flags: "a" }),
  );

  const authTag = cipher.getAuthTag();
  await fsp.appendFile(encryptedPath, authTag);
}

async function decryptDumpFile(sourcePath, decryptedPath, rawKey) {
  const key = normalizeEncryptionKey(rawKey);
  const encrypted = await fsp.readFile(sourcePath);

  if (encrypted.length < 12 + 16) {
    throw new Error("Encrypted backup file is invalid.");
  }

  const iv = encrypted.subarray(0, 12);
  const authTag = encrypted.subarray(encrypted.length - 16);
  const payload = encrypted.subarray(12, encrypted.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  await fsp.writeFile(decryptedPath, decrypted);
}

async function getFileStats(filePath) {
  const stats = await fsp.stat(filePath);
  if (!stats.isFile() || stats.size <= 0) {
    throw new Error("Backup file is empty or invalid.");
  }
  return stats;
}

async function uploadEncryptedFile({ s3, bucket, key, filePath }) {
  const body = fs.createReadStream(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/octet-stream",
      ServerSideEncryption: "AES256",
    }),
  );

  const head = await s3.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  return Number(head.ContentLength || 0);
}

async function listObjectsByPrefix(s3, bucket, prefix) {
  const all = [];
  let continuationToken;

  while (true) {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    if (Array.isArray(page.Contents)) {
      all.push(...page.Contents);
    }

    if (!page.IsTruncated) break;
    continuationToken = page.NextContinuationToken;
  }

  return all;
}

function detectTypeFromKey(key) {
  const parts = String(key || "").split("/");
  return parts[1] || "unknown";
}

async function readBackupState() {
  try {
    const raw = await fsp.readFile(BACKUP_STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      lastRunAt: null,
      lastSuccessAt: null,
      latestStatus: "never",
      latestMessage: "No backups have run yet.",
      recentBackups: [],
      restoreTests: [],
    };
  }
}

async function writeBackupState(state) {
  await ensureDir(BACKUP_STATE_DIR);
  await fsp.writeFile(
    BACKUP_STATE_FILE,
    JSON.stringify(state, null, 2),
    "utf8",
  );
}

function appendBackupRecord(state, record) {
  const next = { ...state };
  next.recentBackups = [record, ...(state.recentBackups || [])].slice(0, 200);
  return next;
}

function appendRestoreRecord(state, record) {
  const next = { ...state };
  const merged = [record, ...(state.restoreTests || [])].slice(0, 50);
  next.restoreTests = pruneRestoreTestHistory(merged);
  return next;
}

function getRestoreTestTimestamp(record) {
  const candidates = [record?.finishedAt, record?.startedAt, record?.createdAt];
  for (const value of candidates) {
    const ts = new Date(value || 0).getTime();
    if (Number.isFinite(ts) && ts > 0) return ts;
  }
  return 0;
}

function sortRestoreTestsByNewest(records = []) {
  return [...records].sort(
    (a, b) => getRestoreTestTimestamp(b) - getRestoreTestTimestamp(a),
  );
}

function pruneRestoreTestHistory(records = [], nowTs = Date.now()) {
  const sorted = sortRestoreTestsByNewest(records).slice(0, 50);
  if (!sorted.length) return [];

  const latest = sorted[0];
  const retained = [latest];

  for (let i = 1; i < sorted.length; i += 1) {
    const record = sorted[i];
    const ts = getRestoreTestTimestamp(record);
    if (!ts) {
      retained.push(record);
      continue;
    }
    if (nowTs - ts <= RESTORE_TEST_RETENTION_MS) {
      retained.push(record);
    }
  }

  return retained;
}

function hasRestoreTestsChanged(prev = [], next = []) {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    if (JSON.stringify(prev[i]) !== JSON.stringify(next[i])) return true;
  }
  return false;
}

export async function cleanupRestoreTestHistory() {
  const state = await readBackupState();
  const current = Array.isArray(state.restoreTests) ? state.restoreTests : [];
  const pruned = pruneRestoreTestHistory(current);

  if (!hasRestoreTestsChanged(current, pruned)) {
    return { changed: false, removed: 0, remaining: current.length };
  }

  const next = { ...state, restoreTests: pruned };
  await writeBackupState(next);
  return {
    changed: true,
    removed: Math.max(0, current.length - pruned.length),
    remaining: pruned.length,
  };
}

async function cleanupLocalFiles(pathsToDelete) {
  for (const p of pathsToDelete) {
    if (!p) continue;
    try {
      await fsp.unlink(p);
    } catch {
      // ignore cleanup errors
    }
  }
}

async function cleanupRemoteRetention(config) {
  logInfo("Cleanup started", "(retention policy)");

  const policies = [
    { type: "daily", days: config.dailyDays },
    { type: "weekly", days: config.weeklyDays },
    { type: "monthly", days: config.monthlyDays },
  ];

  const now = Date.now();
  let deleted = 0;

  if (config.storageProvider === "email") {
    const files = await listEmailArchives();
    for (const policy of policies) {
      const archived = files.filter((f) => f.type === policy.type);
      for (const file of archived) {
        const ageDays =
          (now - new Date(file.createdAt || 0).getTime()) /
          (1000 * 60 * 60 * 24);
        if (ageDays <= policy.days) continue;
        await deleteEmailArchive(file.key);
        deleted += 1;
      }
    }
  } else if (config.storageProvider === "gdrive") {
    const drive = getGDriveClient(config);
    const allFiles = await gdrive_listAll(drive, config);
    for (const policy of policies) {
      const files = allFiles.filter((f) => f.type === policy.type);
      for (const file of files) {
        const ageDays =
          (now - new Date(file.createdAt || 0).getTime()) /
          (1000 * 60 * 60 * 24);
        if (ageDays <= policy.days) continue;
        await gdrive_delete(drive, gdrive_extractFileId(file.key));
        deleted += 1;
      }
    }
  } else {
    const s3 = getS3Client(config);
    for (const policy of policies) {
      const prefix = `backups/${policy.type}/`;
      const files = await listObjectsByPrefix(s3, config.bucketName, prefix);
      for (const file of files) {
        const lastModified = file.LastModified
          ? new Date(file.LastModified).getTime()
          : 0;
        if (!lastModified) continue;
        const ageDays = (now - lastModified) / (1000 * 60 * 60 * 24);
        if (ageDays <= policy.days) continue;
        await s3.send(
          new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: file.Key,
          }),
        );
        deleted += 1;
      }
    }
  }

  logInfo("Cleanup completed", `(deleted: ${deleted})`);
  return deleted;
}

export async function createBackup({
  trigger = "manual",
  initiatedBy = "system",
} = {}) {
  const config = getConfig();
  assertConfigured(config);

  const state = await readBackupState();
  state.lastRunAt = new Date().toISOString();
  state.latestStatus = "running";
  state.latestMessage = `Backup started (${trigger}).`;
  await writeBackupState(state);

  const now = new Date();
  const timestamp = timestampForFilename(now);
  const filename = buildBackupFilename(config.envName, timestamp);
  const dumpPath = path.join(TEMP_BACKUP_DIR, filename);
  const encryptedPath = `${dumpPath}.enc`;

  logInfo("Backup started", `(trigger: ${trigger})`);

  try {
    await ensureDir(TEMP_BACKUP_DIR);

    await runPgDump({
      databaseUrl: config.databaseUrl,
      outputFile: dumpPath,
    });

    const dumpStats = await getFileStats(dumpPath);
    logInfo("Backup dump completed", `(size: ${dumpStats.size} bytes)`);

    await encryptDumpFile(dumpPath, encryptedPath, config.encryptionKey);
    const encryptedStats = await getFileStats(encryptedPath);

    const categories = getBackupCategories(trigger, now);
    const records = [];

    if (config.storageProvider === "email") {
      await sendBackupEmail({
        config,
        trigger,
        categories,
        filename,
        encryptedPath,
        encryptedSize: encryptedStats.size,
      });
      for (const category of categories) {
        const key = buildEmailArchiveKey(category, filename, now);
        const archiveSize = config.emailArchiveEnabled
          ? await saveEmailArchive({
              sourcePath: encryptedPath,
              archiveKey: key,
            })
          : encryptedStats.size;
        records.push({
          id: crypto.randomUUID(),
          key,
          filename: `${filename}.enc`,
          type: category,
          trigger,
          initiatedBy,
          status: "emailed",
          encrypted: true,
          size: archiveSize,
          createdAt: now.toISOString(),
        });
        logInfo("Email sent", `(type: ${category})`);
      }
    } else if (config.storageProvider === "gdrive") {
      const drive = getGDriveClient(config);
      for (const category of categories) {
        const { key, size } = await gdrive_upload(
          drive,
          config,
          category,
          filename,
          encryptedPath,
        );
        records.push({
          id: crypto.randomUUID(),
          key,
          filename: `${filename}.enc`,
          type: category,
          trigger,
          initiatedBy,
          status: "success",
          encrypted: true,
          size: size || encryptedStats.size,
          createdAt: now.toISOString(),
        });
        logInfo("Upload completed", `(type: ${category})`);
      }
    } else {
      const s3 = getS3Client(config);
      for (const category of categories) {
        const key = buildStorageKey(category, filename, now);
        const uploadedSize = await uploadEncryptedFile({
          s3,
          bucket: config.bucketName,
          key,
          filePath: encryptedPath,
        });
        records.push({
          id: crypto.randomUUID(),
          key,
          filename: path.basename(key),
          type: category,
          trigger,
          initiatedBy,
          status: "success",
          encrypted: true,
          size: uploadedSize || encryptedStats.size,
          createdAt: now.toISOString(),
        });
        logInfo("Upload completed", `(type: ${category})`);
      }
    }

    await cleanupRemoteRetention(config);

    let nextState = await readBackupState();
    for (const record of records) {
      nextState = appendBackupRecord(nextState, record);
    }

    nextState.lastRunAt = now.toISOString();
    nextState.lastSuccessAt = now.toISOString();
    nextState.latestStatus = "success";
    nextState.latestMessage = `Backup completed successfully (${records.map((r) => r.type).join(", ")}).`;
    await writeBackupState(nextState);

    await cleanupLocalFiles([dumpPath, encryptedPath]);
    logInfo("Backup completed", `(records: ${records.length})`);

    return {
      success: true,
      message: "Backup completed successfully.",
      records,
      generatedAt: now.toISOString(),
    };
  } catch (error) {
    const mappedError = mapStorageError(error, config);
    const safeError = maskSensitiveError(mappedError);
    logError("Backup failed", { message: safeError });

    const failState = await readBackupState();
    failState.lastRunAt = new Date().toISOString();
    failState.latestStatus = "failed";
    failState.latestMessage = safeError;
    await writeBackupState(failState);

    await cleanupLocalFiles([dumpPath, encryptedPath]);

    const wrapped = new Error("Backup failed. Check server logs for details.");
    wrapped.status = 500;
    throw wrapped;
  }
}

export async function listBackups() {
  const config = getConfig();
  assertConfigured(config);

  if (config.storageProvider === "email") {
    return listEmailArchives();
  }

  if (config.storageProvider === "gdrive") {
    const drive = getGDriveClient(config);
    const files = await gdrive_listAll(drive, config);
    return files.map((f) => ({ ...f, status: "uploaded", encrypted: true }));
  }

  const s3 = getS3Client(config);
  const objects = await listObjectsByPrefix(s3, config.bucketName, "backups/");
  return objects
    .filter((item) => item.Key && item.Key.endsWith(".enc"))
    .map((item) => ({
      key: item.Key,
      filename: path.basename(item.Key),
      type: detectTypeFromKey(item.Key),
      size: Number(item.Size || 0),
      createdAt: item.LastModified
        ? new Date(item.LastModified).toISOString()
        : null,
      status: "uploaded",
      encrypted: true,
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
}

export async function getBackupStatus() {
  const cleanupResult = await cleanupRestoreTestHistory();
  const state = await readBackupState();
  let backups = [];

  try {
    backups = await listBackups();
  } catch {
    backups = [];
  }

  return {
    latestStatus: state.latestStatus || "never",
    latestMessage: state.latestMessage || "No backups have run yet.",
    lastRunAt: state.lastRunAt,
    lastSuccessAt: state.lastSuccessAt,
    latestBackup: backups[0] || null,
    restoreTests: state.restoreTests || [],
    recentBackups: state.recentBackups || [],
    totalBackups: backups.length,
    restoreTestsCleanup: cleanupResult,
  };
}

export async function deleteBackup(key) {
  const config = getConfig();
  assertConfigured(config);

  if (!key) {
    throw Object.assign(new Error("Invalid backup key."), { status: 400 });
  }

  if (config.storageProvider === "email") {
    if (!String(key).startsWith("email/")) {
      throw Object.assign(new Error("Invalid backup key."), { status: 400 });
    }
    await deleteEmailArchive(key);
  } else if (config.storageProvider === "gdrive") {
    if (!String(key).startsWith("gdrive:")) {
      throw Object.assign(new Error("Invalid backup key."), { status: 400 });
    }
    const drive = getGDriveClient(config);
    await gdrive_delete(drive, gdrive_extractFileId(key));
  } else {
    if (!String(key).startsWith("backups/")) {
      throw Object.assign(new Error("Invalid backup key."), { status: 400 });
    }
    const s3 = getS3Client(config);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      }),
    );
  }

  return { success: true };
}

export async function streamBackupDownload(key, writableStream) {
  const config = getConfig();
  assertConfigured(config);

  if (!key) {
    throw Object.assign(new Error("Invalid backup key."), { status: 400 });
  }

  if (config.storageProvider === "email") {
    if (!String(key).startsWith("email/")) {
      throw Object.assign(new Error("Invalid backup key."), { status: 400 });
    }
    await streamEmailArchiveDownload(key, writableStream);
    return;
  }

  if (config.storageProvider === "gdrive") {
    if (!String(key).startsWith("gdrive:")) {
      throw Object.assign(new Error("Invalid backup key."), { status: 400 });
    }
    const drive = getGDriveClient(config);
    const stream = await gdrive_getStream(drive, gdrive_extractFileId(key));
    await pipeline(stream, writableStream);
    return;
  }

  if (!String(key).startsWith("backups/")) {
    throw Object.assign(new Error("Invalid backup key."), { status: 400 });
  }

  const s3 = getS3Client(config);
  const obj = await s3.send(
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }),
  );

  if (!obj.Body) {
    throw Object.assign(new Error("Backup file not found."), { status: 404 });
  }

  await pipeline(obj.Body, writableStream);
}

async function findLatestBackupKey() {
  const all = await listBackups();
  if (!all.length) {
    throw Object.assign(new Error("No backups found for restore test."), {
      status: 404,
    });
  }
  return all[0].key;
}

async function downloadBackupToPath(key, destinationPath) {
  const config = getConfig();
  await ensureDir(path.dirname(destinationPath));

  if (config.storageProvider === "email") {
    await copyEmailArchiveToPath(key, destinationPath);
    return;
  }

  if (config.storageProvider === "gdrive") {
    const drive = getGDriveClient(config);
    const stream = await gdrive_getStream(drive, gdrive_extractFileId(key));
    await pipeline(stream, fs.createWriteStream(destinationPath));
    return;
  }

  const s3 = getS3Client(config);
  const obj = await s3.send(
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }),
  );

  if (!obj.Body) {
    throw new Error("Downloaded backup body is empty.");
  }

  await pipeline(obj.Body, fs.createWriteStream(destinationPath));
}

async function runPrismaMigrationsOnStaging(stagingUrl) {
  const prismaSchemaPath = resolvePrismaSchemaPath();
  const prismaCliPath = resolvePrismaCliPath();

  await runCommand(
    process.execPath,
    [prismaCliPath, "migrate", "deploy", "--schema", prismaSchemaPath],
    {
      cwd: path.dirname(prismaSchemaPath),
      env: {
        ...process.env,
        DATABASE_URL: stagingUrl,
      },
    },
  );
}

function resolvePrismaSchemaPath() {
  const candidates = [
    path.resolve(process.cwd(), "prisma", "schema.prisma"),
    path.resolve(process.cwd(), "backend", "prisma", "schema.prisma"),
    path.resolve(BACKEND_DIR, "prisma", "schema.prisma"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    "Unable to find Prisma schema for restore test migrations (expected prisma/schema.prisma).",
  );
}

function resolvePrismaCliPath() {
  const candidates = [
    path.resolve(process.cwd(), "node_modules", "prisma", "build", "index.js"),
    path.resolve(
      process.cwd(),
      "backend",
      "node_modules",
      "prisma",
      "build",
      "index.js",
    ),
    path.resolve(BACKEND_DIR, "node_modules", "prisma", "build", "index.js"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    "Prisma CLI not found. Install backend dependencies before running restore test.",
  );
}

async function runDatabaseHealthChecks(stagingUrl) {
  const prisma = new PrismaClient({
    datasources: {
      db: { url: stagingUrl },
    },
    log: ["error"],
  });

  try {
    await prisma.$queryRawUnsafe("SELECT 1");

    const [usersTable, customersTable, ordersTable] = await Promise.all([
      prisma.$queryRawUnsafe(
        `SELECT to_regclass('public."User"')::text AS reg`,
      ),
      prisma.$queryRawUnsafe(
        `SELECT to_regclass('public."Customer"')::text AS reg`,
      ),
      prisma.$queryRawUnsafe(
        `SELECT to_regclass('public."Order"')::text AS reg`,
      ),
    ]);

    const usersExists = Boolean(usersTable?.[0]?.reg);
    const customersExists = Boolean(customersTable?.[0]?.reg);
    const ordersExists = Boolean(ordersTable?.[0]?.reg);

    if (!usersExists || !customersExists || !ordersExists) {
      throw new Error("Core tables are missing in restored staging database.");
    }

    return {
      connection: true,
      tables: {
        users: usersExists,
        customers: customersExists,
        orders: ordersExists,
      },
    };
  } finally {
    await prisma.$disconnect();
  }
}

async function runApiHealthCheck(url) {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Health API failed with status ${response.status}`);
  }

  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function assertSafeRestoreTarget(config) {
  if (!config.stagingDatabaseUrl) {
    throw Object.assign(
      new Error("STAGING_DATABASE_URL is required for restore test."),
      {
        status: 500,
      },
    );
  }

  if (config.databaseUrl === config.stagingDatabaseUrl) {
    throw Object.assign(
      new Error(
        "Refusing restore test because STAGING_DATABASE_URL matches production URL.",
      ),
      { status: 400 },
    );
  }
}

export async function runRestoreTest({ initiatedBy = "system" } = {}) {
  const config = getConfig();
  assertConfigured(config);
  assertSafeRestoreTarget(config);

  const startedAt = new Date();
  logInfo("Restore test started", `(initiatedBy: ${initiatedBy})`);

  const encryptedLocalPath = path.join(
    TEMP_BACKUP_DIR,
    `restore-test-${Date.now()}.dump.enc`,
  );
  const decryptedLocalPath = encryptedLocalPath.replace(/\.enc$/, "");

  try {
    const backupKey = await findLatestBackupKey();

    await downloadBackupToPath(backupKey, encryptedLocalPath);
    await decryptDumpFile(
      encryptedLocalPath,
      decryptedLocalPath,
      config.encryptionKey,
    );

    await runPgRestore({
      databaseUrl: config.stagingDatabaseUrl,
      inputFile: decryptedLocalPath,
    });

    await runPrismaMigrationsOnStaging(config.stagingDatabaseUrl);

    const dbChecks = await runDatabaseHealthChecks(config.stagingDatabaseUrl);
    const apiCheck = await runApiHealthCheck(config.healthcheckUrl);

    const record = {
      id: crypto.randomUUID(),
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: "passed",
      initiatedBy,
      backupKey,
      checks: {
        databaseConnection: dbChecks.connection,
        usersTable: dbChecks.tables.users,
        customersTable: dbChecks.tables.customers,
        ordersTable: dbChecks.tables.orders,
        apiHealth: apiCheck.ok,
      },
    };

    const state = await readBackupState();
    await writeBackupState(appendRestoreRecord(state, record));

    logInfo("Restore test passed", `(backup: ${backupKey})`);

    await cleanupLocalFiles([encryptedLocalPath, decryptedLocalPath]);

    return {
      success: true,
      message: "Restore test passed.",
      record,
    };
  } catch (error) {
    const safeError = maskSensitiveError(error);
    logError("Restore test failed", { message: safeError });

    const failedRecord = {
      id: crypto.randomUUID(),
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: "failed",
      initiatedBy,
      error: safeError,
    };

    const state = await readBackupState();
    await writeBackupState(appendRestoreRecord(state, failedRecord));

    await cleanupLocalFiles([encryptedLocalPath, decryptedLocalPath]);

    const wrapped = new Error("Restore test failed. Check logs for details.");
    wrapped.status = 500;
    throw wrapped;
  }
}

export async function runRetentionCleanup() {
  const config = getConfig();
  assertConfigured(config);
  return cleanupRemoteRetention(config);
}
