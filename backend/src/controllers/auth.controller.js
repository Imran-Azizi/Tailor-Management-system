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

/** POST /api/auth/login */
export async function login(req, res, next) {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { phoneNumber: phoneNumber.trim() } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    if (!user.isActive) return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const accessToken = signAccess(user.id);
    const refreshToken = signRefresh(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email ?? null,
        accountType: user.accountType,
      },
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

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      return res.status(401).json({ error: 'Token revoked or invalid.' });
    }

    const newAccess = signAccess(user.id);
    const newRefresh = signRefresh(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefresh } });

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
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
  res.json({
    id: req.user.id,
    name: req.user.name,
    phoneNumber: req.user.phoneNumber,
    email: req.user.email ?? null,
    accountType: req.user.accountType,
  });
}
