import { Router } from "express";
import * as ctrl from "../controllers/design.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
const router = Router();
router.use(authenticate);
router.get("/", ctrl.getAllDesigns);
router.get("/contributors", authorize("ADMIN"), ctrl.listContributors);
router.post("/contributors", authorize("ADMIN"), ctrl.createContributor);
router.post(
  "/contributors/:id/verify-password",
  authorize("ADMIN"),
  ctrl.verifyContributorPassword,
);
router.put("/contributors/:id", authorize("ADMIN"), ctrl.updateContributor);
router.delete("/contributors/:id", authorize("ADMIN"), ctrl.deleteContributor);

// Ready-Made Clothing catalog
router.get("/ready-made-clothing", ctrl.listReadyMadeClothing);
router.post(
  "/ready-made-clothing",
  authorize("ADMIN", "FINANCE"),
  ctrl.createReadyMadeClothing,
);
router.put(
  "/ready-made-clothing/:id",
  authorize("ADMIN", "FINANCE"),
  ctrl.updateReadyMadeClothing,
);
router.delete(
  "/ready-made-clothing/:id",
  authorize("ADMIN"),
  ctrl.deleteReadyMadeClothing,
);

router.get("/:model", ctrl.getAll);
router.post("/:model", authorize("ADMIN", "FINANCE"), ctrl.create);
router.put("/:model/:id", authorize("ADMIN", "FINANCE"), ctrl.update);
router.delete("/:model/:id", authorize("ADMIN"), ctrl.remove);
export default router;
