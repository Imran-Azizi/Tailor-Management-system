import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { runTenantContext } from '../lib/tenantContext.js';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  getCookie,
  hashSessionToken,
  hashRefreshToken,
} from '../lib/sessionCookies.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tailor-secret-key-change-in-prod';

/** Verify JWT and attach req.user */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken = getCookie(req, ACCESS_COOKIE_NAME);
    const token = bearerToken || cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        tenantId: true,
        name: true,
        phoneNumber: true,
        accountType: true,
        isActive: true,
        refreshToken: true,
        tenant: {
          select: {
            id: true,
            tenantId: true,
            slug: true,
            businessName: true,
            systemName: true,
            subscriptionStatus: true,
            expiryDate: true,
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated.' });
    }

    if (payload.tenantId !== undefined && (payload.tenantId || null) !== (user.tenantId || null)) {
      return res.status(401).json({ error: 'Session tenant mismatch.' });
    }

    if (!bearerToken && cookieToken) {
      const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
      if (!refreshToken || !user.refreshToken) {
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      }
      const hashedRefresh = hashRefreshToken(refreshToken);
      if (user.refreshToken !== hashedRefresh) {
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      }
      if (payload.sid && payload.sid !== hashSessionToken(refreshToken)) {
        return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      }
    }

    if (bearerToken && !user.refreshToken) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const isSuperAdmin = user.accountType === 'SUPER_ADMIN';
    if (!isSuperAdmin) {
      if (!user.tenantId || !user.tenant) {
        return res.status(403).json({ error: 'Tenant account is not configured.' });
      }

      if (!user.tenant.isActive || user.tenant.subscriptionStatus === 'SUSPENDED') {
        return res.status(403).json({ code: 'TENANT_SUSPENDED', error: 'Tenant account is suspended.' });
      }

      const isExpired =
        user.tenant.subscriptionStatus === 'EXPIRED' ||
        (user.tenant.expiryDate && new Date(user.tenant.expiryDate).getTime() < Date.now());

      if (isExpired) {
        return res.status(402).json({ code: 'SUBSCRIPTION_EXPIRED', error: 'Subscription expired.' });
      }
    }

    req.user = user;
    delete req.user.refreshToken;
    req.tenant = user.tenant || null;
    runTenantContext(
      { tenantId: user.tenantId, userId: user.id, isSuperAdmin },
      () => next(),
    );
  } catch (err) {
    next(err);
  }
}

/** Restrict to specific account types */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (req.user.accountType === 'SUPER_ADMIN') return next();
    if (!roles.includes(req.user.accountType)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

/** For Dokan, allow access only to orders created by the authenticated user. */
export function authorizeDokanOrderOwner(paramName = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      if (req.user.accountType !== 'DOKAN') {
        return next();
      }

      const orderId = req.params?.[paramName];
      if (!orderId) {
        return res.status(400).json({ error: 'Order id is required.' });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, createdById: true },
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      if (order.createdById !== req.user.id) {
        return res
          .status(403)
          .json({ error: 'You do not have permission to access this order.' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export { JWT_SECRET };
