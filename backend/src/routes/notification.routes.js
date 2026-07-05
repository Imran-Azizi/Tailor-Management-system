import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { authenticate, authorizePermission } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../lib/permissions.js';
const router = Router();
router.use(authenticate, authorizePermission(PERMISSIONS.SETTINGS_VIEW));
router.get('/', ctrl.getAll);
router.patch('/read-all', ctrl.readAll);   // must be before /:id
router.patch('/:id/read', ctrl.read);
router.delete('/:id', ctrl.remove);
export default router;
