import { Router } from "express";
import * as ctrl from "../controllers/order.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
const router = Router();
router.use(authenticate);
router.get("/", ctrl.getAll);
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
router.post("/", authorize("ADMIN", "DOKAN"), ctrl.create);
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
