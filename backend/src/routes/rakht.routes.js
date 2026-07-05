import { Router } from "express";
import * as ctrl from "../controllers/rakht.controller.js";
import { authenticate, authorizeAnyPermission, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";

const router = Router();

router.use(authenticate);
router.get("/", authorizeAnyPermission(PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.ORDERS_CREATE), ctrl.getAll);
router.get(
  "/revenue/summary",
  authorizePermission(PERMISSIONS.FINANCE_REVENUE_VIEW),
  ctrl.getRevenueSummary,
);
router.get(
  "/payment-history",
  authorizePermission(PERMISSIONS.FINANCE_PAYMENTS_MANAGE),
  ctrl.getPaymentHistory,
);
router.get(
  "/payment-history/pdf",
  authorizePermission(PERMISSIONS.REPORTS_PRINT),
  ctrl.getPaymentHistoryPdf,
);
router.get("/:id", authorizeAnyPermission(PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.ORDERS_CREATE), ctrl.getOne);
router.delete("/company/:companyName", authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_DELETE), ctrl.removeCompany);
router.post("/pay-remaining", authorizePermission(PERMISSIONS.FINANCE_PAYMENTS_MANAGE), ctrl.payRemaining);
router.post("/", authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_ADD), ctrl.create);
router.post("/:id/tons", authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_EDIT), ctrl.addTons);
router.put("/:id", authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_EDIT), ctrl.update);
router.delete("/:id", authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_DELETE), ctrl.remove);

export default router;
