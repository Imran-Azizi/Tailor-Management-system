import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
const router = Router();
router.use(authenticate, authorize('ADMIN'));
router.get('/', ctrl.getAll);
router.patch('/read-all', ctrl.readAll);   // must be before /:id
router.patch('/:id/read', ctrl.read);
router.delete('/:id', ctrl.remove);
export default router;
