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
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "DOKAN", "FINANCE"), listDailyTasks);
router.get("/report", authorize("ADMIN"), dailyTaskReport);
router.get("/report/pdf", authorize("ADMIN"), dailyTaskReportPdf);
router.get("/:id", authorize("ADMIN", "DOKAN", "FINANCE"), getDailyTask);
router.post("/", authorize("ADMIN", "DOKAN", "FINANCE"), createDailyTask);
router.put("/:id", authorize("ADMIN"), updateDailyTask);
router.delete("/:id", authorize("ADMIN"), deleteDailyTask);

export default router;
