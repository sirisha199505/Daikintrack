import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, ScanLine } from "lucide-react";
import { Card, Button } from "../../components/ui/Primitives";
import InvoiceFormModal from "../../components/invoices/InvoiceFormModal";

// Check-In / Check-Out entry point. Both flows now post a proper invoice
// (purchase or sales) with per-unit serials — scanning adds lines inside the
// invoice form. The op is preselected from ?op=in|out.
export default function ScanInOut() {
  const [params] = useSearchParams();
  const op = params.get("op");
  // Arriving from the dashboard Check-In/Out buttons (?op=in|out) jumps straight
  // into the invoice with the scanner already running.
  const initial = op === "out" ? "sale" : op === "in" ? "purchase" : null;
  const [mode, setMode] = useState(initial); // 'purchase' | 'sale' | null
  const [autoScan, setAutoScan] = useState(Boolean(op));

  // Opening a flow from the on-page cards is a manual pick — no auto-scan.
  function pick(next) {
    setAutoScan(false);
    setMode(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Check In / Check Out</h1>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ActionCard
          tone="in"
          icon={ArrowDownLeft}
          title="Check In"
          subtitle="Click Scan to register the product receiving."
          cta={<Button size="lg" className="w-full" onClick={() => pick("purchase")}><ScanLine className="h-4 w-4" /> Scan</Button>}
        />
        <ActionCard
          tone="out"
          icon={ArrowUpRight}
          title="Check Out"
          subtitle="Click Scan to register the product being sold."
          cta={<Button size="lg" variant="danger" className="w-full" onClick={() => pick("sale")}><ScanLine className="h-4 w-4" /> Scan</Button>}
        />
      </div>

      <InvoiceFormModal open={mode === "purchase"} mode="purchase" autoScan={autoScan} onClose={() => setMode(null)} />
      <InvoiceFormModal open={mode === "sale"} mode="sale" autoScan={autoScan} onClose={() => setMode(null)} />
    </div>
  );
}

function ActionCard({ tone, icon: Icon, title, subtitle, cta }) {
  const tones = {
    in: "from-emerald-600 to-teal-500",
    out: "from-rose-700 to-red-500",
  };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="flex h-full flex-col overflow-hidden">
        <div className={`bg-gradient-to-br ${tones[tone]} p-5 text-white`}>
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15"><Icon className="h-6 w-6" /></div>
          <h2 className="mt-3 text-lg font-bold">{title}</h2>
        </div>
        <div className="flex flex-1 flex-col justify-between gap-4 p-5">
          <p className="text-sm text-slate-500">{subtitle}</p>
          {cta}
        </div>
      </Card>
    </motion.div>
  );
}
