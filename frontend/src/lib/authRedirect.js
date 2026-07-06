import { PERMISSIONS } from "./permissions.js";

export function getPostLoginPath(user, from = "/") {
  if (!user) return "/login";

  if (user.accountType === "SUPER_ADMIN") {
    return "/super-admin";
  }

  if (user.accountType === "DOKHT" || user.accountType === "QICHIKAR") {
    return "/panel/dashboard";
  }

  const permissions = new Set(user.permissions || []);
  const has = (permission) =>
    user.accountType === "ADMIN" ||
    user.accountType === "SUPER_ADMIN" ||
    permissions.has(permission);

  if (from && from !== "/login" && from !== "/dashboard" && from !== "/") {
    return from;
  }
  if (has(PERMISSIONS.DASHBOARD_VIEW)) return "/dashboard";
  if (has(PERMISSIONS.ORDERS_CREATE)) return "/orders/create";
  if (has(PERMISSIONS.ORDERS_VIEW)) return "/orders";
  if (has(PERMISSIONS.FINANCE_VIEW)) return "/daily-tasks/all";
  if (has(PERMISSIONS.FINANCE_EXPENSES_ADD)) return "/daily-tasks";
  if (has(PERMISSIONS.INVENTORY_VIEW)) return "/item-sales-records";
  if (has(PERMISSIONS.INVENTORY_PRODUCTS_SELL)) return "/other-items";
  if (has(PERMISSIONS.SETTINGS_VIEW)) return "/tenant-settings";
  return "/support-team";
}
