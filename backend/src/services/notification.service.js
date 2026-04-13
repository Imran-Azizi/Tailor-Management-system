import { prisma } from '../lib/prisma.js';

export const getAllNotifications = ({ unreadOnly = false } = {}) =>
  prisma.notification.findMany({
    where: unreadOnly ? { isRead: false } : {},
    orderBy: { createdAt: 'desc' },
    include: { order: { include: { customer: true } } },
  });

export const markRead = (id) =>
  prisma.notification.update({ where: { id }, data: { isRead: true } });

export const markAllRead = () =>
  prisma.notification.updateMany({ data: { isRead: true } });

export const deleteNotification = (id) =>
  prisma.notification.delete({ where: { id } });
