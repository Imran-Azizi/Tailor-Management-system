import * as service from "../services/rakht.service.js";
import { normalizeReportLanguage } from "../lib/reportLocale.js";
import { buildPaymentHistoryReportPdf } from "../lib/paymentHistoryReportPdf.js";
import {
  createRakhtSchema,
  addRakhtTonsSchema,
  payRemainingMoneySchema,
  updateRakhtSchema,
} from "../validators/rakht.validator.js";

export const getAll = async (req, res, next) => {
  try {
    const month = req.query.month != null ? Number(req.query.month) : null;
    const year = req.query.year != null ? Number(req.query.year) : null;
    res.json(await service.getAllRakht({ month, year }));
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req, res, next) => {
  try {
    res.json(await service.getRakhtDetailById(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const getRevenueSummary = async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const companyName =
      typeof req.query.companyName === "string"
        ? req.query.companyName
        : undefined;
    const brandName =
      typeof req.query.brandName === "string" ? req.query.brandName : undefined;
    const tonName =
      typeof req.query.tonName === "string" ? req.query.tonName : undefined;
    const orderType =
      typeof req.query.orderType === "string" ? req.query.orderType : undefined;
    const fromDate =
      typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate =
      typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const month = req.query.month != null ? Number(req.query.month) : null;
    const year = req.query.year != null ? Number(req.query.year) : null;
    const minMeters =
      typeof req.query.minMeters === "string"
        ? Number(req.query.minMeters)
        : undefined;
    const maxMeters =
      typeof req.query.maxMeters === "string"
        ? Number(req.query.maxMeters)
        : undefined;
    const page =
      typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const limit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;

    const isFinance = req.user?.accountType === "FINANCE";

    res.json(
      await service.getRakhtRevenueSummary({
        financeUserId: isFinance ? req.user.id : null,
        search,
        companyName,
        brandName,
        tonName,
        orderType,
        fromDate,
        toDate,
        month,
        year,
        minMeters,
        maxMeters,
        page,
        limit,
      }),
    );
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

export const getPaymentHistoryPdf = async (req, res, next) => {
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
      typeof req.query.page === "string" ? Number(req.query.page) : 1;
    const limit =
      typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
    const language = normalizeReportLanguage(req.query.lang || "en");

    const currentPage = await service.getRakhtPaymentHistory({
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
    });

    const safeLimit = Math.max(1, Number(limit) || 20);
    const exportLimit = Math.min(
      Math.max(Number(currentPage?.total || safeLimit), safeLimit),
      5000,
    );
    const exportRows = await service.getRakhtPaymentHistory({
      companyName,
      search,
      status,
      fromDate,
      toDate,
      month,
      year,
      sortBy,
      sortOrder,
      page: 1,
      limit: exportLimit,
    });

    const activeFilterCount = [
      Boolean(String(search || "").trim()),
      Boolean(String(companyName || "").trim()),
      Boolean(String(status || "").trim()),
      Boolean(fromDate),
      Boolean(toDate),
    ].filter(Boolean).length;

    const pdfBuffer = await buildPaymentHistoryReportPdf({
      rows: exportRows?.data || [],
      summary: exportRows?.summary || { totalPaid: 0, totalRemaining: 0 },
      filters: {
        search,
        companyName,
        status,
        fromDate,
        toDate,
        activeFilterCount,
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
      'attachment; filename="payment-history-report.pdf"',
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
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

export const addTons = async (req, res, next) => {
  try {
    const body = addRakhtTonsSchema.parse(req.body);
    res.status(201).json(await service.addRakhtTons(req.params.id, body));
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
