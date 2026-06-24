import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Download,
  Trash2,
  Image as ImageIcon,
  Cable,
  Eye,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAdmin } from "../../context/AdminContext";
import { useInventory } from "../../context/InventoryContext";
import { useCopperScans } from "../../context/CopperScanContext";
import { useToast } from "../../components/ui/Toast";
import { Card, Button, EmptyState, Skeleton } from "../../components/ui/Primitives";
import CopperTabs from "../../components/copper/CopperTabs";
import Modal from "../../components/ui/Modal";
import { fmtLength } from "../../lib/copper";

const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-daikin-400 cursor-pointer";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const meters = (m) => `${(Number(m) || 0).toFixed(2)} m`;

const methodLabel = (m) =>
  m === "weight" ? "Weight" : m === "ai_photo" ? "AI Photo" : m === "coil" ? "Coil" : "Trace";

// Methods that carry a remaining/used leftover breakdown.
const hasLeftover = (m) => m === "weight" || m === "ai_photo";

function MethodBadge({ method }) {
  const cls =
    method === "weight"
      ? "bg-emerald-100 text-emerald-700"
      : method === "ai_photo"
      ? "bg-fuchsia-100 text-fuchsia-700"
      : method === "coil"
      ? "bg-violet-100 text-violet-700"
      : "bg-cyan-100 text-cyan-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {methodLabel(method)}
    </span>
  );
}

