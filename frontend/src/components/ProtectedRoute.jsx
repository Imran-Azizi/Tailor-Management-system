import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import AccessDenied from "../pages/AccessDenied.jsx";
import { getPostLoginPath } from "../lib/authRedirect.js";

const WORKER_ROLES = ["DOKHT", "QICHIKAR"];
const MAIN_PANEL_ROLES = ["SUPER_ADMIN", "ADMIN", "DOKAN", "FINANCE"];

function LoadingSpinner({ color = "var(--primary)" }) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border)",
            borderTopColor: color,
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            margin: "0 auto 12px",
          }}
        />
        <p style={{ fontSize: 13, color: "var(--text3)" }}>
          {t("common.loading")}
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/**
 * Guards the admin system (/dashboard and all nested routes).
 * - Not authenticated   → /login
 * - DOKHT / QICHIKAR   → /panel  (their own area)
 * - Any other non-admin → /login
 */
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (WORKER_ROLES.includes(user.accountType)) {
    return <Navigate to="/panel/dashboard" replace />;
  }

  if (!MAIN_PANEL_ROLES.includes(user.accountType)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Guards the worker panel (/panel).
 * - Not authenticated → /login
 * - ADMIN             → /dashboard
 * - Any other role    → /login
 */
export function WorkerProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner color="#D97706" />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.accountType === "ADMIN" || user.accountType === "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  if (!WORKER_ROLES.includes(user.accountType)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/** Shows a professional denied state if user lacks the required role/permission. */
export function RoleRoute({
  children,
  roles,
  permission,
  permissions,
  permissionRoles,
}) {
  const { user, hasPermission, hasAnyPermission } = useAuth();
  if (roles && !roles.includes(user?.accountType)) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }
  const requiredPermissions = permissions || (permission ? [permission] : []);
  const shouldEnforcePermission =
    requiredPermissions.length &&
    (!permissionRoles || permissionRoles.includes(user?.accountType));
  if (shouldEnforcePermission && !hasAnyPermission(requiredPermissions)) {
    return <AccessDenied />;
  }
  if (
    permission &&
    shouldEnforcePermission &&
    !hasPermission(permission)
  ) {
    return <AccessDenied />;
  }
  return children;
}
