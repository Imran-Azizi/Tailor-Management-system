import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, {
  clearCsrfToken,
  setAuthSessionExpiredHandler,
} from "../lib/api.js";
import { normalizePermissionList } from "../lib/permissions.js";

const AuthContext = createContext(null);
const AUTH_CHANNEL_NAME = "tailor-auth-session";

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const clearSessionState = useCallback(() => {
    setUser(null);
    clearCsrfToken();
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setAuthSessionExpiredHandler(clearSessionState);
    return () => setAuthSessionExpiredHandler(null);
  }, [clearSessionState]);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return undefined;

    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === "logout" || event.data?.type === "session-expired") {
        clearSessionState();
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [clearSessionState]);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me", { skipAuthRedirect: true })
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) clearSessionState();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clearSessionState]);

  useEffect(() => {
    document.title =
      user?.tenant?.systemName || "Tailoring Management System";
  }, [user?.tenant?.systemName]);

  const login = useCallback(async (phoneNumber, password) => {
    const { data } = await api.post("/auth/login", {
      phoneNumber,
      password,
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    clearSessionState();
    channelRef.current?.postMessage({ type: "logout" });
  }, [clearSessionState]);

  const updateTenant = useCallback((tenant) => {
    setUser((current) => {
      if (!current) return current;
      return { ...current, tenant };
    });
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser((current) => {
      if (!current) return nextUser;
      return typeof nextUser === "function" ? nextUser(current) : { ...current, ...nextUser };
    });
  }, []);

  const isAdmin = user?.accountType === "ADMIN";
  const isSuperAdmin = user?.accountType === "SUPER_ADMIN";
  const isDokan = user?.accountType === "DOKAN";
  const isDokht = user?.accountType === "DOKHT";
  const isQichikar = user?.accountType === "QICHIKAR";
  const isFinance = user?.accountType === "FINANCE";
  const isWorker = isDokht || isQichikar;
  const canManageOrders = isAdmin || isDokan;
  const permissions = useMemo(
    () => normalizePermissionList(user?.permissions),
    [user?.permissions],
  );
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const hasRole = useCallback(
    (...roles) => roles.includes(user?.accountType),
    [user?.accountType],
  );
  const hasPermission = useCallback(
    (permission) =>
      isAdmin ||
      isSuperAdmin ||
      !permission ||
      permissionSet.has(permission),
    [isAdmin, isSuperAdmin, permissionSet],
  );
  const hasAnyPermission = useCallback(
    (...nextPermissions) =>
      isAdmin ||
      isSuperAdmin ||
      nextPermissions.flat().some((permission) => permissionSet.has(permission)),
    [isAdmin, isSuperAdmin, permissionSet],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      updateTenant,
      updateUser,
      isAdmin,
      isSuperAdmin,
      isDokan,
      isDokht,
      isQichikar,
      isFinance,
      isWorker,
      canManageOrders,
      permissions,
      hasRole,
      hasPermission,
      hasAnyPermission,
    }),
    [
      user,
      loading,
      login,
      logout,
      updateTenant,
      updateUser,
      isAdmin,
      isSuperAdmin,
      isDokan,
      isDokht,
      isQichikar,
      isFinance,
      isWorker,
      canManageOrders,
      permissions,
      hasRole,
      hasPermission,
      hasAnyPermission,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
