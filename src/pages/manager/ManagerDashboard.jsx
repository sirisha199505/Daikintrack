import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import GreetingHeader from "../../components/layout/GreetingHeader";
import DonutChart from "../../components/charts/DonutChart";
import ScanFlowModal from "../../components/scan/ScanFlowModal";
import { Card, Skeleton } from "../../components/ui/Primitives";
import { num } from "../../utils/format";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { categoryBreakdown } = useInventory();
  const loading = usePageLoad();
  const [scanOpen, setScanOpen] = useState(false);
  const branchId = user.branchId;

  const cats = useMemo(
    () => categoryBreakdown(branchId).filter((c) => c.value > 0),
    [categoryBreakdown, branchId]
  );
  const total = cats.reduce((s, c) => s + c.value, 0);
  const lowCats = cats.filter((c) => c.low);

  if (loading) return <ManagerSkeleton />;

  return (
    <div className="space-y-5 pb-24">
      <GreetingHeader
        name={user.name}
        subtitle={`${user.branch?.name} · ${user.branch?.location}`}
        badge={
          <div className="hidden shrink-0 rounded-xl bg-white/10 px-4 py-2.5 text-right ring-1 ring-white/15 sm:block">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              Code
            </div>
            <div className="text-lg font-bold">{user.branch?.code}</div>
          </div>
        }
      />

      {/* Low stock alert */}
      {lowCats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            <span className="font-bold">Low Stock Alert</span> — {lowCats.length}{" "}
            alert{lowCats.length > 1 ? "s" : ""} —{" "}
            {lowCats.map((c) => c.name).join(", ")}
          </p>
        </motion.div>
      )}

      {/* Stock by category */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Stock by Category
            </h2>
            <p className="text-xs text-slate-400">{num(total)} units total</p>
          </div>
          <span className="rounded-full border border-daikin-200 bg-daikin-50 px-3 py-1 text-xs font-semibold text-daikin-700">
            {user.branch?.name}
          </span>
        </div>

        <div className="mt-4">
          <DonutChart data={cats} height={260} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3.5 hover:border-daikin-200 hover:bg-daikin-50/40 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: c.color }}
                />
                <span className="truncate text-sm font-semibold text-slate-700">
                  {c.name}
                </span>
              </div>
              <span
                className={`text-lg font-bold ${
                  c.low ? "text-red-500" : "text-slate-800"
                }`}
              >
                {c.value}
              </span>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Sticky check in/out bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 p-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl gap-3">
          <button
            onClick={() => setScanOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-daikin-btn py-3.5 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:brightness-110 cursor-pointer"
          >
            <ArrowDownLeft className="h-4 w-4" /> Check In
          </button>
          <button
            onClick={() => setScanOpen(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 cursor-pointer"
          >
            <ArrowUpRight className="h-4 w-4" /> Check Out
          </button>
        </div>
      </div>

      <ScanFlowModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        branchId={branchId}
      />
    </div>
  );
}

function ManagerSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
