import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

const SALT_ROUNDS = 12;

/** GET /api/users */
export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        accountType: true,
        isActive: true,
        createdAt: true,
        _count: { select: { assignedOrders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/:id */
export async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        accountType: true,
        isActive: true,
        createdAt: true,
        assignedOrders: {
          where: { isCompleted: false },
          select: {
            id: true,
            orderName: true,
            type: true,
            totalPrice: true,
            assignmentPrice: true,
            remaining: true,
            isEmergency: true,
            assignedAt: true,
            customer: { select: { firstName: true, billNumber: true } },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** POST /api/users  (Admin only) */
export async function createUser(req, res, next) {
  try {
    const { name, phoneNumber, accountType, password } = req.body;

    if (!name || !phoneNumber || !accountType) {
      return res
        .status(400)
        .json({ error: "name, phoneNumber and accountType are required." });
    }
    if (!["ADMIN", "DOKAN", "DOKHT", "QICHIKAR"].includes(accountType)) {
      return res.status(400).json({ error: "Invalid accountType." });
    }
    // Default password is the phone number if not explicitly provided
    const rawPassword = password || phoneNumber.trim();
    if (rawPassword.length < 6) {
      return res
        .status(400)
        .json({
          error:
            "Phone number must be at least 6 characters to use as default password.",
        });
    }
    const hashed = await bcrypt.hash(rawPassword, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        accountType,
        password: hashed,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        accountType: true,
        isActive: true,
        createdAt: true,
      },
    });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

/** PUT /api/users/:id  (Admin only) */
export async function updateUser(req, res, next) {
  try {
    const { name, phoneNumber, accountType, password, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber.trim();
    if (accountType !== undefined) {
      if (!["ADMIN", "DOKAN", "DOKHT", "QICHIKAR"].includes(accountType)) {
        return res.status(400).json({ error: "Invalid accountType." });
      }
      data.accountType = accountType;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (password) {
      if (password.length < 6)
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters." });
      data.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        accountType: true,
        isActive: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/users/:id  (Admin only) */
export async function deleteUser(req, res, next) {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user.id) {
      return res
        .status(400)
        .json({ error: "You cannot delete your own account." });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "User deleted." });
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/assignable  — list Qichikar + Dokht for assignment dropdowns */
export async function listAssignable(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { accountType: { in: ["QICHIKAR", "DOKHT"] }, isActive: true },
      select: { id: true, name: true, phoneNumber: true, accountType: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/dokan  — list active Dokan users for daily task sender dropdowns */
export async function listDokanUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { accountType: "DOKAN", isActive: true },
      select: { id: true, name: true, phoneNumber: true, accountType: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/** GET /api/users/me/notifications */
export async function myNotifications(req, res, next) {
  try {
    const { unread } = req.query;
    const where = { userId: req.user.id };
    if (unread === "true") where.isRead = false;

    const notifs = await prisma.userNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifs);
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/users/me/notifications/:id/read */
export async function readNotification(req, res, next) {
  try {
    const notif = await prisma.userNotification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!notif)
      return res.status(404).json({ error: "Notification not found." });
    await prisma.userNotification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ message: "Marked as read." });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/users/me/notifications/read-all */
export async function readAllNotifications(req, res, next) {
  try {
    await prisma.userNotification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    next(err);
  }
}
