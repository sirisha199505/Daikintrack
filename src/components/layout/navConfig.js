import {
  LayoutDashboard,
  Boxes,
  ScanLine,
  ClipboardList,
  History,
  PackageSearch,
} from "lucide-react";

export const NAV = {
  admin: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/products", label: "Products", icon: Boxes },
    { to: "/app/history", label: "History", icon: History },
  ],
  manager: [
    { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/scan", label: "Scan In/Out", icon: ScanLine },
    { to: "/app/stock", label: "Manage Stock", icon: PackageSearch },
    { to: "/app/recent", label: "Recent Scans", icon: ClipboardList },
  ],
};
