import { prisma } from "../lib/prisma.js";

const CREATOR_SELECT = { id: true, name: true, accountType: true };

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDateInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfWeek(date) {
  const d = startOfDay(date);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  start.setDate(start.getDate() + 6);
  return endOfDay(start);
}

function resolveReportRange({ reportType = "monthly", date, from, to }) {
  const anchorDate = parseDateInput(date) || new Date();
  const currentType = String(reportType || "monthly").toLowerCase();

  if (currentType === "custom") {
    const parsedFrom = parseDateInput(from);
    const parsedTo = parseDateInput(to);

    if (parsedFrom && parsedTo) {
      return {
        reportType: currentType,
        from: startOfDay(parsedFrom),
        to: endOfDay(parsedTo),
        granularity: "day",
      };
    }
  }

  if (currentType === "daily") {
    return {
      reportType: currentType,
      from: startOfDay(anchorDate),
      to: endOfDay(anchorDate),
      granularity: "hour",
    };
  }

  if (currentType === "weekly") {
    return {
      reportType: currentType,
      from: startOfWeek(anchorDate),
      to: endOfWeek(anchorDate),
      granularity: "day",
    };
  }

  if (currentType === "yearly") {
    const start = new Date(anchorDate.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(anchorDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    return {
      reportType: currentType,
      from: start,
      to: end,
      granularity: "month",
    };
  }

  const monthStart = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth(),
    1,
    0,
    0,
    0,
    0,
  );
  const monthEnd = new Date(
    anchorDate.getFullYear(),
    anchorDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  return {
    reportType: "monthly",
    from: monthStart,
    to: monthEnd,
    granularity: "day",
  };
}

function getBucketKey(date, granularity) {
  const d = new Date(date);
  if (granularity === "hour") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
  }

  if (granularity === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function buildBreakdown(tasks, granularity) {
  const buckets = new Map();

  for (const task of tasks) {
    const key = getBucketKey(task.taskDate, granularity);
    if (!buckets.has(key)) {
      buckets.set(key, {
        period: key,
        totalTasks: 0,
        totalAmount: 0,
      });
    }

    const bucket = buckets.get(key);
    bucket.totalTasks += 1;
    bucket.totalAmount += Number(task.amount || 0);
  }

  return [...buckets.values()].sort((a, b) =>
    a.period.localeCompare(b.period, "en", { numeric: true }),
  );
}

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

export const getDailyTasks = async ({
  page = 1,
  limit = 20,
  search = "",
  month = null,
  year = null,
}) => {
  const where = {};

  if (search) {
    where.OR = [
      { fromName: { contains: search, mode: "insensitive" } },
      { recipientName: { contains: search, mode: "insensitive" } },
      { note: { contains: search, mode: "insensitive" } },
    ];
  }

  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;

  if (
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear)
  ) {
    const monthStart = new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(parsedYear, parsedMonth, 0, 23, 59, 59, 999);
    where.taskDate = { gte: monthStart, lte: monthEnd };
  }

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

export const getDailyTaskReport = async ({ reportType, date, from, to }) => {
  const resolved = resolveReportRange({ reportType, date, from, to });

  const tasks = await prisma.dailyTask.findMany({
    where: {
      taskDate: {
        gte: resolved.from,
        lte: resolved.to,
      },
    },
    orderBy: { taskDate: "desc" },
    include: { createdBy: { select: CREATOR_SELECT } },
  });

  const totalAmount = tasks.reduce(
    (sum, task) => sum + Number(task.amount || 0),
    0,
  );
  const highestExpense =
    tasks.length > 0
      ? tasks.reduce((max, task) => Math.max(max, Number(task.amount || 0)), 0)
      : 0;
  const averageAmount = tasks.length > 0 ? totalAmount / tasks.length : 0;

  return {
    filters: {
      reportType: resolved.reportType,
      from: resolved.from.toISOString(),
      to: resolved.to.toISOString(),
      date: parseDateInput(date)?.toISOString() || null,
      granularity: resolved.granularity,
    },
    summary: {
      totalTasks: tasks.length,
      totalAmount,
      highestExpense,
      averageAmount,
      completedTasks: null,
      pendingTasks: null,
    },
    breakdown: buildBreakdown(tasks, resolved.granularity),
    tasks,
  };
};
