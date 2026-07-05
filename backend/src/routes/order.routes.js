import { Router } from "express";
import * as ctrl from "../controllers/order.controller.js";
import * as draftCtrl from "../controllers/orderDraft.controller.js";
import {
  authenticate,
  authorize,
  authorizeAnyPermission,
  authorizeDokanOrderOwner,
  authorizePermission,
} from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";
const router = Router();
router.use(authenticate);

router.get("/drafts", authorizePermission(PERMISSIONS.ORDERS_CREATE), draftCtrl.list);
router.get(
  "/drafts/:id",
  authorizePermission(PERMISSIONS.ORDERS_CREATE),
  draftCtrl.getOne,
);
router.post(
  "/drafts",
  authorizePermission(PERMISSIONS.ORDERS_CREATE),
  draftCtrl.upsert,
);
router.delete("/drafts/:id", authorizePermission(PERMISSIONS.ORDERS_CREATE), draftCtrl.remove);

router.get(
  "/",
  authorizePermission(PERMISSIONS.ORDERS_VIEW, "QICHIKAR", "DOKHT"),
  ctrl.getAll,
);
router.get("/report/monthly", authorizePermission(PERMISSIONS.REPORTS_VIEW), ctrl.getMonthlyReport);
router.get(
  "/global-search",
  authorizePermission(PERMISSIONS.ORDERS_VIEW),
  ctrl.globalSearch,
);
router.get(
  "/stats/finance-created",
  authorizeAnyPermission(PERMISSIONS.ORDERS_VIEW, PERMISSIONS.FINANCE_VIEW),
  ctrl.getFinanceCreatedOrderStats,
);
router.get(
  "/lookup",
  authorizePermission(PERMISSIONS.ORDERS_VIEW, "QICHIKAR", "DOKHT"),
  ctrl.lookup,
);
router.get(
  "/completed/from-workers",
  authorizePermission(PERMISSIONS.ORDERS_VIEW),
  ctrl.getCompletedFromWorkers,
);
router.get(
  "/completed/receipts",
  authorizePermission(PERMISSIONS.FINANCE_PAYMENTS_MANAGE),
  ctrl.getCompletedWorkerReceipts,
);
router.patch(
  "/completed/receipts/:receiptId",
  authorizePermission(PERMISSIONS.FINANCE_PAYMENTS_MANAGE),
  ctrl.updateCompletedWorkerReceipt,
);
router.get(
  "/:id",
  authorizePermission(PERMISSIONS.ORDERS_VIEW, "QICHIKAR", "DOKHT"),
  authorizeDokanOrderOwner("id"),
  ctrl.getOne,
);
router.get(
  "/:id/bill",
  authorizePermission(PERMISSIONS.ORDERS_PRINT),
  authorizeDokanOrderOwner("id"),
  ctrl.getBill,
);
router.get(
  "/:id/prefill",
  authorizeAnyPermission(PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_EDIT),
  ctrl.getOrderPrefillData,
);
router.post("/", authorizePermission(PERMISSIONS.ORDERS_CREATE), ctrl.create);
router.put("/:id", authorizePermission(PERMISSIONS.ORDERS_EDIT), ctrl.update);
router.put("/:id/bill", authorizePermission(PERMISSIONS.ORDERS_EDIT), ctrl.updateBill);
router.patch(
  "/:id/settle",
  authorizePermission(PERMISSIONS.ORDERS_DELIVER),
  ctrl.settle,
);
router.patch(
  "/:id/complete",
  authorizePermission(PERMISSIONS.ORDERS_DELIVER, "QICHIKAR", "DOKHT"),
  ctrl.markComplete,
);
router.patch(
  "/:id/progress",
  authorize("ADMIN", "QICHIKAR", "DOKHT"),
  ctrl.markInProgress,
);
router.patch("/:id/receive", authorize("QICHIKAR", "DOKHT"), ctrl.markReceived);
router.patch(
  "/:id/assign",
  authorizePermission(PERMISSIONS.ORDERS_ASSIGN),
  ctrl.assign,
);
router.patch(
  "/:id/pay-worker",
  authorizePermission(PERMISSIONS.FINANCE_PAYMENTS_MANAGE),
  ctrl.payWorkerForCompletedOrder,
);
router.patch(
  "/completed/from-workers/receipts",
  authorizePermission(PERMISSIONS.FINANCE_PAYMENTS_MANAGE),
  ctrl.markCompletedWorkerReceipts,
);
router.delete("/:id", authorizePermission(PERMISSIONS.ORDERS_DELETE), ctrl.remove);
export default router;
