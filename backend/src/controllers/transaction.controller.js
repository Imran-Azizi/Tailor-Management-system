import { createTransactionSchema } from "../validators/transaction.validator.js";
import * as service from "../services/transaction.service.js";
import { normalizeReportLanguage } from "../lib/reportLocale.js";
import { buildTransactionsReportPdf } from "../lib/transactionsReportPdf.js";

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
    const {
      page = 1,
      limit = 20,
      search = "",
      accountType = "",
      month,
      year,
    } = req.query;
    const result = await service.getTransactions({
      page: Number(page),
      limit: Number(limit),
      search,
      accountType,
      month: month != null ? Number(month) : null,
      year: year != null ? Number(year) : null,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/** GET /api/transactions/report/pdf */
export const listTransactionsPdf = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      accountType = "",
      month,
      year,
    } = req.query;
    const language = normalizeReportLanguage(req.query.lang || "en");

    const currentPage = await service.getTransactions({
      page: Number(page),
      limit: Number(limit),
      search,
      accountType,
      month: month != null ? Number(month) : null,
      year: year != null ? Number(year) : null,
    });

    const safeLimit = Math.max(1, Number(limit) || 20);
    const exportLimit = Math.min(
      Math.max(Number(currentPage?.total || safeLimit), safeLimit),
      5000,
    );
    const exportRows = await service.getTransactions({
      page: 1,
      limit: exportLimit,
      search,
      accountType,
      month: month != null ? Number(month) : null,
      year: year != null ? Number(year) : null,
    });

    const currentPageTotal = Array.isArray(currentPage?.data)
      ? currentPage.data.reduce((sum, row) => sum + Number(row?.amount || 0), 0)
      : 0;

    const pdfBuffer = await buildTransactionsReportPdf({
      rows: exportRows?.data || [],
      filters: {
        search,
        typeFilter: accountType,
      },
      totals: {
        currentPageTotal,
        totalRecords: Number(currentPage?.total || 0),
      },
      language,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="all-transactions-report.pdf"',
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/** GET /api/transactions/me/summary */
export const getMyTransactionSummary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const summary = await service.getTransactionSummaryForUser(
      req.user.id,
      req.user.accountType,
      {
        month: month != null ? Number(month) : null,
        year: year != null ? Number(year) : null,
      },
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
      orderId: req.body.orderId,
      amount: Number(req.body.amount),
    });
    const transaction = await service.createTransaction(body, req.user.id);
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
};
