import * as service from "../services/analytics.service.js";

export const getDashboard = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const isFinance = req.user?.accountType === "FINANCE";
    res.json(
      await service.getDashboardStats({
        month: month != null ? Number(month) : null,
        year: year != null ? Number(year) : null,
        financeUserId: isFinance ? req.user.id : null,
      }),
    );
  } catch (e) {
    next(e);
  }
};
