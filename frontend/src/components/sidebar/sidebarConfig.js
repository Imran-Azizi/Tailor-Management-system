import {
  LuArchive,
  LuArrowRightLeft,
  LuBell,
  LuClipboardCheck,
  LuClipboardList,
  LuFactory,
  LuLayoutDashboard,
  LuLifeBuoy,
  LuListChecks,
  LuListTodo,
  LuPackagePlus,
  LuPalette,
  LuPrinter,
  LuScissors,
  LuShieldCheck,
  LuTruck,
  LuUserCheck,
  LuFileText,
  LuDatabaseBackup,
  LuShieldAlert,
  LuSearchCode,
  LuShoppingBag,
  LuChartColumn,
  LuBuilding2,
  LuSettings,
} from "react-icons/lu";
import AfCurrencyIcon from "../ui/AfCurrencyIcon.jsx";

const ROLE_ACCENT = {
  SUPER_ADMIN: "#111827",
  ADMIN: "#2563EB",
  DOKAN: "#0D9488",
  QICHIKAR: "#D97706",
  DOKHT: "#DB2777",
  FINANCE: "#059669",
};

const SUPER_ADMIN_SECTIONS = [
  {
    key: "saas",
    label: "SaaS",
    fallback: "SaaS",
    items: [
      {
        key: "superAdmin",
        label: "Super Admin",
        fallback: "Super Admin",
        path: "/super-admin",
        icon: LuBuilding2,
        end: true,
      },
      {
        key: "backupRestore",
        label: "backup.title",
        fallback: "Backup & Restore",
        path: "/super-admin/backups",
        icon: LuDatabaseBackup,
      },
    ],
  },
];

const SUPPORT_NAV_ITEM = {
  key: "supportTeam",
  label: "supportTeam.title",
  fallback: "Support Team",
  path: "/support-team",
  icon: LuLifeBuoy,
};

