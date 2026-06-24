import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, ChevronDown, Building2, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { roleLabel } from "../../utils/format";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import GlobalSearch from "../search/GlobalSearch";
import logo from "/DAIKIN_logo.PNG";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { branches, viewBranchId, setViewBranchId } = useInventory();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

  const userRole = roleLabel(user.role);
  // Only store managers can switch branch — they view another branch read-only.
  // The "active" branch is the one they've switched to, or their own by default.
  const canSwitchBranch = user.role === "store_manager" && branches.length > 0;
  const activeBranchId = viewBranchId || user.branchId;

  function selectBranch(slug) {
    setViewBranchId((cur) => {
      if (slug === user.branchId) return null; // manager: back to own branch
      if (slug === cur) return null; // tapping the active branch clears it
      return slug;
    });
    setBranchMenuOpen(false);
    setProfileOpen(false);
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eef4fb]">
      {/* Top bar */}
      <header className="bg-daikin-gradient relative z-30 flex h-16 shrink-0 items-center justify-between px-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <motion.img
              src={logo}
              alt="Daikin"
              className="h-14 w-auto"
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
          <GlobalSearch />
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
                  onClick={() => {
                    setProfileOpen(false);
                    setBranchMenuOpen(false);
                  }}
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
                  {canSwitchBranch && (
                    <div className="border-b border-slate-100">
                      <button
                        onClick={() => setBranchMenuOpen((o) => !o)}
                        className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Building2 className="h-4 w-4 text-daikin-600" />
                        <span className="flex-1 text-left">Switch branch</span>
                        <ChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform ${
                            branchMenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {branchMenuOpen && (
                        <div className="max-h-56 overflow-y-auto pb-1">
                          {branches.map((b) => {
                            const isActive = b.id === activeBranchId;
                            const isOwn = b.id === user.branchId;
                            return (
                              <button
                                key={b.id}
                                onClick={() => selectBranch(b.id)}
                                className={`flex w-full items-center gap-2.5 py-2 pl-11 pr-4 text-sm cursor-pointer hover:bg-slate-50 ${
                                  isActive ? "font-bold text-daikin-700" : "text-slate-600"
                                }`}
                              >
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ background: b.color || "#94a3b8" }}
                                />
                                <span className="flex-1 truncate text-left">
                                  {b.name}
                                  {isOwn ? " (mine)" : ""}
                                </span>
                                {isActive && <Check className="h-4 w-4 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
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
        {/* Desktop sidebar (mobile uses the bottom tab bar instead) */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 lg:block">
          <Sidebar />
        </aside>

        {/* Content — equal top/bottom space; pb-16 on mobile clears the fixed
            h-16 bottom nav so the gap above it matches the gap below the header. */}
        <main className="flex flex-1 flex-col overflow-y-auto pb-16 lg:pb-0">
          <div className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar — fixed to the viewport, never scrolls away */}
      <BottomNav />
    </div>
  );
}
