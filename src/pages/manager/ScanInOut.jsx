import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PackageX,
  ScanLine,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Plus,
  Minus,
  Building2,
  Layers,
  QrCode,
  Barcode,
  CheckCircle2,
  Package,
  ReceiptText,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import Scanner from "../../components/scan/Scanner";
import ProductFormModal from "../../components/products/ProductFormModal";
import { Card, EmptyState, Button, Badge } from "../../components/ui/Primitives";
import { useToast } from "../../components/ui/Toast";
import { num } from "../../utils/format";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-daikin-400 focus:bg-white focus:ring-2 focus:ring-daikin-100";

export default function ScanInOut() {
  const { user } = useAuth();
  const { findByBarcode, recordMovement, branches, nextInvoiceNo } = useInventory();
  const { toast } = useToast();
  const [params] = useSearchParams();

  const [op, setOp] = useState(params.get("op") === "out" ? "out" : "in");
  const [scanned, setScanned] = useState(null); // { code, type }
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState("");
  const [qty, setQty] = useState(1);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const locked = Boolean(scanned) || Boolean(receipt);

  function onResult(code, type) {
    if (locked) return; // prevent multiple scans of the same transaction
    setScanned({ code, type });
    const found = findByBarcode(code);
    if (found) {
      setProduct(found);
      setNotFound("");
      setQty(1);
      // Pre-fill a suggested invoice number for check-out (still editable).
      if (op === "out") setInvoiceNo(nextInvoiceNo());
    } else {
      setNotFound(code);
      setProduct(null);
    }
  }

  function reset() {
    setScanned(null);
    setProduct(null);
    setNotFound("");
    setReceipt(null);
    setQty(1);
    setInvoiceNo("");
    setConfirming(false);
  }

  function switchOp(next) {
    setOp(next);
    reset();
  }

  async function completeCheckIn() {
    try {
      const inv = await recordMovement({
        productId: product.id,
        type: "in",
        quantity: qty,
        actor: user.name,
        branchName: branches.find((b) => b.id === product.branchId)?.name,
      });
      toast(`Checked in ${qty} × ${product.name}`, "success");
      setReceipt({ type: "in", qty, invoiceNo: inv, name: product.name });
      setScanned(null);
      setProduct(null);
    } catch (e) {
      toast(e.message || "Failed to check in.", "error");
    }
  }

  async function completeCheckOut() {
    try {
      const inv = await recordMovement({
        productId: product.id,
        type: "out",
        quantity: qty,
        actor: user.name,
        branchName: branches.find((b) => b.id === product.branchId)?.name,
        invoiceNo,
      });
      toast(`Checked out ${qty} × ${product.name}`, "success");
      setReceipt({ type: "out", qty, invoiceNo: inv, name: product.name });
      setScanned(null);
      setProduct(null);
      setConfirming(false);
    } catch (e) {
      toast(e.message || "Failed to check out.", "error");
    }
  }

  function afterManualAdd() {
    // Re-find the freshly added product by the scanned code and continue.
    const found = scanned ? findByBarcode(scanned.code) : null;
    if (found) {
      setProduct(found);
      setNotFound("");
      setQty(1);
      if (op === "out") setInvoiceNo(nextInvoiceNo());
    }
  }

  const maxOut = product ? product.stock : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Check In / Check Out</h1>
        <p className="text-sm text-slate-500">
          Scan a QR code or barcode — the type is detected automatically.
        </p>
      </div>

      {/* Operation toggle */}
      <div className="grid max-w-md grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        {[
          { id: "in", label: "Check In", icon: ArrowDownLeft },
          { id: "out", label: "Check Out", icon: ArrowUpRight },
        ].map((o) => {
          const active = op === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => switchOp(o.id)}
              className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition cursor-pointer ${
                active
                  ? o.id === "in"
                    ? "text-emerald-700"
                    : "text-red-600"
                  : "text-slate-500"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="op-pill"
                  className="absolute inset-0 rounded-xl bg-white shadow-sm"
                />
              )}
              <o.icon className="relative h-4 w-4" />
              <span className="relative">{o.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scanner panel */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2 text-slate-700">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-daikin-600" />
              <h2 className="text-base font-bold">Scanner</h2>
            </div>
            {locked && (
              <Badge tone="slate">
                <Lock className="h-3 w-3" /> Scanning disabled
              </Badge>
            )}
          </div>
          {locked ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <Lock className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-700">
                  Scan captured
                </h3>
                <p className="mt-1 max-w-xs text-sm text-slate-400">
                  Additional scanning is disabled until you start a new scan.
                </p>
              </div>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> New scan
              </Button>
            </div>
          ) : (
            <Scanner onResult={onResult} branchId={user.branchId} />
          )}
        </Card>

        {/* Result panel */}
        <div>
          {receipt ? (
            <Card className="p-8">
              <EmptyState
                icon={CheckCircle2}
                title={`${receipt.type === "in" ? "Checked In" : "Checked Out"} successfully`}
                subtitle={`${receipt.qty} unit(s) of ${receipt.name} · Invoice ${receipt.invoiceNo}`}
                action={
                  <Button onClick={reset}>
                    <ScanLine className="h-4 w-4" /> Scan another
                  </Button>
                }
              />
            </Card>
          ) : product ? (
            <ProductPanel
              product={product}
              branch={branches.find((b) => b.id === product.branchId)}
              scanned={scanned}
              op={op}
              qty={qty}
              setQty={setQty}
              maxOut={maxOut}
              invoiceNo={invoiceNo}
              setInvoiceNo={setInvoiceNo}
              confirming={confirming}
              setConfirming={setConfirming}
              onCheckIn={completeCheckIn}
              onCheckOut={completeCheckOut}
            />
          ) : notFound ? (
            <Card>
              <EmptyState
                icon={PackageX}
                title="No Product Found"
                subtitle={`No product matched "${notFound}". You can add it to the catalogue.`}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => setAddOpen(true)}>
                      <Plus className="h-4 w-4" /> Add Product Manually
                    </Button>
                    <Button variant="outline" onClick={reset}>
                      <RotateCcw className="h-4 w-4" /> Scan again
                    </Button>
                  </div>
                }
              />
            </Card>
          ) : (
            <Card className="h-full">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full min-h-[320px] flex-col items-center justify-center p-8 text-center"
              >
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-daikin-50 text-daikin-400">
                  <ScanLine className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-700">
                  Awaiting scan
                </h3>
                <p className="mt-1 max-w-xs text-sm text-slate-400">
                  Product details and the {op === "in" ? "check-in" : "check-out"} action
                  will appear here once a code is recognised.
                </p>
              </motion.div>
            </Card>
          )}
        </div>
      </div>

      <ProductFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        lockBranch={user.branchId}
        scanCode={scanned?.code}
        onSaved={() => {
          toast("Product added", "success");
          afterManualAdd();
        }}
      />
    </div>
  );
}