const ADMIN_SECTIONS = [
  {
    key: "overview",
    label: "sidebar.overview",
    fallback: "Overview",
    items: [
      {
        key: "dashboard",
        label: "common.dashboard",
        fallback: "Dashboard",
        path: "/dashboard",
        icon: LuLayoutDashboard,
        end: true,
      },
    ],
  },
  {
    key: "orders",
    label: "sidebar.orders",
    fallback: "Orders",
    items: [
      {
        key: "manageOrders",
        label: "sidebar.orders",
        fallback: "Orders",
        icon: AfCurrencyIcon,
        children: [
          {
            key: "createOrder",
            label: "common.createOrder",
            fallback: "Create Order",
            path: "/orders/create",
            icon: LuPackagePlus,
          },
          {
            key: "allOrders",
            label: "common.allOrders",
            fallback: "All Orders",
            path: "/orders",
            icon: AfCurrencyIcon,
          },
          {
            key: "pendingOrders",
            label: "common.pendingOrders",
            fallback: "Pending Orders",
            path: "/orders/pending",
            icon: LuListTodo,
            badge: "pendingOrders",
          },
          {
            key: "completedOrders",
            label: "common.completedOrders",
            fallback: "Completed Orders",
            path: "/orders/completed",
            icon: LuListChecks,
          },
          {
            key: "clothesStatus",
            label: "sidebar.clothesStatus",
            fallback: "Clothes Status",
            path: "/orders/assignments/report",
            icon: LuClipboardCheck,
          },
          {
            key: "damagedClothes",
            label: "sidebar.damagedClothes",
            fallback: "Damaged Clothes",
            path: "/damaged-clothes",
            icon: LuShieldAlert,
          },
          {
            key: "printBills",
            label: "orders.printBills",
            fallback: "Print Bills",
            path: "/print-bills",
            icon: LuPrinter,
          },
          {
            key: "delivery",
            label: "sidebar.clothesDelivery",
            fallback: "Delivery",
            path: "/delivery",
            icon: LuTruck,
            end: true,
          },
        ],
      },
      {
        key: "dailyTasks",
        label: "sidebar.dailyTasks",
        fallback: "Daily Expenses",
        icon: LuClipboardList,
        children: [
          {
            key: "todayTasks",
            label: "dailyTasks.title",
            fallback: "Today Expenses",
            path: "/daily-tasks",
            icon: LuClipboardList,
          },
          {
            key: "allTasks",
            label: "dailyTasks.allTitle",
            fallback: "All Expenses",
            path: "/daily-tasks/all",
            icon: LuClipboardList,
          },
        ],
      },
      {
        key: "assignment",
        label: "assignment.assignOrder",
        fallback: "Assign Order",
        icon: LuUserCheck,
        children: [
          {
            key: "assignClothes",
            label: "assignment.clothesToWorkers",
            fallback: "Clothes to Workers",
            path: "/orders/assignments/clothes",
            icon: LuScissors,
          },
          {
            key: "completedWorkers",
            label: "sidebar.completedFromWorkers",
            fallback: "Completed from Workers",
            path: "/orders/completed-workers",
            icon: LuListChecks,
          },
          {
            key: "workerPaymentReceipts",
            label: "sidebar.workerPaymentReceipts",
            fallback: "Worker Payment Receipts",
            path: "/orders/completed-workers/receipts",
            icon: AfCurrencyIcon,
          },
        ],
      },
      {
        key: "rakht",
        label: "rakht.title",
        fallback: "Rakht",
        icon: LuFactory,
        children: [
          {
            key: "createRakht",
            label: "rakht.addTitle",
            fallback: "Create Rakht",
            path: "/rakht/create",
            icon: LuPackagePlus,
          },
          {
            key: "allRakhts",
            label: "rakht.allTitle",
            fallback: "All Rakhts",
            path: "/rakhts",
            icon: LuFactory,
          },
          {
            key: "rakhtPaymentHistory",
            label: "rakht.paymentHistory",
            fallback: "Payment History",
            path: "/rakhts/payment-history",
            icon: LuFileText,
          },
          {
            key: "rakhtTotalRevenue",
            label: "rakht.totalRevenue",
            fallback: "Total Revenue",
            path: "/rakhts/revenue",
            icon: AfCurrencyIcon,
          },
        ],
      },
    ],
  },
  {
    key: "management",
    label: "sidebar.management",
    fallback: "Management",
    items: [
      {
        key: "transactions",
        label: "sidebar.transactions",
        fallback: "Loan",
        icon: AfCurrencyIcon,
        children: [
          {
            key: "makeTransaction",
            label: "sidebar.makeTransaction",
            fallback: "Make Loan",
            path: "/transactions/create",
            icon: AfCurrencyIcon,
          },
          {
            key: "allTransactions",
            label: "sidebar.allTransactions",
            fallback: "All Loans",
            path: "/transactions",
            icon: AfCurrencyIcon,
          },
        ],
      },
      {
        key: "itemsDropdown",
        label: "sidebar.itemsDropdown",
        fallback: "اجناس دیگر",
        icon: LuShoppingBag,
        children: [
          {
            key: "otherItems",
            label: "sidebar.sellItem",
            fallback: "فروش جنس",
            path: "/other-items",
            icon: LuShoppingBag,
          },
          {
            key: "itemSalesRecords",
            label: "sidebar.itemSalesRecords",
            fallback: "Sold Item Records",
            path: "/item-sales-records",
            icon: LuChartColumn,
          },
        ],
      },
      {
        key: "users",
        label: "users.title",
        fallback: "User Management",
        path: "/users",
        icon: LuShieldCheck,
      },
      {
        key: "tenantSettings",
        label: "tenantSettings.title",
        fallback: "System Settings",
        path: "/tenant-settings",
        icon: LuSettings,
      },
      {
        key: "designs",
        label: "sidebar.settings",
        fallback: "Settings",
        path: "/designs",
        icon: LuPalette,
      },
      {
        key: "boxes",
        label: "common.boxManagement",
        fallback: "Box Management",
        path: "/boxes",
        icon: LuArchive,
      },
      {
        key: "notifications",
        label: "common.notifications",
        fallback: "Notifications",
        path: "/notifications",
        icon: LuBell,
      },
      SUPPORT_NAV_ITEM,
    ],
  },
];

