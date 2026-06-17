import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  ClipboardList,
  History,
  PackageSearch,
  Users,
  Building2,
  Tags,
} from "lucide-react";

export const NAV = {
  // Admin (super user) — full control over users, branches, categories, products.
  admin: [
    { to: "/app/users", label: "User Management", icon: Users },
    { to: "/app/branches", label: "Branch Management", icon: Building2 },
    { to: "/app/categories", label: "Categories", icon: Tags },
    { to: "/app/products", label: "Product Management", icon: Boxes },
  ],
  // Store Manager — operational: scanning, stock management, check-out history.
  store_manager: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/scan", label: "Check In / Out", icon: ScanLine },
    { to: "/app/stock", label: "Manage Stock", icon: PackageSearch },
    { to: "/app/history", label: "History", icon: History },
  ],
  // Distributor — inventory visibility & reporting.
  distributor: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/products", label: "Products", icon: Boxes },
    { to: "/app/history", label: "History & Invoices", icon: History },
    { to: "/app/recent", label: "Transaction Tracking", icon: ClipboardList },
  ],
};
