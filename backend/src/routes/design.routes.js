import { Router } from "express";
import * as ctrl from "../controllers/design.controller.js";
import { authenticate, authorizeAnyPermission, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";
const router = Router();
router.use(authenticate);
router.get("/", authorizeAnyPermission(PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.ORDERS_CREATE), ctrl.getAllDesigns);
router.get("/contributors", authorizePermission(PERMISSIONS.SETTINGS_VIEW), ctrl.listContributors);
router.post("/contributors", authorizePermission(PERMISSIONS.SETTINGS_UPDATE), ctrl.createContributor);
router.post(
  "/contributors/:id/verify-password",
  authorizePermission(PERMISSIONS.SETTINGS_UPDATE),
  ctrl.verifyContributorPassword,
);
router.put("/contributors/:id", authorizePermission(PERMISSIONS.SETTINGS_UPDATE), ctrl.updateContributor);
router.delete("/contributors/:id", authorizePermission(PERMISSIONS.SETTINGS_UPDATE), ctrl.deleteContributor);

// Ready-Made Clothing catalog
router.get("/ready-made-clothing", authorizeAnyPermission(PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.ORDERS_CREATE), ctrl.listReadyMadeClothing);
router.post(
  "/ready-made-clothing",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_ADD),
  ctrl.createReadyMadeClothing,
);
router.put(
  "/ready-made-clothing/:id",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_EDIT),
  ctrl.updateReadyMadeClothing,
);
router.delete(
  "/ready-made-clothing/:id",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_DELETE),
  ctrl.deleteReadyMadeClothing,
);

// Ready-Made Waskat catalog
router.get("/ready-made-waskat-clothing", authorizeAnyPermission(PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.ORDERS_CREATE), ctrl.listReadyMadeWaskatClothing);
router.post(
  "/ready-made-waskat-clothing",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_ADD),
  ctrl.createReadyMadeWaskatClothing,
);
router.put(
  "/ready-made-waskat-clothing/:id",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_EDIT),
  ctrl.updateReadyMadeWaskatClothing,
);
router.delete(
  "/ready-made-waskat-clothing/:id",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_DELETE),
  ctrl.deleteReadyMadeWaskatClothing,
);

router.get("/:model", authorizeAnyPermission(PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.ORDERS_CREATE), ctrl.getAll);
router.post("/:model", authorizePermission(PERMISSIONS.SETTINGS_UPDATE), ctrl.create);
router.put("/:model/:id", authorizePermission(PERMISSIONS.SETTINGS_UPDATE), ctrl.update);
router.delete("/:model/:id", authorizePermission(PERMISSIONS.SETTINGS_UPDATE), ctrl.remove);
export default router;
