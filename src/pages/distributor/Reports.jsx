import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, GitBranch } from "lucide-react";
import { Card } from "../../components/ui/Primitives";
import ReportTable from "../../components/reports/ReportTable";
import { useReports } from "../../context/ReportsContext";
import { useToast } from "../../components/ui/Toast";
import { inr, num, fmtDate } from "../../utils/format";

const inputCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-daikin-400";

const TABS = [
  { id: "stock-ledger", label: "Stock Ledger" },
  { id: "purchase-register", label: "Purchase Register" },
  { id: "sales-register", label: "Sales Register" },
  { id: "outstanding-stock", label: "Outstanding Stock" },
];

export default function Reports() {
  const reports = useReports();
  const { toast } = useToast();
  const [tab, setTab] = useState("stock-ledger");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [state, setState] = useState({ loading: true, data: [], totals: null });

  const fetcher = {
    "stock-ledger": reports.stockLedger,
    "purchase-register": reports.purchaseRegister,
    "sales-register": reports.salesRegister,
    "outstanding-stock": reports.outstandingStock,
  };

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await fetcher[tab](params);
      setState({ loading: false, data: res.data || [], totals: res.totals || null });
    } catch (e) {
      toast(e.message || "Failed to load report.", "error");
      setState({ loading: false, data: [], totals: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, from, to, toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const { columns, totals } = useMemo(() => buildConfig(tab, state.totals), [tab, state.totals]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-daikin-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500">ERP/Tally-style registers and stock reports.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 print:hidden">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition cursor-pointer ${tab === t.id ? "bg-daikin-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab !== "outstanding-stock" && (
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">From
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">To
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}

      <ReportTable
        title={TABS.find((t) => t.id === tab).label}
        filename={tab}
        columns={columns}
        rows={state.data}
        totals={totals}
        loading={state.loading}
      />

      <Card className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <GitBranch className="h-5 w-5 text-daikin-500" />
          <span><strong>Product Traceability:</strong> trace any serial's full lifecycle.</span>
        </div>
        <Link to="/app/product-history" className="text-sm font-semibold text-daikin-600 hover:text-daikin-700">Open Product History →</Link>
      </Card>
    </div>
  );
}

function buildConfig(tab, t) {
  const date = (v) => fmtDate(v);
  const money = (v) => inr(v || 0);
  const qty = (v) => num(v || 0);

  if (tab === "stock-ledger") {
    return {
      columns: [
        { key: "occurred_at", label: "Date", format: date, csv: date },
        { key: "movement_type", label: "Type" },
        { key: "product_name", label: "Product" },
        { key: "serial_no", label: "Serial" },
        { key: "qty", label: "Qty", align: "right", format: (v) => (v > 0 ? `+${v}` : v) },
        { key: "balance_after", label: "Balance", align: "right", format: qty },
        { key: "invoice_no", label: "Invoice" },
        { key: "party_name", label: "Party" },
      ],
      totals: null,
    };
  }
  if (tab === "purchase-register") {
    return {
      columns: [
        { key: "invoice_no", label: "Invoice" },
        { key: "occurred_at", label: "Date", format: date, csv: date },
        { key: "supplier_name", label: "Supplier" },
        { key: "branch_name", label: "Branch" },
        { key: "total_qty", label: "Units", align: "right", format: qty },
        { key: "total_amount", label: "Amount", align: "right", format: money },
      ],
      totals: t ? { total_qty: num(t.qty), total_amount: inr(t.amount) } : null,
    };
  }
  if (tab === "sales-register") {
    return {
      columns: [
        { key: "invoice_no", label: "Invoice" },
        { key: "occurred_at", label: "Date", format: date, csv: date },
        { key: "customer_name", label: "Customer" },
        { key: "branch_name", label: "Branch" },
        { key: "total_qty", label: "Units", align: "right", format: qty },
        { key: "total_amount", label: "Amount", align: "right", format: money },
      ],
      totals: t ? { total_qty: num(t.qty), total_amount: inr(t.amount) } : null,
    };
  }
  // outstanding-stock
  return {
    columns: [
      { key: "name", label: "Product" },
      { key: "category_name", label: "Category" },
      { key: "branch_name", label: "Branch" },
      { key: "available_qty", label: "Available", align: "right", format: qty },
      { key: "quarantine", label: "Quarantine", align: "right", format: qty },
      { key: "damaged", label: "Damaged", align: "right", format: qty },
    ],
    totals: t ? { available_qty: num(t.available) } : null,
  };
}
