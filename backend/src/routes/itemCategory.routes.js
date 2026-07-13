import { Router } from "express";
import * as itemCategoryController from "../controllers/itemCategory.controller.js";
import {
  authenticate,
  authorizePermission,
} from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const itemCategoryRoutes = Router();

itemCategoryRoutes.use(authenticate);
itemCategoryRoutes.get(
  "/",
  authorizePermission(PERMISSIONS.INVENTORY_VIEW),
  itemCategoryController.listCategories,
);
itemCategoryRoutes.get(
  "/:id",
  authorizePermission(PERMISSIONS.INVENTORY_VIEW),
  itemCategoryController.getCategory,
);
itemCategoryRoutes.post(
  "/",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_ADD),
  itemCategoryController.createCategory,
);
itemCategoryRoutes.put(
  "/:id",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_EDIT),
  itemCategoryController.updateCategory,
);
itemCategoryRoutes.delete(
  "/:id",
  authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_DELETE),
  itemCategoryController.deleteCategory,
);

export default itemCategoryRoutes;
