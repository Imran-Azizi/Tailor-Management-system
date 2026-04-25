import {
  deleteOrderDraft,
  getOrderDraftById,
  listOrderDrafts,
  upsertOrderDraft,
} from "../services/orderDraft.service.js";
import { upsertOrderDraftSchema } from "../validators/orderDraft.validator.js";

export async function list(req, res, next) {
  try {
    const data = await listOrderDrafts(req.user.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const data = await getOrderDraftById(req.user.id, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function upsert(req, res, next) {
  try {
    const body = upsertOrderDraftSchema.parse(req.body);
    const data = await upsertOrderDraft(req.user.id, body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    await deleteOrderDraft(req.user.id, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
