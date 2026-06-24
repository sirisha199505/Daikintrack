import { useEffect, useState } from "react";
import { ScanLine, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Modal from "../ui/Modal";
import { Button } from "../ui/Primitives";
import Scanner from "../scan/Scanner";
import LineItemEditor from "./LineItemEditor";
import { useParties } from "../../context/PartyContext";
import { useInventory } from "../../context/InventoryContext";
import { useInvoices } from "../../context/InvoiceContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../ui/Toast";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

// Create a purchase (Check-In) or sales (Check-Out) invoice. Supports manual
// line entry and scan-to-add-line.
export default function InvoiceFormModal({ open, onClose, mode = "purchase", onPosted, autoScan = false }) {
  const isSale = mode === "sale";
  const { suppliers, customers } = useParties();
  const { products, findByBarcode, lookupByBarcode, viewBranchId } = useInventory();
  const { createPurchase, createSale } = useInvoices();
  const { user } = useAuth();
  const { toast } = useToast();

  const [partyId, setPartyId] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPartyId(""); setSupplierInvoiceNo(""); setNotes(""); setLines([]); setScanning(autoScan);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, mode, autoScan]);

  const parties = isSale ? customers : suppliers;
  const branchId = viewBranchId || user?.branchId;
  // Sale lines are limited to products that currently have stock.
  const sellable = isSale ? products.filter((p) => (p.availableQty ?? 0) > 0) : products;

  function addScanned(code) {
    const p = findByBarcode(code);
    const resolve = p ? Promise.resolve(p) : lookupByBarcode(code).catch(() => null);
    Promise.resolve(resolve).then((prod) => {
      if (!prod) return toast(`No product for ${code}`, "error");
      if (isSale && (prod.availableQty ?? 0) <= 0) return toast(`${prod.name} is out of stock`, "error");
      setLines((prev) => {
        const idx = prev.findIndex((l) => String(l.productId) === String(prod.id));
        if (idx >= 0) {
          const copy = [...prev];
          const cap = isSale ? prod.availableQty ?? 0 : Infinity;
          copy[idx] = { ...copy[idx], quantity: Math.min(cap, (copy[idx].quantity || 0) + 1) };
          return copy;
        }
        return [...prev, { productId: prod.id, productName: prod.name, quantity: 1, price: prod.price, maxQty: isSale ? prod.availableQty ?? 0 : 0 }];
      });
      toast(`Added ${prod.name}`, "success");
    });
  }

  async function submit() {
    if (!partyId) return toast(`Select a ${isSale ? "customer" : "supplier"}`, "error");
    const valid = lines.filter((l) => l.productId && (l.quantity || 0) > 0);
    if (valid.length === 0) return toast("Add at least one line item", "error");
    if (isSale && valid.some((l) => (l.quantity || 0) > (l.maxQty ?? Infinity))) {
      return toast("A line exceeds available stock", "error");
    }
    setSaving(true);
    try {
      if (isSale) {
        await createSale({ customerId: Number(partyId), branchId, notes, lines: valid });
      } else {
        await createPurchase({ supplierId: Number(partyId), supplierInvoiceNo, branchId, notes, lines: valid });
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
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-600">{isSale ? "Customer" : "Supplier"}</span>
            <select className={inputCls} value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">Select {isSale ? "customer" : "supplier"}…</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          {!isSale && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-600">Supplier Invoice No.</span>
              <input className={inputCls} value={supplierInvoiceNo} onChange={(e) => setSupplierInvoiceNo(e.target.value)} placeholder="Supplier's bill no." />
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
              <Scanner onResult={(code) => addScanned(code)} branchId={branchId} />
            </div>
          )}
          <LineItemEditor mode={mode} lines={lines} setLines={setLines} products={sellable} />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-600">Notes</span>
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="subtle" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" variant={isSale ? "danger" : "primary"} onClick={submit} disabled={saving}>
            {saving ? "Posting…" : isSale ? "Post Sale" : "Post Purchase"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
