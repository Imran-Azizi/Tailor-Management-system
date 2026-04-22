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

router.get("/", authorize("ADMIN", "DOKAN"), listDailyTasks);
router.get("/report", authorize("ADMIN"), dailyTaskReport);
router.get("/report/pdf", authorize("ADMIN"), dailyTaskReportPdf);
router.get("/:id", authorize("ADMIN", "DOKAN"), getDailyTask);
router.post("/", authorize("ADMIN", "DOKAN"), createDailyTask);
router.put("/:id", authorize("ADMIN"), updateDailyTask);
router.delete("/:id", authorize("ADMIN"), deleteDailyTask);

export default router;
