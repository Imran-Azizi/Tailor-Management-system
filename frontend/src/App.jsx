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

const Layout = lazy(() => import("./components/Layout.jsx"));
const WorkerLayout = lazy(() => import("./components/WorkerLayout.jsx"));
const WorkerPanel = lazy(() => import("./pages/WorkerPanel.jsx"));
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
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard.jsx"));
const TenantSettings = lazy(() => import("./pages/TenantSettings.jsx"));
const SubscriptionExpired = lazy(() => import("./pages/SubscriptionExpired.jsx"));

function RoleBasedRedirect() {
  const { isSuperAdmin, isDokan, isFinance } = useAuth();
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (isDokan) return <Navigate to="/orders/create" replace />;
  if (isFinance) return <Navigate to="/orders" replace />;
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
                    path="dashboard"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
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
                      <RoleRoute roles={["ADMIN", "DOKAN", "FINANCE"]}>
                        <CreateOrder />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/:id/edit"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <EditOrder />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders"
                    element={
                      <RoleRoute roles={["ADMIN", "DOKAN", "FINANCE"]}>
                        <AllOrders />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/pending"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <AllOrders filter="pending" />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/completed"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <AllOrders filter="completed" />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/remaining"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <AllOrders filter="remaining" />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/assignments"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <Navigate to="/orders/assignments/clothes" replace />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/assignments/clothes"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <AssignOrders />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/assignments/report"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <AssignOrdersReport />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/completed-workers"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <CompletedWorkerOrders />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/completed-workers/receipts"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <WorkerPaymentReceipts />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="delivery"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <ClothesDeliveryToCustomer />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="customers"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <Customers />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="customers/create"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <Customers openCreate />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="customers/transactions"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <CustomerTransactions />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="customers/report"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <CustomerReport />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="boxes"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <Boxes />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="designs"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <Designs />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="print-bills"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <PrintBills />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="rakht/create"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <CreateRakht />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="rakhts"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <AllRakhts />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="rakhts/payment-history"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <PaymentHistory />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="rakhts/revenue"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <RakhtRevenue />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="notifications"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <Notifications />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="users"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <UserManagement />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="tenant-settings"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <TenantSettings />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="damaged-clothes"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <DamagedClothes />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="transactions/create"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <MakeTransaction />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="transactions"
                    element={
                      <RoleRoute roles={["ADMIN"]}>
                        <AllTransactions />
                      </RoleRoute>
                    }
                  />

                  <Route
                    path="daily-tasks"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <DailyTasks />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="daily-tasks/all"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <AllDailyTasks />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="orders/global-search"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <GlobalOrderSearch />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="other-items"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
                        <OtherItems />
                      </RoleRoute>
                    }
                  />
                  <Route
                    path="item-sales-records"
                    element={
                      <RoleRoute roles={["ADMIN", "FINANCE"]}>
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
                  <Route index element={<WorkerPanel />} />
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
