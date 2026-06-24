import { useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NAV } from "./navConfig";
import { classNames } from "../../utils/format";

// Mobile-only bottom tab bar (hidden on lg, where the sidebar takes over).
// Only `primary` items live in the bar; everything else goes into a "More" sheet
// so roles with many sections stay usable on a phone.
export default function BottomNav() {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const all = NAV[user.role] || [];
  const primary = all.filter((i) => i.primary).slice(0, 4);
  const overflow = all.filter((i) => !primary.includes(i));

  const tabCls = ({ isActive }) =>
    classNames(
      "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold transition",
      isActive ? "text-daikin-600" : "text-slate-400 hover:text-slate-600"
    );

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 lg:hidden">
        {primary.map((item) => (
          <NavLink key={item.to} to={item.to} className={tabCls}>
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate leading-tight">{item.short || item.label}</span>
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-600">
            <MoreHorizontal className="h-5 w-5 shrink-0" />
            <span className="leading-tight">More</span>
          </button>
        )}
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
            <motion.div
              className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-8"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700">More</h3>
                <button onClick={() => setMoreOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {overflow.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      classNames(
                        "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-semibold transition",
                        isActive ? "bg-daikin-50 text-daikin-600" : "text-slate-500 hover:bg-slate-100"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="leading-tight">{item.short || item.label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
