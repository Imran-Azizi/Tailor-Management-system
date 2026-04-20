import { Router } from "express";
import {
  listDailyTasks,
  getDailyTask,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
} from "../controllers/dailyTask.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("ADMIN", "DOKAN"), listDailyTasks);
router.get("/:id", authorize("ADMIN", "DOKAN"), getDailyTask);
router.post("/", authorize("ADMIN", "DOKAN"), createDailyTask);
router.put("/:id", authorize("ADMIN", "DOKAN"), updateDailyTask);
router.delete("/:id", authorize("ADMIN", "DOKAN"), deleteDailyTask);

export default router;
