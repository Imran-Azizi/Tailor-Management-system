import * as service from "../services/rakht.service.js";
import {
  createRakhtSchema,
  payRemainingMoneySchema,
  updateRakhtSchema,
} from "../validators/rakht.validator.js";

export const getAll = async (req, res, next) => {
  try {
    res.json(await service.getAllRakht());
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const companyName =
      typeof req.query.companyName === "string"
        ? req.query.companyName
        : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const fromDate =
      typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate =
      typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const month = req.query.month != null ? Number(req.query.month) : null;
    const year = req.query.year != null ? Number(req.query.year) : null;
    const sortBy =
      typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
    const sortOrder =
      typeof req.query.sortOrder === "string" ? req.query.sortOrder : undefined;
    const page =
      typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const limit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

    res.json(
      await service.getRakhtPaymentHistory({
        companyName,
        search,
        status,
        fromDate,
        toDate,
        month,
        year,
        sortBy,
        sortOrder,
        page,
        limit,
      }),
    );
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

export const removeCompany = async (req, res, next) => {
  try {
    res.json(await service.deleteRakhtCompany(req.params.companyName));
  } catch (error) {
    next(error);
  }
};

export const payRemaining = async (req, res, next) => {
  try {
    const body = payRemainingMoneySchema.parse(req.body);
    res.json(
      await service.payRemainingMoneyByCompany({
        ...body,
        paidById: req.user.id,
      }),
    );
  } catch (error) {
    next(error);
  }
};
