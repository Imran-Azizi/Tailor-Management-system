import {
  createBackup,
  deleteBackup,
  getBackupStatus,
  listBackups,
  runRestoreTest,
  streamBackupDownload,
} from "../services/backup.service.js";

export async function getStatus(req, res, next) {
  try {
    const status = await getBackupStatus();
    res.json(status);
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

export async function runManualBackup(req, res, next) {
  try {
    const result = await createBackup({
      trigger: "manual",
      initiatedBy: req.user?.id || "admin",
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadBackup(req, res, next) {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "Backup key is required." });

    const filename = String(key).split("/").pop() || "backup.dump.enc";
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"${filename}\"`,
    );
    res.setHeader("Cache-Control", "no-store");

    await streamBackupDownload(key, res);
  } catch (error) {
    next(error);
  }
}

export async function removeBackup(req, res, next) {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "Backup key is required." });

    await deleteBackup(key);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function testRestore(req, res, next) {
  try {
    const result = await runRestoreTest({
      initiatedBy: req.user?.id || "admin",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}
