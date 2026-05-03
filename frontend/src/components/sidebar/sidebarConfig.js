import {
  LuArchive,
  LuArrowRightLeft,
  LuBell,
  LuClipboardList,
  LuFactory,
  LuLayoutDashboard,
  LuList,
  LuListChecks,
  LuListTodo,
  LuPackagePlus,
  LuPalette,
  LuPrinter,
  LuScissors,
  LuShieldCheck,
  LuTruck,
  LuUserCheck,
  LuWalletCards,
  LuFileText,
  LuDatabaseBackup,
} from "react-icons/lu";
import AfCurrencyIcon from "../ui/AfCurrencyIcon.jsx";

const ROLE_ACCENT = {
  ADMIN: "#2563EB",
  DOKAN: "#0D9488",
  QICHIKAR: "#D97706",
  DOKHT: "#DB2777",
  FINANCE: "#059669",
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
        icon: LuList,
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
            icon: LuList,
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
            icon: LuFileText,
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
            icon: LuList,
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
            icon: LuList,
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
        icon: LuWalletCards,
        children: [
          {
            key: "makeTransaction",
            label: "sidebar.makeTransaction",
            fallback: "Make Loan",
            path: "/transactions/create",
            icon: LuArrowRightLeft,
          },
          {
            key: "allTransactions",
            label: "sidebar.allTransactions",
            fallback: "All Loans",
            path: "/transactions",
            icon: LuList,
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
        key: "backupManagement",
        label: "backup.title",
        fallback: "Backup Management",
        path: "/backups",
        icon: LuDatabaseBackup,
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
        icon: LuList,
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
            icon: LuList,
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
            icon: LuFileText,
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
            icon: LuList,
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
            icon: LuList,
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
        icon: LuWalletCards,
        children: [
          {
            key: "makeTransaction",
            label: "sidebar.makeTransaction",
            fallback: "Make Loan",
            path: "/transactions/create",
            icon: LuArrowRightLeft,
          },
          {
            key: "allTransactions",
            label: "sidebar.allTransactions",
            fallback: "All Loans",
            path: "/transactions",
            icon: LuList,
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
      {
        key: "notifications",
        label: "common.notifications",
        fallback: "Notifications",
        path: "/notifications",
        icon: LuBell,
      },
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
        icon: LuList,
        children: [
          {
            key: "allOrders",
            label: "common.allOrders",
            fallback: "All Orders",
            path: "/orders",
            icon: LuList,
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
    ],
  },
];

const FINANCE_SECTIONS = [
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
        icon: LuList,
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
            icon: LuList,
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
            icon: LuList,
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
    ],
  },
];

const ROLE_SECTIONS = {
  ADMIN: ADMIN_SECTIONS,
  DOKAN: DOKAN_SECTIONS,
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
