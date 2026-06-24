import { Minus, Plus } from "lucide-react";

// Numeric stepper with optional max. Extracted from ScanInOut for reuse across
// the invoice line-item editors.
export default function QtyStepper({ qty, setQty, max = 0, min = 1 }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setQty((q) => Math.max(min, q - 1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        value={qty}
        onChange={(e) => {
          let v = Math.max(min, parseInt(e.target.value) || min);
          if (max) v = Math.min(v, max);
          setQty(v);
        }}
        className="w-14 rounded-lg border border-slate-200 py-1.5 text-center text-sm font-bold outline-none focus:border-daikin-400"
      />
      <button
        type="button"
        onClick={() => setQty((q) => (max ? Math.min(max, q + 1) : q + 1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
