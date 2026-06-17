import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { roleLabel } from "../../utils/format";
import Sidebar from "./Sidebar";
import logo from "/DAIKIN_logo.PNG";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const userRole = roleLabel(user.role);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef4fb]">
      {/* Top bar */}
      <header className="bg-daikin-gradient relative z-30 flex h-16 shrink-0 items-center justify-between px-3 sm:px-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawer(true)}
            className="grid h-10 w-10 place-items-center rounded-lg text-white/90 hover:bg-white/10 lg:hidden cursor-pointer"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2.5">
            <motion.img
              src={logo}
              alt="Daikin"
              className="h-14 w-auto brightness-110 saturate-150"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
            <span className="hidden text-xs font-bold uppercase tracking-[0.2em] text-white/70 sm:block">
              Inventory Ops
            </span>
          </div>
        </div>

        <div className="relative flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full bg-white/10 py-1.5 pl-1.5 pr-2.5 ring-1 ring-white/15 hover:bg-white/20 cursor-pointer"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-bold text-daikin-700">
              {user.initials}
            </div>
            <div className="hidden leading-tight text-left sm:block">
              <div className="text-sm font-bold text-white">{user.name}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                {userRole}
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-white/70 transition-transform ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="bg-daikin-gradient grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white">
                      {user.initials}
                    </div>
                    <div className="leading-tight">
                      <div className="text-sm font-bold text-slate-800">
                        {user.name}
                      </div>
                      <div className="text-xs font-semibold text-daikin-600">
                        {userRole}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 lg:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {drawer && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawer(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-72 shadow-2xl lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
              >
                <div className="flex h-14 items-center justify-between bg-daikin-gradient px-4">
                  <motion.img
                    src={logo}
                    alt="Daikin"
                    className="h-14 w-auto brightness-110 saturate-150"
                    initial={{ clipPath: "inset(0 100% 0 0)" }}
                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                    transition={{ duration: 1.4, ease: "easeInOut" }}
                  />
                  <button
                    onClick={() => setDrawer(false)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-white/90 hover:bg-white/10 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="h-[calc(100%-3.5rem)]">
                  <Sidebar onNavigate={() => setDrawer(false)} />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
