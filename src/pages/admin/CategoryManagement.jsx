import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import { Card, Button, EmptyState, Skeleton } from "../../components/ui/Primitives";
import Modal from "../../components/ui/Modal";
import CategoryFormModal from "../../components/admin/CategoryFormModal";
import { useToast } from "../../components/ui/Toast";
import { num } from "../../utils/format";

export default function CategoryManagement() {
  const { categories, deleteCategory } = useAdmin();
  const { products } = useInventory();
  const { toast } = useToast();
  const loading = usePageLoad();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const counts = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.category] = (map[p.category] || 0) + 1;
    });
    return map;
  }, [products]);

  function confirmDelete() {
    deleteCategory(toDelete.id);
    toast(`Deleted ${toDelete.name}`, "info");
    setToDelete(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
          <p className="text-sm text-slate-500">
            Manage product categories used across the catalogue.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tags}
            title="No categories yet"
            subtitle="Add a category to start organising products."
            action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add Category</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="flex items-center gap-4 p-4">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                style={{ background: `${c.color}1a`, color: c.color }}
              >
                <Tags className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-800">{c.name}</div>
                <div className="text-xs text-slate-400">
                  {num(counts[c.id] || 0)} product{(counts[c.id] || 0) !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => { setEditing(c); setFormOpen(true); }}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-daikin-50 hover:text-daikin-600 cursor-pointer"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToDelete(c)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSaved={(isEdit) => toast(isEdit ? "Category updated" : "Category added", "success")}
      />

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete category?" size="sm">
        <div className="p-6">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">{toDelete?.name}</span>?
            {(counts[toDelete?.id] || 0) > 0 && (
              <> {num(counts[toDelete?.id])} product(s) currently use it.</>
            )}
          </p>
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
