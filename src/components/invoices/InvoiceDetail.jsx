import { Fragment, useState } from "react";
import { Building2, Calendar, FileText, ChevronDown, ChevronRight, Package } from "lucide-react";
import { Badge } from "../ui/Primitives";
import SerialBadge from "./SerialBadge";
import { inr, fmtDateTime, num } from "../../utils/format";

// Renders a posted purchase or sales invoice: gradient header, line-item table,
// and an expandable list of the per-unit serials each line generated/consumed.
export default function InvoiceDetail({ invoice, mode }) {
  const isSale = mode === "sale";
  const [open, setOpen] = useState({});
  if (!invoice) return null;
  const party = isSale ? invoice.customerName : invoice.supplierName;

  return (
    <div>
      <div className={`p-5 text-white ${isSale ? "bg-gradient-to-br from-rose-700 to-red-500" : "bg-daikin-gradient"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
              {isSale ? "Sales Invoice" : "Purchase Invoice"}
            </div>
            <h2 className="font-mono text-xl font-extrabold">{invoice.invoiceNo}</h2>
            <div className="mt-1 text-sm text-white/80">{party}</div>
          </div>
          <Badge tone={invoice.status === "posted" ? "green" : "slate"}>{invoice.status}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/75">
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDateTime(invoice.date)}</span>
          {invoice.branchName && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{invoice.branchName}</span>}
          {invoice.supplierInvoiceNo && <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Bill {invoice.supplierInvoiceNo}</span>}
        </div>
      </div>

      <div className="p-5">
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
        {invoice.notes && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{invoice.notes}</p>}
      </div>
    </div>
  );
}
