import "dotenv/config";
import { runRestoreTest } from "../services/backup.service.js";

async function main() {
  try {
    const result = await runRestoreTest({ initiatedBy: "script" });
    console.log("[Backup] Restore test completed.", {
      status: result.record?.status,
      backupKey: result.record?.backupKey,
      finishedAt: result.record?.finishedAt,
    });
    process.exit(0);
  } catch (error) {
    console.error("[Backup] Restore test failed:", error?.message || error);
    process.exit(1);
  }
}

main();
