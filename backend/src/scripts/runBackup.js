import "dotenv/config";
import { createBackup } from "../services/backup.service.js";

async function main() {
  try {
    const result = await createBackup({
      trigger: "manual",
      initiatedBy: "script",
    });
    console.log("[Backup] Manual backup completed.", {
      generatedAt: result.generatedAt,
      records: result.records?.length || 0,
    });
    process.exit(0);
  } catch (error) {
    console.error("[Backup] Manual backup failed:", error?.message || error);
    process.exit(1);
  }
}

main();
