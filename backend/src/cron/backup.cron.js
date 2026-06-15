import cron from "node-cron";
import {
  cleanupExpiredBackups,
  runScheduledBackupIfDue,
} from "../services/backup.service.js";

export function startBackupCron() {
  const timezone = process.env.BACKUP_TIMEZONE || "Asia/Kabul";

  cron.schedule(
    "* * * * *",
    async () => {
      try {
        const result = await runScheduledBackupIfDue();
        if (result.ran) console.log("[Backup] Scheduled backup completed.");
      } catch (error) {
        console.error("[Backup] Scheduled backup failed:", error?.message || error);
      }
    },
    { timezone },
  );

  cron.schedule(
    "0 3 * * *",
    async () => {
      try {
        const deleted = await cleanupExpiredBackups();
        if (deleted) console.log(`[Backup] Removed ${deleted} expired backup(s).`);
      } catch (error) {
        console.error("[Backup] Retention cleanup failed:", error?.message || error);
      }
    },
    { timezone },
  );

  console.log(`[Backup] Scheduler started (database schedule, ${timezone})`);
}
