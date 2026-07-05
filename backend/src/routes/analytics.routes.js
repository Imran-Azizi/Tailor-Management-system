import { Router } from "express";
import * as ctrl from "../controllers/analytics.controller.js";
import { authenticate, authorizeAnyPermission, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";
const router = Router();
router.use(authenticate);
router.get("/dashboard", authorizePermission(PERMISSIONS.DASHBOARD_VIEW), ctrl.getDashboard);
router.get(
  "/month-policy",
  authorizeAnyPermission(
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ),
  ctrl.getMonthPolicy,
);
export default router;
