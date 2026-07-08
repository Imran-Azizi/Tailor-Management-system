import { getSidebarFooterItems, getSidebarSections } from "../components/sidebar/sidebarConfig.js";
import { ROUTE_PERMISSIONS } from "./permissions.js";

const MANAGED_PERMISSION_ROLES = new Set(["DOKAN", "FINANCE"]);

function isManagedPermissionRole(accountType) {
  return MANAGED_PERMISSION_ROLES.has(accountType);
}

function normalizePath(path) {
  if (!path) return "/";
  return String(path).split("?")[0].split("#")[0] || "/";
}

function getNavigableItems(role) {
  return [...getSidebarSections(role), { key: "footer", items: getSidebarFooterItems(role) }]
    .flatMap((section) => section.items || []);
}

function flattenPaths(items = []) {
  const paths = [];
  for (const item of items) {
    if (item.children?.length) {
      paths.push(...flattenPaths(item.children));
      continue;
    }
    if (item.path) paths.push(item.path);
  }
  return paths;
}

export function canAccessPath(user, path) {
  if (!user || !path) return false;
  if (user.accountType === "SUPER_ADMIN" || user.accountType === "ADMIN") return true;
  if (user.accountType === "DOKHT" || user.accountType === "QICHIKAR") {
    return normalizePath(path).startsWith("/panel");
  }

  const normalizedPath = normalizePath(path);
  const requiredPermission = ROUTE_PERMISSIONS[normalizedPath];
  if (isManagedPermissionRole(user.accountType) && !requiredPermission) return false;

  const permissions = new Set(user.permissions || []);
  return !requiredPermission || permissions.has(requiredPermission);
}

export function getFirstAllowedPath(user) {
  if (!user) return "/login";
  if (user.accountType === "SUPER_ADMIN") return "/super-admin";
  if (user.accountType === "DOKHT" || user.accountType === "QICHIKAR") {
    return "/panel/dashboard";
  }

  const candidatePaths = flattenPaths(getNavigableItems(user.accountType));
  const firstAllowed = candidatePaths.find((path) => canAccessPath(user, path));
  return firstAllowed || "/access-denied";
}

export function getPostLoginPath(user, from = "/") {
  if (!user) return "/login";
  const firstAllowedPath = getFirstAllowedPath(user);
  const normalizedFrom = normalizePath(from);
  if (
    normalizedFrom &&
    normalizedFrom !== "/login" &&
    normalizedFrom !== "/" &&
    canAccessPath(user, normalizedFrom)
  ) {
    return from;
  }
  return firstAllowedPath;
}
