import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Search, CheckCircle2, Wrench, Repeat, Trash2, Microscope } from "lucide-react";
import { Card, Button, Skeleton } from "../../components/ui/Primitives";
import SerialBadge, { STATUS_LABEL } from "../../components/invoices/SerialBadge";
import { Api, mapSerialFromApi } from "../../lib/api";
import { useInvoices } from "../../context/InvoiceContext";
import { useToast } from "../../components/ui/Toast";
import { fmtDate } from "../../utils/format";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

// Buckets shown as columns on the quarantine board.
const COLUMNS = [
  { status: "returned", title: "Returned", hint: "Awaiting inspection" },
  { status: "under_inspection", title: "Under Inspection", hint: "Technician deciding" },
  { status: "repair", title: "In Repair", hint: "Being repaired" },
  { status: "damaged", title: "Damaged / Scrapped", hint: "Out of stock" },
];

export default function Quarantine() {
  const { inspectUnit, disposeUnit, repairCompleteUnit, createReturn } = useInvoices();
  const { toast } = useToast();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [retSerial, setRetSerial] = useState("");
  const [retReason, setRetReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await Api.listUnits({ status: "returned,under_inspection,repair,damaged" });
      setUnits(rows.map(mapSerialFromApi));
    } catch (e) {
      toast(e.message || "Failed to load quarantine.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function act(fn, id, label) {
    setBusy(id);
    try { await fn(); toast(label, "success"); await load(); }
    catch (e) { toast(e.message || "Action failed.", "error"); }
    finally { setBusy(null); }
  }

  async function recordReturn(e) {
    e.preventDefault();
    if (!retSerial.trim()) return toast("Enter a serial number", "error");
    setBusy("return");
    try {
      await createReturn({ serial_no: retSerial.trim(), reason: retReason.trim() || undefined });
      toast("Return recorded — sent to quarantine", "success");
      setRetSerial(""); setRetReason(""); await load();
    } catch (err) {
      toast(err.message || "Failed to record return.", "error");
    } finally { setBusy(null); }
  }

  const byStatus = (s) => units.filter((u) => u.status === s);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quarantine &amp; Returns</h1>
        <p className="text-sm text-slate-500">Returned units are inspected before re-entering stock — approve, repair, replace, or scrap.</p>
      </div>

      {/* Record a customer return */}
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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">{COLUMNS.map((c) => <Skeleton key={c.status} className="h-48 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = byStatus(col.status);
            return (
              <div key={col.status} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">{col.title}</h3>
                    <p className="text-[11px] text-slate-400">{col.hint}</p>
                  </div>
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-slate-100 px-1.5 text-xs font-bold text-slate-500">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <Card className="p-4 text-center text-xs text-slate-400">Empty</Card>
                ) : items.map((u) => (
                  <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-4">
                      <SerialBadge serialNo={u.serialNo} status={u.status} />
                      <div className="mt-2 text-sm font-semibold text-slate-700">{u.productName}</div>
                      <div className="text-xs text-slate-400">{STATUS_LABEL[u.status]} · {fmtDate(u.soldAt || u.createdAt)}</div>
                      {u.returnReason && <div className="mt-1 text-xs text-amber-600">“{u.returnReason}”</div>}
                      {u.customerName && <div className="text-xs text-slate-400">{u.customerName}</div>}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {u.status === "returned" && (
                          <Button size="sm" variant="outline" disabled={busy === u.id}
                            onClick={() => act(() => inspectUnit(u.id, {}), u.id, "Sent to inspection")}>
                            <Microscope className="h-3.5 w-3.5" /> Inspect
                          </Button>
                        )}
                        {u.status === "under_inspection" && (
                          <>
                            <Button size="sm" variant="success" disabled={busy === u.id}
                              onClick={() => act(() => disposeUnit(u.id, { decision: "approve" }), u.id, "Approved — back in stock")}>
                              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy === u.id}
                              onClick={() => act(() => disposeUnit(u.id, { decision: "repair" }), u.id, "Sent to repair")}>
                              <Wrench className="h-3.5 w-3.5" /> Repair
                            </Button>
                            <Button size="sm" variant="outline" disabled={busy === u.id}
                              onClick={() => act(() => disposeUnit(u.id, { decision: "replace" }), u.id, "Replacement issued")}>
                              <Repeat className="h-3.5 w-3.5" /> Replace
                            </Button>
                            <Button size="sm" variant="ghost" disabled={busy === u.id}
                              onClick={() => act(() => disposeUnit(u.id, { decision: "scrap" }), u.id, "Scrapped")}>
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </>
                        )}
                        {u.status === "repair" && (
                          <Button size="sm" variant="success" disabled={busy === u.id}
                            onClick={() => act(() => repairCompleteUnit(u.id, {}), u.id, "Repaired — back in stock")}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Repair Done
                          </Button>
                        )}
                        {u.status === "damaged" && <span className="text-xs font-semibold text-red-500">Scrapped</span>}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
