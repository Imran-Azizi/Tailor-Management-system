import { Router } from "express";
import { getTenantContext } from "../controllers/public.controller.js";

const router = Router();

router.get("/tenant-context", getTenantContext);

export default router;
