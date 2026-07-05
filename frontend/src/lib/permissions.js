export const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: "dashboard.view",

  ORDERS_VIEW: "orders.view",
  ORDERS_CREATE: "orders.create",
  ORDERS_EDIT: "orders.edit",
  ORDERS_DELETE: "orders.delete",
  ORDERS_PRINT: "orders.print",
  ORDERS_DELIVER: "orders.deliver",
  ORDERS_ASSIGN: "orders.assign",

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_EDIT: "customers.edit",
  CUSTOMERS_DELETE: "customers.delete",

  FINANCE_VIEW: "finance.view",
  FINANCE_EXPENSES_ADD: "finance.expenses.add",
  FINANCE_EXPENSES_EDIT: "finance.expenses.edit",
  FINANCE_EXPENSES_DELETE: "finance.expenses.delete",
  FINANCE_REVENUE_VIEW: "finance.revenue.view",
  FINANCE_PROFIT_VIEW: "finance.profit.view",
  FINANCE_DEBT_RECORDS_VIEW: "finance.debtRecords.view",
  FINANCE_PAYMENTS_MANAGE: "finance.payments.manage",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_PRODUCTS_ADD: "inventory.products.add",
  INVENTORY_PRODUCTS_EDIT: "inventory.products.edit",
  INVENTORY_PRODUCTS_DELETE: "inventory.products.delete",
  INVENTORY_PRODUCTS_SELL: "inventory.products.sell",
  INVENTORY_CATEGORIES_MANAGE: "inventory.categories.manage",

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
});

export const ALL_PERMISSION_CODES = Object.freeze(Object.values(PERMISSIONS));

export const PERMISSION_GROUP_ORDER = Object.freeze([
  "dashboard",
  "orders",
  "customers",
  "finance",
  "inventory",
  "reports",
  "users",
  "settings",
]);

export const ROUTE_PERMISSIONS = Object.freeze({
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/orders/create": PERMISSIONS.ORDERS_CREATE,
  "/orders": PERMISSIONS.ORDERS_VIEW,
  "/orders/pending": PERMISSIONS.ORDERS_VIEW,
  "/orders/completed": PERMISSIONS.ORDERS_VIEW,
  "/orders/remaining": PERMISSIONS.ORDERS_VIEW,
  "/orders/global-search": PERMISSIONS.ORDERS_VIEW,
  "/orders/assignments/report": PERMISSIONS.REPORTS_VIEW,
  "/orders/assignments/clothes": PERMISSIONS.ORDERS_ASSIGN,
  "/orders/completed-workers": PERMISSIONS.ORDERS_VIEW,
  "/orders/completed-workers/receipts": PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
  "/delivery": PERMISSIONS.ORDERS_DELIVER,
  "/print-bills": PERMISSIONS.ORDERS_PRINT,
  "/daily-tasks": PERMISSIONS.FINANCE_EXPENSES_ADD,
  "/daily-tasks/all": PERMISSIONS.FINANCE_VIEW,
  "/rakht/create": PERMISSIONS.INVENTORY_PRODUCTS_ADD,
  "/rakhts": PERMISSIONS.INVENTORY_VIEW,
  "/rakhts/payment-history": PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
  "/rakhts/revenue": PERMISSIONS.FINANCE_REVENUE_VIEW,
  "/transactions/create": PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
  "/transactions": PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
  "/other-items": PERMISSIONS.INVENTORY_PRODUCTS_SELL,
  "/item-sales-records": PERMISSIONS.INVENTORY_VIEW,
  "/users": PERMISSIONS.USERS_VIEW,
  "/permissions": PERMISSIONS.PERMISSIONS_MANAGE,
  "/customers": PERMISSIONS.CUSTOMERS_VIEW,
  "/customers/create": PERMISSIONS.CUSTOMERS_CREATE,
  "/customers/transactions": PERMISSIONS.CUSTOMERS_VIEW,
  "/customers/report": PERMISSIONS.CUSTOMERS_VIEW,
  "/tenant-settings": PERMISSIONS.SETTINGS_VIEW,
  "/designs": PERMISSIONS.SETTINGS_VIEW,
  "/boxes": PERMISSIONS.INVENTORY_CATEGORIES_MANAGE,
  "/notifications": PERMISSIONS.SETTINGS_VIEW,
  "/damaged-clothes": PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
});

export function normalizePermissionList(permissions) {
  return Array.isArray(permissions)
    ? permissions.map((permission) => String(permission || "").trim()).filter(Boolean)
    : [];
}
