import { Router } from 'express';
import {
  listAccountTypes,
  listUsersByType,
  listTransactions,
  getMyTransactionSummary,
  createTransaction,
} from '../controllers/transaction.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

// Lookup helpers (any authenticated user)
router.get('/account-types',      listAccountTypes);
router.get('/users/:accountType', listUsersByType);
router.get('/me/summary',         getMyTransactionSummary);

// CRUD — ADMIN and DOKAN only
router.get('/',  authorize('ADMIN', 'DOKAN'), listTransactions);
router.post('/', authorize('ADMIN', 'DOKAN'), createTransaction);

export default router;
