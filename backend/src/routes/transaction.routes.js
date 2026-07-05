import { Router } from 'express';
import {
  listAccountTypes,
  listUsersByType,
  listTransactions,
  listTransactionsPdf,
  getMyTransactionSummary,
  createTransaction,
} from '../controllers/transaction.controller.js';
import { authenticate, authorize, authorizePermission } from '../middleware/auth.middleware.js';
import { PERMISSIONS } from '../lib/permissions.js';

const router = Router();

router.use(authenticate);

// Lookup helpers (any authenticated user)
router.get('/account-types',      authorizePermission(PERMISSIONS.USERS_VIEW), listAccountTypes);
router.get('/users/:accountType', authorizePermission(PERMISSIONS.USERS_VIEW), listUsersByType);
router.get('/me/summary',         authorize('ADMIN', 'DOKHT', 'QICHIKAR'), getMyTransactionSummary);

// CRUD
router.get('/report/pdf', authorizePermission(PERMISSIONS.REPORTS_PRINT), listTransactionsPdf);
router.get('/',  authorizePermission(PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW), listTransactions);
router.post('/', authorizePermission(PERMISSIONS.FINANCE_PAYMENTS_MANAGE), createTransaction);

export default router;
