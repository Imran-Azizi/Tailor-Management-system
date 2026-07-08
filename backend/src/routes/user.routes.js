import { Router } from "express";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  listAssignable,
  listDokanUsers,
  myNotifications,
  readNotification,
  readAllNotifications,
  getUserLimit,
} from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { authorizeAnyPermission, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get("/assignable", authorizeAnyPermission(PERMISSIONS.USERS_VIEW, PERMISSIONS.ORDERS_EDIT), listAssignable);
router.get("/dokan", authorizeAnyPermission(PERMISSIONS.USERS_VIEW, PERMISSIONS.FINANCE_EXPENSES_ADD), listDokanUsers);
router.get("/limit", authorizePermission(PERMISSIONS.USERS_VIEW), getUserLimit);

// My notifications (any authenticated user)
router.get("/me/notifications", authorize("ADMIN", "DOKHT", "QICHIKAR"), myNotifications);
router.patch("/me/notifications/read-all", authorize("ADMIN", "DOKHT", "QICHIKAR"), readAllNotifications);
router.patch("/me/notifications/:id/read", authorize("ADMIN", "DOKHT", "QICHIKAR"), readNotification);

// Admin-only CRUD
router.get("/", authorizePermission(PERMISSIONS.USERS_VIEW), listUsers);
router.get("/:id", authorizePermission(PERMISSIONS.USERS_VIEW), getUser);
router.post("/", authorizePermission(PERMISSIONS.USERS_CREATE), createUser);
router.put("/:id", authorizePermission(PERMISSIONS.USERS_EDIT), updateUser);
router.delete("/:id", authorizePermission(PERMISSIONS.USERS_DELETE), deleteUser);

export default router;
