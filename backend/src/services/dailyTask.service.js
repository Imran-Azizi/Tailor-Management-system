import { prisma } from "../lib/prisma.js";
import {
  getAfghanMonthDateRange,
  getCurrentAfghanMonthYear,
} from "../lib/afghanistanDate.js";
import {
  normalizeText,
  parseNumberLocale,
  toAsciiDigits,
} from "../lib/normalize.js";
import { recalculateOrderBenefit } from "./order.service.js";

const CREATOR_SELECT = { id: true, name: true, accountType: true };

const assertTaskDateCurrentMonth = (taskDate) => {
  const current = getCurrentAfghanMonthYear();
  const { month: taskMonth, year: taskYear } = getCurrentAfghanMonthYear(
    new Date(taskDate),
  );
  if (taskMonth !== current.month || taskYear !== current.year) {
    throw Object.assign(
      new Error("New entries are allowed only in the current month."),
      { status: 403, code: "MONTH_ENTRY_MUST_BE_CURRENT" },
    );
  }
};

const assertTaskDateReadOnly = (taskDate) => {
  const current = getCurrentAfghanMonthYear();
  const { month: taskMonth, year: taskYear } = getCurrentAfghanMonthYear(
    new Date(taskDate),
  );
  if (taskMonth !== current.month || taskYear !== current.year) {
    throw Object.assign(
      new Error(
        "Past and future months are read-only. Edits only allowed for the current month.",
      ),
      { status: 403, code: "MONTH_READONLY" },
    );
  }
};

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

