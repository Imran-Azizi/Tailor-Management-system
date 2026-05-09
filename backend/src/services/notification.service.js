import { prisma } from "../lib/prisma.js";
import { getAfghanMonthDateRange } from "../lib/afghanistanDate.js";

const dedupeByOrderId = (notifications = []) => {
  const seen = new Set();
  const unique = [];

  for (const notification of notifications) {
    const key = notification?.orderId || notification?.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(notification);
  }

  return unique;
};

export const getAllNotifications = async ({
  unreadOnly = false,
  month,
  year,
} = {}) => {
  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;
  const hasMonthFilter =
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear);

  const monthFilter = hasMonthFilter
    ? (() => {
        const { start, end } = getAfghanMonthDateRange({
          month: parsedMonth,
          year: parsedYear,
        });
        return {
          OR: [
            { entryMonth: parsedMonth, entryYear: parsedYear },
            { entryMonth: null, createdAt: { gte: start, lte: end } },
          ],
        };
      })()
    : null;

  const notifications = await prisma.notification.findMany({
    where: {
      ...(unreadOnly ? { isRead: false } : {}),
      order: {
        isEmergency: true,
        isCompleted: false,
        ...(monthFilter || {}),
      },
    },
    orderBy: [{ isRead: "asc" }, { updatedAt: "desc" }],
    include: { order: { include: { customer: true } } },
  });

  return dedupeByOrderId(notifications);
};

export const markRead = async (id) => {
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, orderId: true },
  });

  if (!notification) {
    throw Object.assign(new Error("Notification not found"), { status: 404 });
  }

  await prisma.notification.updateMany({
    where: { orderId: notification.orderId },
    data: { isRead: true },
  });

  return prisma.notification.findUnique({ where: { id: notification.id } });
};

export const markAllRead = () =>
  prisma.notification.updateMany({ data: { isRead: true } });

export const deleteNotification = (id) =>
  prisma.notification.delete({ where: { id } });
