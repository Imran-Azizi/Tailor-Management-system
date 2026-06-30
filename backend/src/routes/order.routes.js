import { Router } from "express";
import * as ctrl from "../controllers/order.controller.js";
import * as draftCtrl from "../controllers/orderDraft.controller.js";
import {
  authenticate,
  authorize,
  authorizeDokanOrderOwner,
} from "../middleware/auth.middleware.js";
const router = Router();
router.use(authenticate);

router.get("/drafts", authorize("ADMIN", "DOKAN", "FINANCE"), draftCtrl.list);
router.get(
  "/drafts/:id",
  authorize("ADMIN", "DOKAN", "FINANCE"),
  draftCtrl.getOne,
);
router.post(
  "/drafts",
  authorize("ADMIN", "DOKAN", "FINANCE"),
  draftCtrl.upsert,
);
router.delete("/drafts/:id", authorize("ADMIN", "DOKAN"), draftCtrl.remove);

router.get(
  "/",
  authorize("ADMIN", "DOKAN", "QICHIKAR", "DOKHT", "FINANCE"),
  ctrl.getAll,
);
router.get("/report/monthly", authorize("ADMIN"), ctrl.getMonthlyReport);
router.get(
  "/global-search",
  authorize("ADMIN", "FINANCE"),
  ctrl.globalSearch,
);
router.get(
  "/stats/finance-created",
  authorize("FINANCE"),
  ctrl.getFinanceCreatedOrderStats,
);
router.get(
  "/lookup",
  authorize("ADMIN", "QICHIKAR", "DOKHT", "FINANCE"),
  ctrl.lookup,
);
router.get(
  "/completed/from-workers",
  authorize("ADMIN"),
  ctrl.getCompletedFromWorkers,
);
router.get(
  "/completed/receipts",
  authorize("ADMIN"),
  ctrl.getCompletedWorkerReceipts,
);
router.get(
  "/:id",
  authorize("ADMIN", "DOKAN", "QICHIKAR", "DOKHT", "FINANCE"),
  authorizeDokanOrderOwner("id"),
  ctrl.getOne,
);
router.get(
  "/:id/bill",
  authorize("ADMIN", "DOKAN", "FINANCE"),
  authorizeDokanOrderOwner("id"),
  ctrl.getBill,
);
router.get(
  "/:id/prefill",
  authorize("ADMIN", "FINANCE"),
  ctrl.getOrderPrefillData,
);
router.post("/", authorize("ADMIN", "DOKAN", "FINANCE"), ctrl.create);
router.put("/:id", authorize("ADMIN", "FINANCE"), ctrl.update);
router.put("/:id/bill", authorize("ADMIN"), ctrl.updateBill);
router.patch(
  "/:id/settle",
  authorize("ADMIN", "FINANCE"),
  ctrl.settle,
);
router.patch(
  "/:id/complete",
  authorize("ADMIN", "QICHIKAR", "DOKHT", "FINANCE"),
  ctrl.markComplete,
);
router.patch(
  "/:id/progress",
  authorize("ADMIN", "QICHIKAR", "DOKHT"),
  ctrl.markInProgress,
);
router.patch("/:id/receive", authorize("QICHIKAR", "DOKHT"), ctrl.markReceived);
router.patch("/:id/assign", authorize("ADMIN"), ctrl.assign);
router.patch(
  "/:id/pay-worker",
  authorize("ADMIN"),
  ctrl.payWorkerForCompletedOrder,
);
router.patch(
  "/completed/from-workers/receipts",
  authorize("ADMIN"),
  ctrl.markCompletedWorkerReceipts,
);
router.delete("/:id", authorize("ADMIN"), ctrl.remove);
export default router;
