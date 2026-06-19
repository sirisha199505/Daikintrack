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

// `label` is the full name; `short` is the compact tab-bar caption (BottomNav).
export const NAV = {
  // Admin (super user) — full control over users, branches, categories, products.
  admin: [
    { to: "/app/users", label: "User Management", short: "Users", icon: Users },
    { to: "/app/branches", label: "Branch Management", short: "Branches", icon: Building2 },
    { to: "/app/categories", label: "Categories", short: "Categories", icon: Tags },
    { to: "/app/products", label: "Product Management", short: "Products", icon: Boxes },
  ],
  // Store Manager — operational: scanning, stock management, check-out history.
  store_manager: [
    { to: "/app/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
    { to: "/app/scan", label: "Check In / Out", short: "Scan", icon: ScanLine },
    { to: "/app/stock", label: "Manage Stock", short: "Stock", icon: PackageSearch },
    { to: "/app/history", label: "History", short: "History", icon: History },
  ],
  // Distributor — inventory visibility & reporting.
  distributor: [
    { to: "/app/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard },
    { to: "/app/products", label: "Products", short: "Products", icon: Boxes },
    { to: "/app/history", label: "History & Invoices", short: "History", icon: History },
    { to: "/app/recent", label: "Transaction Tracking", short: "Activity", icon: ClipboardList },
  ],
};
