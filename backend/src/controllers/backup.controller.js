import {
  createSystemBackup,
  createTenantBackup,
  deleteBackup,
  exportTenantUserData,
  getBackupStatus,
  getBackupStorageSettings,
  getBackupSchedule,
  getTenantUsers,
  listBackups,
  restoreBackup,
  restoreUploadedBackup,
  runRestoreTest,
  saveBackupSchedule,
  streamBackupDownload,
} from "../services/backup.service.js";

export async function getStatus(req, res, next) {
  try {
    res.json(await getBackupStatus());
  } catch (error) {
    next(error);
  }
}

export async function getBackupList(req, res, next) {
  try {
    const backups = await listBackups();
    res.json({ data: backups, total: backups.length });
  } catch (error) {
    next(error);
  }
}

export async function getStorageSettings(req, res, next) {
  try {
    res.json(await getBackupStorageSettings());
  } catch (error) {
    next(error);
  }
}

export async function getSchedule(req, res, next) {
  try {
    res.json(await getBackupSchedule());
  } catch (error) {
    next(error);
  }
}

export async function saveSchedule(req, res, next) {
  try {
    const schedule = await saveBackupSchedule({ req, data: req.body || {} });
    res.json(schedule);
  } catch (error) {
    next(error);
  }
}

export async function runManualBackup(req, res, next) {
  try {
    const result = await createSystemBackup({ req });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function runTenantBackup(req, res, next) {
  try {
    const { tenantId } = req.body || {};
    if (!tenantId) return res.status(400).json({ error: "Tenant is required." });
    const result = await createTenantBackup({ req, tenantId });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function exportUserData(req, res, next) {
  try {
    const { tenantId, userId = "ALL" } = req.body || {};
    if (!tenantId) return res.status(400).json({ error: "Tenant is required." });
    const result = await exportTenantUserData({ req, tenantId, userId });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listTenantUsers(req, res, next) {
  try {
    const { tenantId } = req.params;
    res.json(await getTenantUsers(tenantId));
  } catch (error) {
    next(error);
  }
}

export async function downloadBackup(req, res, next) {
  try {
    const { id, key } = req.query;
    const backupKey = id || key;
    if (!backupKey) return res.status(400).json({ error: "Backup id is required." });

    const filename = String(backupKey).split("/").pop() || "backup.json.gz";
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store");
    await streamBackupDownload(backupKey, res);
  } catch (error) {
    next(error);
  }
}

export async function removeBackup(req, res, next) {
  try {
    const { id, key } = req.query;
    const backupKey = id || key;
    if (!backupKey) return res.status(400).json({ error: "Backup id is required." });
    await deleteBackup(backupKey, { req });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function restoreExistingBackup(req, res, next) {
  try {
    const result = await restoreBackup({
      req,
      backupId: req.params.id,
      restoreType: req.body?.restoreType,
      tenantId: req.body?.tenantId,
      confirm: req.body?.confirm === true,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function restoreUpload(req, res, next) {
  try {
    const result = await restoreUploadedBackup({
      req,
      fileName: req.body?.fileName,
      data: req.body?.data,
      restoreType: req.body?.restoreType,
      tenantId: req.body?.tenantId,
      confirm: req.body?.confirm === true,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function testRestore(req, res, next) {
  try {
    const result = await runRestoreTest({
      initiatedBy: req.user?.id || "superadmin",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
