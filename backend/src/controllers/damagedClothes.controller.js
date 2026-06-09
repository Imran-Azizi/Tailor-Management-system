import {
  createDamagedPenaltySchema,
  damagedClothesPenaltyListSchema,
  damagedClothesRoleSchema,
  damagedClothesSearchSchema,
} from "../validators/damagedClothes.validator.js";
import * as service from "../services/damagedClothes.service.js";

export const listWorkersByRole = async (req, res, next) => {
  try {
    const { roleType } = damagedClothesRoleSchema.parse(req.query);
    const workers = await service.getWorkersByRole(roleType);
    res.json(workers);
  } catch (error) {
    next(error);
  }
};

export const searchOrders = async (req, res, next) => {
  try {
    const { query, userId, roleType, page, limit } =
      damagedClothesSearchSchema.parse(req.query);
    const result = await service.searchOrdersForPenalty({
      query,
      userId,
      roleType,
      page,
      limit,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getOrderExpenseDetails = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const result = await service.getOrderExpenseDetails(orderId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createPenalty = async (req, res, next) => {
  try {
    const body = createDamagedPenaltySchema.parse(req.body);
    const result = await service.createDamagedClothesPenalty(body, req.user.id);
    res.status(201).json(result);
  } catch (error) {
    if (error?.code === "DUPLICATE_DAMAGED_CLOTHES_PENALTY") {
      return res.status(409).json({
        error: error.message,
        code: error.code,
        existingPenalty: error.existingPenalty || null,
      });
    }
    if (error?.code === "WORKER_NOT_ON_ORDER") {
      return res.status(403).json({
        error: error.message,
        code: error.code,
      });
    }
    next(error);
  }
};

export const listPenalties = async (req, res, next) => {
  try {
    const filters = damagedClothesPenaltyListSchema.parse(req.query);
    const result = await service.getDamagedClothesPenalties(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const myPenalties = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const result = await service.getMyDamagedClothesPenalties(req.user.id, {
      page,
      limit,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
};
