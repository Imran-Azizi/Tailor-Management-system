export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: "dashboard.view",

  ORDERS_VIEW: "orders.view",
  ORDERS_CREATE: "orders.create",
  ORDERS_EDIT: "orders.edit",
  ORDERS_DELETE: "orders.delete",
  ORDERS_PRINT: "orders.print",
  ORDERS_DELIVER: "orders.deliver",
  ORDERS_ASSIGN: "orders.assign",

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

  WORKER_RECEIPTS_VIEW: "finance.workerReceipts.view",
  TRANSACTIONS_CREATE_VIEW: "finance.makeTransaction.view",
  TRANSACTIONS_VIEW: "finance.loans.view",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_PRODUCTS_ADD: "inventory.products.add",
  INVENTORY_PRODUCTS_EDIT: "inventory.products.edit",
  INVENTORY_PRODUCTS_DELETE: "inventory.products.delete",
  INVENTORY_PRODUCTS_SELL: "inventory.products.sell",
  INVENTORY_CATEGORIES_MANAGE: "inventory.categories.manage",

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

  SETTINGS_TENANT_VIEW: "settings.tenant.view",
  SETTINGS_DESIGNS_VIEW: "settings.designs.view",
  SETTINGS_NOTIFICATIONS_VIEW: "settings.notifications.view",

  SUPPORT_VIEW: "support.view",
});

export const ALL_PERMISSION_CODES = Object.freeze(Object.values(PERMISSIONS));

/** Module/API codes that back page permissions; hidden from the toggle UI. */
export const IMPLIED_MODULE_CODES = Object.freeze(new Set([
  PERMISSIONS.ORDERS_VIEW,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
  PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
]));

export const PERMISSION_GROUP_ORDER = Object.freeze([
  "dashboard",
  "orders",
  "finance",
  "inventory",
  "reports",
  "users",
  "settings",
]);

export const ROUTE_PERMISSIONS = Object.freeze({
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/orders/create": PERMISSIONS.ORDERS_CREATE,
  "/orders": PERMISSIONS.ORDERS_ALL_VIEW,
  "/orders/pending": PERMISSIONS.ORDERS_PENDING_VIEW,
  "/orders/completed": PERMISSIONS.ORDERS_COMPLETED_VIEW,
  "/orders/remaining": PERMISSIONS.ORDERS_ALL_VIEW,
  "/orders/global-search": PERMISSIONS.ORDERS_ALL_VIEW,
  "/orders/assignments/report": PERMISSIONS.REPORTS_VIEW,
  "/orders/assignments/clothes": PERMISSIONS.ORDERS_ASSIGN,
  "/orders/completed-workers": PERMISSIONS.ORDERS_COMPLETED_WORKERS_VIEW,
  "/orders/completed-workers/receipts": PERMISSIONS.WORKER_RECEIPTS_VIEW,
  "/delivery": PERMISSIONS.ORDERS_DELIVER,
  "/print-bills": PERMISSIONS.ORDERS_PRINT,
  "/damaged-clothes": PERMISSIONS.ORDERS_DAMAGED_VIEW,
  "/daily-tasks": PERMISSIONS.FINANCE_EXPENSES_ADD,
  "/daily-tasks/all": PERMISSIONS.FINANCE_VIEW,
  "/rakht/create": PERMISSIONS.INVENTORY_PRODUCTS_ADD,
  "/rakhts": PERMISSIONS.RAKHT_LIST_VIEW,
  "/rakhts/payment-history": PERMISSIONS.RAKHT_PAYMENTS_VIEW,
  "/rakhts/revenue": PERMISSIONS.FINANCE_REVENUE_VIEW,
  "/transactions/create": PERMISSIONS.TRANSACTIONS_CREATE_VIEW,
  "/transactions": PERMISSIONS.TRANSACTIONS_VIEW,
  "/other-items": PERMISSIONS.INVENTORY_PRODUCTS_SELL,
  "/item-sales-records": PERMISSIONS.ITEM_SALES_VIEW,
  "/users": PERMISSIONS.USERS_VIEW,
  "/permissions": PERMISSIONS.PERMISSIONS_MANAGE,
  "/tenant-settings": PERMISSIONS.SETTINGS_TENANT_VIEW,
  "/designs": PERMISSIONS.SETTINGS_DESIGNS_VIEW,
  "/boxes": PERMISSIONS.INVENTORY_CATEGORIES_MANAGE,
  "/notifications": PERMISSIONS.SETTINGS_NOTIFICATIONS_VIEW,
  "/support-team": PERMISSIONS.SUPPORT_VIEW,
});

export function normalizePermissionList(permissions) {
  return Array.isArray(permissions)
    ? permissions.map((permission) => String(permission || "").trim()).filter(Boolean)
    : [];
}
