import { Router } from "express";
import * as ctrl from "../controllers/rakht.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", ctrl.getAll);
router.get(
  "/revenue/summary",
  authorize("ADMIN", "DOKAN", "FINANCE"),
  ctrl.getRevenueSummary,
);
router.get(
  "/payment-history",
  authorize("ADMIN", "DOKAN"),
  ctrl.getPaymentHistory,
);
router.get("/:id", ctrl.getOne);
router.delete("/company/:companyName", authorize("ADMIN"), ctrl.removeCompany);
router.post("/pay-remaining", authorize("ADMIN"), ctrl.payRemaining);
router.post("/", authorize("ADMIN"), ctrl.create);
router.put("/:id", authorize("ADMIN"), ctrl.update);
router.delete("/:id", authorize("ADMIN"), ctrl.remove);

export default router;
