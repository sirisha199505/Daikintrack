import { Trash2, Plus, PackageX } from "lucide-react";
import QtyStepper from "../ui/QtyStepper";
import { inr } from "../../utils/format";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm outline-none focus:border-daikin-400 focus:bg-white";

// Editable list of invoice line items. `mode` = 'purchase' | 'sale'.
// In sale mode quantities are capped to each product's available stock.
export default function LineItemEditor({ mode, lines, setLines, products }) {
  const isSale = mode === "sale";

  const setLine = (i, patch) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));
  const addLine = () =>
    setLines((prev) => [...prev, { productId: "", quantity: 1, price: 0 }]);

  function onPickProduct(i, productId) {
    const p = products.find((x) => String(x.id) === String(productId));
    setLine(i, {
      productId: p ? p.id : "",
      productName: p?.name,
      price: p ? (isSale ? p.price : p.price) : 0,
      maxQty: isSale ? p?.availableQty ?? 0 : 0,
    });
  }

  const total = lines.reduce((s, l) => s + (l.quantity || 0) * (l.price || 0), 0);
  const totalQty = lines.reduce((s, l) => s + (l.quantity || 0), 0);

  return (
    <div className="space-y-3">
      {lines.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
          <PackageX className="h-4 w-4" /> No line items yet — add one or scan a product.
        </div>
      )}

      {lines.map((l, i) => {
        const cap = isSale ? l.maxQty || 0 : 0;
        const over = isSale && l.productId && (l.quantity || 0) > cap;
        return (
          <div key={i} className="rounded-xl border border-slate-200 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <div>
                <select
                  className={inputCls}
                  value={l.productId || ""}
                  onChange={(e) => onPickProduct(i, e.target.value)}
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={isSale && (p.availableQty ?? 0) <= 0}>
                      {p.name}
                      {isSale ? ` · ${p.availableQty ?? 0} in stock` : ""}
                    </option>
                  ))}
                </select>
                {over && (
                  <p className="mt-1 text-xs text-red-500">Only {cap} in stock.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 sm:hidden">Qty</span>
                <QtyStepper qty={l.quantity || 1} setQty={(fn) => setLine(i, { quantity: typeof fn === "function" ? fn(l.quantity || 1) : fn })} max={cap} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">₹</span>
                <input
                  type="number"
                  className={`${inputCls} w-24`}
                  value={l.price ?? 0}
                  onChange={(e) => setLine(i, { price: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <span className="text-sm font-semibold text-slate-700">{inr((l.quantity || 0) * (l.price || 0))}</span>
                <button type="button" onClick={() => removeLine(i)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm font-semibold text-daikin-600 hover:text-daikin-700 cursor-pointer">
        <Plus className="h-4 w-4" /> Add line item
      </button>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
        <span className="text-sm font-semibold text-slate-500">{totalQty} unit{totalQty === 1 ? "" : "s"} · {lines.length} line{lines.length === 1 ? "" : "s"}</span>
        <span className="text-lg font-bold text-slate-800">{inr(total)}</span>
      </div>
    </div>
  );
}
