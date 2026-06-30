import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  csrf,
  login,
  logout,
  me,
  refresh,
  updateProfile,
} from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();
const sensitiveAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_PASSWORD_ATTEMPTS',
    error: 'Too many password attempts. Please try again later.',
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    error: 'Too many login attempts. Please try again later.',
  },
});

router.get('/csrf', csrf);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.put(
  '/profile',
  authenticate,
  authorize('SUPER_ADMIN'),
  sensitiveAccountLimiter,
  updateProfile,
);
router.post(
  '/change-password',
  authenticate,
  authorize('SUPER_ADMIN'),
  sensitiveAccountLimiter,
  changePassword,
);

export default router;
