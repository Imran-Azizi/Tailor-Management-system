export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: "dashboard.view",

  // Order module (API/action level)
  ORDERS_VIEW: "orders.view",
  ORDERS_CREATE: "orders.create",
  ORDERS_EDIT: "orders.edit",
  ORDERS_DELETE: "orders.delete",
  ORDERS_PRINT: "orders.print",
  ORDERS_DELIVER: "orders.deliver",
  ORDERS_ASSIGN: "orders.assign",

  // Order module (page level — one per sidebar link)
  ORDERS_ALL_VIEW: "orders.all.view",
  ORDERS_PENDING_VIEW: "orders.pending.view",
  ORDERS_COMPLETED_VIEW: "orders.completed.view",
  ORDERS_COMPLETED_WORKERS_VIEW: "orders.completedWorkers.view",
  ORDERS_DAMAGED_VIEW: "orders.damaged.view",

  FINANCE_VIEW: "finance.view",
  FINANCE_EXPENSES_ADD: "finance.expenses.add",
  FINANCE_EXPENSES_EDIT: "finance.expenses.edit",
  FINANCE_EXPENSES_DELETE: "finance.expenses.delete",
  FINANCE_REVENUE_VIEW: "finance.revenue.view",
  FINANCE_PROFIT_VIEW: "finance.profit.view",
  FINANCE_DEBT_RECORDS_VIEW: "finance.debtRecords.view",
  FINANCE_PAYMENTS_MANAGE: "finance.payments.manage",

  // Finance module (page level)
  WORKER_RECEIPTS_VIEW: "finance.workerReceipts.view",
  TRANSACTIONS_CREATE_VIEW: "finance.makeTransaction.view",
  TRANSACTIONS_VIEW: "finance.loans.view",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_PRODUCTS_ADD: "inventory.products.add",
  INVENTORY_PRODUCTS_EDIT: "inventory.products.edit",
  INVENTORY_PRODUCTS_DELETE: "inventory.products.delete",
  INVENTORY_PRODUCTS_SELL: "inventory.products.sell",
  INVENTORY_CATEGORIES_MANAGE: "inventory.categories.manage",

  // Inventory module (page level)
  RAKHT_LIST_VIEW: "rakht.list.view",
  RAKHT_PAYMENTS_VIEW: "rakht.payments.view",
  ITEM_SALES_VIEW: "inventory.itemSales.view",

  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  REPORTS_PRINT: "reports.print",

  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",
  PERMISSIONS_MANAGE: "permissions.manage",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",

  // Settings module (page level)
  SETTINGS_TENANT_VIEW: "settings.tenant.view",
  SETTINGS_DESIGNS_VIEW: "settings.designs.view",
  SETTINGS_NOTIFICATIONS_VIEW: "settings.notifications.view",

  SUPPORT_VIEW: "support.view",
});

export const PERMISSION_CATALOG = Object.freeze([
  { code: PERMISSIONS.DASHBOARD_VIEW, group: "dashboard" },

  { code: PERMISSIONS.ORDERS_VIEW, group: "orders" },
  { code: PERMISSIONS.ORDERS_ALL_VIEW, group: "orders" },
  { code: PERMISSIONS.ORDERS_PENDING_VIEW, group: "orders" },
  { code: PERMISSIONS.ORDERS_COMPLETED_VIEW, group: "orders" },
  { code: PERMISSIONS.ORDERS_COMPLETED_WORKERS_VIEW, group: "orders" },
  { code: PERMISSIONS.ORDERS_DAMAGED_VIEW, group: "orders" },
  { code: PERMISSIONS.ORDERS_CREATE, group: "orders" },
  { code: PERMISSIONS.ORDERS_EDIT, group: "orders" },
  { code: PERMISSIONS.ORDERS_DELETE, group: "orders" },
  { code: PERMISSIONS.ORDERS_PRINT, group: "orders" },
  { code: PERMISSIONS.ORDERS_DELIVER, group: "orders" },
  { code: PERMISSIONS.ORDERS_ASSIGN, group: "orders" },

  { code: PERMISSIONS.FINANCE_VIEW, group: "finance" },
  { code: PERMISSIONS.FINANCE_EXPENSES_ADD, group: "finance" },
  { code: PERMISSIONS.FINANCE_EXPENSES_EDIT, group: "finance" },
  { code: PERMISSIONS.FINANCE_EXPENSES_DELETE, group: "finance" },
  { code: PERMISSIONS.FINANCE_REVENUE_VIEW, group: "finance" },
  { code: PERMISSIONS.FINANCE_PROFIT_VIEW, group: "finance" },
  { code: PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW, group: "finance" },
  { code: PERMISSIONS.FINANCE_PAYMENTS_MANAGE, group: "finance" },
  { code: PERMISSIONS.WORKER_RECEIPTS_VIEW, group: "finance" },
  { code: PERMISSIONS.TRANSACTIONS_CREATE_VIEW, group: "finance" },
  { code: PERMISSIONS.TRANSACTIONS_VIEW, group: "finance" },

  { code: PERMISSIONS.INVENTORY_VIEW, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_PRODUCTS_ADD, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_PRODUCTS_EDIT, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_PRODUCTS_DELETE, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_PRODUCTS_SELL, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_CATEGORIES_MANAGE, group: "inventory" },
  { code: PERMISSIONS.RAKHT_LIST_VIEW, group: "inventory" },
  { code: PERMISSIONS.RAKHT_PAYMENTS_VIEW, group: "inventory" },
  { code: PERMISSIONS.ITEM_SALES_VIEW, group: "inventory" },

  { code: PERMISSIONS.REPORTS_VIEW, group: "reports" },
  { code: PERMISSIONS.REPORTS_EXPORT, group: "reports" },
  { code: PERMISSIONS.REPORTS_PRINT, group: "reports" },

  { code: PERMISSIONS.USERS_VIEW, group: "users" },
  { code: PERMISSIONS.USERS_CREATE, group: "users" },
  { code: PERMISSIONS.USERS_EDIT, group: "users" },
  { code: PERMISSIONS.USERS_DELETE, group: "users" },
  { code: PERMISSIONS.PERMISSIONS_MANAGE, group: "users" },

  { code: PERMISSIONS.SETTINGS_VIEW, group: "settings" },
  { code: PERMISSIONS.SETTINGS_UPDATE, group: "settings" },
  { code: PERMISSIONS.SETTINGS_TENANT_VIEW, group: "settings" },
  { code: PERMISSIONS.SETTINGS_DESIGNS_VIEW, group: "settings" },
  { code: PERMISSIONS.SETTINGS_NOTIFICATIONS_VIEW, group: "settings" },

  { code: PERMISSIONS.SUPPORT_VIEW, group: "settings" },
]);

