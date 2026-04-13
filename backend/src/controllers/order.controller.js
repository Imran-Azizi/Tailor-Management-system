import * as service from '../services/order.service.js';
import { createOrderSchema, updateOrderSchema } from '../validators/order.validator.js';
import { prisma } from '../lib/prisma.js';

export const getAll = async (req, res, next) => {
  try {
    // Qichikar / Dokht only see their assigned orders
    const user = req.user;
    const query = { ...req.query };
    if (user && (user.accountType === 'QICHIKAR' || user.accountType === 'DOKHT')) {
      query.assignedToId = user.id;
    }
    res.json(await service.getAllOrders(query));
  } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const data = await service.getOrderById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const body = createOrderSchema.parse(req.body);
    res.status(201).json(await service.createOrder(body));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const body = updateOrderSchema.parse(req.body);
    res.json(await service.updateOrder(req.params.id, body));
  } catch (e) { next(e); }
};

export const markComplete = async (req, res, next) => {
  try {
    const user = req.user;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: { firstName: true, billNumber: true, phoneNumber: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const isWorker = ['QICHIKAR', 'DOKHT'].includes(user.accountType);

    // Workers can only complete orders assigned to them
    if (isWorker && order.assignedToId !== user.id) {
      return res.status(403).json({ error: 'You can only complete orders assigned to you.' });
    }

    // Admin/Dokan: enforce full payment before completion
    if (!isWorker && order.remaining > 0) {
      return res.status(400).json({ error: 'This order cannot be completed until the customer pays the remaining balance.' });
    }

    const result = await service.markComplete(req.params.id);

    // Notify all admins that the order has been completed
    if (['QICHIKAR', 'DOKHT'].includes(user.accountType)) {
      const admins = await prisma.user.findMany({
        where: { accountType: 'ADMIN' },
        select: { id: true },
      });
      const msg = `✅ ${user.name} has completed the order for ${order.customer.firstName} — Bill #${order.customer.billNumber} · ${order.type}. This order has been completed successfully.`;
      await Promise.all(admins.map(admin =>
        prisma.userNotification.create({
          data: { userId: admin.id, orderId: req.params.id, message: msg, type: 'WORK_COMPLETED' },
        })
      ));
    }

    res.json(result);
  } catch (e) { next(e); }
};

/** PATCH /api/orders/:id/progress — Toggle In Progress for a worker */
export const markInProgress = async (req, res, next) => {
  try {
    const user = req.user;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: { select: { firstName: true, billNumber: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Workers can only update their own assigned orders
    if (['QICHIKAR', 'DOKHT'].includes(user.accountType)) {
      if (order.assignedToId !== user.id) {
        return res.status(403).json({ error: 'You can only update orders assigned to you.' });
      }
    }
    if (order.isCompleted) {
      return res.status(400).json({ error: 'Cannot update status of a completed order.' });
    }

    const nowStarting = !order.inProgress;

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { inProgress: nowStarting },
    });

    // Notify all admins when a worker starts working
    if (nowStarting) {
      const admins = await prisma.user.findMany({
        where: { accountType: 'ADMIN' },
        select: { id: true },
      });
      const msg = `🔨 ${user.name} started working on order for ${order.customer.firstName} — Bill #${order.customer.billNumber} (${order.type})`;
      await Promise.all(admins.map(admin =>
        prisma.userNotification.create({
          data: { userId: admin.id, orderId: req.params.id, message: msg, type: 'WORK_STARTED' },
        })
      ));
    }

    res.json(updated);
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await service.deleteOrder(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
};

/** PATCH /api/orders/:id/assign  — Admin assigns an order to a worker */
export const assign = async (req, res, next) => {
  try {
    const { assignedToId, assignmentNote } = req.body;
    const orderId = req.params.id;

    // Validate target user exists and is a worker
    if (assignedToId) {
      const worker = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!worker) return res.status(404).json({ error: 'User not found.' });
      if (!['QICHIKAR', 'DOKHT'].includes(worker.accountType)) {
        return res.status(400).json({ error: 'Orders can only be assigned to Qichikar or Dokht.' });
      }
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedToId: assignedToId || null,
        assignedById: assignedToId ? req.user.id : null,
        assignedAt: assignedToId ? new Date() : null,
        assignmentNote: assignmentNote || null,
      },
      include: {
        customer: { select: { firstName: true, billNumber: true } },
        assignedTo: { select: { id: true, name: true, accountType: true } },
        assignedBy: { select: { id: true, name: true } },
      },
    });

    // Create user notification for the assigned worker
    if (assignedToId) {
      const msg = `New order assigned by ${req.user.name}: ${order.customer.firstName} — Bill #${order.customer.billNumber} (${order.type})${assignmentNote ? '. Note: ' + assignmentNote : ''}`;
      await prisma.userNotification.create({
        data: { userId: assignedToId, orderId, message: msg, type: 'ASSIGNMENT' },
      });
    }

    res.json(order);
  } catch (e) { next(e); }
};
