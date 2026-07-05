import {
  LuArchive,
  LuBell,
  LuChartColumn,
  LuClipboardCheck,
  LuClipboardList,
  LuFactory,
  LuFileText,
  LuLayoutDashboard,
  LuListChecks,
  LuListTodo,
  LuPackage,
  LuPackagePlus,
  LuPalette,
  LuPencil,
  LuPrinter,
  LuScissors,
  LuSearchCode,
  LuSettings,
  LuShieldAlert,
  LuShieldCheck,
  LuShoppingBag,
  LuTrash2,
  LuTruck,
  LuUserCheck,
  LuUserPlus,
  LuWallet,
} from "react-icons/lu";
import { PERMISSIONS } from "./permissions.js";

/** Permission codes excluded from the admin UI (still enforced by the backend). */
export const HIDDEN_UI_PERMISSION_CODES = new Set([
  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_EDIT,
  PERMISSIONS.CUSTOMERS_DELETE,
  PERMISSIONS.REPORTS_EXPORT,
  PERMISSIONS.REPORTS_PRINT,
  PERMISSIONS.INVENTORY_PRODUCTS_EDIT,
  PERMISSIONS.INVENTORY_PRODUCTS_DELETE,
]);

/**
 * When several sidebar pages share one permission code, show a single toggle
 * keyed by that permission so selecting one row does not appear to select many.
 */
export function dedupeCategoryItems(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.permission, (counts.get(item.permission) || 0) + 1);
  }

  const seen = new Set();
  return items.flatMap((item) => {
    if (seen.has(item.permission)) return [];
    seen.add(item.permission);

    const duplicated = (counts.get(item.permission) || 0) > 1;
    if (item.type === "page" && duplicated) {
      return [
        {
          ...item,
          key: `perm-${item.permission}`,
          usePermissionLabel: true,
          hideSubtitle: true,
        },
      ];
    }
    return [item];
  });
}

/**
 * Permission categories mirroring the sidebar navigation structure, so
 * administrators can find permissions the same way users find pages.
 *
 * - type "page":   a submenu link in the sidebar; the toggle controls the
 *                  permission that unlocks that page.
 * - type "action": an operation inside a page (edit/delete buttons, etc.)
 *                  that has no menu link of its own.
 *
 * Several menu links can share one permission code (e.g. all order lists use
 * "orders.view"); their toggles stay in sync because they represent the same
 * underlying permission.
 */
