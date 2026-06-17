import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Primitives";
import { useAdmin, ROLE_OPTIONS } from "../../context/AdminContext";

const EMPTY = {
  name: "",
  email: "",
  mobile: "",
  username: "",
  password: "",
  role: "store_manager",
  branchId: "",
  status: "Active",
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

export default function UserFormModal({ open, onClose, initial, lockBranch, onSaved }) {
  const { branches, users, addUser, updateUser } = useAdmin();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setForm(
        initial
          ? { ...EMPTY, ...initial }
          : { ...EMPTY, branchId: lockBranch || "" }
      );
      setErrors({});
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, initial, lockBranch]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Invalid email";
    if (!form.username.trim()) errs.username = "Required";
    if (!isEdit && !form.password.trim()) errs.password = "Required";
    // Username must be unique across users.
    const clash = users.find(
      (u) => u.username === form.username.trim() && u.id !== initial?.id
    );
    if (clash) errs.username = "Username already taken";
    if (Object.keys(errs).length) return setErrors(errs);

    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      username: form.username.trim(),
      // Admins are not tied to a branch.
      branchId: form.role === "admin" ? null : form.branchId || null,
    };
    if (isEdit) updateUser(initial.id, payload);
    else addUser(payload);
    onSaved?.(isEdit);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit User" : "Create User"} size="lg">
      <form onSubmit={submit} className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Priya Nair"
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@daikin.in"
            />
            {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mobile Number">
            <input
              className={inputCls}
              value={form.mobile}
              onChange={(e) => set("mobile", e.target.value)}
              placeholder="+91 98xxx xxxxx"
            />
          </Field>
          <Field label="Role">
            <select
              className={inputCls}
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username">
            <input
              className={inputCls}
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder="login id"
            />
            {errors.username && (
              <span className="text-xs text-red-500">{errors.username}</span>
            )}
          </Field>
          <Field label={isEdit ? "Password (leave to keep)" : "Password"}>
            <input
              className={inputCls}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••"
            />
            {errors.password && (
              <span className="text-xs text-red-500">{errors.password}</span>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Branch Assignment">
            <select
              className={inputCls}
              value={form.branchId || ""}
              disabled={form.role === "admin" || Boolean(lockBranch)}
              onChange={(e) => set("branchId", e.target.value)}
            >
              <option value="">
                {form.role === "admin" ? "Not applicable" : "— Unassigned —"}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.location}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              className={inputCls}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{isEdit ? "Save Changes" : "Create User"}</Button>
        </div>
      </form>
    </Modal>
  );
}
