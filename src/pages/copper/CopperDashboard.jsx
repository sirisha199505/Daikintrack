import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Cable, Ruler, Layers, Gauge, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useInventory } from "../../context/InventoryContext";
import { useCopperScans } from "../../context/CopperScanContext";
import { Card, Skeleton, EmptyState } from "../../components/ui/Primitives";
import CopperTabs from "../../components/copper/CopperTabs";

const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-daikin-400 cursor-pointer";

export default function CopperDashboard() {
  const { user } = useAuth();
  const { branches } = useAdmin();
  const { viewBranchId } = useInventory();
  const { loadSummary } = useCopperScans();
  const navigate = useNavigate();

  const canFilterBranch = user.role === "admin" || user.role === "distributor";
  const branchApiId = (slug) => branches.find((b) => b.id === slug)?.apiId;
  const [branch, setBranch] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const branchId =
      user.role === "store_manager"
        ? branchApiId(viewBranchId || user.branchId)
        : branch !== "all"
        ? branchApiId(branch)
        : undefined;
    setLoading(true);
    loadSummary({ branchId, from: from || undefined, to: to || undefined })
      .then((d) => alive && setData(d))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSummary, branch, from, to, viewBranchId, branches]);

  const branchColor = (name) => branches.find((b) => b.name === name)?.color || "#f59e0b";
  const byBranch = useMemo(
    () => (data?.by_branch || []).map((b) => ({ ...b, name: b.branch_name || "—" })),
    [data]
  );
  const byMonth = data?.by_month || [];
  const hasData = (data?.total_scans || 0) > 0;
  const totalScans = data?.total_scans || 0;
  const totalLength = data?.total_length_m || 0;
  const avgLength = totalScans ? totalLength / totalScans : 0;

  const kpis = [
    { label: "Total scans", icon: Layers, tone: "text-daikin-600 bg-daikin-50", value: totalScans },
    { label: "Total length", icon: Ruler, tone: "text-amber-600 bg-amber-50", value: `${totalLength.toFixed(1)} m` },
    { label: "Avg / scan", icon: Gauge, tone: "text-emerald-600 bg-emerald-50", value: `${avgLength.toFixed(2)} m` },
  ];

  return (
    <div className="space-y-5">
      <CopperTabs />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Cable className="h-6 w-6 text-amber-600" /> Copper Analytics
          </h1>
          <p className="text-sm text-slate-500">Copper wire measured across branches.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canFilterBranch && (
            <select className={selectCls} value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <input type="date" className={selectCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className={selectCls} value={to} onChange={(e) => setTo(e.target.value)} />
          <button
            onClick={() => navigate("/app/copper")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" /> New scan
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.label} className="flex items-center gap-3 p-4">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${k.tone}`}>
              <k.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-800">{loading ? "…" : k.value}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{k.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : !hasData ? (
        <Card>
          <EmptyState icon={Cable} title="No copper scans in range" subtitle="Record scans or widen the date filter." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Length by branch */}
          <Card className="p-5">
            <h3 className="text-base font-bold text-slate-800">Length by branch</h3>
            <p className="mb-2 text-xs text-slate-400">Measured wire (m)</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byBranch} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v} m`, "Length"]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="length_m" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {byBranch.map((b) => (
                      <Cell key={b.branch_id} fill={branchColor(b.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Monthly trend */}
          <Card className="p-5">
            <h3 className="text-base font-bold text-slate-800">Measurement trend</h3>
            <p className="mb-2 text-xs text-slate-400">Length (m) by month</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={byMonth} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                  <defs>
                    <linearGradient id="copperTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v} m`, "Length"]} contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="length_m" stroke="#d97706" strokeWidth={2} fill="url(#copperTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* By-branch table */}
          <Card className="overflow-hidden lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">Branch</th>
                    <th className="px-5 py-3 text-right">Scans</th>
                    <th className="px-5 py-3 text-right">Length (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {byBranch.map((b) => (
                    <tr key={b.branch_id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-semibold text-slate-700">{b.name}</td>
                      <td className="px-5 py-3 text-right text-slate-600">{b.scans}</td>
                      <td className="px-5 py-3 text-right font-bold text-amber-700">{b.length_m.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
