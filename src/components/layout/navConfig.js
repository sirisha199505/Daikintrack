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
  Cable,
  Truck,
  UserSquare,
  FileInput,
  FileOutput,
  ShieldAlert,
  BookOpen,
  BarChart3,
} from "lucide-react";

// `label` is the full name; `short` is the compact tab-bar caption (BottomNav).
// `primary: true` marks the items kept in the mobile bottom bar; the rest fall
// into the "More" overflow sheet (see BottomNav).
export const NAV = {
  // Admin (super user) — full control + master data (suppliers/customers).
  admin: [
    { to: "/app/users", label: "User Management", short: "Users", icon: Users, primary: true },
    { to: "/app/branches", label: "Branch Management", short: "Branches", icon: Building2, primary: true },
    { to: "/app/categories", label: "Categories", short: "Categories", icon: Tags },
    { to: "/app/products", label: "Product Management", short: "Products", icon: Boxes, primary: true },
    { to: "/app/suppliers", label: "Suppliers", short: "Suppliers", icon: Truck },
    { to: "/app/customers", label: "Customers", short: "Customers", icon: UserSquare },
    { to: "/app/reports", label: "Reports", short: "Reports", icon: BarChart3, primary: true },
  ],
  // Store Manager — operational: invoicing, stock, quarantine, ledger.
  store_manager: [
    { to: "/app/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard, primary: true },
    { to: "/app/scan", label: "Check In / Out", short: "Scan", icon: ScanLine, primary: true },
    { to: "/app/purchase-invoices", label: "Purchase Invoices", short: "Purchases", icon: FileInput },
    { to: "/app/sales-invoices", label: "Sales Invoices", short: "Sales", icon: FileOutput },
    { to: "/app/stock", label: "Manage Stock", short: "Stock", icon: PackageSearch, primary: true },
    { to: "/app/quarantine", label: "Quarantine & Returns", short: "Returns", icon: ShieldAlert },
    { to: "/app/suppliers", label: "Suppliers", short: "Suppliers", icon: Truck },
    { to: "/app/customers", label: "Customers", short: "Customers", icon: UserSquare },
    { to: "/app/ledger", label: "Inventory Ledger", short: "Ledger", icon: BookOpen },
    { to: "/app/product-history", label: "Product History", short: "Trace", icon: ClipboardList },
    { to: "/app/copper", label: "CopperScan", short: "Copper", icon: Cable },
    { to: "/app/history", label: "History", short: "History", icon: History },
  ],
  // Distributor — inventory visibility & reporting.
  distributor: [
    { to: "/app/dashboard", label: "Dashboard", short: "Dashboard", icon: LayoutDashboard, primary: true },
    { to: "/app/products", label: "Products", short: "Products", icon: Boxes, primary: true },
    { to: "/app/ledger", label: "Inventory Ledger", short: "Ledger", icon: BookOpen, primary: true },
    { to: "/app/reports", label: "Reports", short: "Reports", icon: BarChart3, primary: true },
    { to: "/app/product-history", label: "Product History", short: "Trace", icon: ClipboardList },
    { to: "/app/history", label: "History & Invoices", short: "History", icon: History },
    { to: "/app/recent", label: "Transaction Tracking", short: "Activity", icon: ClipboardList },
  ],
};