const DOKAN_SECTIONS = [
  {
    key: "overview",
    label: "sidebar.overview",
    fallback: "Overview",
    items: [
      {
        key: "dashboard",
        label: "common.dashboard",
        fallback: "Dashboard",
        path: "/dashboard",
        icon: LuLayoutDashboard,
        end: true,
      },
    ],
  },
  {
    key: "orders",
    label: "sidebar.orders",
    fallback: "Orders",
    items: [
      {
        key: "manageOrders",
        label: "sidebar.orders",
        fallback: "Orders",
        icon: AfCurrencyIcon,
        children: [
          {
            key: "createOrder",
            label: "common.createOrder",
            fallback: "Create Order",
            path: "/orders/create",
            icon: LuPackagePlus,
          },
          {
            key: "allOrders",
            label: "common.allOrders",
            fallback: "All Orders",
            path: "/orders",
            icon: AfCurrencyIcon,
          },
          {
            key: "pendingOrders",
            label: "common.pendingOrders",
            fallback: "Pending Orders",
            path: "/orders/pending",
            icon: LuListTodo,
            badge: "pendingOrders",
          },
          {
            key: "completedOrders",
            label: "common.completedOrders",
            fallback: "Completed Orders",
            path: "/orders/completed",
            icon: LuListChecks,
          },
          {
            key: "clothesStatus",
            label: "sidebar.clothesStatus",
            fallback: "Clothes Status",
            path: "/orders/assignments/report",
            icon: LuClipboardCheck,
          },
          {
            key: "printBills",
            label: "orders.printBills",
            fallback: "Print Bills",
            path: "/print-bills",
            icon: LuPrinter,
          },
          {
            key: "globalSearch",
            label: "globalSearch.title",
            fallback: "Global Search",
            path: "/orders/global-search",
            icon: LuSearchCode,
          },
          {
            key: "delivery",
            label: "sidebar.clothesDelivery",
            fallback: "Delivery",
            path: "/delivery",
            icon: LuTruck,
            end: true,
          },
        ],
      },
      {
        key: "dailyTasks",
        label: "sidebar.dailyTasks",
        fallback: "Daily Expenses",
        icon: LuClipboardList,
        children: [
          {
            key: "todayTasks",
            label: "dailyTasks.title",
            fallback: "Today Expenses",
            path: "/daily-tasks",
            icon: LuClipboardList,
          },
          {
            key: "allTasks",
            label: "dailyTasks.allTitle",
            fallback: "All Expenses",
            path: "/daily-tasks/all",
            icon: LuClipboardList,
          },
        ],
      },
      {
        key: "rakht",
        label: "rakht.title",
        fallback: "Rakht",
        icon: LuFactory,
        children: [
          {
            key: "createRakht",
            label: "rakht.addTitle",
            fallback: "Create Rakht",
            path: "/rakht/create",
            icon: LuPackagePlus,
          },
          {
            key: "allRakhts",
            label: "rakht.allTitle",
            fallback: "All Rakhts",
            path: "/rakhts",
            icon: LuFactory,
          },
          {
            key: "rakhtPaymentHistory",
            label: "rakht.paymentHistory",
            fallback: "Payment History",
            path: "/rakhts/payment-history",
            icon: LuFileText,
          },
          {
            key: "rakhtTotalRevenue",
            label: "rakht.totalRevenue",
            fallback: "Total Revenue",
            path: "/rakhts/revenue",
            icon: AfCurrencyIcon,
          },
        ],
      },
    ],
  },
  {
    key: "management",
    label: "sidebar.management",
    fallback: "Management",
    items: [
      {
        key: "transactions",
        label: "sidebar.transactions",
        fallback: "Loan",
        icon: AfCurrencyIcon,
        children: [
          {
            key: "makeTransaction",
            label: "sidebar.makeTransaction",
            fallback: "Make Loan",
            path: "/transactions/create",
            icon: AfCurrencyIcon,
          },
          {
            key: "allTransactions",
            label: "sidebar.allTransactions",
            fallback: "All Loans",
            path: "/transactions",
            icon: AfCurrencyIcon,
          },
        ],
      },
      {
        key: "itemsDropdown",
        label: "sidebar.itemsDropdown",
        fallback: "اجناس دیگر",
        icon: LuShoppingBag,
        children: [
          {
            key: "otherItems",
            label: "sidebar.sellItem",
            fallback: "فروش جنس",
            path: "/other-items",
            icon: LuShoppingBag,
          },
          {
            key: "itemSalesRecords",
            label: "sidebar.itemSalesRecords",
            fallback: "Sold Item Records",
            path: "/item-sales-records",
            icon: LuChartColumn,
          },
        ],
      },
      {
        key: "otherItems",
        label: "sidebar.otherItems",
        fallback: "Other Items",
        path: "/other-items",
        icon: LuShoppingBag,
      },
      {
        key: "itemSalesRecords",
        label: "sidebar.itemSalesRecords",
        fallback: "Sold Item Records",
        path: "/item-sales-records",
        icon: LuChartColumn,
      },
      {
        key: "designs",
        label: "sidebar.settings",
        fallback: "Settings",
        path: "/designs",
        icon: LuPalette,
      },
      {
        key: "boxes",
        label: "common.boxManagement",
        fallback: "Box Management",
        path: "/boxes",
        icon: LuArchive,
      },
      {
        key: "notifications",
        label: "common.notifications",
        fallback: "Notifications",
        path: "/notifications",
        icon: LuBell,
      },
      SUPPORT_NAV_ITEM,
    ],
  },
];