function resolveReportRange({
  reportType = "monthly",
  date,
  from,
  to,
  month,
  year,
}) {
  const anchorDate = parseDateInput(date) || new Date();
  const currentType = String(reportType || "monthly").toLowerCase();
  const parsedMonth = month != null ? Number(month) : null;
  const parsedYear = year != null ? Number(year) : null;
  const hasSelectedMonth =
    parsedMonth &&
    parsedYear &&
    Number.isFinite(parsedMonth) &&
    Number.isFinite(parsedYear);

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
    if (parsedYear && Number.isFinite(parsedYear)) {
      const yearStart = getAfghanMonthDateRange({ month: 1, year: parsedYear });
      const yearEnd = getAfghanMonthDateRange({ month: 12, year: parsedYear });
      return {
        reportType: currentType,
        from: yearStart.start,
        to: yearEnd.end,
        granularity: "month",
      };
    }

    const start = new Date(anchorDate.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(anchorDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    return {
      reportType: currentType,
      from: start,
      to: end,
      granularity: "month",
    };
  }

  const monthRange = hasSelectedMonth
    ? getAfghanMonthDateRange({ month: parsedMonth, year: parsedYear })
    : null;

  const monthStart =
    monthRange?.start ||
    new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd =
    monthRange?.end ||
    new Date(
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
  assertTaskDateCurrentMonth(data.taskDate);
  const task = await prisma.dailyTask.create({
    data: {
      fromName: data.fromName,
      recipientName: data.recipientName,
      amount: data.amount,
      taskDate: data.taskDate,
      orderId: data.orderId || null,
      note: data.note || null,
      createdById,
    },
    include: {
      createdBy: { select: CREATOR_SELECT },
      order: {
        select: {
          id: true,
          type: true,
          customer: { select: { firstName: true, billNumber: true } },
        },
      },
    },
  });

  if (task.orderId) {
    await recalculateOrderBenefit(task.orderId);
  }

  return task;
};

export const createDailyTaskBatch = async (data, createdById) => {
  assertTaskDateCurrentMonth(data.taskDate);
  return prisma.$transaction(async (tx) => {
    const createdTasks = [];

    for (const allocation of data.allocations) {
      const task = await tx.dailyTask.create({
        data: {
          fromName: data.fromName,
          recipientName: data.recipientName,
          amount: allocation.amount,
          taskDate: data.taskDate,
          orderId: allocation.orderId,
          note: data.note || null,
          createdById,
        },
        include: {
          createdBy: { select: CREATOR_SELECT },
          order: {
            select: {
              id: true,
              type: true,
              customer: { select: { firstName: true, billNumber: true } },
            },
          },
        },
      });

      createdTasks.push(task);
    }

    const orderIds = [
      ...new Set(createdTasks.map((task) => task.orderId).filter(Boolean)),
    ];
    for (const orderId of orderIds) {
      await recalculateOrderBenefit(orderId, tx);
    }

    return createdTasks;
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
  const normalizedSearch = String(normalizeText(search || "") || "")
    .replace(/\s+/g, " ")
    .trim();
  const parsedSearchBill = Math.trunc(
    parseNumberLocale(toAsciiDigits(normalizedSearch)),
  );

  if (normalizedSearch) {
    where.OR = [
      { fromName: { contains: normalizedSearch, mode: "insensitive" } },
      { recipientName: { contains: normalizedSearch, mode: "insensitive" } },
      { note: { contains: normalizedSearch, mode: "insensitive" } },
      ...(Number.isFinite(parsedSearchBill)
        ? [{ order: { customer: { billNumber: parsedSearchBill } } }]
        : []),
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
    const { start: monthStart, end: monthEnd } = getAfghanMonthDateRange({
      month: parsedMonth,
      year: parsedYear,
    });
    where.taskDate = { gte: monthStart, lte: monthEnd };
  }

  const [total, data] = await Promise.all([
    prisma.dailyTask.count({ where }),
    prisma.dailyTask.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { taskDate: "desc" },
      include: {
        createdBy: { select: CREATOR_SELECT },
        order: {
          select: {
            id: true,
            type: true,
            customer: { select: { firstName: true, billNumber: true } },
          },
        },
      },
    }),
  ]);

  return { data, total, page, limit };
};

export const getDailyTaskById = async (id) => {
  return prisma.dailyTask.findUnique({
    where: { id },
    include: {
      createdBy: { select: CREATOR_SELECT },
      order: {
        select: {
          id: true,
          type: true,
          customer: { select: { firstName: true, billNumber: true } },
        },
      },
    },
  });
};

export const updateDailyTask = async (id, data) => {
  return prisma.$transaction(async (tx) => {
    const before = await tx.dailyTask.findUnique({
      where: { id },
      select: { orderId: true, taskDate: true },
    });
    if (!before)
      throw Object.assign(new Error("Task not found"), { status: 404 });
    assertTaskDateReadOnly(before.taskDate);

    const updated = await tx.dailyTask.update({
      where: { id },
      data: {
        fromName: data.fromName,
        recipientName: data.recipientName,
        amount: data.amount,
        taskDate: data.taskDate,
        orderId: data.orderId || null,
        note: data.note || null,
      },
      include: {
        createdBy: { select: CREATOR_SELECT },
        order: {
          select: {
            id: true,
            type: true,
            customer: { select: { firstName: true, billNumber: true } },
          },
        },
      },
    });

    if (before?.orderId && before.orderId !== updated.orderId) {
      await recalculateOrderBenefit(before.orderId, tx);
    }
    if (updated.orderId) {
      await recalculateOrderBenefit(updated.orderId, tx);
    }

    return updated;
  });
};

export const deleteDailyTask = async (id) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.dailyTask.findUnique({
      where: { id },
      select: { id: true, orderId: true, taskDate: true },
    });
    if (!existing)
      throw Object.assign(new Error("Task not found"), { status: 404 });
    assertTaskDateReadOnly(existing.taskDate);

    const deleted = await tx.dailyTask.delete({ where: { id } });

    if (existing?.orderId) {
      await recalculateOrderBenefit(existing.orderId, tx);
    }

    return deleted;
  });
};

export const getDailyTaskReport = async ({
  reportType,
  date,
  from,
  to,
  month,
  year,
}) => {
  const resolved = resolveReportRange({
    reportType,
    date,
    from,
    to,
    month,
    year,
  });

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
      month: month != null ? Number(month) : null,
      year: year != null ? Number(year) : null,
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
