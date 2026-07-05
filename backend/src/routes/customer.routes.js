import { Router } from 'express';
import * as ctrl from '../controllers/customer.controller.js';
import { authenticate, authorizeAnyPermission } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../lib/permissions.js';
const router = Router();
router.use(authenticate);
// Order flow permissions are accepted alongside customer permissions because
// creating/editing an order requires reading and writing customer records.
router.get('/', authorizeAnyPermission(PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.ORDERS_VIEW), ctrl.getAll);
router.get('/search/phone', authorizeAnyPermission(PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.ORDERS_CREATE, PERMISSIONS.ORDERS_VIEW), ctrl.searchByPhone);
router.get('/:id', authorizeAnyPermission(PERMISSIONS.CUSTOMERS_VIEW, PERMISSIONS.ORDERS_VIEW), ctrl.getOne);
router.post('/', authorizeAnyPermission(PERMISSIONS.CUSTOMERS_CREATE, PERMISSIONS.ORDERS_CREATE), ctrl.create);
router.put('/:id', authorizeAnyPermission(PERMISSIONS.CUSTOMERS_EDIT, PERMISSIONS.ORDERS_EDIT), ctrl.update);
router.delete('/:id', authorizeAnyPermission(PERMISSIONS.CUSTOMERS_DELETE, PERMISSIONS.ORDERS_DELETE), ctrl.remove);
export default router;
