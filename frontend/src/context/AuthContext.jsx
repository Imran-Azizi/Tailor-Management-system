import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

function loadUser() {
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem('authUser', JSON.stringify(data));
      })
      .catch(() => {
        // Token invalid — clear everything
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('authUser');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (phoneNumber, password) => {
    const { data } = await api.post('/auth/login', { phoneNumber, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('authUser', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');
    setUser(null);
  }, []);

  const isAdmin = user?.accountType === 'ADMIN';
  const isDokan = user?.accountType === 'DOKAN';
  const isDokht = user?.accountType === 'DOKHT';
  const isQichikar = user?.accountType === 'QICHIKAR';
  const isWorker = isDokht || isQichikar;
  const canManageOrders = isAdmin || isDokan;

  // Helper to check if user has a specific role
  const hasRole = (...roles) => roles.includes(user?.accountType);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isDokan, isDokht, isQichikar, isWorker, canManageOrders, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
