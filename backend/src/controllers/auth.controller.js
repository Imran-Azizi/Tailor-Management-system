import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import {
  clearAuthCookies,
  createCsrfToken,
  getCookie,
  REFRESH_COOKIE_NAME,
  setAuthCookies,
  setCsrfCookie,
  hashSessionToken,
  hashRefreshToken,
} from '../lib/sessionCookies.js';
import { JWT_SECRET } from '../middleware/auth.middleware.js';
import { getEffectivePermissionCodes } from '../services/rbac.service.js';

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tailor-refresh-secret-change-in-prod';
const ACCESS_EXP = '15m';
const REFRESH_EXP = '7d';
const PASSWORD_MIN_LENGTH = 8;
const SALT_ROUNDS = 12;

function signAccess(user, refreshToken) {
  return jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenantId || null,
      accountType: user.accountType,
      sid: hashSessionToken(refreshToken),
    },
    JWT_SECRET,
    { expiresIn: ACCESS_EXP },
  );
}

function signRefresh(user) {
  return jwt.sign(
    {
      sub: user.id,
      tenantId: user.tenantId || null,
      accountType: user.accountType,
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXP },
  );
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

async function serializeUser(user) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    phoneNumber: user.phoneNumber,
    accountType: user.accountType,
    tenant: user.tenant || null,
    permissions: user.permissions || await getEffectivePermissionCodes(user),
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

function matchesRequestedTenant(user, requestedTenant) {
  if (!requestedTenant || user.accountType === 'SUPER_ADMIN') return false;
  return (
    user.tenantId === requestedTenant ||
    user.tenant?.id === requestedTenant ||
    user.tenant?.slug === requestedTenant ||
    user.tenant?.tenantId === requestedTenant
  );
}

async function findValidLoginUser({ phoneNumber, password, requestedTenant }) {
  const candidates = await prisma.user.findMany({
    where: {
      phoneNumber,
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
    orderBy: { createdAt: 'asc' },
    take: 25,
  });

  const validUsers = [];
  for (const candidate of candidates) {
    if (await bcrypt.compare(password, candidate.password)) {
      validUsers.push(candidate);
    }
  }

  if (!validUsers.length) return { user: null };

  if (requestedTenant) {
    return {
      user:
        validUsers.find((candidate) => matchesRequestedTenant(candidate, requestedTenant)) ||
        validUsers.find((candidate) => candidate.accountType === 'SUPER_ADMIN') ||
        validUsers[0],
    };
  }

  if (validUsers.length === 1) return { user: validUsers[0] };

  return {
    user: null,
    requiresTenant: true,
  };
}

/** POST /api/auth/login */
export async function login(req, res, next) {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    const requestedTenant = String(getRequestedTenant(req) || '').trim();
    const { user, requiresTenant } = await findValidLoginUser({
      phoneNumber: phoneNumber.trim(),
      password,
      requestedTenant,
    });
    if (requiresTenant) {
      return res.status(409).json({
        code: 'TENANT_REQUIRED',
        error: 'Please select your tenant before signing in.',
      });
    }
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

    const refreshToken = signRefresh(user);
    const accessToken = signAccess(user, refreshToken);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashRefreshToken(refreshToken) } });
    setAuthCookies(res, { accessToken, refreshToken });

    res.json({
      user: await serializeUser(user),
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/refresh */
export async function refresh(req, res, next) {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required.' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const hashedToken = hashRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: { select: tenantSelect() } },
    });
    if (!user || !user.refreshToken || user.refreshToken !== hashedToken || !user.isActive) {
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

    const newRefresh = signRefresh(user);
    const newAccess = signAccess(user, newRefresh);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: hashRefreshToken(newRefresh) } });
    setAuthCookies(res, { accessToken: newAccess, refreshToken: newRefresh });

    res.json({ user: await serializeUser(user) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout */
export async function logout(req, res, next) {
  try {
    const refreshToken = getCookie(req, REFRESH_COOKIE_NAME);
    if (req.user) {
      await prisma.user.update({ where: { id: req.user.id }, data: { refreshToken: null } });
    } else if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const hashedToken = hashRefreshToken(refreshToken);
        await prisma.user.updateMany({
          where: { id: payload.sub, refreshToken: hashedToken },
          data: { refreshToken: null },
        });
      } catch {
        // Expired or malformed sessions are still cleared client-side below.
      }
    }
    clearAuthCookies(res);
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/auth/me */
export async function me(req, res) {
  res.json(await serializeUser(req.user));
}

/** GET /api/auth/csrf */
export function csrf(req, res) {
  const csrfToken = createCsrfToken();
  setCsrfCookie(res, csrfToken);
  res.json({ csrfToken });
}

function isStrongPassword(password) {
  return (
    typeof password === 'string' &&
    password.length >= PASSWORD_MIN_LENGTH &&
    /[a-zA-Z]/.test(password) &&
    /\d/.test(password)
  );
}

/** PUT /api/auth/profile */
export async function updateProfile(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    const phoneNumber = String(req.body?.phoneNumber || '').trim();
    const currentPassword = String(req.body?.currentPassword || '');

    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'Full name must be between 2 and 100 characters.' });
    }
    if (!/^[0-9+()\-\s]{7,24}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Enter a valid phone number.' });
    }
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }

    const account = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true, accountType: true },
    });
    if (!account || account.accountType !== 'SUPER_ADMIN') {
      return res.status(404).json({ error: 'Super admin account not found.' });
    }
    if (!(await bcrypt.compare(currentPassword, account.password))) {
      return res.status(401).json({ code: 'INVALID_CURRENT_PASSWORD', error: 'Current password is incorrect.' });
    }

    const phoneOwner = await prisma.user.findFirst({
      where: {
        id: { not: account.id },
        accountType: 'SUPER_ADMIN',
        phoneNumber,
      },
      select: { id: true },
    });
    if (phoneOwner) {
      return res.status(409).json({ code: 'PHONE_IN_USE', error: 'This phone number is already in use.' });
    }

    const updated = await prisma.user.update({
      where: { id: account.id },
      data: { name, phoneNumber },
      include: { tenant: { select: tenantSelect() } },
    });
    res.json({ user: await serializeUser(updated) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/change-password */
export async function changePassword(req, res, next) {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include a letter and a number.`,
      });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different from the current password.' });
    }

    const account = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { tenant: { select: tenantSelect() } },
    });
    if (!account || account.accountType !== 'SUPER_ADMIN') {
      return res.status(404).json({ error: 'Super admin account not found.' });
    }
    if (!(await bcrypt.compare(currentPassword, account.password))) {
      return res.status(401).json({ code: 'INVALID_CURRENT_PASSWORD', error: 'Current password is incorrect.' });
    }

    const refreshToken = signRefresh(account);
    const accessToken = signAccess(account, refreshToken);
    const updated = await prisma.user.update({
      where: { id: account.id },
      data: {
        password: await bcrypt.hash(newPassword, SALT_ROUNDS),
        refreshToken: hashRefreshToken(refreshToken),
      },
      include: { tenant: { select: tenantSelect() } },
    });
    setAuthCookies(res, { accessToken, refreshToken });
    res.json({ user: await serializeUser(updated) });
  } catch (err) {
    next(err);
  }
}
