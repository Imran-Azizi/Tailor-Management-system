import { Router } from "express";
import * as ctrl from "../controllers/design.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
const router = Router();
router.use(authenticate);
router.get("/", ctrl.getAllDesigns);
router.get("/contributors", ctrl.listContributors);
router.post(
  "/contributors",
  authorize("ADMIN", "FINANCE"),
  ctrl.createContributor,
);
router.post(
  "/contributors/:id/verify-password",
  authorize("ADMIN", "FINANCE"),
  ctrl.verifyContributorPassword,
);
router.put(
  "/contributors/:id",
  authorize("ADMIN", "FINANCE"),
  ctrl.updateContributor,
);
router.delete(
  "/contributors/:id",
  authorize("ADMIN", "FINANCE"),
  ctrl.deleteContributor,
);
router.get("/:model", ctrl.getAll);
router.post("/:model", authorize("ADMIN", "FINANCE"), ctrl.create);
router.put("/:model/:id", authorize("ADMIN", "FINANCE"), ctrl.update);
router.delete("/:model/:id", authorize("ADMIN"), ctrl.remove);
export default router;
