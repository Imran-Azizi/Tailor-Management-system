import { createTransactionSchema } from "../validators/transaction.validator.js";
import * as service from "../services/transaction.service.js";

const ACCOUNT_TYPES = ["ADMIN", "DOKAN", "DOKHT", "QICHIKAR"];

/** GET /api/transactions/account-types */
export const listAccountTypes = (req, res) => {
  res.json(ACCOUNT_TYPES);
};

/** GET /api/transactions/users/:accountType */
export const listUsersByType = async (req, res, next) => {
  try {
    const { accountType } = req.params;
    if (!ACCOUNT_TYPES.includes(accountType)) {
      return res.status(400).json({ error: "Invalid account type." });
    }
    const users = await service.getUsersByAccountType(accountType);
    res.json(users);
  } catch (err) {
    next(err);
  }
};

/** GET /api/transactions */
export const listTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = "", accountType = "" } = req.query;
    const result = await service.getTransactions({
      page: Number(page),
      limit: Number(limit),
      search,
      accountType,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/** GET /api/transactions/me/summary */
export const getMyTransactionSummary = async (req, res, next) => {
  try {
    const summary = await service.getTransactionSummaryForUser(
      req.user.id,
      req.user.accountType,
    );
    res.json(summary);
  } catch (err) {
    next(err);
  }
};

/** POST /api/transactions */
export const createTransaction = async (req, res, next) => {
  try {
    const body = createTransactionSchema.parse({
      ...req.body,
      amount: Number(req.body.amount),
    });
    const transaction = await service.createTransaction(body, req.user.id);
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
};
