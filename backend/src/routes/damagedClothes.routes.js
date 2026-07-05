import { Router } from "express";
import {
  createPenalty,
  getOrderExpenseDetails,
  listPenalties,
  listWorkersByRole,
  myPenalties,
  searchOrders,
} from "../controllers/damagedClothes.controller.js";
import { authenticate, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";

const router = Router();

router.use(authenticate);

router.get("/my-penalties", myPenalties);

router.get("/workers", authorizePermission(PERMISSIONS.USERS_VIEW), listWorkersByRole);
router.get("/penalties", authorizePermission(PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW), listPenalties);
router.get("/orders/search", authorizePermission(PERMISSIONS.ORDERS_VIEW), searchOrders);
router.get(
  "/orders/:orderId/expenses",
  authorizePermission(PERMISSIONS.FINANCE_VIEW),
  getOrderExpenseDetails,
);
router.post("/penalties", authorizePermission(PERMISSIONS.FINANCE_PAYMENTS_MANAGE), createPenalty);

export default router;
