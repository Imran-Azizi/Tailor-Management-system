import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../middleware/auth.middleware.js';

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tailor-refresh-secret-change-in-prod';
const ACCESS_EXP = '15m';
const REFRESH_EXP = '7d';

function signAccess(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: ACCESS_EXP });
}

function signRefresh(userId) {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
}

function tenantSelect() {
  return {
    id: true,
    tenantId: true,
    slug: true,
    businessName: true,
    systemName: true,
    address: true,
    phone: true,
    mobile: true,
    email: true,
    logoUrl: true,
    currency: true,
    language: true,
    timezone: true,
    subscriptionPlan: true,
    subscriptionStatus: true,
    expiryDate: true,
    isActive: true,
  };
}

function serializeUser(user) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    phoneNumber: user.phoneNumber,
    accountType: user.accountType,
    tenant: user.tenant || null,
  };
}

function isTenantExpired(tenant) {
  return (
    tenant?.subscriptionStatus === 'EXPIRED' ||
    (tenant?.expiryDate && new Date(tenant.expiryDate).getTime() < Date.now())
  );
}

function getRequestedTenant(req) {
  return (
    req.body?.tenantId ||
    req.body?.tenantSlug ||
    req.headers['x-tenant-id'] ||
    req.headers['x-tenant-slug'] ||
    null
  );
}

/** POST /api/auth/login */
export async function login(req, res, next) {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    const requestedTenant = String(getRequestedTenant(req) || '').trim();
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: phoneNumber.trim(),
        ...(requestedTenant
          ? {
              OR: [
                { accountType: 'SUPER_ADMIN' },
                { tenantId: requestedTenant },
                { tenant: { slug: requestedTenant } },
                { tenant: { tenantId: requestedTenant } },
              ],
            }
          : {}),
      },
      include: { tenant: { select: tenantSelect() } },
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
    if (user.accountType !== 'SUPER_ADMIN') {
      if (!user.tenant || !user.tenant.isActive || user.tenant.subscriptionStatus === 'SUSPENDED') {
        return res.status(403).json({ code: 'TENANT_SUSPENDED', error: 'Tenant account is suspended.' });
      }
      if (isTenantExpired(user.tenant)) {
        return res.status(402).json({ code: 'SUBSCRIPTION_EXPIRED', error: 'Subscription expired.' });
      }
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.json({
      accessToken,
      refreshToken,
      user: serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/refresh */
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: { select: tenantSelect() } },
    });
    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      return res.status(401).json({ error: 'Token revoked or invalid.' });
    }
    if (user.accountType !== 'SUPER_ADMIN') {
      if (!user.tenant || !user.tenant.isActive || user.tenant.subscriptionStatus === 'SUSPENDED') {
        return res.status(403).json({ code: 'TENANT_SUSPENDED', error: 'Tenant account is suspended.' });
      }
      if (isTenantExpired(user.tenant)) {
        return res.status(402).json({ code: 'SUBSCRIPTION_EXPIRED', error: 'Subscription expired.' });
      }
    }

    const newAccess = signAccess(user.id);
    const newRefresh = signRefresh(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefresh } });

    res.json({ accessToken: newAccess, refreshToken: newRefresh, user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
export async function logout(req, res, next) {
  try {
    if (req.user) {
      await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/me */
export async function me(req, res) {
  res.json(serializeUser(req.user));
}
