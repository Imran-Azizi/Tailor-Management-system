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

export const PERMISSION_CATALOG = Object.freeze([
  { code: PERMISSIONS.DASHBOARD_VIEW, group: "dashboard" },

  { code: PERMISSIONS.ORDERS_VIEW, group: "orders" },
  { code: PERMISSIONS.ORDERS_CREATE, group: "orders" },
  { code: PERMISSIONS.ORDERS_EDIT, group: "orders" },
  { code: PERMISSIONS.ORDERS_DELETE, group: "orders" },
  { code: PERMISSIONS.ORDERS_PRINT, group: "orders" },
  { code: PERMISSIONS.ORDERS_DELIVER, group: "orders" },
  { code: PERMISSIONS.ORDERS_ASSIGN, group: "orders" },

  { code: PERMISSIONS.CUSTOMERS_VIEW, group: "customers" },
  { code: PERMISSIONS.CUSTOMERS_CREATE, group: "customers" },
  { code: PERMISSIONS.CUSTOMERS_EDIT, group: "customers" },
  { code: PERMISSIONS.CUSTOMERS_DELETE, group: "customers" },

  { code: PERMISSIONS.FINANCE_VIEW, group: "finance" },
  { code: PERMISSIONS.FINANCE_EXPENSES_ADD, group: "finance" },
  { code: PERMISSIONS.FINANCE_EXPENSES_EDIT, group: "finance" },
  { code: PERMISSIONS.FINANCE_EXPENSES_DELETE, group: "finance" },
  { code: PERMISSIONS.FINANCE_REVENUE_VIEW, group: "finance" },
  { code: PERMISSIONS.FINANCE_PROFIT_VIEW, group: "finance" },
  { code: PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW, group: "finance" },
  { code: PERMISSIONS.FINANCE_PAYMENTS_MANAGE, group: "finance" },

  { code: PERMISSIONS.INVENTORY_VIEW, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_PRODUCTS_ADD, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_PRODUCTS_EDIT, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_PRODUCTS_DELETE, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_PRODUCTS_SELL, group: "inventory" },
  { code: PERMISSIONS.INVENTORY_CATEGORIES_MANAGE, group: "inventory" },

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
]);

export const ALL_PERMISSION_CODES = Object.freeze(
  PERMISSION_CATALOG.map((permission) => permission.code),
);

export const DEFAULT_ROLE_PERMISSIONS = Object.freeze({
  ADMIN: ALL_PERMISSION_CODES,
  DOKAN: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
  ],
  FINANCE: [
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.ORDERS_PRINT,
    PERMISSIONS.ORDERS_DELIVER,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_EXPENSES_ADD,
    PERMISSIONS.FINANCE_REVENUE_VIEW,
    PERMISSIONS.FINANCE_PROFIT_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_PRODUCTS_ADD,
    PERMISSIONS.INVENTORY_PRODUCTS_EDIT,
    PERMISSIONS.INVENTORY_PRODUCTS_SELL,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_PRINT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,
  ],
});

export const RBAC_MANAGED_ACCOUNT_TYPES = Object.freeze(["DOKAN", "FINANCE"]);
