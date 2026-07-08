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
  LuLifeBuoy,
  LuListTodo,
  LuPackage,
  LuPackagePlus,
  LuPalette,
  LuPencil,
  LuPrinter,
  LuScissors,
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

/**
 * Permission codes excluded from the admin UI (still enforced by the backend).
 * This covers coarse module/API codes that back page permissions (granted
 * automatically via implication) plus a few internal-only action codes.
 */
export const HIDDEN_UI_PERMISSION_CODES = new Set([
  PERMISSIONS.REPORTS_EXPORT,
  PERMISSIONS.REPORTS_PRINT,
  PERMISSIONS.INVENTORY_PRODUCTS_EDIT,
  PERMISSIONS.INVENTORY_PRODUCTS_DELETE,
  PERMISSIONS.FINANCE_PROFIT_VIEW,
  // Implied module/API codes — represented in the UI by page permissions.
  PERMISSIONS.ORDERS_VIEW,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW,
  PERMISSIONS.FINANCE_PAYMENTS_MANAGE,
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
 * Collapse duplicate permission rows across all categories so each underlying
 * permission code is editable exactly once in the UI. Shared permissions keep
 * the first visible placement and collect related page/action labels as
 * read-only context instead of rendering duplicate toggles.
 */
export function dedupePermissionCategories(categories) {
  const seenByPermission = new Map();
  const normalized = [];

  for (const category of categories) {
    const uniqueWithinCategory = dedupeCategoryItems(category.items || []);
    const nextItems = [];

    for (const item of uniqueWithinCategory) {
      const relatedEntry = {
        key: item.key,
        type: item.type,
        labelKey: item.labelKey,
        fallback: item.fallback,
      };
      const existing = seenByPermission.get(item.permission);

      if (!existing) {
        const nextItem = {
          ...item,
          relatedEntries: [relatedEntry],
        };
        nextItems.push(nextItem);
        seenByPermission.set(item.permission, nextItem);
        continue;
      }

      existing.relatedEntries = [
        ...(existing.relatedEntries || []),
        relatedEntry,
      ];

      if (existing.type === "page") {
        existing.usePermissionLabel = true;
        existing.hideSubtitle = true;
      }
    }

    if (nextItems.length) normalized.push({ ...category, items: nextItems });
  }

  return normalized;
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
        permission: PERMISSIONS.ORDERS_ALL_VIEW,
      },
      {
        key: "pendingOrders",
        type: "page",
        labelKey: "common.pendingOrders",
        fallback: "Pending Orders",
        icon: LuListTodo,
        permission: PERMISSIONS.ORDERS_PENDING_VIEW,
      },
      {
        key: "completedOrders",
        type: "page",
        labelKey: "common.completedOrders",
        fallback: "Completed Orders",
        icon: LuListChecks,
        permission: PERMISSIONS.ORDERS_COMPLETED_VIEW,
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
        permission: PERMISSIONS.ORDERS_DAMAGED_VIEW,
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
        permission: PERMISSIONS.ORDERS_COMPLETED_WORKERS_VIEW,
      },
      {
        key: "workerPaymentReceipts",
        type: "page",
        labelKey: "sidebar.workerPaymentReceipts",
        fallback: "Worker Payment Receipts",
        icon: LuFileText,
        permission: PERMISSIONS.WORKER_RECEIPTS_VIEW,
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
        permission: PERMISSIONS.RAKHT_LIST_VIEW,
      },
      {
        key: "rakhtPaymentHistory",
        type: "page",
        labelKey: "rakht.paymentHistory",
        fallback: "Payment History",
        icon: LuFileText,
        permission: PERMISSIONS.RAKHT_PAYMENTS_VIEW,
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
        permission: PERMISSIONS.TRANSACTIONS_CREATE_VIEW,
      },
      {
        key: "allTransactions",
        type: "page",
        labelKey: "sidebar.allTransactions",
        fallback: "All Loans",
        icon: LuWallet,
        permission: PERMISSIONS.TRANSACTIONS_VIEW,
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
        permission: PERMISSIONS.ITEM_SALES_VIEW,
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
        permission: PERMISSIONS.SETTINGS_TENANT_VIEW,
      },
      {
        key: "designs",
        type: "page",
        labelKey: "sidebar.settings",
        fallback: "Settings",
        icon: LuPalette,
        permission: PERMISSIONS.SETTINGS_DESIGNS_VIEW,
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
        permission: PERMISSIONS.SETTINGS_NOTIFICATIONS_VIEW,
      },
      {
        key: "supportTeam",
        type: "page",
        labelKey: "supportTeam.title",
        fallback: "Support Team",
        icon: LuLifeBuoy,
        permission: PERMISSIONS.SUPPORT_VIEW,
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
