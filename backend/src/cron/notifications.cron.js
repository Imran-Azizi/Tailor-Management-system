import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';

export const startCronJobs = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    console.log('[Cron] Running notification check at', now.toISOString());

    // 1. Delete expired notifications
    const deleted = await prisma.notification.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    if (deleted.count > 0) {
      console.log(`[Cron] Deleted ${deleted.count} expired notification(s)`);
    }

    // 2. Re-trigger notifications that are due for next alert
    const due = await prisma.notification.findMany({
      where: {
        nextAlert: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { order: { include: { customer: true } } },
    });

    for (const n of due) {
      await prisma.notification.update({
        where: { id: n.id },
        data: {
          isRead: false,
          message: `🚨 URGENT: ${n.order.type} for ${n.order.customer.firstName} (Bill #${n.order.customer.billNumber}) is still pending`,
          nextAlert: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
    }

    if (due.length > 0) {
      console.log(`[Cron] Re-triggered ${due.length} emergency notification(s)`);
    }
  });

  console.log('[Cron] Notification scheduler started');
};
