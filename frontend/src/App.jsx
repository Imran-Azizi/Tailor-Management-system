import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { MonthProvider } from "./context/MonthContext.jsx";
import {
  ProtectedRoute,
  RoleRoute,
  WorkerProtectedRoute,
} from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import SystemHorizontalScrollbars from "./components/SystemHorizontalScrollbars.jsx";
import { PERMISSIONS } from "./lib/permissions.js";

const Layout = lazy(() => import("./components/Layout.jsx"));
const WorkerLayout = lazy(() => import("./components/WorkerLayout.jsx"));
const WorkerPanel = lazy(() => import("./pages/WorkerPanel.jsx"));
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const CreateOrder = lazy(() => import("./pages/CreateOrder.jsx"));
const AllOrders = lazy(() => import("./pages/AllOrders.jsx"));
const EditOrder = lazy(() => import("./pages/EditOrder.jsx"));
const Customers = lazy(() => import("./pages/Customers.jsx"));
const Boxes = lazy(() => import("./pages/Boxes.jsx"));
const Designs = lazy(() => import("./pages/Designs.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const PrintBills = lazy(() => import("./pages/PrintBills.jsx"));
const UserManagement = lazy(() => import("./pages/UserManagement.jsx"));
const MyTasks = lazy(() => import("./pages/MyTasks.jsx"));
const CustomerTransactions = lazy(
  () => import("./pages/CustomerTransactions.jsx"),
);
const CustomerReport = lazy(() => import("./pages/CustomerReport.jsx"));
const MakeTransaction = lazy(() => import("./pages/MakeTransaction.jsx"));
const AllTransactions = lazy(() => import("./pages/AllTransactions.jsx"));
const ClothesDeliveryToCustomer = lazy(
  () => import("./pages/ClothesDeliveryToCustomer.jsx"),
);
const AssignOrders = lazy(() => import("./pages/AssignOrders.jsx"));
const AssignOrdersReport = lazy(() => import("./pages/AssignOrdersReport.jsx"));
const CompletedWorkerOrders = lazy(
  () => import("./pages/CompletedWorkerOrders.jsx"),
);
const WorkerPaymentReceipts = lazy(
  () => import("./pages/WorkerPaymentReceipts.jsx"),
);
const DailyTasks = lazy(() => import("./pages/DailyTasks.jsx"));
const AllDailyTasks = lazy(() => import("./pages/AllDailyTasks.jsx"));
const CreateRakht = lazy(() => import("./pages/CreateRakht.jsx"));
const AllRakhts = lazy(() => import("./pages/AllRakhts.jsx"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory.jsx"));
const RakhtRevenue = lazy(() => import("./pages/RakhtRevenue.jsx"));
const BackupManagement = lazy(() => import("./pages/BackupManagement.jsx"));
const DamagedClothes = lazy(() => import("./pages/DamagedClothes.jsx"));
const GlobalOrderSearch = lazy(() => import("./pages/GlobalOrderSearch.jsx"));
const OtherItems = lazy(() => import("./pages/OtherItems.jsx"));
const ItemSalesRecords = lazy(() => import("./pages/ItemSalesRecords.jsx"));
const SupportTeam = lazy(() => import("./pages/SupportTeam.jsx"));
const PermissionsManagement = lazy(() => import("./pages/PermissionsManagement.jsx"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard.jsx"));
const SuperAdminSettings = lazy(() => import("./pages/SuperAdminSettings.jsx"));
const TenantSettings = lazy(() => import("./pages/TenantSettings.jsx"));
const SubscriptionExpired = lazy(() => import("./pages/SubscriptionExpired.jsx"));

function RoleBasedRedirect() {
  const { isSuperAdmin, hasPermission } = useAuth();
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (hasPermission(PERMISSIONS.DASHBOARD_VIEW)) return <Navigate to="/dashboard" replace />;
  if (hasPermission(PERMISSIONS.ORDERS_CREATE)) return <Navigate to="/orders/create" replace />;
  if (hasPermission(PERMISSIONS.ORDERS_VIEW)) return <Navigate to="/orders" replace />;
  if (hasPermission(PERMISSIONS.FINANCE_VIEW)) return <Navigate to="/daily-tasks/all" replace />;
  if (hasPermission(PERMISSIONS.INVENTORY_VIEW)) return <Navigate to="/item-sales-records" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MonthProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ScrollToTop />
            <SystemHorizontalScrollbars />
            <Suspense fallback={null}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/subscription-expired" element={<SubscriptionExpired />} />

                {/* Admin system — requires ADMIN role */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<RoleBasedRedirect />} />
                  <Route
                    path="super-admin"
                    element={
                      <RoleRoute roles={["SUPER_ADMIN"]}>
                        <SuperAdminDashboard />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="super-admin/backups"
                    element={
                      <RoleRoute roles={["SUPER_ADMIN"]}>
                        <BackupManagement />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="super-admin/settings"
                    element={
                      <RoleRoute roles={["SUPER_ADMIN"]}>
                        <SuperAdminSettings />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="dashboard"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.DASHBOARD_VIEW}
                      >
                        <Dashboard />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="my-tasks"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <MyTasks />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="orders/create"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_CREATE}
                      >
                        <CreateOrder />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/:id/edit"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_EDIT}
                      >
                        <EditOrder />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_VIEW}
                      >
                        <AllOrders />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/pending"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_VIEW}
                      >
                        <AllOrders filter="pending" />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/completed"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_VIEW}
                      >
                        <AllOrders filter="completed" />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/remaining"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_VIEW}
                      >
                        <AllOrders filter="remaining" />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/assignments"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_ASSIGN}
                      >
                        <Navigate to="/orders/assignments/clothes" replace />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/assignments/clothes"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_ASSIGN}
                      >
                        <AssignOrders />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/assignments/report"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.REPORTS_VIEW}
                      >
                        <AssignOrdersReport />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/completed-workers"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_VIEW}
                      >
                        <CompletedWorkerOrders />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/completed-workers/receipts"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.FINANCE_PAYMENTS_MANAGE}
                      >
                        <WorkerPaymentReceipts />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="delivery"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_DELIVER}
                      >
                        <ClothesDeliveryToCustomer />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="customers"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.CUSTOMERS_VIEW}
                      >
                        <Customers />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="customers/create"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.CUSTOMERS_CREATE}
                      >
                        <Customers openCreate />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="customers/transactions"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.CUSTOMERS_VIEW}
                      >
                        <CustomerTransactions />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="customers/report"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.CUSTOMERS_VIEW}
                      >
                        <CustomerReport />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="boxes"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.INVENTORY_CATEGORIES_MANAGE}
                      >
                        <Boxes />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="designs"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.SETTINGS_VIEW}
                      >
                        <Designs />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="print-bills"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_PRINT}
                      >
                        <PrintBills />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="rakht/create"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.INVENTORY_PRODUCTS_ADD}
                      >
                        <CreateRakht />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="rakhts"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.INVENTORY_VIEW}
                      >
                        <AllRakhts />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="rakhts/payment-history"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.FINANCE_PAYMENTS_MANAGE}
                      >
                        <PaymentHistory />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="rakhts/revenue"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.FINANCE_REVENUE_VIEW}
                      >
                        <RakhtRevenue />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="notifications"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.SETTINGS_VIEW}
                      >
                        <Notifications />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="users"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.USERS_VIEW}
                      >
                        <UserManagement />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="permissions"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.PERMISSIONS_MANAGE}
                      >
                        <PermissionsManagement />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="tenant-settings"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.SETTINGS_VIEW}
                      >
                        <TenantSettings />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="damaged-clothes"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW}
                      >
                        <DamagedClothes />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="transactions/create"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.FINANCE_PAYMENTS_MANAGE}
                      >
                        <MakeTransaction />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="transactions"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.FINANCE_DEBT_RECORDS_VIEW}
                      >
                        <AllTransactions />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="daily-tasks"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.FINANCE_EXPENSES_ADD}
                      >
                        <DailyTasks />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="daily-tasks/all"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.FINANCE_VIEW}
                      >
                        <AllDailyTasks />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/global-search"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.ORDERS_VIEW}
                      >
                        <GlobalOrderSearch />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="other-items"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.INVENTORY_PRODUCTS_SELL}
                      >
                        <OtherItems />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="item-sales-records"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE"]}
                        permission={PERMISSIONS.INVENTORY_VIEW}
                      >
                        <ItemSalesRecords />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="support-team"
                    element={
                      <RoleRoute
                        roles={["ADMIN", "DOKAN", "FINANCE", "QICHIKAR", "DOKHT"]}
                      >
                        <SupportTeam />
                      </RoleRoute>
                    }
                  />
                </Route>

                <Route
                  path="/panel"
                  element={
                    <WorkerProtectedRoute>
                      <WorkerLayout />
                    </WorkerProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/panel/dashboard" replace />} />
                  <Route path="dashboard" element={<WorkerDashboard />} />
                  <Route path="orders" element={<WorkerPanel />} />
                </Route>

                {/* Fallback */}
                <Route
                  path="*"
                  element={<Navigate to="/" replace />}
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </MonthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
