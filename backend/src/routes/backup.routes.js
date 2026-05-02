import { Router } from "express";
import {
  downloadBackup,
  getBackupList,
  getStatus,
  removeBackup,
  runManualBackup,
  testRestore,
} from "../controllers/backup.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/status", getStatus);
router.get("/", getBackupList);
router.post("/run", runManualBackup);
router.get("/download", downloadBackup);
router.delete("/", removeBackup);
router.post("/test-restore", testRestore);

export default router;
