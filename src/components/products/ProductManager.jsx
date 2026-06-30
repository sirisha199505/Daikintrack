import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Filter,
  Package,
  Boxes,
} from "lucide-react";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import {
  Card,
  Button,
  Badge,
  EmptyState,
  Skeleton,
} from "../ui/Primitives";
import Modal from "../ui/Modal";
import ProductFormModal from "./ProductFormModal";
import { useToast } from "../ui/Toast";
import { num, inr } from "../../utils/format";

function statusOf(p) {
  if (p.stock === 0) return { tone: "red", label: "Out of Stock" };
  if (p.stock <= p.lowStockThreshold) return { tone: "amber", label: "Low Stock" };
  return { tone: "green", label: "In Stock" };
}

const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-daikin-400 cursor-pointer";

// Reusable product management surface. branchId=null → all branches (admin).
// readOnly hides all mutation controls (used when a store manager is viewing
// another branch, which the backend permits for reads only).
export default function ProductManager({ branchId = null, title, subtitle, readOnly = false }) {
  const { products, categories, branches, deleteProduct } = useInventory();
  const { toast } = useToast();
  const loading = usePageLoad();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const list = useMemo(() => {
    let l = branchId
      ? products.filter((p) => p.branchId === branchId)
      : products;
    if (cat !== "all") l = l.filter((p) => p.category === cat);
    if (!branchId && branch !== "all")
      l = l.filter((p) => p.branchId === branch);
    if (status !== "all")
      l = l.filter((p) => {
        const s = statusOf(p).label;
        return (
          (status === "in" && s === "In Stock") ||
          (status === "low" && s === "Low Stock") ||
          (status === "out" && s === "Out of Stock")
        );
      });
    if (q.trim()) {
      const t = q.toLowerCase();
      l = l.filter((p) => {
        const bn = branches.find((b) => b.id === p.branchId)?.name || "";
        return (
          p.name.toLowerCase().includes(t) ||
          bn.toLowerCase().includes(t) ||
          p.categoryName.toLowerCase().includes(t)
        );
      });
    }
    return l;
  }, [products, branches, branchId, cat, branch, status, q]);

  const branchName = (id) => branches.find((b) => b.id === id)?.name || "—";

  async function confirmDelete() {
    try {
      await deleteProduct(toDelete.id);
      toast(`Deleted ${toDelete.name}`, "info");
      setToDelete(null);
    } catch (e) {
      toast(e.message || "Failed to delete product.", "error");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, branch or category…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-daikin-400 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="h-4 w-4" />
          </div>
          <select className={selectCls} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!branchId && (
            <select
              className={selectCls}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <select
            className={selectCls}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </Card>

      {/* Results */}
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Boxes}
            title="No products match"
            subtitle="Try adjusting your search or filters."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQ("");
                  setCat("all");
                  setBranch("all");
                  setStatus("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3.5">Product</th>
                    {!branchId && <th className="px-5 py-3.5">Branch</th>}
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5 text-right">Purchased</th>
                    <th className="px-5 py-3.5 text-right">Sold</th>
                    <th className="px-5 py-3.5 text-right">Available</th>
                    <th className="px-5 py-3.5">Status</th>
                    {!readOnly && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const s = statusOf(p);
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-daikin-50/30"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-daikin-50 text-daikin-500">
                              <Package className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">
                                {p.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        {!branchId && (
                          <td className="px-5 py-3.5 text-slate-600">
                            {branchName(p.branchId)}
                          </td>
                        )}
                        <td className="px-5 py-3.5 text-slate-600">
                          {p.categoryName}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">
                          {num(p.purchasedQty)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">
                          {num(p.soldQty)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                          {num(p.availableQty ?? p.stock)}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={s.tone}>{s.label}</Badge>
                        </td>
                        {!readOnly && (
                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditing(p);
                                  setFormOpen(true);
                                }}
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-daikin-50 hover:text-daikin-600 cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setToDelete(p)}
                                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {list.map((p) => {
              const s = statusOf(p);
              return (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-700">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {p.categoryName}
                      </div>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {p.categoryName}
                    {!branchId ? ` · ${branchName(p.branchId)}` : ""}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Purchased</div>
                      <div className="text-sm font-bold text-slate-700">{num(p.purchasedQty)}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sold</div>
                      <div className="text-sm font-bold text-slate-700">{num(p.soldQty)}</div>
                    </div>
                    <div className="rounded-lg bg-daikin-50 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-daikin-500">Available</div>
                      <div className="text-sm font-bold text-daikin-700">{num(p.availableQty ?? p.stock)}</div>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setToDelete(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-slate-400">
            Showing {list.length} product{list.length !== 1 ? "s" : ""}
          </p>
        </>
      )}

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        lockBranch={branchId}
        onSaved={(isEdit) =>
          toast(isEdit ? "Product updated" : "Product added", "success")
        }
      />

      {/* Delete confirm */}
      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete product?"
        size="sm"
      >
        <div className="p-6">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">
              {toDelete?.name}
            </span>
            ? This action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="subtle" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
