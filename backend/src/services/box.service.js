import { prisma } from '../lib/prisma.js';

export const getAllBoxes = () =>
  prisma.box.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { orders: true } },
      orders: {
        include: {
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
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

export const assignOrderToBox = async (orderId, boxId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) {
    throw Object.assign(new Error("Order not found"), { status: 404 });
  }

  if (!boxId) {
    return prisma.order.update({
      where: { id: orderId },
      data: { boxId: null },
      include: { customer: true, box: true },
    });
  }

  const numericBoxId = Number(boxId);
  const box = await prisma.box.findUnique({
    where: { id: numericBoxId },
    include: { _count: { select: { orders: true } } },
  });
  if (!box) {
    throw Object.assign(new Error("Box not found"), { status: 404 });
  }

  if (box.boxType !== order.type) {
    throw Object.assign(
      new Error("Order type and box type do not match."),
      { status: 400 },
    );
  }

  const isAlreadyInBox = order.boxId === numericBoxId;
  if (!isAlreadyInBox && box._count.orders >= box.capacity) {
    throw Object.assign(new Error("capacity of this box is full"), {
      status: 400,
      code: "BOX_CAPACITY_FULL",
      boxId: box.id,
      boxName: box.boxName,
      orderType: order.type,
    });
  }

  return prisma.order.update({
    where: { id: orderId },
    data: { boxId: numericBoxId },
    include: { customer: true, box: true },
  });
};
