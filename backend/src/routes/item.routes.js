import { Router } from "express";
import * as itemController from "../controllers/item.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";

export const itemRoutes = Router();

itemRoutes.use(authenticate);
itemRoutes.get("/", authorize("ADMIN", "FINANCE"), itemController.listItems);
itemRoutes.get("/:id", authorize("ADMIN", "FINANCE"), itemController.getItem);
itemRoutes.post("/", authorize("ADMIN", "FINANCE"), itemController.createItem);
itemRoutes.put("/:id", authorize("ADMIN", "FINANCE"), itemController.updateItem);
itemRoutes.delete("/:id", authorize("ADMIN"), itemController.deleteItem);

export default itemRoutes;
