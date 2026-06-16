import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  AlertTriangle,
  PackageX,
  ArrowLeftRight,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import GreetingHeader from "../../components/layout/GreetingHeader";
import { Card, StatCard, Skeleton, Badge } from "../../components/ui/Primitives";
import ActivityChart from "../../components/charts/ActivityChart";
import { num, timeAgo } from "../../utils/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { branches, statsFor, transactions } = useInventory();
  const loading = usePageLoad();
  const [activeHub, setActiveHub] = useState(branches[0].id);

  const overall = useMemo(() => statsFor(null), [statsFor]);
  const hubStats = useMemo(
    () => statsFor(activeHub),
    [statsFor, activeHub]
  );
  const hub = branches.find((b) => b.id === activeHub);
  const hubIndex = branches.findIndex((b) => b.id === activeHub) + 1;
  const hubShare = overall.totalStock
    ? Math.round((hubStats.totalStock / overall.totalStock) * 100)
    : 0;

  const monthly = useMemo(() => {
    const map = MONTHS.map((m) => ({ label: m, in: 0, out: 0 }));
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() !== 2026) return;
      const idx = d.getMonth();
      if (idx < MONTHS.length) {
        if (t.type === "in") map[idx].in += t.quantity;
        else map[idx].out += t.quantity;
      }
    });
    return map;
  }, [transactions]);

  const recent = transactions.slice(0, 6);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <GreetingHeader
        name={user.name}
        subtitle="Store Manager · All Branches"
      />

      {/* System overview */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          All Branches
        </div>
        <h2 className="text-xl font-bold text-slate-800">System Overview</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Boxes} label="Total Stock" value={num(overall.totalStock)} tone="blue" delay={0} />
        <StatCard icon={AlertTriangle} label="Low Stock" value={overall.lowStock} tone="amber" delay={0.05} />
        <StatCard icon={PackageX} label="Out of Stock" value={overall.outOfStock} tone="red" delay={0.1} />
        <StatCard icon={ArrowLeftRight} label="Today's Moves" value={overall.moves} tone="green" delay={0.15} />
      </div>

      {/* Hub tabs */}
      <div className="flex flex-wrap gap-2">
        {branches.map((b) => {
          const active = activeHub === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setActiveHub(b.id)}
              style={
                active
                  ? { background: b.color, boxShadow: `0 8px 20px ${b.color}55` }
                  : undefined
              }
              className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                active
                  ? "text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: active ? "#fff" : b.color }}
              />
              {b.name}
            </button>
          );
        })}
      </div>

      {/* Hub detail card — container stays mounted so the layout never jumps;
          only the inner content crossfades when the active hub changes. */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white transition-[background,box-shadow] duration-500"
        style={{
          background: hub.gradient,
          boxShadow: `0 16px 44px -8px ${hub.color}66`,
        }}
      >
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <motion.div
          key={activeHub}
          initial={{ opacity: 0, scale: 0.8, rotateX: -25, filter: "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, rotateX: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          style={{ transformPerspective: 900 }}
        >
          <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{hub.name}</h3>
                  <p className="text-sm text-white/70">
                    {hub.location} · {hub.manager}
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] font-bold uppercase tracking-widest text-white/60">
                Hub {hubIndex}/{branches.length}
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-2 gap-2.5">
              <HubStat value={num(hubStats.totalStock)} label="Total" />
              <HubStat value={hubStats.lowStock} label="Low Stock" />
              <HubStat value={hubStats.outOfStock} label="Out Stock" />
              <HubStat value={hubStats.moves} label="Moves" />
            </div>

            <div className="relative mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                <motion.div
                  className="h-full rounded-full bg-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${hubShare}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-white/70">
                <span>{hubShare}% of total inventory</span>
                <span className="hidden sm:inline">← tap a hub to browse →</span>
              </div>
            </div>
        </motion.div>
      </div>
      {/* /hub detail */}

      {/* Charts + recent activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-base font-bold text-slate-800">
            Inventory Movement
          </h3>
          <p className="text-xs text-slate-400">
            Monthly check-in vs check-out (2026)
          </p>
          <div className="mt-3">
            <ActivityChart data={monthly} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-bold text-slate-800">
            Recent Activities
          </h3>
          <div className="mt-3 space-y-2">
            {recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
              >
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                    t.type === "in"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {t.type === "in" ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-700">
                    {t.productName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {t.branchName} · {timeAgo(t.date)}
                  </div>
                </div>
                <Badge tone={t.type === "in" ? "green" : "red"}>
                  {t.type === "in" ? "+" : "-"}
                  {t.quantity}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function HubStat({ value, label }) {
  return (
    <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/10">
      <div className="text-2xl font-extrabold sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-white/70">
        {label}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
