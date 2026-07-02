import { Fragment, useEffect, useState } from "react";
import { Building2, Calendar, FileText, ChevronDown, ChevronRight, Package, Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "../ui/Primitives";
import SerialBadge from "./SerialBadge";
import { inr, fmtDateTime, num } from "../../utils/format";
import { lookupModel, CATEGORIES, TYPES, UNITS, MODEL_NOS } from "../../lib/daikinMapping";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100 disabled:cursor-default disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:font-semibold disabled:text-slate-700";

function detailFrom(invoice) {
  const d = (invoice.productDetails || [])[0] || {};
  return {
    name: d.name || invoice.productName || invoice.lines?.[0]?.productName || "",
    category: d.category || invoice.categoryName || "",
    type: d.type || "",
    model: d.model || "",
    capacity: d.capacity == null ? "" : String(d.capacity),
    unit: d.unit || "",
  };
}

// Renders a purchase / sales invoice. Descriptive fields (product details, bill
// ref, notes) are editable; quantities/serials are immutable (delete + re-scan
// to change stock). onSave(payload) persists; onDelete() voids the invoice.
export default function InvoiceDetail({ invoice, mode, onSave, onDelete }) {
  const isSale = mode === "sale";
  const [open, setOpen] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [draft, setDraft] = useState(() => (invoice ? detailFrom(invoice) : {}));
  const [billRef, setBillRef] = useState(invoice?.supplierInvoiceNo || "");
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [qty, setQty] = useState(() => invoice?.lines?.[0]?.quantity ?? invoice?.totalQty ?? 1);

  // Quantity is editable only for single-product check-ins/outs (the scan flow).
  const singleLine = (invoice?.lines?.length ?? 0) <= 1;

  // Re-sync editable state when the invoice changes and we're not mid-edit.
  useEffect(() => {
    if (invoice && !editing) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setDraft(detailFrom(invoice));
      setBillRef(invoice.supplierInvoiceNo || "");
      setNotes(invoice.notes || "");
      setQty(invoice.lines?.[0]?.quantity ?? invoice.totalQty ?? 1);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [invoice, editing]);

  if (!invoice) return null;
  const party = isSale ? invoice.customerName : invoice.supplierName;

  function setField(patch) {
    if (patch.model !== undefined) {
      const hit = lookupModel(patch.model);
      if (hit) patch = { ...patch, category: hit.category, type: hit.type, capacity: hit.capacity == null ? "" : String(hit.capacity), unit: hit.unit || "" };
    }
    setDraft((d) => ({ ...d, ...patch }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        product_details: [{ name: draft.name, model: draft.model, category: draft.category, type: draft.type, capacity: draft.capacity, unit: draft.unit }],
        notes,
      };
      if (!isSale) payload.supplier_invoice_no = billRef;
      if (singleLine) payload.quantity = Math.max(1, parseInt(qty, 10) || 1);
      await onSave?.(payload);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${invoice.invoiceNo}? This reverses its stock movement and cannot be undone.`)) return;
    setDeleting(true);
    try { await onDelete?.(); } finally { setDeleting(false); }
  }

  function cancel() {
    setDraft(detailFrom(invoice));
    setBillRef(invoice.supplierInvoiceNo || "");
    setNotes(invoice.notes || "");
    setEditing(false);
  }

  return (
    <div>
      <div className={`p-5 text-white ${isSale ? "bg-gradient-to-br from-rose-700 to-red-500" : "bg-daikin-gradient"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
              {isSale ? "Check-Out" : "Check-In"}
            </div>
            <h2 className="font-mono text-xl font-extrabold">{invoice.invoiceNo}</h2>
            {party && <div className="mt-1 text-sm text-white/80">{party}</div>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/75">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDateTime(invoice.date)}</span>
          {invoice.branchName && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{invoice.branchName}</span>}
          {!editing && billRef && <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Bill {billRef}</span>}
        </div>
      </div>

      <div className="p-5">
        {/* Editable product details */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <datalist id="idv-models">{MODEL_NOS.map((m) => <option key={m} value={m} />)}</datalist>
          <datalist id="idv-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="idv-types">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
          <datalist id="idv-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>

          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Product</span>
              <input className={inputCls} disabled={!editing} value={draft.name} onChange={(e) => setField({ name: e.target.value })} placeholder="—" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Category</span>
              <input list="idv-categories" className={inputCls} disabled={!editing} value={draft.category} onChange={(e) => setField({ category: e.target.value })} placeholder="—" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Type</span>
              <input list="idv-types" className={inputCls} disabled={!editing} value={draft.type} onChange={(e) => setField({ type: e.target.value })} placeholder="—" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Model No</span>
              <input list="idv-models" className={`${inputCls} font-mono`} disabled={!editing} value={draft.model} onChange={(e) => setField({ model: e.target.value })} placeholder="—" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Capacity</span>
              <input type="number" step="0.01" className={inputCls} disabled={!editing} value={draft.capacity} onChange={(e) => setField({ capacity: e.target.value })} placeholder="—" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Unit</span>
              <input list="idv-units" className={inputCls} disabled={!editing} value={draft.unit} onChange={(e) => setField({ unit: e.target.value })} placeholder="—" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Quantity</span>
              <input type="number" min="1" className={inputCls} disabled={!editing || !singleLine} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="—" />
              {editing && !singleLine && <span className="mt-1 block text-[11px] text-slate-400">Multiple products — edit not supported.</span>}
            </label>
            {!isSale && (
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Bill / Reference No</span>
                <input className={inputCls} disabled={!editing} value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="—" />
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Notes</span>
              <input className={inputCls} disabled={!editing} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="—" />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 font-semibold">Product</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Rate</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.lines || []).map((l) => (
                <Fragment key={l.id}>
                  <tr>
                    <td className="py-2.5">
                      <button onClick={() => setOpen((o) => ({ ...o, [l.id]: !o[l.id] }))} className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-daikin-600 cursor-pointer">
                        {(l.serials || []).length > 0 && (open[l.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                        {l.productName}
                      </button>
                      <span className="ml-5 text-xs text-slate-400">{(l.serials || []).length} serial(s)</span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{num(l.quantity)}</td>
                    <td className="py-2.5 text-right tabular-nums">{inr(l.price)}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{inr(l.amount)}</td>
                  </tr>
                  {open[l.id] && (l.serials || []).length > 0 && (
                    <tr>
                      <td colSpan={4} className="pb-3">
                        <div className="ml-5 flex flex-wrap gap-1.5">
                          {l.serials.map((s) => (
                            <SerialBadge key={s.id || s.serialNo} serialNo={s.serialNo} status={s.status} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="py-3 font-semibold text-slate-500" colSpan={1}>
                  <span className="flex items-center gap-1.5"><Package className="h-4 w-4" />{num(invoice.totalQty)} units</span>
                </td>
                <td></td>
                <td className="py-3 text-right text-sm font-semibold text-slate-500">Total</td>
                <td className="py-3 text-right text-lg font-bold text-slate-800">{inr(invoice.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <Button variant="danger" onClick={remove} disabled={deleting || saving}>
            <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete"}
          </Button>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="subtle" onClick={cancel} disabled={saving}><X className="h-4 w-4" /> Cancel</Button>
              <Button onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          )}
        </div>
      </div>
    </div>
  );
}
