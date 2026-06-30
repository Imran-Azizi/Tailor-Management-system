import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createTenant,
  deleteTenant,
  getMyTenantSettings,
  getTenant,
  listTenants,
  tenantStats,
  updateMyTenantSettings,
  updateTenant,
  verifyTenantDeletionPassword,
} from "../controllers/tenant.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();
const passwordVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "TOO_MANY_PASSWORD_ATTEMPTS",
    error: "Too many password attempts. Please try again later.",
  },
});

router.use(authenticate);

router.get("/me/settings", authorize("ADMIN"), getMyTenantSettings);
router.put("/me/settings", authorize("ADMIN"), updateMyTenantSettings);

router.get("/", authorize("SUPER_ADMIN"), listTenants);
router.post("/", authorize("SUPER_ADMIN"), createTenant);
router.get("/:id", authorize("SUPER_ADMIN"), getTenant);
router.get("/:id/stats", authorize("SUPER_ADMIN"), tenantStats);
router.put("/:id", authorize("SUPER_ADMIN"), updateTenant);
router.post(
  "/:id/verify-deletion",
  authorize("SUPER_ADMIN"),
  passwordVerificationLimiter,
  verifyTenantDeletionPassword,
);
router.delete(
  "/:id",
  authorize("SUPER_ADMIN"),
  passwordVerificationLimiter,
  deleteTenant,
);

export default router;
