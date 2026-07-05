import { Router } from "express";
import * as itemSaleController from "../controllers/itemSale.controller.js";
import { authenticate, authorizeAnyPermission, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const itemSaleRoutes = Router();

itemSaleRoutes.use(authenticate);
itemSaleRoutes.get("/", authorizePermission(PERMISSIONS.INVENTORY_VIEW), itemSaleController.listSales);
itemSaleRoutes.get("/stats", authorizeAnyPermission(PERMISSIONS.FINANCE_REVENUE_VIEW, PERMISSIONS.FINANCE_PROFIT_VIEW), itemSaleController.stats);
itemSaleRoutes.post(
  "/",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_SELL),
  itemSaleController.createSale,
);

export default itemSaleRoutes;
