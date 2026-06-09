import { Router } from "express";
import {
  createPenalty,
  getOrderExpenseDetails,
  listPenalties,
  listWorkersByRole,
  myPenalties,
  searchOrders,
} from "../controllers/damagedClothes.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/my-penalties", myPenalties);

router.get("/workers", authorize("ADMIN"), listWorkersByRole);
router.get("/penalties", authorize("ADMIN"), listPenalties);
router.get("/orders/search", authorize("ADMIN"), searchOrders);
router.get(
  "/orders/:orderId/expenses",
  authorize("ADMIN"),
  getOrderExpenseDetails,
);
router.post("/penalties", authorize("ADMIN"), createPenalty);

export default router;
