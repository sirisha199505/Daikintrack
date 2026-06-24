import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Search, ArrowDownLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import { Card, Badge, EmptyState, Skeleton } from "../../components/ui/Primitives";
import SerialBadge from "../../components/invoices/SerialBadge";
import { useReports } from "../../context/ReportsContext";
import { useToast } from "../../components/ui/Toast";
import { fmtDateTime, num } from "../../utils/format";

const TYPE_TONE = {
  purchase: "green", opening: "green", restock: "green",
  sale: "red", scrap: "red",
  return: "amber", inspection: "amber", repair: "amber", replacement: "blue",
};
const FILTERS = [
  { id: "", label: "All" },
  { id: "purchase", label: "Purchase" },
  { id: "sale", label: "Sale" },
  { id: "return", label: "Return" },
  { id: "replacement", label: "Replacement" },
];

export default function InventoryLedger() {
  const { ledger } = useReports();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(
    async (t) => {
      setLoading(true);
      try {
        setRows(await ledger(t ? { type: t } : {}));
      } catch (e) {
        toast(e.message || "Failed to load ledger.", "error");
      } finally {
        setLoading(false);
      }
    },
    [ledger, toast]
  );

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(type); }, [load, type]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.serialNo, r.invoiceNo, r.partyName, r.productName].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventory Ledger</h1>
        <p className="text-sm text-slate-500">Every stock movement — purchases, sales, returns, replacements.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setType(f.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition cursor-pointer ${type === f.id ? "bg-daikin-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Serial, invoice, party…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-daikin-400 focus:ring-2 focus:ring-daikin-100" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8"><EmptyState icon={BookOpen} title="No movements" subtitle="No ledger entries match your filters." /></Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">Serial</th>
                    <th className="px-5 py-3 font-semibold">Party</th>
                    <th className="px-5 py-3 font-semibold">Invoice</th>
                    <th className="px-5 py-3 text-right font-semibold">Qty</th>
                    <th className="px-5 py-3 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 whitespace-nowrap text-slate-500">{fmtDateTime(r.date)}</td>
                      <td className="px-5 py-3"><Badge tone={TYPE_TONE[r.movementType] || "slate"}>{r.movementType}</Badge></td>
                      <td className="px-5 py-3 text-slate-700">{r.productName}</td>
                      <td className="px-5 py-3">{r.serialNo ? <SerialBadge serialNo={r.serialNo} status={r.toStatus || "available"} /> : "—"}</td>
                      <td className="px-5 py-3 text-slate-500">{r.partyName || "—"}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{r.invoiceNo || "—"}</td>
                      <td className={`px-5 py-3 text-right font-semibold tabular-nums ${r.qty > 0 ? "text-emerald-600" : r.qty < 0 ? "text-red-500" : "text-slate-400"}`}>
                        {r.qty > 0 ? `+${r.qty}` : r.qty}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-700">{r.balanceAfter == null ? "—" : num(r.balanceAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={TYPE_TONE[r.movementType] || "slate"}>{r.movementType}</Badge>
                    <span className={`flex items-center gap-1 text-sm font-bold ${r.qty > 0 ? "text-emerald-600" : r.qty < 0 ? "text-red-500" : "text-slate-400"}`}>
                      {r.qty > 0 ? <ArrowDownLeft className="h-3.5 w-3.5" /> : r.qty < 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      {r.qty > 0 ? `+${r.qty}` : r.qty}
                    </span>
                  </div>
                  <div className="mt-2 font-semibold text-slate-700">{r.productName}</div>
                  {r.serialNo && <div className="mt-1"><SerialBadge serialNo={r.serialNo} status={r.toStatus || "available"} /></div>}
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>{r.partyName || "—"} · {r.invoiceNo || "—"}</span>
                    <span>{fmtDateTime(r.date)}</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-xs text-slate-400">{filtered.length} movement{filtered.length === 1 ? "" : "s"}</p>
        </>
      )}
    </div>
  );
}
