import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Filter,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { useAdmin, ROLE_OPTIONS } from "../../context/AdminContext";
import { usePageLoad } from "../../hooks/usePageLoad";
import { Card, Button, Badge, EmptyState, Skeleton } from "../../components/ui/Primitives";
import Modal from "../../components/ui/Modal";
import UserFormModal from "../../components/admin/UserFormModal";
import { useToast } from "../../components/ui/Toast";
import { roleLabel } from "../../utils/format";

const selectCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 outline-none focus:border-daikin-400 cursor-pointer";

const roleTone = {
  admin: "blue",
  store_manager: "green",
  distributor: "amber",
};

export default function UserManagement() {
  const { users, branches, deleteUser, setUserStatus } = useAdmin();
  const { toast } = useToast();
  const loading = usePageLoad();

  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const branchName = (id) => branches.find((b) => b.id === id)?.name || "—";

  const list = useMemo(() => {
    let l = users;
    if (role !== "all") l = l.filter((u) => u.role === role);
    if (status !== "all") l = l.filter((u) => (u.status || "Active") === status);
    if (q.trim()) {
      const t = q.toLowerCase();
      l = l.filter(
        (u) =>
          u.name.toLowerCase().includes(t) ||
          (u.email || "").toLowerCase().includes(t) ||
          (u.username || "").toLowerCase().includes(t)
      );
    }
    return l;
  }, [users, role, status, q]);

  async function confirmDelete() {
    const target = toDelete;
    setToDelete(null);
    try {
      await deleteUser(target.id);
      toast(`Deleted ${target.name}`, "info");
    } catch (e) {
      toast(e?.message || "Failed to delete user", "error");
    }
  }

  async function toggleStatus(u) {
    const next = (u.status || "Active") === "Active" ? "Inactive" : "Active";
    try {
      await setUserStatus(u.id, next);
      toast(`${u.name} ${next === "Active" ? "enabled" : "disabled"}`, "success");
    } catch (e) {
      toast(e?.message || "Failed to update status", "error");
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
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500">
            Create, edit and manage users, roles and branch access.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Create User
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or username…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-daikin-400 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="h-4 w-4" />
          </div>
          <select className={selectCls} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No users match"
            subtitle="Try adjusting your search or filters, or create a new user."
            action={
              <Button variant="outline" onClick={() => { setQ(""); setRole("all"); setStatus("all"); }}>
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
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Contact</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Branch</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((u) => {
                    const active = (u.status || "Active") === "Active";
                    return (
                      <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-daikin-50/30">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-daikin-btn text-xs font-bold text-white">
                              {u.initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-700">{u.name}</div>
                              <div className="text-xs text-slate-400">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          <div>{u.email}</div>
                          <div className="text-xs text-slate-400">{u.mobile || "—"}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={roleTone[u.role] || "slate"}>
                            {u.role === "admin" && <ShieldCheck className="h-3 w-3" />}
                            {roleLabel(u.role)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{branchName(u.branchId)}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => toggleStatus(u)}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 cursor-pointer"
                              title={active ? "Disable" : "Enable"}
                            >
                              {active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => { setEditing(u); setFormOpen(true); }}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-daikin-50 hover:text-daikin-600 cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setToDelete(u)}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {list.map((u) => {
              const active = (u.status || "Active") === "Active";
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-daikin-btn text-xs font-bold text-white">
                        {u.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-700">{u.name}</div>
                        <div className="truncate text-xs text-slate-400">{u.email}</div>
                      </div>
                    </div>
                    <Badge tone={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <Badge tone={roleTone[u.role] || "slate"}>{roleLabel(u.role)}</Badge>
                    <span className="text-slate-500">{branchName(u.branchId)}</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleStatus(u)}>
                      {active ? "Disable" : "Enable"}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(u); setFormOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(u)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-slate-400">
            Showing {list.length} user{list.length !== 1 ? "s" : ""}
          </p>
        </>
      )}

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSaved={(isEdit) => toast(isEdit ? "User updated" : "User created", "success")}
      />

      <Modal open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Delete user?" size="sm">
        <div className="p-6">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-800">{toDelete?.name}</span>? This action cannot be undone.
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
