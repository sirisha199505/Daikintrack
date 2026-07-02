import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Search, CheckCircle2, Wrench, Repeat, Trash2, Microscope, Eye } from "lucide-react";
import { Card, Button, Skeleton, EmptyState } from "../../components/ui/Primitives";
import Modal from "../../components/ui/Modal";
import SerialBadge, { STATUS_LABEL } from "../../components/invoices/SerialBadge";
import { Api, mapSerialFromApi } from "../../lib/api";
import { useInvoices } from "../../context/InvoiceContext";
import { useToast } from "../../components/ui/Toast";
import { fmtDate } from "../../utils/format";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

// Dead Stock = every unit held out of sellable stock (returned, under
// inspection, in repair, or scrapped). Shown as a single consistent table.
export default function Quarantine() {
  const { inspectUnit, disposeUnit, repairCompleteUnit, createReturn } = useInvoices();
  const { toast } = useToast();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [view, setView] = useState(null); // unit shown in the detail modal
  const [retSerial, setRetSerial] = useState("");
  const [retReason, setRetReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await Api.listUnits({ status: "returned,under_inspection,repair,damaged" });
      setUnits(rows.map(mapSerialFromApi));
    } catch (e) {
      toast(e.message || "Failed to load dead stock.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function act(fn, id, label) {
    setBusy(id);
    try { await fn(); toast(label, "success"); setView(null); await load(); }
    catch (e) { toast(e.message || "Action failed.", "error"); }
    finally { setBusy(null); }
  }

  async function recordReturn(e) {
    e.preventDefault();
    if (!retSerial.trim()) return toast("Enter a serial number", "error");
    setBusy("return");
    try {
      await createReturn({ serial_no: retSerial.trim(), reason: retReason.trim() || undefined });
      toast("Return recorded — sent to dead stock", "success");
      setRetSerial(""); setRetReason(""); await load();
    } catch (err) {
      toast(err.message || "Failed to record return.", "error");
    } finally { setBusy(null); }
  }

  // Disposition buttons available for a unit's current status.
  function actionsFor(u, size = "sm") {
    const btns = [];
    if (u.status === "returned")
      btns.push(<Button key="i" size={size} variant="outline" disabled={busy === u.id} onClick={() => act(() => inspectUnit(u.id, {}), u.id, "Sent to inspection")}><Microscope className="h-3.5 w-3.5" /> Inspect</Button>);
    if (u.status === "under_inspection") {
      btns.push(<Button key="a" size={size} variant="success" disabled={busy === u.id} onClick={() => act(() => disposeUnit(u.id, { decision: "approve" }), u.id, "Approved — back in stock")}><CheckCircle2 className="h-3.5 w-3.5" /> Approve</Button>);
      btns.push(<Button key="r" size={size} variant="outline" disabled={busy === u.id} onClick={() => act(() => disposeUnit(u.id, { decision: "repair" }), u.id, "Sent to repair")}><Wrench className="h-3.5 w-3.5" /> Repair</Button>);
      btns.push(<Button key="p" size={size} variant="outline" disabled={busy === u.id} onClick={() => act(() => disposeUnit(u.id, { decision: "replace" }), u.id, "Replacement issued")}><Repeat className="h-3.5 w-3.5" /> Replace</Button>);
    }
    if (u.status === "repair")
      btns.push(<Button key="rc" size={size} variant="success" disabled={busy === u.id} onClick={() => act(() => repairCompleteUnit(u.id, {}), u.id, "Repaired — back in stock")}><CheckCircle2 className="h-3.5 w-3.5" /> Repair Done</Button>);
    return btns;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dead Stock</h1>
        <p className="text-sm text-slate-500">Units held out of sellable stock — returned, under inspection, in repair, or scrapped.</p>
      </div>

      {/* Record a customer return — the entry point into dead stock. */}
      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-700"><ShieldAlert className="h-5 w-5 text-amber-500" /> Record a Customer Return</h2>
        <form onSubmit={recordReturn} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-10 font-mono`} placeholder="Serial number of sold unit" value={retSerial} onChange={(e) => setRetSerial(e.target.value)} />
          </div>
          <input className={`${inputCls} flex-1`} placeholder="Reason (e.g. compressor noise)" value={retReason} onChange={(e) => setRetReason(e.target.value)} />
          <Button type="submit" disabled={busy === "return"}>{busy === "return" ? "Recording…" : "Record Return"}</Button>
        </form>
      </Card>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : units.length === 0 ? (
        <Card className="p-8"><EmptyState icon={ShieldAlert} title="No dead stock" subtitle="Returned, damaged and in-repair units will appear here." /></Card>
      ) : (
        <>
          {/* Desktop table — consistent styling with Received Stock / Stock Sold. */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Serial No</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((u) => (
                  <tr key={u.id} className="cursor-pointer hover:bg-slate-50/60" onClick={() => setView(u)}>
                    <td className="px-5 py-3 font-semibold text-slate-700">{u.productName}</td>
                    <td className="px-5 py-3 text-slate-500">{u.categoryName || "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{u.serialNo}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(u.soldAt || u.createdAt)}</td>
                    <td className="px-5 py-3"><SerialBadge serialNo={u.serialNo} status={u.status} clickable={false} /></td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setView(u); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-daikin-600 hover:text-daikin-700">
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        {u.status !== "damaged" && (
                          <button onClick={(e) => { e.stopPropagation(); act(() => disposeUnit(u.id, { decision: "scrap" }), u.id, "Scrapped"); }}
                            disabled={busy === u.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" /> {busy === u.id ? "…" : "Dispose"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {units.map((u) => (
              <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4" onClick={() => setView(u)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-700">{u.productName}</div>
                      <div className="font-mono text-xs text-slate-500">{u.serialNo}</div>
                      <div className="text-xs text-slate-400">{u.categoryName || "—"} · {fmtDate(u.soldAt || u.createdAt)}</div>
                    </div>
                    <SerialBadge serialNo={u.serialNo} status={u.status} clickable={false} />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* View / dispose modal */}
      <Modal open={!!view} onClose={() => setView(null)} title="Unit Details" size="md">
        {view && (
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-slate-800">{view.productName}</div>
                <div className="font-mono text-xs text-slate-500">{view.serialNo}</div>
              </div>
              <SerialBadge serialNo={view.serialNo} status={view.status} clickable={false} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase text-slate-400">Category</dt><dd className="text-slate-700">{view.categoryName || "—"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-400">Status</dt><dd className="text-slate-700">{STATUS_LABEL[view.status] || view.status}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-400">Date</dt><dd className="text-slate-700">{fmtDate(view.soldAt || view.createdAt)}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-400">Customer</dt><dd className="text-slate-700">{view.customerName || "—"}</dd></div>
              {view.returnReason && <div className="col-span-2"><dt className="text-xs font-semibold uppercase text-slate-400">Return Reason</dt><dd className="text-amber-600">“{view.returnReason}”</dd></div>}
            </dl>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              {actionsFor(view)}
              {view.status !== "damaged" && (
                <Button size="sm" variant="ghost" disabled={busy === view.id}
                  onClick={() => act(() => disposeUnit(view.id, { decision: "scrap" }), view.id, "Scrapped")}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" /> Dispose (scrap)
                </Button>
              )}
              {view.status === "damaged" && <span className="text-xs font-semibold text-red-500">Scrapped — out of stock</span>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
