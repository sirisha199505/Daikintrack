import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Primitives";
import { useAdmin } from "../../context/AdminContext";
import { useToast } from "../ui/Toast";

const EMPTY = {
  name: "",
  code: "",
  location: "",
  address: "",
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

export default function BranchFormModal({ open, onClose, initial, onSaved }) {
  const { branches, addBranch, updateBranch } = useAdmin();
  const { toast } = useToast();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setForm(initial ? { ...EMPTY, ...initial } : EMPTY);
      setErrors({});
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, initial]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.code.trim()) errs.code = "Required";
    // Branch code must be unique.
    const clash = branches.find(
      (b) => (b.code || "").toLowerCase() === form.code.trim().toLowerCase() && b.id !== initial?.id
    );
    if (clash) errs.code = "Code already in use";
    if (Object.keys(errs).length) return setErrors(errs);

    const payload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
    };
    setSaving(true);
    try {
      if (isEdit) await updateBranch(initial.id, payload);
      else await addBranch(payload);
      onSaved?.(isEdit);
      onClose();
    } catch (err) {
      toast(err.message || "Failed to save branch.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Branch" : "Add Branch"} size="lg">
      <form onSubmit={submit} className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Branch Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. North Hub"
            />
            {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
          </Field>
          <Field label="Branch Code">
            <input
              className={`${inputCls} font-mono`}
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="WH-NORTH"
            />
            {errors.code && <span className="text-xs text-red-500">{errors.code}</span>}
          </Field>
        </div>

        <Field label="Location">
          <input
            className={inputCls}
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="City / Region"
          />
        </Field>

        <Field label="Address">
          <textarea
            className={`${inputCls} min-h-[72px] resize-y`}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Full warehouse address"
          />
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

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="subtle" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Branch"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