function QtyStepper({ qty, setQty, max }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setQty((q) => Math.max(1, q - 1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        value={qty}
        onChange={(e) => {
          let v = Math.max(1, parseInt(e.target.value) || 1);
          if (max) v = Math.min(v, max);
          setQty(v);
        }}
        className="w-14 rounded-lg border border-slate-200 py-1.5 text-center text-sm font-bold outline-none focus:border-daikin-400"
      />
      <button
        onClick={() => setQty((q) => (max ? Math.min(max, q + 1) : q + 1))}
        className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProductPanel({
  product,
  branch,
  scanned,
  op,
  qty,
  setQty,
  maxOut,
  invoiceNo,
  setInvoiceNo,
  confirming,
  setConfirming,
  onCheckIn,
  onCheckOut,
}) {
  const status =
    product.stock === 0
      ? { tone: "red", label: "Out of Stock" }
      : product.stock <= product.lowStockThreshold
      ? { tone: "amber", label: "Low Stock" }
      : { tone: "green", label: "In Stock" };
  const codeType = scanned?.type === "qr" ? "QR Code" : "Barcode";
  const CodeIcon = scanned?.type === "qr" ? QrCode : Barcode;
  const outOfStock = product.stock === 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="overflow-hidden">
        <div className="bg-daikin-gradient p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">{product.name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
                  <CodeIcon className="h-4 w-4" />
                  <span className="font-mono">{product.barcode}</span>
                </div>
              </div>
            </div>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <Info icon={Building2} label="Branch" value={branch?.name || "—"} />
            <Info icon={Layers} label="Category" value={product.categoryName} />
            <Info icon={CodeIcon} label="Detected" value={codeType} />
            <Info icon={Package} label="Available Stock" value={num(product.stock)} />
          </div>

          {confirming ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Confirm check-out of{" "}
                <span className="font-bold text-slate-800">{qty}</span> unit(s) of{" "}
                <span className="font-bold text-slate-800">{product.name}</span> against
                invoice <span className="font-mono font-semibold text-daikin-700">{invoiceNo}</span>?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="subtle" onClick={() => setConfirming(false)}>
                  Back
                </Button>
                <Button variant="danger" onClick={onCheckOut}>
                  <CheckCircle2 className="h-4 w-4" /> Confirm Checkout
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">Quantity</span>
                <QtyStepper qty={qty} setQty={setQty} max={op === "out" ? maxOut : 0} />
              </div>

              {op === "out" && (
                <div className="mt-4">
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                    <ReceiptText className="h-4 w-4 text-slate-400" /> Invoice Number
                  </label>
                  <input
                    className={`${inputCls} font-mono`}
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="INV-2026-…"
                  />
                </div>
              )}

              <div className="mt-5">
                {op === "in" ? (
                  <Button size="lg" className="w-full" onClick={onCheckIn}>
                    <ArrowDownLeft className="h-4 w-4" /> Confirm Check-In
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="danger"
                    className="w-full"
                    disabled={outOfStock}
                    onClick={() => setConfirming(true)}
                  >
                    <ArrowUpRight className="h-4 w-4" /> Proceed to Checkout
                  </Button>
                )}
              </div>
              {op === "out" && outOfStock && (
                <p className="mt-2 text-center text-xs font-medium text-red-500">
                  This product is out of stock and cannot be checked out.
                </p>
              )}
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-daikin-50 text-daikin-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-slate-700">{value}</div>
      </div>
    </div>
  );
}
