import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import {
  Card,
  Badge,
  EmptyState,
  Skeleton,
  Button,
} from "../../components/ui/Primitives";
import InvoiceModal from "../../components/history/InvoiceModal";
import { fmtDateTime, timeAgo } from "../../utils/format";

export default function RecentScans() {
  const { user } = useAuth();
  const { transactions } = useInventory();
  const loading = usePageLoad();
  const [params] = useSearchParams();
  // Pre-fill the search from a ?barcode= deep link (e.g. "View History").
  const [q, setQ] = useState(() => params.get("barcode") || "");
  const [invoice, setInvoice] = useState(null);

  const rows = useMemo(() => {
    let l = transactions.filter((t) => t.branchId === user.branchId);
    if (q.trim()) {
      const t = q.toLowerCase();
      l = l.filter(
        (r) =>
          r.barcode.includes(t) ||
          r.productName.toLowerCase().includes(t) ||
          r.invoiceNo.toLowerCase().includes(t)
      );
    }
    return l;
  }, [transactions, user.branchId, q]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Recent Scans</h1>
        <p className="text-sm text-slate-500">
          Check-in / check-out activity at {user.branch?.name}.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by product, barcode or invoice…"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm shadow-[var(--shadow-card)] outline-none focus:border-daikin-400"
        />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="No scans yet"
            subtitle="Recorded check-ins and check-outs will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {rows.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card className="flex items-center gap-4 p-4 hover:shadow-[var(--shadow-soft)] transition-shadow">
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                    t.type === "in"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {t.type === "in" ? (
                    <ArrowDownLeft className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-700">
                      {t.productName}
                    </span>
                    <Badge tone={t.type === "in" ? "green" : "red"}>
                      {t.type === "in" ? "+" : "-"}
                      {t.quantity}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                    <span className="font-mono">{t.barcode}</span>
                    <span>·</span>
                    <span>{t.invoiceNo}</span>
                    <span>·</span>
                    <span title={fmtDateTime(t.date)}>{timeAgo(t.date)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInvoice(t)}
                >
                  <Eye className="h-3.5 w-3.5" /> Invoice
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <InvoiceModal
        txn={invoice}
        open={Boolean(invoice)}
        onClose={() => setInvoice(null)}
      />
    </div>
  );
}
