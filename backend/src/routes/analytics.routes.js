import { Router } from "express";
import * as ctrl from "../controllers/analytics.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
const router = Router();
router.use(authenticate);
router.get("/dashboard", authorize("ADMIN"), ctrl.getDashboard);
router.get("/month-policy", ctrl.getMonthPolicy);
export default router;
