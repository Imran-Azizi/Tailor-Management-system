import cron from "node-cron";
import { createBackup } from "../services/backup.service.js";

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

  console.log(`[Backup] Scheduler started (${schedule}, ${timezone})`);
}
