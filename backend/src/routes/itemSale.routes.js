import { Router } from "express";
import * as itemSaleController from "../controllers/itemSale.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

export const itemSaleRoutes = Router();

itemSaleRoutes.use(authenticate);
itemSaleRoutes.get("/", authorize("ADMIN", "FINANCE"), itemSaleController.listSales);
itemSaleRoutes.get("/stats", authorize("ADMIN", "FINANCE"), itemSaleController.stats);
itemSaleRoutes.post(
  "/",
  authorize("ADMIN", "FINANCE"),
  itemSaleController.createSale,
);

export default itemSaleRoutes;
