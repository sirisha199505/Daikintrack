import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Primitives";
import { useParties } from "../../context/PartyContext";
import { useToast } from "../ui/Toast";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

// Shared create/edit modal for suppliers and customers (same fields).
export default function PartyFormModal({ open, onClose, kind, initial, onSaved }) {
  const { addSupplier, updateSupplier, addCustomer, updateCustomer } = useParties();
  const { toast } = useToast();
  const isSupplier = kind === "supplier";
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setForm({
        name: initial?.name || "", gstin: initial?.gstin || "", phone: initial?.phone || "",
        email: initial?.email || "", contact: initial?.contact || "", code: initial?.code || "",
        address: initial?.address || "",
      });
      setError("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name?.trim()) return setError("Name is required");
    setSaving(true);
    try {
      if (isSupplier) {
        isEdit ? await updateSupplier(initial.id, form) : await addSupplier(form);
      } else {
        isEdit ? await updateCustomer(initial.id, form) : await addCustomer(form);
      }
      onSaved?.(isEdit);
      onClose();
    } catch (err) {
      toast(err.message || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  const noun = isSupplier ? "Supplier" : "Customer";
  return (
    <Modal open={open} onClose={onClose} title={`${isEdit ? "Edit" : "Add"} ${noun}`} size="md">
      <form onSubmit={submit} className="space-y-4 p-6">
        <Field label={`${noun} Name`}>
          <input className={inputCls} value={form.name || ""} onChange={set("name")} placeholder={`e.g. ${isSupplier ? "Daikin Distributors" : "Cool Air Services"}`} autoFocus />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contact Person"><input className={inputCls} value={form.contact || ""} onChange={set("contact")} /></Field>
          <Field label="Phone"><input className={inputCls} value={form.phone || ""} onChange={set("phone")} /></Field>
          <Field label="Email"><input className={inputCls} value={form.email || ""} onChange={set("email")} /></Field>
          <Field label="GSTIN"><input className={`${inputCls} font-mono`} value={form.gstin || ""} onChange={set("gstin")} /></Field>
        </div>
        <Field label="Address">
          <textarea className={inputCls} rows={2} value={form.address || ""} onChange={set("address")} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="subtle" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : isEdit ? "Save Changes" : `Add ${noun}`}</Button>
        </div>
      </form>
    </Modal>
  );
}
