import * as service from '../services/box.service.js';
import { z } from 'zod';

const boxSchema = z.object({
  boxName: z.string().min(1),
  boxType: z.enum(['OUTFIT', 'WASKAT', 'KORTY', 'YAKHANQAQ']),
  capacity: z.number().int().min(1),
});

export const getAll = async (req, res, next) => {
  try { res.json(await service.getAllBoxes()); } catch (e) { next(e); }
};

export const getOne = async (req, res, next) => {
  try {
    const data = await service.getBoxById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Box not found' });
    res.json(data);
  } catch (e) { next(e); }
};

export const create = async (req, res, next) => {
  try {
    const body = boxSchema.parse(req.body);
    res.status(201).json(await service.createBox(body));
  } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
  try {
    const body = boxSchema.partial().parse(req.body);
    res.json(await service.updateBox(req.params.id, body));
  } catch (e) { next(e); }
};

export const remove = async (req, res, next) => {
  try {
    await service.deleteBox(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
};

export const assignOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    res.json(await service.assignOrderToBox(orderId, req.params.id));
  } catch (e) { next(e); }
};
