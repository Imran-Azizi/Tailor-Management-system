import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import {
  ProtectedRoute,
  RoleRoute,
  WorkerProtectedRoute,
} from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import WorkerLayout from "./components/WorkerLayout.jsx";
import WorkerPanel from "./pages/WorkerPanel.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CreateOrder from "./pages/CreateOrder.jsx";
import AllOrders from "./pages/AllOrders.jsx";
import EditOrder from "./pages/EditOrder.jsx";
import Customers from "./pages/Customers.jsx";
import Boxes from "./pages/Boxes.jsx";
import Designs from "./pages/Designs.jsx";
import Notifications from "./pages/Notifications.jsx";
import PrintBills from "./pages/PrintBills.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import MyTasks from "./pages/MyTasks.jsx";
import CustomerTransactions from "./pages/CustomerTransactions.jsx";
import CustomerReport from "./pages/CustomerReport.jsx";
import MakeTransaction from "./pages/MakeTransaction.jsx";
import AllTransactions from "./pages/AllTransactions.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";
import ClothesDeliveryToCustomer from "./pages/ClothesDeliveryToCustomer.jsx";
import AssignOrders from "./pages/AssignOrders.jsx";
import AssignOrdersReport from "./pages/AssignOrdersReport.jsx";
import CompletedWorkerOrders from "./pages/CompletedWorkerOrders.jsx";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="my-tasks" element={<MyTasks />} />

              <Route
                path="orders/create"
                element={
                  <RoleRoute roles={["ADMIN", "DOKAN"]}>
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
                  <RoleRoute roles={["ADMIN", "DOKAN"]}>
                    <Boxes />
                  </RoleRoute>
                }
              />
              <Route
                path="designs"
                element={
                  <RoleRoute roles={["ADMIN", "DOKAN"]}>
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
              <Route path="notifications" element={<Notifications />} />

              <Route
                path="users"
                element={
                  <RoleRoute roles={["ADMIN"]}>
                    <UserManagement />
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
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