const WORKER_SECTIONS = [
  {
    key: "overview",
    label: "sidebar.overview",
    fallback: "Overview",
    items: [
      {
        key: "myTasks",
        label: "myTasks.title",
        fallback: "My Tasks",
        path: "/my-tasks",
        icon: LuClipboardList,
        end: true,
      },
      {
        key: "manageOrders",
        label: "sidebar.orders",
        fallback: "Orders",
        icon: AfCurrencyIcon,
        children: [
          {
            key: "allOrders",
            label: "common.allOrders",
            fallback: "All Orders",
            path: "/orders",
            icon: AfCurrencyIcon,
          },
          {
            key: "pendingOrders",
            label: "common.pendingOrders",
            fallback: "Pending Orders",
            path: "/orders/pending",
            icon: LuListTodo,
            badge: "pendingOrders",
          },
          {
            key: "completedOrders",
            label: "common.completedOrders",
            fallback: "Completed Orders",
            path: "/orders/completed",
            icon: LuListChecks,
          },
        ],
      },
      SUPPORT_NAV_ITEM,
    ],
  },
];

const FINANCE_SECTIONS = [
  {
    key: "orders",
    label: "sidebar.orders",
    fallback: "Orders",
    items: [
      {
        key: "manageOrders",
        label: "sidebar.orders",
        fallback: "Orders",
        icon: AfCurrencyIcon,
        children: [
          {
            key: "createOrder",
            label: "common.createOrder",
            fallback: "Create Order",
            path: "/orders/create",
            icon: LuPackagePlus,
          },
          {
            key: "allOrders",
            label: "common.allOrders",
            fallback: "All Orders",
            path: "/orders",
            icon: AfCurrencyIcon,
          },
          {
            key: "pendingOrders",
            label: "common.pendingOrders",
            fallback: "Pending Orders",
            path: "/orders/pending",
            icon: LuListTodo,
            badge: "pendingOrders",
          },
          {
            key: "completedOrders",
            label: "common.completedOrders",
            fallback: "Completed Orders",
            path: "/orders/completed",
            icon: LuListChecks,
          },
          {
            key: "clothesStatus",
            label: "sidebar.clothesStatus",
            fallback: "Clothes Status",
            path: "/orders/assignments/report",
            icon: LuClipboardCheck,
          },
          {
            key: "printBills",
            label: "orders.printBills",
            fallback: "Print Bills",
            path: "/print-bills",
            icon: LuPrinter,
          },
          {
            key: "delivery",
            label: "sidebar.clothesDelivery",
            fallback: "Delivery",
            path: "/delivery",
            icon: LuTruck,
            end: true,
          },
        ],
      },
      {
        key: "dailyTasks",
        label: "sidebar.dailyTasks",
        fallback: "Daily Expenses",
        icon: LuClipboardList,
        children: [
          {
            key: "todayTasks",
            label: "dailyTasks.title",
            fallback: "Today Expenses",
            path: "/daily-tasks",
            icon: LuClipboardList,
          },
          {
            key: "allTasks",
            label: "dailyTasks.allTitle",
            fallback: "All Expenses",
            path: "/daily-tasks/all",
            icon: LuClipboardList,
          },
        ],
      },
    ],
  },
  {
    key: "management",
    label: "sidebar.management",
    fallback: "Management",
    items: [
      {
        key: "itemsDropdown",
        label: "sidebar.itemsDropdown",
        fallback: "Other Items",
        icon: LuShoppingBag,
        children: [
          {
            key: "otherItems",
            label: "sidebar.sellItem",
            fallback: "Sell Item",
            path: "/other-items",
            icon: LuShoppingBag,
          },
          {
            key: "itemSalesRecords",
            label: "sidebar.itemSalesRecords",
            fallback: "Sold Item Records",
            path: "/item-sales-records",
            icon: LuChartColumn,
          },
        ],
      },
      {
        key: "designs",
        label: "sidebar.settings",
        fallback: "Settings",
        path: "/designs",
        icon: LuPalette,
      },
      {
        key: "boxes",
        label: "common.boxManagement",
        fallback: "Box Management",
        path: "/boxes",
        icon: LuArchive,
      },
      SUPPORT_NAV_ITEM,
    ],
  },
];

