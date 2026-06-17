import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  Download,
  Printer,
  ReceiptText,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  History as HistoryIcon,
} from "lucide-react";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import {
  Card,
  StatCard,
  Badge,
  EmptyState,
  Skeleton,
  Button,
} from "../../components/ui/Primitives";
import InvoiceModal from "../../components/history/InvoiceModal";
import { downloadInvoice, printInvoice } from "../../utils/invoice";
import { fmtDate, num } from "../../utils/format";

const RANGES = [
  { id: "recent", label: "Recent" },
  { id: "week", label: "Last Week" },
  { id: "month", label: "Monthly" },
  { id: "custom", label: "Custom" },
];
const FIELDS = [
  { id: "all", label: "All Fields" },
  { id: "invoiceNo", label: "Invoice No." },
  { id: "productName", label: "Product" },
  { id: "branchName", label: "Branch" },
];

export default function History() {
  const { transactions, getProduct } = useInventory();
  const loading = usePageLoad();
  const [range, setRange] = useState("recent");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [field, setField] = useState("all");
  const [q, setQ] = useState("");
  const [invoice, setInvoice] = useState(null);

  const filtered = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    let l = [...transactions];
    if (range === "week") l = l.filter((t) => now - new Date(t.date) <= 7 * 864e5);
    else if (range === "month")
      l = l.filter((t) => now - new Date(t.date) <= 30 * 864e5);
    else if (range === "custom") {
      if (from) l = l.filter((t) => new Date(t.date) >= new Date(from));
      if (to)
        l = l.filter((t) => new Date(t.date) <= new Date(to + "T23:59:59"));
    }
    if (q.trim()) {
      const t = q.toLowerCase();
      l = l.filter((row) => {
        if (field === "all")
          return [row.invoiceNo, row.productName, row.branchName]
            .join(" ")
            .toLowerCase()
            .includes(t);
        return String(row[field]).toLowerCase().includes(t);
      });
    }
    return l;
  }, [transactions, range, from, to, q, field]);

  const stats = useMemo(() => {
    const activeBranches = new Set(transactions.map((t) => t.branchId)).size;
    return {
      total: transactions.length,
      branches: activeBranches,
    };
  }, [transactions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">History</h1>
        <p className="text-sm text-slate-500">
          All inventory transactions across branches.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={ReceiptText}
          label="Total Transactions"
          value={num(stats.total)}
          tone="green"
        />
        <StatCard
          icon={Building2}
          label="Active Branches"
          value={stats.branches}
          tone="amber"
          delay={0.05}
        />
      </div>

      {/* Filters */}
      <Card className="p-4 space-y-3">
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
                    layoutId="range-pill"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  />
                )}
                <span className="relative">{r.label}</span>
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2">
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-daikin-400 cursor-pointer"
          >
            {FIELDS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoice, barcode, product or branch…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-daikin-400 focus:bg-white"
            />
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={HistoryIcon}
            title="No transactions found"
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
                    <th className="px-5 py-3.5">Branch</th>
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5 text-center">Qty</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-daikin-50/30"
                    >
                      <td className="px-5 py-3.5 font-semibold text-daikin-700">
                        {t.invoiceNo}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {fmtDate(t.date)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {t.branchName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {t.productName}
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-700">
                        {t.quantity}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={t.type === "in" ? "green" : "red"}>
                          {t.type === "in" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <IconBtn
                            title="View Invoice"
                            onClick={() => setInvoice(t)}
                          >
                            <Eye className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            title="Download PDF"
                            onClick={() =>
                              downloadInvoice(t, getProduct(t.productId))
                            }
                          >
                            <Download className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            title="Print"
                            onClick={() =>
                              printInvoice(t, getProduct(t.productId))
                            }
                          >
                            <Printer className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-daikin-700">
                    {t.invoiceNo}
                  </span>
                  <Badge tone={t.type === "in" ? "green" : "red"}>
                    {t.status}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-700">
                  {t.productName}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {t.branchName} · {fmtDate(t.date)} · Qty {t.quantity}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setInvoice(t)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadInvoice(t, getProduct(t.productId))}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => printInvoice(t, getProduct(t.productId))}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <p className="text-xs text-slate-400">
            Showing {filtered.length} transaction
            {filtered.length !== 1 ? "s" : ""}
          </p>
        </>
      )}

      <InvoiceModal
        txn={invoice}
        open={Boolean(invoice)}
        onClose={() => setInvoice(null)}
      />
    </div>
  );
}

function IconBtn({ children, title, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-daikin-50 hover:text-daikin-600 cursor-pointer"
    >
      {children}
    </button>
  );
}
