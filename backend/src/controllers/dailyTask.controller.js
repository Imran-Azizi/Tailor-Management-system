import {
  createDailyTaskSchema,
  updateDailyTaskSchema,
} from "../validators/dailyTask.validator.js";
import * as service from "../services/dailyTask.service.js";

/** GET /api/daily-tasks */
export const listDailyTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const result = await service.getDailyTasks({
      page: Number(page),
      limit: Number(limit),
      search,
    });
    res.json(result);
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
    const body = createDailyTaskSchema.parse({
      ...req.body,
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

    const body = updateDailyTaskSchema.parse({
      ...req.body,
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
    await service.deleteDailyTask(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
