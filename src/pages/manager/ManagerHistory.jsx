import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, ArrowUpRight, History as HistoryIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import { Card, Badge, EmptyState, Skeleton } from "../../components/ui/Primitives";
import { fmtDate, fmtDateTime } from "../../utils/format";

const RANGES = [
  { id: "all", label: "All" },
  { id: "week", label: "Last Week" },
  { id: "custom", label: "Date Range" },
];

export default function ManagerHistory() {
  const { user } = useAuth();
  const { transactions } = useInventory();
  const loading = usePageLoad();
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    // History shows Check-Out transactions only, for this branch.
    let l = transactions.filter(
      (t) => t.type === "out" && (!user.branchId || t.branchId === user.branchId)
    );
    if (range === "week") {
      l = l.filter((t) => now - new Date(t.date) <= 7 * 864e5);
    } else if (range === "custom") {
      if (from) l = l.filter((t) => new Date(t.date) >= new Date(from));
      if (to) l = l.filter((t) => new Date(t.date) <= new Date(to + "T23:59:59"));
    }
    if (q.trim()) {
      const t = q.toLowerCase();
      l = l.filter(
        (r) =>
          r.productName.toLowerCase().includes(t) ||
          r.barcode.includes(t) ||
          r.invoiceNo.toLowerCase().includes(t)
      );
    }
    return l;
  }, [transactions, user.branchId, range, from, to, q]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">History</h1>
        <p className="text-sm text-slate-500">
          Check-out transactions{user.branch ? ` at ${user.branch.name}` : ""}.
        </p>
      </div>

      {/* Filters */}
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`relative rounded-lg px-3.5 py-1.5 text-sm font-semibold transition cursor-pointer ${
                  range === r.id ? "text-daikin-700" : "text-slate-500"
                }`}
              >
                {range === r.id && (
                  <motion.div
                    layoutId="sm-range-pill"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  />
                )}
                <span className="relative">{r.label}</span>
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-daikin-400"
              />
              <span className="text-slate-400">–</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-daikin-400"
              />
            </div>
          )}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search product, barcode or invoice…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-daikin-400 focus:bg-white"
            />
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={HistoryIcon}
            title="No check-outs found"
            subtitle="Adjust the date range or search to see results."
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3.5">Invoice No.</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5">Barcode</th>
                    <th className="px-5 py-3.5 text-center">Qty</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-daikin-50/30"
                    >
                      <td className="px-5 py-3.5 font-semibold text-daikin-700">
                        {t.invoiceNo}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{fmtDate(t.date)}</td>
                      <td className="px-5 py-3.5 text-slate-700">{t.productName}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                        {t.barcode}
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-700">
                        {t.quantity}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone="red">
                          <ArrowUpRight className="h-3 w-3" />
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {rows.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-daikin-700">{t.invoiceNo}</span>
                  <Badge tone="red">
                    <ArrowUpRight className="h-3 w-3" />
                    {t.status}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {t.productName}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                  <span className="font-mono">{t.barcode}</span>
                  <span>·</span>
                  <span title={fmtDateTime(t.date)}>{fmtDate(t.date)}</span>
                  <span>·</span>
                  <span>Qty {t.quantity}</span>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-xs text-slate-400">
            Showing {rows.length} check-out{rows.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>
  );
}
