import { Router } from 'express';
import {
  listAccountTypes,
  listUsersByType,
  listTransactions,
  listTransactionsPdf,
  getMyTransactionSummary,
  createTransaction,
} from '../controllers/transaction.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Lookup helpers (any authenticated user)
router.get('/account-types',      authorize('ADMIN'), listAccountTypes);
router.get('/users/:accountType', authorize('ADMIN'), listUsersByType);
router.get('/me/summary',         authorize('ADMIN', 'DOKHT', 'QICHIKAR'), getMyTransactionSummary);

// CRUD
router.get('/report/pdf', authorize('ADMIN'), listTransactionsPdf);
router.get('/',  authorize('ADMIN'), listTransactions);
router.post('/', authorize('ADMIN'), createTransaction);

export default router;
