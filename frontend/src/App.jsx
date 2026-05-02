import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { MonthProvider } from "./context/MonthContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  ProtectedRoute,
  RoleRoute,
  WorkerProtectedRoute,
} from "./components/ProtectedRoute.jsx";
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
const DailyTasks = lazy(() => import("./pages/DailyTasks.jsx"));
const AllDailyTasks = lazy(() => import("./pages/AllDailyTasks.jsx"));
const DailyTaskDetails = lazy(() => import("./pages/DailyTaskDetails.jsx"));
const CreateRakht = lazy(() => import("./pages/CreateRakht.jsx"));
const AllRakhts = lazy(() => import("./pages/AllRakhts.jsx"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory.jsx"));
const RakhtRevenue = lazy(() => import("./pages/RakhtRevenue.jsx"));
const BackupManagement = lazy(() => import("./pages/BackupManagement.jsx"));

function RoleBasedRedirect() {
  const { user } = useAuth();
  if (user?.accountType === "FINANCE")
    return <Navigate to="/dashboard" replace />;
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
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="my-tasks" element={<MyTasks />} />

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
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <EditOrder />
                    </RoleRoute>
                  }
                />
                <Route path="orders" element={<AllOrders />} />
                <Route
                  path="orders/pending"
                  element={<AllOrders filter="pending" />}
                />
                <Route
                  path="orders/completed"
                  element={<AllOrders filter="completed" />}
                />
                <Route
                  path="orders/remaining"
                  element={<AllOrders filter="remaining" />}
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
                    <RoleRoute roles={["ADMIN"]}>
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
                  path="delivery"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <ClothesDeliveryToCustomer />
                    </RoleRoute>
                  }
                />

                <Route
                  path="customers"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <Customers />
                    </RoleRoute>
                  }
                />
                <Route
                  path="customers/create"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <Customers openCreate />
                    </RoleRoute>
                  }
                />
                <Route
                  path="customers/transactions"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <CustomerTransactions />
                    </RoleRoute>
                  }
                />
                <Route
                  path="customers/report"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <CustomerReport />
                    </RoleRoute>
                  }
                />
                <Route
                  path="boxes"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN", "FINANCE"]}>
                      <Boxes />
                    </RoleRoute>
                  }
                />
                <Route
                  path="designs"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN", "FINANCE"]}>
                      <Designs />
                    </RoleRoute>
                  }
                />
                <Route
                  path="print-bills"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <PrintBills />
                    </RoleRoute>
                  }
                />
                <Route
                  path="rakht/create"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <CreateRakht />
                    </RoleRoute>
                  }
                />
                <Route
                  path="rakhts"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <AllRakhts />
                    </RoleRoute>
                  }
                />
                <Route
                  path="rakhts/payment-history"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <PaymentHistory />
                    </RoleRoute>
                  }
                />
                <Route
                  path="rakhts/revenue"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN", "FINANCE"]}>
                      <RakhtRevenue />
                    </RoleRoute>
                  }
                />
                <Route
                  path="notifications"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
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
                  path="backups"
                  element={
                    <RoleRoute roles={["ADMIN"]}>
                      <BackupManagement />
                    </RoleRoute>
                  }
                />

                <Route
                  path="transactions/create"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <MakeTransaction />
                    </RoleRoute>
                  }
                />
                <Route
                  path="transactions"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN"]}>
                      <AllTransactions />
                    </RoleRoute>
                  }
                />

                <Route
                  path="daily-tasks"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN", "FINANCE"]}>
                      <DailyTasks />
                    </RoleRoute>
                  }
                />
                <Route
                  path="daily-tasks/all"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN", "FINANCE"]}>
                      <AllDailyTasks />
                    </RoleRoute>
                  }
                />
                <Route
                  path="daily-tasks/:id"
                  element={
                    <RoleRoute roles={["ADMIN", "DOKAN", "FINANCE"]}>
                      <DailyTaskDetails />
                    </RoleRoute>
                  }
                />
              </Route>

              {/* Worker panel — Dokht and Qichikar */}
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
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </MonthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
