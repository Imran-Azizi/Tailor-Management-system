export const NOTIFICATION_RETENTION_DAYS = 15;
export const NOTIFICATION_RETENTION_MS =
  NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const getNotificationRetentionCutoff = (now = new Date()) =>
  new Date(now.getTime() - NOTIFICATION_RETENTION_MS);

export const getNotificationRetentionWhere = (now = new Date()) => ({
  createdAt: { gte: getNotificationRetentionCutoff(now) },
});

export const getExpiredNotificationWhere = (now = new Date()) => ({
  createdAt: { lt: getNotificationRetentionCutoff(now) },
});