const DOKAN_ALLOWED_SECTIONS = [
  {
    key: "dokanPanel",
    label: "sidebar.dokanPanel",
    fallback: "Dokan Panel",
    items: [
      {
        key: "createOrder",
        label: "common.createOrder",
        fallback: "Create Order",
        path: "/orders/create",
        icon: LuPackagePlus,
        end: true,
      },
      {
        key: "allOrders",
        label: "common.allOrders",
        fallback: "All Orders",
        path: "/orders",
        icon: AfCurrencyIcon,
        end: true,
      },
    ],
  },
];

const ROLE_SECTIONS = {
  SUPER_ADMIN: SUPER_ADMIN_SECTIONS,
  ADMIN: ADMIN_SECTIONS,
  DOKAN: DOKAN_ALLOWED_SECTIONS,
  QICHIKAR: WORKER_SECTIONS,
  DOKHT: WORKER_SECTIONS,
  FINANCE: FINANCE_SECTIONS,
};

export function getRoleAccent(role) {
  return ROLE_ACCENT[role] || ROLE_ACCENT.ADMIN;
}

export function getSidebarSections(role) {
  return ROLE_SECTIONS[role] || ADMIN_SECTIONS;
}

export function getSidebarFooterItems(role) {
  return role === "DOKAN" ? [SUPPORT_NAV_ITEM] : [];
}
