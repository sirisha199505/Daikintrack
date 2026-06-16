import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Primitives";
import { useInventory } from "../../context/InventoryContext";

const EMPTY = {
  name: "",
  category: "split",
  branchId: "north",
  barcode: "",
  stock: 0,
  lowStockThreshold: 10,
  price: 0,
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
  onSaved,
}) {
  const { categories, branches, addProduct, updateProduct } = useInventory();
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Sync the form to the selected product whenever the modal (re)opens.
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setForm(
        initial
          ? { ...EMPTY, ...initial }
          : { ...EMPTY, branchId: lockBranch || "north" }
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
    if (!String(form.barcode).trim()) errs.barcode = "Required";
    if (Number(form.stock) < 0) errs.stock = "Invalid";
    if (Object.keys(errs).length) return setErrors(errs);

    const cat = categories.find((c) => c.id === form.category);
    const payload = {
      ...form,
      stock: Number(form.stock),
      price: Number(form.price),
      lowStockThreshold: Number(form.lowStockThreshold),
      categoryName: cat?.name,
    };
    if (isEdit) updateProduct(initial.id, payload);
    else addProduct(payload);
    onSaved?.(isEdit);
    onClose();
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              className={inputCls}
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Branch">
            <select
              className={inputCls}
              value={form.branchId}
              disabled={Boolean(lockBranch)}
              onChange={(e) => set("branchId", e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.location}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Barcode">
          <input
            className={`${inputCls} font-mono`}
            value={form.barcode}
            onChange={(e) => set("barcode", e.target.value)}
            placeholder="13-digit EAN"
          />
          {errors.barcode && (
            <span className="text-xs text-red-500">{errors.barcode}</span>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Stock Qty">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
            />
          </Field>
          <Field label="Low Stock At">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", e.target.value)}
            />
          </Field>
          <Field label="Unit Price (₹)">
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{isEdit ? "Save Changes" : "Add Product"}</Button>
        </div>
      </form>
    </Modal>
  );
}
