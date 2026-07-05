import { Router } from "express";
import {
  getManagedUsers,
  getPermissions,
  updateManagedUserPermissions,
} from "../controllers/rbac.controller.js";
import { authenticate, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";

const router = Router();

router.use(authenticate);
// ADMIN and SUPER_ADMIN pass implicitly; DOKAN/FINANCE users need an explicit
// "permissions.manage" grant to administer permissions.
router.use(authorizePermission(PERMISSIONS.PERMISSIONS_MANAGE));

router.get("/permissions", getPermissions);
router.get("/users", getManagedUsers);
router.put("/users/:userId/permissions", updateManagedUserPermissions);

export default router;
