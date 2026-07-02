import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Barcode, FileInput, FileOutput, UserSquare, Package } from "lucide-react";
import { useReports } from "../../context/ReportsContext";

const TYPES = [
  { id: "", label: "All" },
  { id: "serial", label: "Serial" },
  { id: "invoice", label: "Invoice" },
  { id: "customer", label: "Customer" },
  { id: "product", label: "Product" },
];

const EMPTY = { units: [], purchaseInvoices: [], salesInvoices: [], customers: [], products: [] };

// Universal inventory search for the app bar. Debounced; results grouped by type.
export default function GlobalSearch() {
  const { search } = useReports();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [res, setRes] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q.trim().length < 2) { setRes(EMPTY); return; }
    const t = setTimeout(async () => {
      try { setRes(await search(q.trim(), type || undefined)); setOpen(true); }
      catch { setRes(EMPTY); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, type, search]);

  function go(path) { setOpen(false); setQ(""); navigate(path); }

  const groups = [
    { key: "units", icon: Barcode, label: "Serials", items: res.units, render: (u) => u.serialNo, onPick: (u) => go(`/app/product-history?serial=${encodeURIComponent(u.serialNo)}`) },
    { key: "purchaseInvoices", icon: FileInput, label: "Purchases", items: res.purchaseInvoices, render: (i) => i.invoice_no, onPick: () => go("/app/purchase-invoices") },
    { key: "salesInvoices", icon: FileOutput, label: "Sales", items: res.salesInvoices, render: (i) => i.invoice_no, onPick: () => go("/app/sales-invoices") },
    { key: "customers", icon: UserSquare, label: "Customers", items: res.customers, render: (c) => c.name, onPick: () => go("/app/customers") },
    { key: "products", icon: Package, label: "Products", items: res.products, render: (p) => p.name, onPick: () => go("/app/stock") },
  ].filter((g) => (g.items || []).length > 0);

  const hasResults = groups.length > 0;

  return (
    <div ref={boxRef} className="relative hidden sm:block">
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 focus-within:bg-white/20">
        <Search className="h-4 w-4 text-white/70" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          placeholder="Search serials, invoices, parties…"
          className="w-44 bg-transparent text-sm text-white placeholder-white/50 outline-none focus:w-64 transition-all md:w-56"
        />
        {q && <button onClick={() => { setQ(""); setRes(EMPTY); }} className="text-white/60 hover:text-white"><X className="h-4 w-4" /></button>}
      </div>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex flex-wrap gap-1 border-b border-slate-100 p-2">
            {TYPES.map((t) => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${type === t.id ? "bg-daikin-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!hasResults ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No matches</div>
            ) : groups.map((g) => (
              <div key={g.key}>
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <g.icon className="h-3 w-3" /> {g.label}
                </div>
                {g.items.slice(0, 6).map((it, i) => (
                  <button key={it.id ?? i} onClick={() => g.onPick(it)}
                    className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-daikin-50">
                    <span className="truncate font-mono">{g.render(it)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
