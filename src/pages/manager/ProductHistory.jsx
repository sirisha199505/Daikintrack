import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { GitBranch, Search, Package, Truck, UserSquare, ShoppingCart, ShieldAlert, Wrench, Repeat, CheckCircle2, Trash2, PackagePlus } from "lucide-react";
import { Card, Button, Badge, EmptyState, Skeleton } from "../../components/ui/Primitives";
import { STATUS_LABEL } from "../../components/invoices/SerialBadge";
import { useReports } from "../../context/ReportsContext";
import { useToast } from "../../components/ui/Toast";
import { fmtDateTime, inr } from "../../utils/format";

const MOVE_ICON = {
  purchase: PackagePlus, opening: PackagePlus, restock: CheckCircle2,
  sale: ShoppingCart, return: ShieldAlert, inspection: Search,
  repair: Wrench, replacement: Repeat, scrap: Trash2,
};
const MOVE_TONE = {
  purchase: "bg-emerald-500", opening: "bg-emerald-500", restock: "bg-emerald-500",
  sale: "bg-rose-500", return: "bg-amber-500", inspection: "bg-yellow-500",
  repair: "bg-orange-500", replacement: "bg-blue-500", scrap: "bg-red-500",
};

export default function ProductHistory() {
  const [params, setParams] = useSearchParams();
  const { productHistory } = useReports();
  const { toast } = useToast();
  const [serial, setSerial] = useState(params.get("serial") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (sn) => {
    if (!sn) return;
    setLoading(true);
    try { setData(await productHistory({ serialNo: sn })); }
    catch (e) { toast(e.message || "Lookup failed.", "error"); setData(null); }
    finally { setLoading(false); }
  }, [productHistory, toast]);

  useEffect(() => {
    const sn = params.get("serial");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sn) run(sn);
  }, [params, run]);

  function submit(e) {
    e.preventDefault();
    setParams(serial.trim() ? { serial: serial.trim() } : {});
    run(serial.trim());
  }

  const unit = data?.unit;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Product History</h1>
        <p className="text-sm text-slate-500">Trace a serial number's full lifecycle — purchase to customer and beyond.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Enter serial number (e.g. SN-1-AB12CD34)"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 font-mono text-sm outline-none focus:border-daikin-400 focus:ring-2 focus:ring-daikin-100" />
        </div>
        <Button type="submit">Trace</Button>
      </form>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data ? (
        <Card className="p-8"><EmptyState icon={GitBranch} title="Trace a serial" subtitle="Enter a serial number above to see its journey." /></Card>
      ) : !unit && (data.trail || []).length === 0 ? (
        <Card className="p-8"><EmptyState icon={GitBranch} title="No history" subtitle="No movements found for that serial." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Unit summary */}
          {unit && (
            <Card className="p-5 lg:col-span-1">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-daikin-50 text-daikin-600"><Package className="h-6 w-6" /></div>
                <div>
                  <div className="font-bold text-slate-800">{unit.productName}</div>
                  <div className="font-mono text-xs text-slate-400">{unit.serialNo}</div>
                </div>
              </div>
              <div className="mt-4"><Badge tone="slate">{STATUS_LABEL[unit.status] || unit.status}</Badge></div>
              <dl className="mt-4 space-y-2 text-sm">
                <Row icon={Truck} label="Supplier" value={unit.supplierName} />
                <Row icon={UserSquare} label="Customer" value={unit.customerName} />
                <Row icon={PackagePlus} label="Cost" value={unit.costPrice ? inr(unit.costPrice) : null} />
                <Row icon={ShoppingCart} label="Sold for" value={unit.soldPrice ? inr(unit.soldPrice) : null} />
              </dl>
            </Card>
          )}

          {/* Timeline */}
          <Card className={`p-5 ${unit ? "lg:col-span-2" : "lg:col-span-3"}`}>
            <h2 className="mb-4 text-base font-bold text-slate-700">Lifecycle</h2>
            <ol className="relative ml-3 border-l-2 border-slate-100">
              {(data.trail || []).map((m) => {
                const Icon = MOVE_ICON[m.movementType] || GitBranch;
                return (
                  <motion.li key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-5 ml-6">
                    <span className={`absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full text-white ${MOVE_TONE[m.movementType] || "bg-slate-400"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold capitalize text-slate-700">{m.movementType}</span>
                      <span className="text-xs text-slate-400">{fmtDateTime(m.date)}</span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {m.fromStatus && m.toStatus ? `${STATUS_LABEL[m.fromStatus] || m.fromStatus} → ${STATUS_LABEL[m.toStatus] || m.toStatus}` : (m.toStatus ? STATUS_LABEL[m.toStatus] : "")}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {[m.invoiceNo, m.partyName, m.actor].filter(Boolean).join(" · ")}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="text-slate-400">{label}:</span>
      <span className="font-semibold text-slate-700">{value}</span>
    </div>
  );
}
