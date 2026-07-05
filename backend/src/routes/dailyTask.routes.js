import { Router } from "express";
import {
  listDailyTasks,
  dailyTaskReport,
  dailyTaskReportPdf,
  getDailyTask,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
} from "../controllers/dailyTask.controller.js";
import { authenticate, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";

const router = Router();

router.use(authenticate);

router.get("/", authorizePermission(PERMISSIONS.FINANCE_VIEW), listDailyTasks);
router.get("/report", authorizePermission(PERMISSIONS.REPORTS_VIEW), dailyTaskReport);
router.get("/report/pdf", authorizePermission(PERMISSIONS.REPORTS_PRINT), dailyTaskReportPdf);
router.get("/:id", authorizePermission(PERMISSIONS.FINANCE_VIEW), getDailyTask);
router.post("/", authorizePermission(PERMISSIONS.FINANCE_EXPENSES_ADD), createDailyTask);
router.put("/:id", authorizePermission(PERMISSIONS.FINANCE_EXPENSES_EDIT), updateDailyTask);
router.delete("/:id", authorizePermission(PERMISSIONS.FINANCE_EXPENSES_DELETE), deleteDailyTask);

export default router;
