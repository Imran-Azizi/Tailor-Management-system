import { Router } from "express";
import {
  createTenant,
  deleteTenant,
  getMyTenantSettings,
  getTenant,
  listTenants,
  tenantStats,
  updateMyTenantSettings,
  updateTenant,
} from "../controllers/tenant.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/me/settings", authorize("ADMIN"), getMyTenantSettings);
router.put("/me/settings", authorize("ADMIN"), updateMyTenantSettings);

router.get("/", authorize("SUPER_ADMIN"), listTenants);
router.post("/", authorize("SUPER_ADMIN"), createTenant);
router.get("/:id", authorize("SUPER_ADMIN"), getTenant);
router.get("/:id/stats", authorize("SUPER_ADMIN"), tenantStats);
router.put("/:id", authorize("SUPER_ADMIN"), updateTenant);
router.delete("/:id", authorize("SUPER_ADMIN"), deleteTenant);

export default router;

