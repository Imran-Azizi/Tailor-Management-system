import { Router } from "express";
import {
  downloadBackup,
  exportUserData,
  getBackupList,
  getSchedule,
  getStatus,
  getStorageSettings,
  listTenantUsers,
  removeBackup,
  restoreExistingBackup,
  restoreUpload,
  runManualBackup,
  runTenantBackup,
  saveSchedule,
  testRestore,
} from "../controllers/backup.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(authorize("SUPER_ADMIN"));

router.get("/status", getStatus);
router.get("/storage", getStorageSettings);
router.get("/schedule", getSchedule);
router.put("/schedule", saveSchedule);
router.get("/tenant-users/:tenantId", listTenantUsers);
router.get("/", getBackupList);
router.post("/system", runManualBackup);
router.post("/tenant", runTenantBackup);
router.post("/user-export", exportUserData);
router.get("/download", downloadBackup);
router.delete("/", removeBackup);
router.post("/restore-upload", restoreUpload);
router.post("/:id/restore", restoreExistingBackup);
router.post("/test-restore", testRestore);

export default router;
