import { useEffect, useState } from "react";
import { PackageX, PackagePlus, ArrowLeft, Save } from "lucide-react";
import Modal from "../ui/Modal";
import { Button, EmptyState } from "../ui/Primitives";
import Scanner from "../scan/Scanner";
import ProductFormModal from "../products/ProductFormModal";
import { parseScan } from "../../lib/scanParser";
import { lookupModel, CATEGORIES, TYPES, UNITS, MODEL_NOS } from "../../lib/daikinMapping";
import { useInventory } from "../../context/InventoryContext";
import { useInvoices } from "../../context/InvoiceContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

const EMPTY_DRAFT = { name: "", category: "", type: "", model: "", capacity: "", unit: "" };

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

// Scan-first Check-In (purchase) / Check-Out (sale) flow.
//   Scan → parse code → fetch product → editable Product Details form → Save.
// Each Save records exactly one unit (qty = 1). Reuses the existing Scanner,
// scan parser, and createPurchase/createSale APIs. No customer/supplier capture.
export default function InvoiceFormModal({ open, onClose, mode = "purchase", onPosted }) {
  const isSale = mode === "sale";
  const { lookupByBarcode, viewBranchId, refreshProducts } = useInventory();
  const { createPurchase, createSale } = useInvoices();
  const { user } = useAuth();
  const { toast } = useToast();

  const [screen, setScreen] = useState("scan"); // 'scan' | 'form'
  const [product, setProduct] = useState(null); // matched catalog product
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [billRef, setBillRef] = useState("");
  const [parsed, setParsed] = useState(null);
  const [notFound, setNotFound] = useState("");
  const [registering, setRegistering] = useState(false);
  const [saving, setSaving] = useState(false);

  const branchId = viewBranchId || user?.branchId;

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setScreen("scan"); setProduct(null); setDraft(EMPTY_DRAFT);
      setInvoiceNo(""); setBillRef(""); setParsed(null); setNotFound(""); setRegistering(false); setSaving(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, mode]);

  // Prefill the details form from a matched product + its catalog model row.
  function openForm(prod, info) {
    const hit = lookupModel(prod.modelNumber || prod.barcode || info?.modelNumber);
    setProduct(prod);
    setDraft({
      name: prod.name || "",
      category: hit?.category || prod.categoryName || "",
      type: hit?.type || "",
      model: prod.modelNumber || hit?.model || info?.modelNumber || "",
      capacity: hit?.capacity == null ? "" : String(hit.capacity),
      unit: hit?.unit || "",
    });
    setScreen("form");
  }

  // Scanner / manual entry result → parse, fetch the product, open the form.
  async function onResult(code) {
    const info = parseScan(code);
    setParsed(info);
    try {
      const prod = await lookupByBarcode(info.barcode);
      if (prod) {
        if (isSale && (prod.availableQty ?? 0) <= 0) {
          toast(`${prod.name} is out of stock`, "error");
          return;
        }
        openForm(prod, info);
      } else {
        setNotFound(info.barcode || code);
      }
    } catch {
      setNotFound(info.barcode || code);
    }
  }

  // Model No edit auto-fills Category / Type / Capacity / Unit from the catalog.
  function setField(patch) {
    if (patch.model !== undefined) {
      const hit = lookupModel(patch.model);
      if (hit) {
        patch = {
          ...patch,
          category: hit.category,
          type: hit.type,
          capacity: hit.capacity == null ? "" : String(hit.capacity),
          unit: hit.unit || "",
        };
      }
    }
    setDraft((d) => ({ ...d, ...patch }));
  }

  async function save() {
    if (!product) return;
    const details = [{
      name: draft.name || product.name,
      model: draft.model, category: draft.category, type: draft.type,
      capacity: draft.capacity, unit: draft.unit,
    }];
    const line = {
      productId: product.id,
      productName: draft.name || product.name,
      barcode: product.barcode,
      quantity: 1,
      price: product.price || 0,
      maxQty: isSale ? product.availableQty ?? 0 : 0,
    };
    setSaving(true);
    try {
      if (isSale) {
        await createSale({ invoiceNo, branchId, lines: [line], productDetails: details });
      } else {
        await createPurchase({ invoiceNo, supplierInvoiceNo: billRef, branchId, lines: [line], productDetails: details });
      }
      toast(isSale ? "Checked out" : "Checked in", "success");
      onPosted?.();
      onClose();
    } catch (e) {
      toast(e.message || "Failed to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  const title = isSale ? "Check-Out" : "Check-In";

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} size="md">
        <div className="p-5">
          {screen === "form" ? (
            <div className="space-y-4">
              <datalist id="ifm-models">{MODEL_NOS.map((m) => <option key={m} value={m} />)}</datalist>
              <datalist id="ifm-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
              <datalist id="ifm-types">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
              <datalist id="ifm-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>

              <Field label="Product">
                <input className={inputCls} value={draft.name} onChange={(e) => setField({ name: e.target.value })} placeholder="Product name" />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <input list="ifm-categories" className={inputCls} value={draft.category} onChange={(e) => setField({ category: e.target.value })} placeholder="Type or pick…" />
                </Field>
                <Field label="Type">
                  <input list="ifm-types" className={inputCls} value={draft.type} onChange={(e) => setField({ type: e.target.value })} placeholder="Type or pick…" />
                </Field>
                <Field label="Model No">
                  <input list="ifm-models" className={`${inputCls} font-mono`} value={draft.model} onChange={(e) => setField({ model: e.target.value })} placeholder="Auto-fills the rest" />
                </Field>
                <Field label="Capacity">
                  <input type="number" step="0.01" className={inputCls} value={draft.capacity} onChange={(e) => setField({ capacity: e.target.value })} placeholder="Auto-fills from Model" />
                </Field>
                <Field label="Unit">
                  <input list="ifm-units" className={inputCls} value={draft.unit} onChange={(e) => setField({ unit: e.target.value })} placeholder="Type or pick…" />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Invoice No.">
                  <input className={`${inputCls} font-mono`} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder={isSale ? "SINV-2026- (auto if blank)" : "PINV-2026- (auto if blank)"} />
                </Field>
                {!isSale && (
                  <Field label="Bill / Reference No.">
                    <input className={inputCls} value={billRef} onChange={(e) => setBillRef(e.target.value)} placeholder="Vendor bill no. (optional)" />
                  </Field>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-1">
                <Button type="button" variant="subtle" onClick={() => setScreen("scan")} disabled={saving}>
                  <ArrowLeft className="h-4 w-4" /> Scan again
                </Button>
                <Button type="button" variant={isSale ? "danger" : "primary"} onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : notFound ? (
            <EmptyState
              icon={PackageX}
              title="Product not registered"
              subtitle={`No product matches barcode "${notFound}". Register it, then it can be ${isSale ? "checked out" : "checked in"}.`}
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {!isSale && (
                    <Button onClick={() => setRegistering(true)}>
                      <PackagePlus className="h-4 w-4" /> Register product
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setNotFound("")}>Scan again</Button>
                </div>
              }
            />
          ) : (
            <Scanner onResult={onResult} />
          )}
        </div>
      </Modal>

      {/* Register a not-found product, then continue into the details form. */}
      <ProductFormModal
        open={registering}
        onClose={() => setRegistering(false)}
        prefill={parsed ? {
          barcode: parsed.barcode,
          modelNumber: parsed.modelNumber,
          manufacturingDate: parsed.manufacturingDate,
          serialCode: parsed.suffix,
          name: parsed.model ? `${parsed.model.model} ${parsed.model.type}`.trim() : "",
        } : null}
        onSaved={async () => {
          setRegistering(false);
          await refreshProducts();
          const prod = await lookupByBarcode(notFound).catch(() => null);
          if (prod) { setNotFound(""); openForm(prod, parsed); }
        }}
      />
    </>
  );
}
