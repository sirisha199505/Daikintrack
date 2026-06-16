import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PackageX, ScanLine, RotateCcw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useInventory } from "../../context/InventoryContext";
import Scanner from "../../components/scan/Scanner";
import ProductResult from "../../components/scan/ProductResult";
import { Card, EmptyState, Button } from "../../components/ui/Primitives";
import { useToast } from "../../components/ui/Toast";

export default function ScanInOut() {
  const { user } = useAuth();
  const { findByBarcode } = useInventory();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState("");
  const [receipt, setReceipt] = useState(null);

  function onResult(code) {
    setReceipt(null);
    const found = findByBarcode(code);
    if (found) {
      setProduct(found);
      setNotFound("");
    } else {
      setNotFound(code);
      setProduct(null);
    }
  }

  function reset() {
    setProduct(null);
    setNotFound("");
    setReceipt(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Scan In / Out</h1>
        <p className="text-sm text-slate-500">
          Scan a QR code, scan a barcode, or enter it manually to move stock.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scanner panel */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <ScanLine className="h-5 w-5 text-daikin-600" />
            <h2 className="text-base font-bold">Scanner</h2>
          </div>
          <Scanner onResult={onResult} branchId={user.branchId} />
        </Card>

        {/* Result panel */}
        <div>
          {receipt ? (
            <Card className="p-8">
              <EmptyState
                icon={RotateCcw}
                title={`${
                  receipt.type === "in" ? "Checked In" : "Checked Out"
                } successfully`}
                subtitle={`${receipt.qty} unit(s) · Invoice ${receipt.invoiceNo}`}
                action={
                  <Button onClick={reset}>
                    <ScanLine className="h-4 w-4" /> Scan another
                  </Button>
                }
              />
            </Card>
          ) : product ? (
            <ProductResult
              product={product}
              onDone={(type, qty, invoiceNo) => {
                toast(
                  `${type === "in" ? "Checked in" : "Checked out"} ${qty} × ${
                    product.name
                  }`,
                  "success"
                );
                setReceipt({ type, qty, invoiceNo });
                setProduct(null);
              }}
              onViewHistory={(p) =>
                navigate(`/app/recent?barcode=${p.barcode}`)
              }
            />
          ) : notFound ? (
            <Card>
              <EmptyState
                icon={PackageX}
                title="No product found"
                subtitle={`Barcode "${notFound}" did not match any product.`}
                action={
                  <Button variant="outline" onClick={reset}>
                    Try again
                  </Button>
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
                  Product details and check-in / check-out actions will appear
                  here once a barcode is recognised.
                </p>
              </motion.div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
