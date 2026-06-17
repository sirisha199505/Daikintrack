import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Products from "./pages/admin/Products";
import History from "./pages/admin/History";
import UserManagement from "./pages/admin/UserManagement";
import BranchManagement from "./pages/admin/BranchManagement";
import CategoryManagement from "./pages/admin/CategoryManagement";

import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ScanInOut from "./pages/manager/ScanInOut";
import ManageStock from "./pages/manager/ManageStock";
import ManagerHistory from "./pages/manager/ManagerHistory";
import RecentScans from "./pages/manager/RecentScans";

// Picks the right dashboard for the signed-in role.
// Store Manager → operational dashboard; Distributor → system overview.
// Admin has no dashboard — it lands on User Management instead.
function DashboardRouter() {
  const { user } = useAuth();
  if (user.role === "admin") return <Navigate to="/app/users" replace />;
  return user.role === "store_manager" ? <ManagerDashboard /> : <AdminDashboard />;
}

// The default landing per role after login.
function HomeRedirect() {
  const { user } = useAuth();
  const to = user.role === "admin" ? "users" : "dashboard";
  return <Navigate to={to} replace />;
}

// History is shared: Store Manager sees branch check-outs; Distributor sees the
// full transaction/invoice history.
function HistoryRouter() {
  const { user } = useAuth();
  return user.role === "store_manager" ? <ManagerHistory /> : <History />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<DashboardRouter />} />

        {/* Admin — super user management */}
        <Route
          path="users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="branches"
          element={
            <ProtectedRoute roles={["admin"]}>
              <BranchManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="categories"
          element={
            <ProtectedRoute roles={["admin"]}>
              <CategoryManagement />
            </ProtectedRoute>
          }
        />

        {/* Products — Admin (manage) & Distributor (visibility) */}
        <Route
          path="products"
          element={
            <ProtectedRoute roles={["admin", "distributor"]}>
              <Products />
            </ProtectedRoute>
          }
        />

        {/* Store Manager — operational */}
        <Route
          path="scan"
          element={
            <ProtectedRoute roles={["store_manager"]}>
              <ScanInOut />
            </ProtectedRoute>
          }
        />
        <Route
          path="stock"
          element={
            <ProtectedRoute roles={["store_manager"]}>
              <ManageStock />
            </ProtectedRoute>
          }
        />

        {/* History — Store Manager (check-outs) & Distributor (full history) */}
        <Route
          path="history"
          element={
            <ProtectedRoute roles={["distributor", "store_manager"]}>
              <HistoryRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="recent"
          element={
            <ProtectedRoute roles={["distributor"]}>
              <RecentScans />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
