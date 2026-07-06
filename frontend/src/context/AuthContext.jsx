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
import {
  getExpectedUserUrl,
  getTenantHostContext,
} from "../lib/tenantHost.js";
import { getPostLoginPath } from "../lib/authRedirect.js";

const AuthContext = createContext(null);
const AUTH_CHANNEL_NAME = "tailor-auth-session";

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const syncUserHost = useCallback((nextUser, pathname) => {
    const targetPath = pathname || getPostLoginPath(nextUser);
    const expectedUrl = getExpectedUserUrl(nextUser, targetPath);
    const hostContext = getTenantHostContext();
    if (!expectedUrl || hostContext.hostType === "local") {
      return false;
    }
    const expected = new URL(expectedUrl, window.location.origin);
    if (expected.host !== window.location.host) {
      window.location.href = expected.href;
      return true;
    }
    return false;
  }, []);

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
        if (!cancelled && !syncUserHost(data, getPostLoginPath(data))) setUser(data);
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
  }, [clearSessionState, syncUserHost]);

  useEffect(() => {
    document.title =
      user?.tenant?.systemName || "Tailoring Management System";
  }, [user?.tenant?.systemName]);

  const login = useCallback(async (phoneNumber, password, fromPath) => {
    const hostContext = getTenantHostContext();
    const payload = {
      phoneNumber,
      password,
      ...(hostContext.hostType === "tenant" && hostContext.tenantSlug
        ? { tenantSlug: hostContext.tenantSlug }
        : {}),
    };
    const { data } = await api.post("/auth/login", payload);
    if (syncUserHost(data.user, getPostLoginPath(data.user, fromPath))) {
      return data.user;
    }
    setUser(data.user);
    return data.user;
  }, [syncUserHost]);

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