export const PERMISSION_CATEGORIES = [
  {
    key: "dashboard",
    labelKey: "common.dashboard",
    fallback: "Dashboard",
    icon: LuLayoutDashboard,
    items: [
      {
        key: "dashboardView",
        type: "page",
        labelKey: "common.dashboard",
        fallback: "Dashboard",
        icon: LuLayoutDashboard,
        permission: PERMISSIONS.DASHBOARD_VIEW,
      },
      {
        key: "profitView",
        type: "action",
        icon: LuChartColumn,
        permission: PERMISSIONS.FINANCE_PROFIT_VIEW,
      },
    ],
  },
  {
    key: "orders",
    labelKey: "sidebar.orders",
    fallback: "Orders",
    icon: LuPackage,
    items: [
      {
        key: "createOrder",
        type: "page",
        labelKey: "common.createOrder",
        fallback: "Create Order",
        icon: LuPackagePlus,
        permission: PERMISSIONS.ORDERS_CREATE,
      },
      {
        key: "allOrders",
        type: "page",
        labelKey: "common.allOrders",
        fallback: "All Orders",
        icon: LuPackage,
        permission: PERMISSIONS.ORDERS_VIEW,
      },
      {
        key: "pendingOrders",
        type: "page",
        labelKey: "common.pendingOrders",
        fallback: "Pending Orders",
        icon: LuListTodo,
        permission: PERMISSIONS.ORDERS_VIEW,
      },
      {
        key: "completedOrders",
        type: "page",
        labelKey: "common.completedOrders",
        fallback: "Completed Orders",
        icon: LuListChecks,
        permission: PERMISSIONS.ORDERS_VIEW,
      },
      {
        key: "globalSearch",
        type: "page",
        labelKey: "globalSearch.title",
        fallback: "Global Search",
        icon: LuSearchCode,
        permission: PERMISSIONS.ORDERS_VIEW,
      },
      {
        key: "clothesStatus",
        type: "page",
        labelKey: "sidebar.clothesStatus",
        fallback: "Clothes Status",
        icon: LuClipboardCheck,
        permission: PERMISSIONS.REPORTS_VIEW,
      },
      {
        key: "damagedClothes",
        type: "page",
        labelKey: "sidebar.damagedClothes",
        fallback: "Damaged Clothes",
        icon: LuShieldAlert,
        permission: PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
      },
      {
        key: "printBills",
        type: "page",
        labelKey: "orders.printBills",
        fallback: "Print Bills",
        icon: LuPrinter,
        permission: PERMISSIONS.ORDERS_PRINT,
      },
      {
        key: "delivery",
        type: "page",
        labelKey: "sidebar.clothesDelivery",
        fallback: "Delivery",
        icon: LuTruck,
        permission: PERMISSIONS.ORDERS_DELIVER,
      },
      {
        key: "editOrders",
        type: "action",
        icon: LuPencil,
        permission: PERMISSIONS.ORDERS_EDIT,
      },
      {
        key: "deleteOrders",
        type: "action",
        icon: LuTrash2,
        permission: PERMISSIONS.ORDERS_DELETE,
      },
    ],
  },
  {
    key: "assignment",
    labelKey: "assignment.assignOrder",
    fallback: "Assign Order",
    icon: LuUserCheck,
    items: [
      {
        key: "clothesToWorkers",
        type: "page",
        labelKey: "assignment.clothesToWorkers",
        fallback: "Clothes to Workers",
        icon: LuScissors,
        permission: PERMISSIONS.ORDERS_ASSIGN,
      },
      {
        key: "completedWorkers",
        type: "page",
        labelKey: "sidebar.completedFromWorkers",
        fallback: "Completed from Workers",
        icon: LuListChecks,
        permission: PERMISSIONS.ORDERS_VIEW,
      },
      {
        key: "workerPaymentReceipts",
        type: "page",
        labelKey: "sidebar.workerPaymentReceipts",
        fallback: "Worker Payment Receipts",
        icon: LuFileText,
        permission: PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
      },
    ],
  },
  {
    key: "dailyTasks",
    labelKey: "sidebar.dailyTasks",
    fallback: "Daily Expenses",
    icon: LuClipboardList,
    items: [
      {
        key: "todayTasks",
        type: "page",
        labelKey: "dailyTasks.title",
        fallback: "Today Expenses",
        icon: LuClipboardList,
        permission: PERMISSIONS.FINANCE_EXPENSES_ADD,
      },
      {
        key: "allTasks",
        type: "page",
        labelKey: "dailyTasks.allTitle",
        fallback: "All Expenses",
        icon: LuListChecks,
        permission: PERMISSIONS.FINANCE_VIEW,
      },
      {
        key: "editExpenses",
        type: "action",
        icon: LuPencil,
        permission: PERMISSIONS.FINANCE_EXPENSES_EDIT,
      },
      {
        key: "deleteExpenses",
        type: "action",
        icon: LuTrash2,
        permission: PERMISSIONS.FINANCE_EXPENSES_DELETE,
      },
    ],
  },
  {
    key: "rakht",
    labelKey: "rakht.title",
    fallback: "Rakht",
    icon: LuFactory,
    items: [
      {
        key: "createRakht",
        type: "page",
        labelKey: "rakht.addTitle",
        fallback: "Create Rakht",
        icon: LuPackagePlus,
        permission: PERMISSIONS.INVENTORY_PRODUCTS_ADD,
      },
      {
        key: "allRakhts",
        type: "page",
        labelKey: "rakht.allTitle",
        fallback: "All Rakhts",
        icon: LuFactory,
        permission: PERMISSIONS.INVENTORY_VIEW,
      },
      {
        key: "rakhtPaymentHistory",
        type: "page",
        labelKey: "rakht.paymentHistory",
        fallback: "Payment History",
        icon: LuFileText,
        permission: PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
      },
      {
        key: "rakhtTotalRevenue",
        type: "page",
        labelKey: "rakht.totalRevenue",
        fallback: "Total Revenue",
        icon: LuChartColumn,
        permission: PERMISSIONS.FINANCE_REVENUE_VIEW,
      },
    ],
  },
  {
    key: "transactions",
    labelKey: "sidebar.transactions",
    fallback: "Loan",
    icon: LuWallet,
    items: [
      {
        key: "makeTransaction",
        type: "page",
        labelKey: "sidebar.makeTransaction",
        fallback: "Make Loan",
        icon: LuWallet,
        permission: PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
      },
      {
        key: "allTransactions",
        type: "page",
        labelKey: "sidebar.allTransactions",
        fallback: "All Loans",
        icon: LuWallet,
        permission: PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
      },
    ],
  },
  {
    key: "items",
    labelKey: "sidebar.otherItems",
    fallback: "Other Items",
    icon: LuShoppingBag,
    hidePageSubtitles: true,
    items: [
      {
        key: "sellItem",
        type: "page",
        labelKey: "sidebar.sellItem",
        fallback: "Sell Item",
        icon: LuShoppingBag,
        permission: PERMISSIONS.INVENTORY_PRODUCTS_SELL,
      },
      {
        key: "itemSalesRecords",
        type: "page",
        labelKey: "sidebar.itemSalesRecords",
        fallback: "Sold Item Records",
        icon: LuChartColumn,
        permission: PERMISSIONS.INVENTORY_VIEW,
      },
    ],
  },
  {
    key: "management",
    labelKey: "sidebar.management",
    fallback: "Management",
    icon: LuSettings,
    items: [
      {
        key: "users",
        type: "page",
        labelKey: "users.title",
        fallback: "User Management",
        icon: LuShieldCheck,
        permission: PERMISSIONS.USERS_VIEW,
      },
      {
        key: "permissionsPage",
        type: "page",
        labelKey: "permissions.title",
        fallback: "Permissions",
        icon: LuShieldCheck,
        permission: PERMISSIONS.PERMISSIONS_MANAGE,
      },
      {
        key: "tenantSettings",
        type: "page",
        labelKey: "tenantSettings.title",
        fallback: "System Settings",
        icon: LuSettings,
        permission: PERMISSIONS.SETTINGS_VIEW,
      },
      {
        key: "designs",
        type: "page",
        labelKey: "sidebar.settings",
        fallback: "Settings",
        icon: LuPalette,
        permission: PERMISSIONS.SETTINGS_VIEW,
      },
      {
        key: "boxes",
        type: "page",
        labelKey: "common.boxManagement",
        fallback: "Box Management",
        icon: LuArchive,
        permission: PERMISSIONS.INVENTORY_CATEGORIES_MANAGE,
      },
      {
        key: "notifications",
        type: "page",
        labelKey: "common.notifications",
        fallback: "Notifications",
        icon: LuBell,
        permission: PERMISSIONS.SETTINGS_VIEW,
      },
      {
        key: "createUsers",
        type: "action",
        icon: LuUserPlus,
        permission: PERMISSIONS.USERS_CREATE,
      },
      {
        key: "editUsers",
        type: "action",
        icon: LuPencil,
        permission: PERMISSIONS.USERS_EDIT,
      },
      {
        key: "deleteUsers",
        type: "action",
        icon: LuTrash2,
        permission: PERMISSIONS.USERS_DELETE,
      },
      {
        key: "updateSettings",
        type: "action",
        icon: LuPencil,
        permission: PERMISSIONS.SETTINGS_UPDATE,
      },
    ],
  },
];
