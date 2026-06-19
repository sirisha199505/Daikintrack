import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  PackageX,
  CheckCircle2,
  Eye,
  PieChart as PieIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import GreetingHeader from "../../components/layout/GreetingHeader";
import DonutChart from "../../components/charts/DonutChart";
import { Card, Skeleton, Button, EmptyState } from "../../components/ui/Primitives";
import { num } from "../../utils/format";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { categoryBreakdown, statsFor, branches, viewBranchId, isViewingOtherBranch } =
    useInventory();
  const navigate = useNavigate();
  const loading = usePageLoad();
  // The branch currently being viewed — own branch by default, or another branch
  // picked via "Switch Branch" (read-only).
  const branchId = viewBranchId || user.branchId;
  const viewedBranch =
    branches.find((b) => b.id === branchId) || (branchId === user.branchId ? user.branch : null);

  const cats = useMemo(() => categoryBreakdown(branchId), [categoryBreakdown, branchId]);
  const stats = useMemo(() => statsFor(branchId), [statsFor, branchId]);

  const inStockData = useMemo(
    () => cats.filter((c) => c.value > 0).map((c) => ({ name: c.name, value: c.value, color: c.color })),
    [cats]
  );
  const lowData = useMemo(
    () => cats.filter((c) => c.lowValue > 0).map((c) => ({ name: c.name, value: c.lowValue, color: c.color })),
    [cats]
  );
  const lowUnits = useMemo(() => lowData.reduce((s, d) => s + d.value, 0), [lowData]);
  if (loading) return <ManagerSkeleton />;

  const branchLabel = viewedBranch
    ? `${viewedBranch.name} · ${viewedBranch.location}`
    : "All Hubs";

  return (
    <div className="space-y-6">
      <GreetingHeader
        name={user.name}
        subtitle={viewedBranch ? branchLabel : "All Hubs · Store Operations"}
        badge={
          viewedBranch ? (
            <div className="hidden shrink-0 rounded-xl bg-white/10 px-4 py-2.5 text-right ring-1 ring-white/15 sm:block">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                Code
              </div>
              <div className="text-lg font-bold">{viewedBranch.code}</div>
            </div>
          ) : null
        }
      />

      {isViewingOtherBranch && (
        <div className="flex items-center gap-2 rounded-xl border border-daikin-200 bg-daikin-50 px-4 py-3 text-sm text-daikin-800">
          <Eye className="h-4 w-4 shrink-0" />
          <span>
            You're managing <strong>{viewedBranch?.name}</strong>. Switch back to your own branch
            from the profile menu any time.
          </span>
        </div>
      )}

      {/* ===== Stock Overview ===== */}
      <section>
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {branchLabel}
        </div>
        <h2 className="text-xl font-bold text-slate-800">Stock Overview</h2>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* In Stock — Donut */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                <Boxes className="h-4 w-4 text-daikin-600" /> In Stock
              </h3>
              <p className="text-xs text-slate-400">Total available stock</p>
            </div>
            <span className="rounded-full bg-daikin-50 px-3 py-1 text-sm font-bold text-daikin-700">
              {num(stats.totalStock)}
            </span>
          </div>
          {inStockData.length ? (
            <div className="mt-2">
              <DonutChart
                data={inStockData}
                centerValue={num(stats.totalStock)}
                centerLabel="in stock"
                showTooltip
              />
            </div>
          ) : (
            <EmptyState icon={PackageX} title="No stock available" />
          )}
        </Card>

        {/* Low Stock — Pie */}
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                <PieIcon className="h-4 w-4 text-red-500" /> Low Stock
              </h3>
              <p className="text-xs text-slate-400">Items at or below threshold</p>
            </div>
            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
              {num(stats.lowStock)}
            </span>
          </div>
          {lowData.length ? (
            <div className="mt-2">
              <DonutChart
                data={lowData}
                centerValue={num(lowUnits)}
                centerLabel="low units"
                unit="units"
              />
            </div>
          ) : (
            <div className="grid min-h-[220px] place-items-center">
              <EmptyState
                icon={CheckCircle2}
                title="All healthy"
                subtitle="No products are running low right now."
              />
            </div>
          )}
        </Card>
      </div>

      <Card className="flex flex-col gap-3 p-5 sm:flex-row">
        <Button size="lg" className="flex-1" onClick={() => navigate("/app/scan?op=in")}>
          <ArrowDownLeft className="h-4 w-4" /> Check In
        </Button>
        <Button size="lg" variant="danger" className="flex-1" onClick={() => navigate("/app/scan?op=out")}>
          <ArrowUpRight className="h-4 w-4" /> Check Out
        </Button>
      </Card>
    </div>
  );
}

function ManagerSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
