import * as service from '../services/analytics.service.js';

export const getDashboard = async (req, res, next) => {
  try {
    res.json(await service.getDashboardStats());
  } catch (e) { next(e); }
};
