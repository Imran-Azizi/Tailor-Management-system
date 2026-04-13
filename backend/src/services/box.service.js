import { prisma } from '../lib/prisma.js';

export const getAllBoxes = () =>
  prisma.box.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  });

export const getBoxById = (id) =>
  prisma.box.findUnique({
    where: { id: Number(id) },
    include: {
      orders: {
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

export const createBox = (body) =>
  prisma.box.create({ data: body });

export const updateBox = (id, body) =>
  prisma.box.update({ where: { id: Number(id) }, data: body });

export const deleteBox = (id) =>
  prisma.box.delete({ where: { id: Number(id) } });

export const assignOrderToBox = (orderId, boxId) =>
  prisma.order.update({
    where: { id: orderId },
    data: { boxId: boxId ? Number(boxId) : null },
    include: { customer: true },
  });
