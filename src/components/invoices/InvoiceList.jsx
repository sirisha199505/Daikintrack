import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, FileInput, FileOutput, Eye } from "lucide-react";
import { Card, Button, Badge, EmptyState, Skeleton } from "../ui/Primitives";
import Modal from "../ui/Modal";
import InvoiceFormModal from "./InvoiceFormModal";
import InvoiceDetail from "./InvoiceDetail";
import { useInvoices } from "../../context/InvoiceContext";
import { useToast } from "../ui/Toast";
import { inr, fmtDate, num } from "../../utils/format";

// Shared list page for purchase ("in") and sales ("out") invoices.
export default function InvoiceList({ mode }) {
  const isSale = mode === "sale";
  const inv = useInvoices();
  const { toast } = useToast();
  const rows = isSale ? inv.sales : inv.purchases;
  const refresh = isSale ? inv.refreshSales : inv.refreshPurchases;
  const getOne = isSale ? inv.getSale : inv.getPurchase;

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    refresh().catch((e) => toast(e.message || "Failed to load invoices.", "error")).finally(() => setLoading(false));
  }, [refresh, toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.invoiceNo, r.supplierName, r.customerName, r.supplierInvoiceNo].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [rows, query]);

  async function openDetail(id) {
    try {
      setDetail({ loading: true });
      const full = await getOne(id);
      setDetail({ loading: false, invoice: full });
    } catch (e) {
      toast(e.message || "Failed to load invoice.", "error");
      setDetail(null);
    }
  }

  const Icon = isSale ? FileOutput : FileInput;
  const title = isSale ? "Sales Invoices" : "Purchase Invoices";
  const subtitle = isSale ? "Check-Out — stock sold to customers." : "Check-In — stock received from suppliers.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <Button variant={isSale ? "danger" : "primary"} onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New {isSale ? "Sale" : "Purchase"}
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice no, party…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-daikin-400 focus:ring-2 focus:ring-daikin-100" />
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8"><EmptyState icon={Icon} title={`No ${isSale ? "sales" : "purchase"} invoices`} subtitle={query ? "No matches." : `Post your first ${isSale ? "sale" : "purchase"} to get started.`} /></Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Invoice No</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">{isSale ? "Customer" : "Supplier"}</th>
                  <th className="px-5 py-3 text-right font-semibold">Units</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50/60" onClick={() => openDetail(r.id)}>
                    <td className="px-5 py-3 font-mono font-semibold text-daikin-700">{r.invoiceNo}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(r.date)}</td>
                    <td className="px-5 py-3 text-slate-700">{isSale ? r.customerName : r.supplierName}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{num(r.totalQty)}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">{inr(r.totalAmount)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-daikin-600"><Eye className="h-3.5 w-3.5" /> View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-3 md:hidden">
            {filtered.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="cursor-pointer p-4" onClick={() => openDetail(r.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-daikin-700">{r.invoiceNo}</div>
                      <div className="truncate text-sm text-slate-700">{isSale ? r.customerName : r.supplierName}</div>
                      <div className="text-xs text-slate-400">{fmtDate(r.date)} · {num(r.totalQty)} units</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">{inr(r.totalAmount)}</div>
                      <Badge tone={r.status === "posted" ? "green" : "slate"}>{r.status}</Badge>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      <InvoiceFormModal open={formOpen} mode={mode} onClose={() => setFormOpen(false)} onPosted={() => refresh()} />

      <Modal open={!!detail} onClose={() => setDetail(null)} size="lg">
        {detail?.loading ? (
          <div className="p-8"><Skeleton className="h-40 w-full" /></div>
        ) : (
          <InvoiceDetail invoice={detail?.invoice} mode={mode} />
        )}
      </Modal>
    </div>
  );
}
