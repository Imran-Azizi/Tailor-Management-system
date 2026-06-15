import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import {
  getExpiredNotificationWhere,
  NOTIFICATION_RETENTION_DAYS,
} from "../lib/notificationRetention.js";

const EMERGENCY_ALERT_INTERVAL_MS = 12 * 60 * 60 * 1000;

const buildEmergencyAlertMessage = ({
  orderType,
  customerName,
  customerPhone,
  billNumber,
  createdAt,
  statusLabel = "EMERGENCY - PENDING",
  intro = "Emergency order reminder. Please prioritize and complete this order first.",
}) =>
  [
    "🚨 Emergency Alert",
    intro,
    `Bill #: ${billNumber || "-"}`,
    `Customer: ${customerName || "-"}`,
    `Phone: ${customerPhone || "-"}`,
    `Order Type: ${orderType || "-"}`,
    `Status: ${statusLabel}`,
    `Created: ${new Date(createdAt || Date.now()).toISOString()}`,
  ].join("\n");

export const startCronJobs = () => {
  // Run every 15 minutes to catch due alerts reliably.
  cron.schedule("*/15 * * * *", async () => {
    const now = new Date();

    // 1. Retain read and unread notifications for 15 days, then clean them up.
    const expiredWhere = getExpiredNotificationWhere(now);
    const [deletedSystem, deletedUser] = await Promise.all([
      prisma.notification.deleteMany({ where: expiredWhere }),
      prisma.userNotification.deleteMany({ where: expiredWhere }),
    ]);
    const deletedCount = deletedSystem.count + deletedUser.count;
    if (deletedCount > 0) {
      console.log(
        `[Cron] Deleted ${deletedCount} notification(s) older than ${NOTIFICATION_RETENTION_DAYS} days`,
      );
    }

    // 2. Re-trigger emergency notifications every 12 hours while unresolved.
    const due = await prisma.notification.findMany({
      where: {
        nextAlert: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        order: {
          isEmergency: true,
          isCompleted: false,
        },
      },
      include: { order: { include: { customer: true } } },
    });

    for (const n of due) {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          isRead: false,
          message: buildEmergencyAlertMessage({
            orderType: n.order.type,
            customerName: n.order.customer.firstName,
            customerPhone: n.order.customer.phoneNumber,
            billNumber: n.order.customer.billNumber,
            createdAt: n.order.createdAt,
          }),
          nextAlert: new Date(now.getTime() + EMERGENCY_ALERT_INTERVAL_MS),
        },
      });
    }

    if (due.length > 0) {
      console.log(
        `[Cron] Re-triggered ${due.length} emergency notification(s)`,
      );
    }
  });
};
