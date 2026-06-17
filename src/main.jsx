import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AdminProvider } from "./context/AdminContext";
import { AuthProvider } from "./context/AuthContext";
import { InventoryProvider } from "./context/InventoryContext";
import { ToastProvider } from "./components/ui/Toast";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AdminProvider>
        <AuthProvider>
          <InventoryProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </InventoryProvider>
        </AuthProvider>
      </AdminProvider>
    </BrowserRouter>
  </StrictMode>
);
