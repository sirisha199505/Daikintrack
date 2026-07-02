import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, FileInput, FileOutput, Eye, Trash2 } from "lucide-react";
import { Card, Button, EmptyState, Skeleton } from "../ui/Primitives";
import Modal from "../ui/Modal";
import InvoiceFormModal from "./InvoiceFormModal";
import InvoiceDetail from "./InvoiceDetail";
import { useInvoices } from "../../context/InvoiceContext";
import { useToast } from "../ui/Toast";
import { fmtDate, num } from "../../utils/format";

// Product / Category columns: prefer the line-item snapshot (works for every
// invoice), then fall back to the scan-form product-details JSON.
const firstDetail = (r) => (r.productDetails || [])[0] || {};
const rowProduct = (r) => { const d = firstDetail(r); return r.productName || d.name || d.model || "—"; };
const rowCategory = (r) => r.categoryName || firstDetail(r).category || "—";

// Shared list page for purchase ("in") and sales ("out") invoices.
export default function InvoiceList({ mode }) {
  const isSale = mode === "sale";
  const inv = useInvoices();
  const { toast } = useToast();
  const rows = isSale ? inv.sales : inv.purchases;
  const refresh = isSale ? inv.refreshSales : inv.refreshPurchases;
  const getOne = isSale ? inv.getSale : inv.getPurchase;
  const del = isSale ? inv.deleteSale : inv.deletePurchase;
  const save = isSale ? inv.updateSale : inv.updatePurchase;

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  async function remove(e, r) {
    e.stopPropagation();
    if (!window.confirm(`Delete ${r.invoiceNo}? This reverses its stock movement and cannot be undone.`)) return;
    setDeletingId(r.id);
    try {
      await del(r.id);
      toast(`${r.invoiceNo} deleted`, "success");
    } catch (err) {
      toast(err.message || "Failed to delete.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  const Icon = isSale ? FileOutput : FileInput;
  const title = isSale ? "Stock Sold" : "Received Stock";
  const subtitle = isSale ? "Check-Out — stock sold to customers." : "Check-In — stock received into inventory.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <Button variant={isSale ? "danger" : "primary"} onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Add New
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isSale ? "Search invoice no, customer…" : "Search invoice no…"}
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
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Invoice No</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Units</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50/60" onClick={() => openDetail(r.id)}>
                    <td className="px-5 py-3 font-semibold text-slate-700">
                      {rowProduct(r)}{r.lineCount > 1 && <span className="ml-1 text-xs font-normal text-slate-400">+{r.lineCount - 1}</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{rowCategory(r)}</td>
                    <td className="px-5 py-3 font-mono font-semibold text-daikin-700">{r.invoiceNo}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(r.date)}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{num(r.unitCount ?? r.totalQty)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={(e) => { e.stopPropagation(); openDetail(r.id); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-daikin-600 hover:text-daikin-700">
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button onClick={(e) => remove(e, r)} disabled={deletingId === r.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
                          <Trash2 className="h-3.5 w-3.5" /> {deletingId === r.id ? "…" : "Delete"}
                        </button>
                      </div>
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
                      <div className="truncate text-sm font-semibold text-slate-700">{rowProduct(r)}</div>
                      <div className="font-mono text-xs text-daikin-700">{r.invoiceNo}</div>
                      <div className="text-xs text-slate-400">{rowCategory(r)} · {fmtDate(r.date)} · {num(r.unitCount ?? r.totalQty)} units</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={(e) => remove(e, r)} disabled={deletingId === r.id}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" /> {deletingId === r.id ? "…" : "Delete"}
                      </button>
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
          <InvoiceDetail
            invoice={detail?.invoice}
            mode={mode}
            onSave={async (payload) => {
              const updated = await save(detail.invoice.id, payload);
              setDetail({ loading: false, invoice: updated });
              await refresh();
              toast("Saved", "success");
            }}
            onDelete={async () => {
              await del(detail.invoice.id);
              setDetail(null);
              toast(`${detail.invoice.invoiceNo} deleted`, "success");
            }}
          />
        )}
      </Modal>
    </div>
  );
}
