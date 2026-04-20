import { prisma } from "../lib/prisma.js";

const CREATOR_SELECT = { id: true, name: true, accountType: true };

export const createDailyTask = async (data, createdById) => {
  return prisma.dailyTask.create({
    data: {
      fromName: data.fromName,
      recipientName: data.recipientName,
      amount: data.amount,
      taskDate: data.taskDate,
      note: data.note || null,
      createdById,
    },
    include: { createdBy: { select: CREATOR_SELECT } },
  });
};

export const getDailyTasks = async ({ page = 1, limit = 20, search = "" }) => {
  const where = search
    ? {
        OR: [
          { fromName: { contains: search, mode: "insensitive" } },
          { recipientName: { contains: search, mode: "insensitive" } },
          { note: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [total, data] = await Promise.all([
    prisma.dailyTask.count({ where }),
    prisma.dailyTask.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { taskDate: "desc" },
      include: { createdBy: { select: CREATOR_SELECT } },
    }),
  ]);

  return { data, total, page, limit };
};

export const getDailyTaskById = async (id) => {
  return prisma.dailyTask.findUnique({
    where: { id },
    include: { createdBy: { select: CREATOR_SELECT } },
  });
};

export const updateDailyTask = async (id, data) => {
  return prisma.dailyTask.update({
    where: { id },
    data: {
      fromName: data.fromName,
      recipientName: data.recipientName,
      amount: data.amount,
      taskDate: data.taskDate,
      note: data.note || null,
    },
    include: { createdBy: { select: CREATOR_SELECT } },
  });
};

export const deleteDailyTask = async (id) => {
  return prisma.dailyTask.delete({ where: { id } });
};
