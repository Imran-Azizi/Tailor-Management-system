import * as service from "../services/rakht.service.js";
import {
  createRakhtSchema,
  updateRakhtSchema,
} from "../validators/rakht.validator.js";

export const getAll = async (req, res, next) => {
  try {
    res.json(await service.getAllRakht());
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const body = createRakhtSchema.parse(req.body);
    res.status(201).json(await service.createRakht(body));
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const body = updateRakhtSchema.parse(req.body);
    res.json(await service.updateRakht(req.params.id, body));
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await service.removeRakht(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
