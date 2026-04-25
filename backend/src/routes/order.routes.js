import { Router } from "express";
import * as ctrl from "../controllers/order.controller.js";
import * as draftCtrl from "../controllers/orderDraft.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
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

router.get("/", ctrl.getAll);
router.get("/report/monthly", authorize("ADMIN"), ctrl.getMonthlyReport);
router.get(
  "/lookup",
  authorize("ADMIN", "DOKAN", "QICHIKAR", "DOKHT"),
  ctrl.lookup,
);
router.get(
  "/completed/from-workers",
  authorize("ADMIN"),
  ctrl.getCompletedFromWorkers,
);
router.get("/:id", ctrl.getOne);
router.get("/:id/bill", authorize("ADMIN", "DOKAN"), ctrl.getBill);
router.post("/", authorize("ADMIN", "DOKAN", "FINANCE"), ctrl.create);
router.put("/:id", authorize("ADMIN", "DOKAN"), ctrl.update);
router.put("/:id/bill", authorize("ADMIN", "DOKAN"), ctrl.updateBill);
router.patch(
  "/:id/complete",
  authorize("ADMIN", "DOKAN", "QICHIKAR", "DOKHT"),
  ctrl.markComplete,
);
router.patch(
  "/:id/progress",
  authorize("ADMIN", "DOKAN", "QICHIKAR", "DOKHT"),
  ctrl.markInProgress,
);
router.patch("/:id/receive", authorize("QICHIKAR", "DOKHT"), ctrl.markReceived);
router.patch("/:id/assign", authorize("ADMIN"), ctrl.assign);
router.patch(
  "/:id/pay-worker",
  authorize("ADMIN"),
  ctrl.payWorkerForCompletedOrder,
);
router.delete("/:id", authorize("ADMIN"), ctrl.remove);
export default router;