export const ALL_PERMISSION_CODES = Object.freeze(
  PERMISSION_CATALOG.map((permission) => permission.code),
);

/**
 * Forward-only: page permission -> module/API permission needed for its data.
 * Never expands module codes back into other page permissions.
 */
export const MODULE_IMPLIED_PERMISSIONS = Object.freeze({
  [PERMISSIONS.ORDERS_ALL_VIEW]: [PERMISSIONS.ORDERS_VIEW],
  [PERMISSIONS.ORDERS_PENDING_VIEW]: [PERMISSIONS.ORDERS_VIEW],
  [PERMISSIONS.ORDERS_COMPLETED_VIEW]: [PERMISSIONS.ORDERS_VIEW],
  [PERMISSIONS.ORDERS_COMPLETED_WORKERS_VIEW]: [PERMISSIONS.ORDERS_VIEW],
  [PERMISSIONS.ORDERS_DAMAGED_VIEW]: [PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW],
  [PERMISSIONS.ORDERS_CREATE]: [PERMISSIONS.ORDERS_VIEW],
  [PERMISSIONS.WORKER_RECEIPTS_VIEW]: [PERMISSIONS.FINANCE_PAYMENTS_MANAGE],
  [PERMISSIONS.TRANSACTIONS_CREATE_VIEW]: [PERMISSIONS.FINANCE_PAYMENTS_MANAGE],
  [PERMISSIONS.TRANSACTIONS_VIEW]: [PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW],
  [PERMISSIONS.RAKHT_LIST_VIEW]: [PERMISSIONS.INVENTORY_VIEW],
  [PERMISSIONS.RAKHT_PAYMENTS_VIEW]: [PERMISSIONS.FINANCE_PAYMENTS_MANAGE],
  [PERMISSIONS.ITEM_SALES_VIEW]: [PERMISSIONS.INVENTORY_VIEW],
  [PERMISSIONS.SETTINGS_TENANT_VIEW]: [PERMISSIONS.SETTINGS_VIEW],
  [PERMISSIONS.SETTINGS_DESIGNS_VIEW]: [PERMISSIONS.SETTINGS_VIEW],
  [PERMISSIONS.SETTINGS_NOTIFICATIONS_VIEW]: [PERMISSIONS.SETTINGS_VIEW],
});

/** Expand granted codes with module/API permissions required for backend access. */
export function expandModulePermissionCodes(codes) {
  const result = new Set();
  for (const code of codes || []) {
    if (!code) continue;
    result.add(code);
    for (const implied of MODULE_IMPLIED_PERMISSIONS[code] || []) {
      result.add(implied);
    }
  }
  return [...result];
}

export const DEFAULT_ROLE_PERMISSIONS = Object.freeze({
  ADMIN: ALL_PERMISSION_CODES,
  // Dokan and Finance users start with zero permissions; the admin assigns
  // each permission individually on the اجازه‌ها page.
  DOKAN: [],
  FINANCE: [],
});

export const RBAC_MANAGED_ACCOUNT_TYPES = Object.freeze(["DOKAN", "FINANCE"]);
