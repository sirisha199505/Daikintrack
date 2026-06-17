import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  MapPin,
  Users,
  Boxes,
  UserPlus,
  PackageSearch,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { useInventory } from "../../context/InventoryContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import { Card, Button, Badge, EmptyState, Skeleton } from "../../components/ui/Primitives";
import Modal from "../../components/ui/Modal";
import BranchFormModal from "../../components/admin/BranchFormModal";
import UserFormModal from "../../components/admin/UserFormModal";
import { useToast } from "../../components/ui/Toast";
import { roleLabel, num } from "../../utils/format";

export default function BranchManagement() {
  const { branches, users, deleteBranch } = useAdmin();
  const { products } = useInventory();
  const { toast } = useToast();
  const navigate = useNavigate();
  const loading = usePageLoad();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [assignFor, setAssignFor] = useState(null);
  const [userFormOpen, setUserFormOpen] = useState(false);

  const productCount = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.branchId] = (map[p.branchId] || 0) + 1;
    });
    return map;
  }, [products]);

  const usersByBranch = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      if (u.branchId) (map[u.branchId] = map[u.branchId] || []).push(u);
    });
    return map;
  }, [users]);

  function confirmDelete() {
    deleteBranch(toDelete.id);
    toast(`Deleted ${toDelete.name}`, "info");
    setToDelete(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Branch Management</h1>
          <p className="text-sm text-slate-500">
            Create branches, assign users and review branch inventory.
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Add Branch
        </Button>
      </div>

      {branches.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No branches yet"
            subtitle="Create your first branch to start assigning users and inventory."
            action={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add Branch</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const active = (b.status || "Active") === "Active";
            return (
              <Card key={b.id} className="overflow-hidden">
                <div
                  className="relative p-5 text-white"
                  style={{ background: b.gradient || b.color || "#0098d8" }}
                >
                  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" />
                  <div className="relative flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <Badge tone={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <h3 className="relative mt-3 text-lg font-bold">{b.name}</h3>
                  <p className="relative font-mono text-xs text-white/70">{b.code}</p>
                </div>

                <div className="space-y-2.5 p-5">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">{b.location || "—"}</span>
                  </div>
                  <div className="flex items-center gap-4 pt-1 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Boxes className="h-4 w-4 text-daikin-500" />
                      {num(productCount[b.id] || 0)} products
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Users className="h-4 w-4 text-daikin-500" />
                      {(usersByBranch[b.id] || []).length} users
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => setAssignFor(b)}>
                      <Users className="h-3.5 w-3.5" /> Assign Users
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate("/app/products")}>
                      <PackageSearch className="h-3.5 w-3.5" /> Inventory
                    </Button>
                    <Button size="sm" variant="subtle" onClick={() => { setEditing(b); setFormOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(b)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <BranchFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSaved={(isEdit) => toast(isEdit ? "Branch updated" : "Branch added", "success")}
      />

      {/* Assign users to a branch */}
      <Modal
        open={Boolean(assignFor)}
        onClose={() => setAssignFor(null)}
        title={assignFor ? `Users · ${assignFor.name}` : "Users"}
        size="md"
      >
        <div className="p-6">
          {(usersByBranch[assignFor?.id] || []).length === 0 ? (
            <p className="text-sm text-slate-500">
              No users assigned to this branch yet.
            </p>
          ) : (
            <div className="space-y-2">
              {(usersByBranch[assignFor?.id] || []).map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-daikin-btn text-xs font-bold text-white">
                    {u.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-700">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                  <Badge tone="blue">{roleLabel(u.role)}</Badge>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="subtle" onClick={() => setAssignFor(null)}>Close</Button>
            <Button onClick={() => setUserFormOpen(true)}>
              <UserPlus className="h-4 w-4" /> Create Branch User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create a user pre-assigned to the branch */}
      <UserFormModal
        open={userFormOpen}
        onClose={() => setUserFormOpen(false)}
        lockBranch={assignFor?.id}
        onSaved={() => toast("Branch user created", "success")}
      />

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete branch?" size="sm">
        <div className="p-6">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">{toDelete?.name}</span>? Products and users
            assigned to it will remain but become unassigned.
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
