import { Download, Printer } from "lucide-react";
import Modal from "../ui/Modal";
import { Button, Badge } from "../ui/Primitives";
import { useInventory } from "../../context/InventoryContext";
import { downloadInvoice, printInvoice } from "../../utils/invoice";
import { fmtDateTime, inr } from "../../utils/format";
import logo from "/DAIKIN_logo.PNG";

export default function InvoiceModal({ txn, open, onClose }) {
  const { getProduct } = useInventory();
  if (!txn) return null;
  const product = getProduct(txn.productId);
  const unit = product?.price || 0;
  const total = unit * txn.quantity;

  return (
    <Modal open={open} onClose={onClose} title="Invoice" size="lg">
      <div className="p-6">
        {/* Invoice sheet */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="bg-daikin-gradient flex items-center justify-between px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Daikin"
                className="h-7 w-auto"
              />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/70">
                Inventory Ops
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-widest text-white/60">
                Tax Invoice
              </div>
              <div className="font-bold">{txn.invoiceNo}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 px-6 py-5 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">
                Date
              </div>
              <div className="font-medium text-slate-700">
                {fmtDateTime(txn.date)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase text-slate-400">
                Branch
              </div>
              <div className="font-medium text-slate-700">{txn.branchName}</div>
              <div className="text-xs text-slate-400">by {txn.actor}</div>
            </div>
          </div>

          <div className="px-6">
            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-daikin-50 text-[11px] font-bold uppercase text-daikin-700">
                  <tr>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">Barcode</th>
                    <th className="px-4 py-2.5 text-center">Qty</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-700">
                        {txn.productName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {txn.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {txn.barcode}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">
                      {txn.quantity}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {inr(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-start justify-between px-6 py-5">
            <Badge tone={txn.type === "in" ? "green" : "red"}>
              {txn.status}
            </Badge>
            <div className="w-48 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Unit Price</span>
                <span>{inr(unit)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Quantity</span>
                <span>{txn.quantity}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-1 text-base font-bold text-slate-800">
                <span>Total</span>
                <span>{inr(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => printInvoice(txn, product)}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={() => downloadInvoice(txn, product)}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
