import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NAV } from "./navConfig";
import { classNames } from "../../utils/format";

// Mobile-only bottom tab bar (hidden on lg, where the sidebar takes over).
// Mirrors the per-role items from navConfig so it stays in sync with the sidebar.
export default function BottomNav() {
  const { user } = useAuth();
  const items = NAV[user.role] || [];

  return (
    <nav className="sticky bottom-0 z-30 flex shrink-0 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            classNames(
              "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition",
              isActive ? "text-daikin-600" : "text-slate-400 hover:text-slate-600"
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0" />
          <span className="max-w-full truncate leading-tight">{item.short || item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
