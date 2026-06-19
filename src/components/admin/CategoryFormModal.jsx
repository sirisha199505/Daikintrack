import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Primitives";
import { useAdmin } from "../../context/AdminContext";
import { useToast } from "../ui/Toast";

const SWATCHES = [
  "#22b8e6", "#16a34a", "#f59e0b", "#ef4444",
  "#8b5cf6", "#14b8a6", "#6366f1", "#f97316",
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

export default function CategoryFormModal({ open, onClose, initial, onSaved }) {
  const { categories, addCategory, updateCategory } = useAdmin();
  const { toast } = useToast();
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(initial?.name || "");
      setColor(initial?.color || SWATCHES[0]);
      setError("");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, initial]);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Required");
    const clash = categories.find(
      (c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== initial?.id
    );
    if (clash) return setError("A category with this name already exists");

    setSaving(true);
    try {
      if (isEdit) await updateCategory(initial.id, { name: name.trim(), color });
      else await addCategory({ name: name.trim(), color });
      onSaved?.(isEdit);
      onClose();
    } catch (err) {
      toast(err.message || "Failed to save category.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Category" : "Add Category"} size="sm">
      <form onSubmit={submit} className="space-y-4 p-6">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-600">Category Name</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Split AC"
            autoFocus
          />
          {error && <span className="text-xs text-red-500">{error}</span>}
        </label>

        <div>
          <span className="mb-1.5 block text-sm font-semibold text-slate-600">Colour</span>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setColor(s)}
                className={`h-8 w-8 rounded-full ring-2 ring-offset-2 transition cursor-pointer ${
                  color === s ? "ring-slate-400" : "ring-transparent"
                }`}
                style={{ background: s }}
                aria-label={s}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="subtle" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
