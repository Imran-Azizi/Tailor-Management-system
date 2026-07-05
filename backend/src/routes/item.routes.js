import { Router } from "express";
import * as itemController from "../controllers/item.controller.js";
import { authenticate, authorizePermission } from "../middleware/auth.middleware.js";
import { PERMISSIONS } from "../lib/permissions.js";

export const itemRoutes = Router();

itemRoutes.use(authenticate);
itemRoutes.get("/", authorizePermission(PERMISSIONS.INVENTORY_VIEW), itemController.listItems);
itemRoutes.get("/:id", authorizePermission(PERMISSIONS.INVENTORY_VIEW), itemController.getItem);
itemRoutes.post("/", authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_ADD), itemController.createItem);
itemRoutes.put("/:id", authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_EDIT), itemController.updateItem);
itemRoutes.delete("/:id", authorizePermission(PERMISSIONS.INVENTORY_PRODUCTS_DELETE), itemController.deleteItem);

export default itemRoutes;
