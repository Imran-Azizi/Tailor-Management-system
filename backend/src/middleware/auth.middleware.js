import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tailor-secret-key-change-in-prod';

/** Verify JWT and attach req.user */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, phoneNumber: true, accountType: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Restrict to specific account types */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
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
