import * as service from "../services/analytics.service.js";
import { cacheGet, cacheSet } from "../lib/memoryCache.js";

const DASHBOARD_CACHE_TTL_MS = 15_000;

function dashboardCacheKey({ tenantId, financeUserId, month, year }) {
  return `${tenantId || "none"}:${financeUserId || "all"}:${month ?? "n"}:${year ?? "n"}`;
}

export const getDashboard = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const isFinance = req.user?.accountType === "FINANCE";
    const parsedMonth = month != null ? Number(month) : null;
    const parsedYear = year != null ? Number(year) : null;
    const financeUserId = isFinance ? req.user.id : null;
    const cacheKey = dashboardCacheKey({
      tenantId: req.user?.tenantId,
      financeUserId,
      month: parsedMonth,
      year: parsedYear,
    });

    const cached = cacheGet("dashboard-stats", cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    const stats = await service.getDashboardStats({
      month: parsedMonth,
      year: parsedYear,
      financeUserId,
    });

    cacheSet("dashboard-stats", cacheKey, stats, DASHBOARD_CACHE_TTL_MS);
    res.setHeader("X-Cache", "MISS");
    res.json(stats);
  } catch (e) {
    next(e);
  }
};

export const getMonthPolicy = async (req, res, next) => {
  try {
    res.json(await service.getMonthPolicy());
  } catch (e) {
    next(e);
  }
};
