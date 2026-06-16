import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Products from "./pages/admin/Products";
import History from "./pages/admin/History";

import ManagerDashboard from "./pages/manager/ManagerDashboard";
import ScanInOut from "./pages/manager/ScanInOut";
import ManageStock from "./pages/manager/ManageStock";
import RecentScans from "./pages/manager/RecentScans";

// Picks the right dashboard for the signed-in role.
function DashboardRouter() {
  const { user } = useAuth();
  return user.role === "admin" ? <AdminDashboard /> : <ManagerDashboard />;
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
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRouter />} />

        {/* Admin */}
        <Route
          path="products"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="history"
          element={
            <ProtectedRoute roles={["admin"]}>
              <History />
            </ProtectedRoute>
          }
        />

        {/* Manager */}
        <Route
          path="scan"
          element={
            <ProtectedRoute roles={["manager"]}>
              <ScanInOut />
            </ProtectedRoute>
          }
        />
        <Route
          path="stock"
          element={
            <ProtectedRoute roles={["manager"]}>
              <ManageStock />
            </ProtectedRoute>
          }
        />
        <Route
          path="recent"
          element={
            <ProtectedRoute roles={["manager"]}>
              <RecentScans />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
