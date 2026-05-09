import cron from "node-cron";
import {
  cleanupRestoreTestHistory,
  createBackup,
} from "../services/backup.service.js";

function isEnabled() {
  return String(process.env.BACKUP_ENABLED ?? "true").toLowerCase() === "true";
}

export function startBackupCron() {
  if (!isEnabled()) {
    console.log("[Backup] Cron disabled by BACKUP_ENABLED=false");
    return;
  }

  const schedule = process.env.BACKUP_CRON || "0 2 * * *";
  const timezone = process.env.BACKUP_TIMEZONE || "Asia/Kabul";

  cron.schedule(
    schedule,
    async () => {
      try {
        await createBackup({ trigger: "scheduled", initiatedBy: "cron" });
      } catch (error) {
        console.error(
          "[Backup] Scheduled backup failed:",
          error?.message || error,
        );
      }
    },
    { timezone },
  );

  // Keep restore test history clean: remove records older than 48h,
  // but always preserve the latest record until a newer one exists.
  cron.schedule(
    "0 */6 * * *",
    async () => {
      try {
        const result = await cleanupRestoreTestHistory();
        if (result.changed) {
          console.log(
            `[Backup] Restore test history cleanup removed ${result.removed} old record(s).`,
          );
        }
      } catch (error) {
        console.error(
          "[Backup] Restore test history cleanup failed:",
          error?.message || error,
        );
      }
    },
    { timezone },
  );

  console.log(`[Backup] Scheduler started (${schedule}, ${timezone})`);
}
