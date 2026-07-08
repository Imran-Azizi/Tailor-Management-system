import { Router } from 'express';
import * as ctrl from '../controllers/customer.controller.js';
import { authenticate, authorizeAnyPermission } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../lib/permissions.js';
const router = Router();
router.use(authenticate);
// Read-only endpoints retained for order bill printing/lookup. Customer records
// are created/updated internally by the order flow; there is no manual customer
// management surface anymore.
router.get('/', authorizeAnyPermission(PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_PRINT), ctrl.getAll);
router.get('/:id', authorizeAnyPermission(PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_PRINT), ctrl.getOne);
export default router;
