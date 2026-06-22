import { NavLink } from "react-router-dom";
import { ScanLine, ListChecks, BarChart3 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { classNames } from "../../utils/format";

// Sub-navigation shared across the CopperScan pages. The capture tab is only
// shown to roles allowed to record (admin & store manager); distributors are
// read-only here.
export default function CopperTabs() {
  const { user } = useAuth();
  const canScan = user.role === "admin" || user.role === "store_manager";

  const tabs = [
    canScan && { to: "/app/copper", label: "New scan", icon: ScanLine, end: true },
    { to: "/app/copper/history", label: "History", icon: ListChecks },
    { to: "/app/copper/analytics", label: "Analytics", icon: BarChart3 },
  ].filter(Boolean);

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            classNames(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition",
              isActive
                ? "bg-daikin-btn text-white shadow-[var(--shadow-soft)]"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )
          }
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
