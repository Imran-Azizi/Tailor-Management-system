import {
  createDailyTaskSchema,
  createDailyTaskBatchSchema,
  updateDailyTaskSchema,
} from "../validators/dailyTask.validator.js";
import * as service from "../services/dailyTask.service.js";
import { buildDailyTaskReportPdf } from "../lib/dailyTaskReportPdf.js";
import { normalizeReportLanguage } from "../lib/reportLocale.js";

const DAILY_TASK_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function ensureTaskIsEditable(task) {
  const createdAt = new Date(task.createdAt).getTime();

  if (
    Number.isNaN(createdAt) ||
    Date.now() - createdAt > DAILY_TASK_EDIT_WINDOW_MS
  ) {
    const error = new Error("Editing time expired.");
    error.status = 403;
    throw error;
  }
}

/** GET /api/daily-tasks */
export const listDailyTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "", month, year } = req.query;
    const result = await service.getDailyTasks({
      page: Number(page),
      limit: Number(limit),
      search,
      month: month != null ? Number(month) : null,
      year: year != null ? Number(year) : null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/** GET /api/daily-tasks/report */
export const dailyTaskReport = async (req, res, next) => {
  try {
    const { reportType = "monthly", date, from, to } = req.query;
    const result = await service.getDailyTaskReport({
      reportType,
      date,
      from,
      to,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/** GET /api/daily-tasks/report/pdf */
export const dailyTaskReportPdf = async (req, res, next) => {
  try {
    const { reportType = "daily", date, from, to } = req.query;
    const language = normalizeReportLanguage(req.query.lang || "en");
    const report = await service.getDailyTaskReport({
      reportType,
      date,
      from,
      to,
    });
    const pdfBuffer = await buildDailyTaskReportPdf(report, language);

    const safeType = String(report.filters.reportType || "daily").toLowerCase();
    const filename = `daily-task-${safeType}-report.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/** GET /api/daily-tasks/:id */
export const getDailyTask = async (req, res, next) => {
  try {
    const task = await service.getDailyTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: "Daily task not found." });
    res.json(task);
  } catch (err) {
    next(err);
  }
};

/** POST /api/daily-tasks */
export const createDailyTask = async (req, res, next) => {
  try {
    if (
      Array.isArray(req.body.allocations) &&
      req.body.allocations.length > 0
    ) {
      const body = createDailyTaskBatchSchema.parse({
        ...req.body,
        allocations: req.body.allocations.map((item) => ({
          ...item,
          orderId: item?.orderId,
          amount: Number(item?.amount),
        })),
      });

      const tasks = await service.createDailyTaskBatch(body, req.user.id);
      return res.status(201).json({ data: tasks, count: tasks.length });
    }

    const body = createDailyTaskSchema.parse({
      ...req.body,
      orderId: req.body.orderId,
      amount: Number(req.body.amount),
    });
    const task = await service.createDailyTask(body, req.user.id);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/daily-tasks/:id */
export const updateDailyTask = async (req, res, next) => {
  try {
    const existing = await service.getDailyTaskById(req.params.id);
    if (!existing)
      return res.status(404).json({ error: "Daily task not found." });

    ensureTaskIsEditable(existing);

    const body = updateDailyTaskSchema.parse({
      ...req.body,
      orderId: req.body.orderId,
      amount: Number(req.body.amount),
    });

    const task = await service.updateDailyTask(req.params.id, body);
    res.json(task);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/daily-tasks/:id */
export const deleteDailyTask = async (req, res, next) => {
  try {
    const existing = await service.getDailyTaskById(req.params.id);
    if (!existing)
      return res.status(404).json({ error: "Daily task not found." });

    ensureTaskIsEditable(existing);

    await service.deleteDailyTask(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
