import { useEffect, useState } from "react";
import { ScanLine, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Primitives";
import Scanner from "../scan/Scanner";
import ProductFields from "../scan/ProductFields";
import { lookupModel } from "../../lib/daikinMapping";
import LineItemEditor from "./LineItemEditor";
import { useParties } from "../../context/PartyContext";
import { useInventory } from "../../context/InventoryContext";
import { useInvoices } from "../../context/InvoiceContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

const EMPTY_DETAIL = { model: "", category: "", type: "", capacity: "", unit: "" };

// Create a purchase (Check-In) or sales (Check-Out) invoice. Supports manual
// line entry and scan-to-add-line.
export default function InvoiceFormModal({ open, onClose, mode = "purchase", onPosted, autoScan = false }) {
  const isSale = mode === "sale";
  const { customers } = useParties();
  const { products, findByBarcode, lookupByBarcode, viewBranchId } = useInventory();
  const { createPurchase, createSale } = useInvoices();
  const { user } = useAuth();
  const { toast } = useToast();

  const [partyId, setPartyId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productEntries, setProductEntries] = useState([]);
  const [productDraft, setProductDraft] = useState(EMPTY_DETAIL);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPartyId(""); setInvoiceNo(""); setSupplierInvoiceNo(""); setNotes(""); setLines([]); setScanning(autoScan);
      setProductEntries([]); setProductDraft(EMPTY_DETAIL);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, mode, autoScan]);

  const branchId = viewBranchId || user?.branchId;
  // Sale lines are limited to products that currently have stock.
  const sellable = isSale ? products.filter((p) => (p.availableQty ?? 0) > 0) : products;

  // Auto-fill & auto-save the product-detail row for a scanned/typed Model No.
  // Deduped by model — scanning the same model again won't add a duplicate row
  // (the operator can still edit it below).
  function autoSaveDetail(code) {
    const hit = lookupModel(code);
    if (!hit) return false;
    setProductEntries((prev) => {
      if (prev.some((e) => (e.model || "").toUpperCase() === hit.model.toUpperCase())) return prev;
      return [...prev, {
        model: hit.model,
        category: hit.category,
        type: hit.type,
        capacity: hit.capacity == null ? "" : String(hit.capacity),
        unit: hit.unit || "",
      }];
    });
    toast(`Auto-filled ${hit.model} — ${hit.type}`, "success");
    return true;
  }

  // Find the matching catalog product for a code and add/increment its line.
  // `silent` suppresses the "no product" warning (used when the code came from
  // typing a Model No, where the detail auto-fill is the primary action).
  function addProductLine(code, { silent = false } = {}) {
    const p = findByBarcode(code);
    const resolve = p ? Promise.resolve(p) : lookupByBarcode(code).catch(() => null);
    Promise.resolve(resolve).then((prod) => {
      if (!prod) return silent ? undefined : toast(`No product for ${code}`, "error");
      if (isSale && (prod.availableQty ?? 0) <= 0) return toast(`${prod.name} is out of stock`, "error");
      setLines((prev) => {
        const idx = prev.findIndex((l) => String(l.productId) === String(prod.id));
        if (idx >= 0) {
          const copy = [...prev];
          const cap = isSale ? prod.availableQty ?? 0 : Infinity;
          copy[idx] = { ...copy[idx], quantity: Math.min(cap, (copy[idx].quantity || 0) + 1) };
          return copy;
        }
        return [...prev, { productId: prod.id, productName: prod.name, barcode: prod.barcode, quantity: 1, price: prod.price, maxQty: isSale ? prod.availableQty ?? 0 : 0 }];
      });
      toast(`Added ${prod.name}`, "success");
    });
  }

  // Scanner / manual-code path: auto-fill the details AND add the product line.
  function addScanned(code) {
    autoSaveDetail(code);
    addProductLine(code);
  }

  // Model No picked in the Product Details fields → also pull in the product
  // line automatically (quietly if there's no matching catalog product).
  function handleModelPicked(model) {
    if (model) addProductLine(model, { silent: true });
  }

  // A product picked in a line-item dropdown → auto-fill the Product Details
  // above from that product's Model No (barcode).
  function handleLineProductPicked(prod) {
    const hit = prod && lookupModel(prod.barcode);
    if (!hit) return;
    setProductDraft({
      model: hit.model,
      category: hit.category,
      type: hit.type,
      capacity: hit.capacity == null ? "" : String(hit.capacity),
      unit: hit.unit || "",
    });
  }

  // The Product Details the operator entered — saved rows plus the current
  // (unsaved) draft — as normalized Model Nos.
  function detailModels() {
    return [...productEntries.map((e) => e.model), productDraft.model]
      .map((m) => String(m || "").trim().toUpperCase())
      .filter(Boolean);
  }

  // Every Model No in the Product Details must match a selected product.
  function mismatchedModel(validLines) {
    const barcodes = validLines
      .map((l) => String(l.barcode || "").trim().toUpperCase())
      .filter(Boolean);
    return detailModels().find((m) => !barcodes.includes(m)) || null;
  }

  async function submit() {
    // Purchases (Check-In) no longer capture a supplier; only sales need a party.
    if (isSale && !partyId) return toast("Select a customer", "error");
    const valid = lines.filter((l) => l.productId && (l.quantity || 0) > 0);
    if (valid.length === 0) return toast("Add at least one line item", "error");
    if (isSale && valid.some((l) => (l.quantity || 0) > (l.maxQty ?? Infinity))) {
      return toast("A line exceeds available stock", "error");
    }
    const badModel = mismatchedModel(valid);
    if (badModel) {
      return toast(`Product Details "${badModel}" don't match the selected product. Fix the details or the product line.`, "error");
    }
    // Include the unsaved draft row too, so a filled-but-not-"Saved" detail
    // still persists with the invoice.
    const draftFilled = productDraft.model || productDraft.category || productDraft.type || productDraft.capacity || productDraft.unit;
    const details = draftFilled ? [...productEntries, productDraft] : productEntries;
    setSaving(true);
    try {
      if (isSale) {
        await createSale({ customerId: Number(partyId), invoiceNo, branchId, notes, lines: valid, productDetails: details });
      } else {
        await createPurchase({ invoiceNo, supplierInvoiceNo, branchId, notes, lines: valid, productDetails: details });
      }
      toast(`${isSale ? "Sale" : "Purchase"} posted`, "success");
      onPosted?.();
      onClose();
    } catch (e) {
      toast(e.message || "Failed to post invoice.", "error");
    } finally {
      setSaving(false);
    }
  }

  const title = isSale ? "New Sales Invoice (Check-Out)" : "New Purchase Invoice (Check-In)";

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="space-y-5 p-6">
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${isSale ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
          {isSale ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
          {isSale ? "Selling stock — units are allocated FIFO and marked sold." : "Receiving stock — a unique serial is generated for every unit."}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isSale && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-600">Customer</span>
              <select className={inputCls} value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                <option value="">Select customer…</option>
                {customers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-600">
              Invoice No. <span className="font-normal text-slate-400">(optional — auto if blank)</span>
            </span>
            <input className={`${inputCls} font-mono`} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder={isSale ? "SINV-2026-…" : "PINV-2026-…"} />
          </label>
          {!isSale && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-600">Bill / Reference No.</span>
              <input className={inputCls} value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} placeholder="Vendor bill no. (optional)" />
            </label>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Line Items</span>
            <Button type="button" variant={scanning ? "danger" : "outline"} size="sm" onClick={() => setScanning((s) => !s)}>
              {scanning ? <><X className="h-4 w-4" /> Close scanner</> : <><ScanLine className="h-4 w-4" /> Scan to add</>}
            </Button>
          </div>
          {scanning && (
            <div className="mb-4 rounded-xl border border-slate-200 p-3">
              <Scanner onResult={(code) => addScanned(code)} />
            </div>
          )}
          <ProductFields draft={productDraft} onDraftChange={setProductDraft} entries={productEntries} onEntriesChange={setProductEntries} onModelPicked={handleModelPicked} />
          <div className="mt-4">
            <LineItemEditor mode={mode} lines={lines} setLines={setLines} products={sellable} onProductPicked={handleLineProductPicked} />
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-600">Notes</span>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="subtle" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" variant={isSale ? "danger" : "primary"} onClick={submit} disabled={saving}>
            {saving ? "Confirming…" : isSale ? "Confirm Sale" : "Confirm Purchase"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
