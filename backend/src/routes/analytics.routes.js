import { Router } from 'express';
import * as ctrl from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate);
router.get('/dashboard', ctrl.getDashboard);
export default router;
