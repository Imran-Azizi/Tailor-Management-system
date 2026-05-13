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
} from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get("/assignable", authorize("ADMIN"), listAssignable);
router.get("/dokan", authorize("ADMIN", "FINANCE"), listDokanUsers);

// My notifications (any authenticated user)
router.get("/me/notifications", authorize("ADMIN", "DOKHT", "QICHIKAR"), myNotifications);
router.patch("/me/notifications/read-all", authorize("ADMIN", "DOKHT", "QICHIKAR"), readAllNotifications);
router.patch("/me/notifications/:id/read", authorize("ADMIN", "DOKHT", "QICHIKAR"), readNotification);

// Admin-only CRUD
router.get("/", authorize("ADMIN"), listUsers);
router.get("/:id", authorize("ADMIN"), getUser);
router.post("/", authorize("ADMIN"), createUser);
router.put("/:id", authorize("ADMIN"), updateUser);
router.delete("/:id", authorize("ADMIN"), deleteUser);

export default router;
