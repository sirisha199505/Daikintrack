import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Primitives";
import { useInventory } from "../../context/InventoryContext";
import { useToast } from "../ui/Toast";
import { MODEL_NOS } from "../../lib/daikinMapping";

const EMPTY = {
  name: "",
  category: "",
  branchId: "",
  stock: 0,
  lowStockThreshold: 10,
  // Fields decoded from a scanned QR/barcode (see scanParser.js). All editable.
  barcode: "",
  modelNumber: "",
  manufacturingDate: "",
  serialCode: "",
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

export default function ProductFormModal({
  open,
  onClose,
  initial,
  lockBranch,
  scanCode,
  prefill,
  onSaved,
}) {
  const { categories, branches, addProduct, updateProduct } = useInventory();
  const { toast } = useToast();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Sync the form to the selected product whenever the modal (re)opens.
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setForm(
        initial
          ? { ...EMPTY, ...initial }
          : {
              ...EMPTY,
              branchId: lockBranch || branches[0]?.id || "",
              category: categories[0]?.id || "",
              // Values parsed from a not-found scan pre-populate the form.
              ...(prefill || {}),
            }
      );
      setErrors({});
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, initial, lockBranch, prefill, categories, branches]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.category) errs.category = "Required";
    if (!form.branchId) errs.branchId = "Required";
    if (Number(form.stock) < 0) errs.stock = "Invalid";
    if (Number(form.lowStockThreshold) < 0) errs.lowStockThreshold = "Invalid";
    if (Object.keys(errs).length) return setErrors(errs);

    const cat = categories.find((c) => c.id === form.category);
    const payload = {
      ...form,
      stock: Number(form.stock),
      categoryName: cat?.name,
    };
    // A barcode scanned in Check-In ("Add Product Manually") keeps the new
    // product matchable by that code. A code typed into the Barcode field wins.
    if (!isEdit && scanCode && !payload.barcode) payload.barcode = String(scanCode).trim();
    setSaving(true);
    try {
      if (isEdit) await updateProduct(initial.id, payload);
      else await addProduct(payload);
      onSaved?.(isEdit);
      onClose();
    } catch (err) {
      toast(err.message || "Failed to save product.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Product" : "Add Product"}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4 p-6">
        <Field label="Product Name">
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. FTKF50 1.5 Ton 5 Star Inverter"
          />
          {errors.name && (
            <span className="text-xs text-red-500">{errors.name}</span>
          )}
        </Field>

        {/* Scan-decoded fields — barcode & model no. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Barcode">
            <input
              className={`${inputCls} font-mono`}
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
              placeholder="Auto-generated if left blank"
            />
          </Field>
          <Field label="Model Number">
            <input
              list="pfm-models"
              className={`${inputCls} font-mono`}
              value={form.modelNumber}
              onChange={(e) => set("modelNumber", e.target.value)}
              placeholder="e.g. RZMF125BRV169"
            />
            <datalist id="pfm-models">
              {MODEL_NOS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
        </div>

        {/* Scan-decoded fields — manufacturing date & serial/suffix. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Manufacturing Date">
            <input
              className={inputCls}
              value={form.manufacturingDate}
              onChange={(e) => set("manufacturingDate", e.target.value)}
              placeholder="MM-YYYY (e.g. 11-2025)"
            />
          </Field>
          <Field label="Serial / Code">
            <input
              className={`${inputCls} font-mono`}
              value={form.serialCode}
              onChange={(e) => set("serialCode", e.target.value)}
              placeholder="Trailing suffix, e.g. G"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              className={inputCls}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">— Select —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className="text-xs text-red-500">{errors.category}</span>
            )}
          </Field>
          <Field label="Branch">
            <select
              className={inputCls}
              value={form.branchId}
              disabled={Boolean(lockBranch)}
              onChange={(e) => set("branchId", e.target.value)}
            >
              <option value="">— Select —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.location}
                </option>
              ))}
            </select>
            {errors.branchId && (
              <span className="text-xs text-red-500">{errors.branchId}</span>
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Stock Quantity">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
            />
            {errors.stock && (
              <span className="text-xs text-red-500">{errors.stock}</span>
            )}
          </Field>
          <Field label="Low Stock Threshold">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", e.target.value)}
              placeholder="10"
            />
            {errors.lowStockThreshold && (
              <span className="text-xs text-red-500">{errors.lowStockThreshold}</span>
            )}
            <span className="mt-1 block text-xs text-slate-400">
              Flag the product as “Low Stock” at or below this quantity.
            </span>
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="subtle" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Product"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