export default function CopperHistory() {
  const { user } = useAuth();
  const { branches } = useAdmin();
  const { viewBranchId } = useInventory();
  const { scans, loading, refresh, removeScan, getScan } = useCopperScans();
  const { toast } = useToast();

  const canFilterBranch = user.role === "admin" || user.role === "distributor";
  const branchApiId = (slug) => branches.find((b) => b.id === slug)?.apiId;

  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    const branchId =
      user.role === "store_manager"
        ? branchApiId(viewBranchId || user.branchId)
        : branch !== "all"
        ? branchApiId(branch)
        : undefined;
    const t = setTimeout(() => {
      refresh({
        branchId,
        from: from || undefined,
        to: to || undefined,
        search: q.trim() || undefined,
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, branch, from, to, q, viewBranchId, branches]);

  const totals = useMemo(
    () => ({
      count: scans.length,
      length: scans.reduce((s, r) => s + (r.lengthM || 0), 0),
    }),
    [scans]
  );

  async function openImage(id) {
    setViewLoading(true);
    try {
      setViewing(await getScan(id));
    } catch {
      toast("Could not load that scan.", "error");
    } finally {
      setViewLoading(false);
    }
  }

  async function confirmDelete() {
    try {
      await removeScan(toDelete.id);
      toast("Scan deleted", "info");
      setToDelete(null);
    } catch (e) {
      toast(e.message || "Failed to delete.", "error");
    }
  }

  function exportCsv() {
    const head = [
      "Date", "Branch", "Method", "Product", "Start (m)", "Used (m)",
      "Remaining (m)", "Leftover (kg)", "Recorded by", "Notes",
    ];
    const rows = scans.map((s) => [
      fmtDate(s.createdAt),
      s.branchName || "",
      methodLabel(s.method),
      s.product || "",
      s.startLengthM != null ? Number(s.startLengthM).toFixed(2) : "",
      (s.lengthM || 0).toFixed(2),
      s.remainingLengthM != null ? Number(s.remainingLengthM).toFixed(2) : "",
      s.leftoverWeightKg != null ? Number(s.leftoverWeightKg).toFixed(2) : "",
      s.actor || "",
      (s.notes || "").replace(/[\n\r,]+/g, " "),
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `copper-scans-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <CopperTabs />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Cable className="h-6 w-6 text-amber-600" /> Scan History
          </h1>
          <p className="text-sm text-slate-500">Recorded copper wire measurements.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!scans.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Scans", value: totals.count },
          { label: "Total length", value: fmtLength(totals.length) },
        ].map((k) => (
          <Card key={k.label} className="p-4 text-center">
            <div className="text-lg font-extrabold text-slate-800 sm:text-xl">{k.value}</div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes or person…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-daikin-400 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="h-4 w-4" />
          </div>
          {canFilterBranch && (
            <select className={selectCls} value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <input type="date" className={selectCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" className={selectCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : scans.length === 0 ? (
        <Card>
          <EmptyState icon={Cable} title="No scans yet" subtitle="Record a scan to see it here." />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Branch</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5 text-right">Used / Remaining</th>
                    <th className="px-5 py-3.5">By</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-amber-50/30">
                      <td className="px-5 py-3 text-slate-600">{fmtDate(s.createdAt)}</td>
                      <td className="px-5 py-3 font-semibold text-slate-700">{s.branchName || "—"}</td>
                      <td className="px-5 py-3"><MethodBadge method={s.method} /></td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-bold text-amber-700">{meters(s.lengthM)}</span>
                        {hasLeftover(s.method) && s.remainingLengthM != null && (
                          <span className="ml-2 text-xs font-medium text-emerald-600">
                            {s.method === "ai_photo" ? "~" : ""}{meters(s.remainingLengthM)} left
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{s.actor || "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          {s.hasImage && (
                            <button onClick={() => openImage(s.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-daikin-50 hover:text-daikin-600 cursor-pointer" title="View image">
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {user.role === "admin" && (
                            <button onClick={() => setToDelete(s)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {scans.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{s.branchName || "—"}</span>
                      <MethodBadge method={s.method} />
                    </div>
                    <div className="text-xs text-slate-400">{fmtDate(s.createdAt)}</div>
                    {s.product && <div className="text-[11px] text-slate-400">{s.product}</div>}
                  </div>
                  <div className="shrink-0 rounded-lg bg-amber-50 px-3 py-1 text-right">
                    <div className="font-bold text-amber-700">{meters(s.lengthM)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-amber-700/60">used</div>
                  </div>
                </div>
                {hasLeftover(s.method) && s.remainingLengthM != null && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-1.5 text-xs">
                    <span className="font-semibold text-emerald-700">
                      {s.method === "ai_photo" ? "~" : ""}{meters(s.remainingLengthM)} remaining
                    </span>
                    {s.method === "ai_photo"
                      ? <span className="text-emerald-600/80">AI estimate</span>
                      : s.leftoverWeightKg != null && (
                          <span className="text-emerald-600/80">{Number(s.leftoverWeightKg).toFixed(2)} kg leftover</span>
                        )}
                  </div>
                )}
                {s.notes && <p className="mt-2 text-xs text-slate-500">{s.notes}</p>}
                <div className="mt-3 flex gap-2">
                  {s.hasImage && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openImage(s.id)}>
                      <ImageIcon className="h-3.5 w-3.5" /> Image
                    </Button>
                  )}
                  {user.role === "admin" && (
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(s)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-slate-400">Showing {scans.length} scan(s)</p>
        </>
      )}

      {/* Image viewer */}
      <Modal open={Boolean(viewing) || viewLoading} onClose={() => setViewing(null)} title="Scan detail" size="md">
        <div className="p-5">
          {viewLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : viewing ? (
            <div className="space-y-3">
              {viewing.image ? (
                <img src={viewing.image} alt="scan" className="w-full rounded-xl border border-slate-200" />
              ) : (
                <EmptyState icon={ImageIcon} title="No image stored" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Branch" value={viewing.branchName} />
                <Info label="Date" value={fmtDate(viewing.createdAt)} />
                <Info label="Method" value={methodLabel(viewing.method)} />
                {viewing.product && <Info label="Product" value={viewing.product} />}
                {hasLeftover(viewing.method) ? (
                  <>
                    <Info label="Start" value={fmtLength(viewing.startLengthM)} />
                    <Info label="Used" value={fmtLength(viewing.lengthM)} />
                    <Info label="Remaining" value={fmtLength(viewing.remainingLengthM)} />
                    {viewing.method === "weight" ? (
                      <Info
                        label="Leftover weight"
                        value={viewing.leftoverWeightKg != null ? `${Number(viewing.leftoverWeightKg).toFixed(2)} kg` : "—"}
                      />
                    ) : (
                      <Info label="Source" value="AI photo estimate" />
                    )}
                  </>
                ) : (
                  <Info label="Length" value={fmtLength(viewing.lengthM)} />
                )}
                <Info label="Recorded by" value={viewing.actor} />
              </div>
              {viewing.notes && <p className="text-sm text-slate-600">{viewing.notes}</p>}
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete scan?" size="sm">
        <div className="p-6">
          <p className="text-sm text-slate-600">This permanently removes the scan and its image.</p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="subtle" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-semibold text-slate-700">{value || "—"}</div>
    </div>
  );
}
