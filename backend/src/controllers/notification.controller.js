import * as service from '../services/notification.service.js';

export const getAll = async (req, res, next) => {
  try {
    res.json(await service.getAllNotifications({ unreadOnly: req.query.unread === 'true' }));
  } catch (e) { next(e); }
};

export const read = async (req, res, next) => {
  try { res.json(await service.markRead(req.params.id)); } catch (e) { next(e); }
};

export const readAll = async (req, res, next) => {
  try { res.json(await service.markAllRead()); } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try { await service.deleteNotification(req.params.id); res.status(204).send(); } catch (e) { next(e); }
};
