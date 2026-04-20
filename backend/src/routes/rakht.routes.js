import { Router } from "express";
import * as ctrl from "../controllers/rakht.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", ctrl.getAll);
router.post("/", authorize("ADMIN"), ctrl.create);
router.put("/:id", authorize("ADMIN"), ctrl.update);
router.delete("/:id", authorize("ADMIN"), ctrl.remove);

export default router;
