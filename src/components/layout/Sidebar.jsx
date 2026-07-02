import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { NAV } from "./navConfig";
import { classNames } from "../../utils/format";

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const items = NAV[user.role] || [];

  return (
    <div className="flex h-full flex-col bg-white">
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          General
        </div>
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  classNames(
                    "relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                    isActive
                      ? "text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-xl bg-daikin-btn shadow-[var(--shadow-soft)]"
                        transition={{ type: "spring", damping: 26, stiffness: 320 }}
                      />
                    )}
                    <item.icon className="relative h-5 w-5 shrink-0" />
                    <span className="relative">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
