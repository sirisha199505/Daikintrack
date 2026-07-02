import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageX, PackagePlus } from "lucide-react";
import Modal from "../ui/Modal";
import Scanner from "./Scanner";
import ProductResult from "./ProductResult";
import ProductFormModal from "../products/ProductFormModal";
import { EmptyState, Button } from "../ui/Primitives";
import { useInventory } from "../../context/InventoryContext";
import { useToast } from "../ui/Toast";
import { parseScan } from "../../lib/scanParser";

// Self-contained scan → product → movement flow inside a modal.
// The scanned value may be a concatenated payload (barcode + model + mfg date
// + suffix); parseScan() decomposes it, we look the product up by the extracted
// barcode, and — when nothing matches — offer to register it with the parsed
// fields pre-filled.
export default function ScanFlowModal({ open, onClose }) {
  const { findByBarcode, refreshProducts } = useInventory();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [parsed, setParsed] = useState(null); // last parsed scan (for not-found)
  const [notFound, setNotFound] = useState("");
  const [registering, setRegistering] = useState(false);

  function reset() {
    setProduct(null);
    setParsed(null);
    setNotFound("");
    setRegistering(false);
  }
  function close() {
    reset();
    onClose?.();
  }

  function onResult(code) {
    const info = parseScan(code);
    setParsed(info);
    const found = findByBarcode(info.barcode);
    if (found) {
      setProduct(found);
      setNotFound("");
    } else {
      setNotFound(info.barcode || code);
    }
  }

  // Pre-fill the registration form from the parsed scan.
  const registerPrefill = parsed
    ? {
        barcode: parsed.barcode,
        modelNumber: parsed.modelNumber,
        manufacturingDate: parsed.manufacturingDate,
        serialCode: parsed.suffix,
        // Suggest a name from the matched catalog model, if any.
        name: parsed.model
          ? `${parsed.model.model} ${parsed.model.type}`.trim()
          : "",
      }
    : null;

  return (
    <>
      <Modal open={open} onClose={close} title="Scan / Enter Barcode" size="md">
        <div className="p-5">
          {product ? (
            <ProductResult
              product={product}
              onDone={(type) => {
                toast(
                  `${type === "in" ? "Checked in" : "Checked out"} ${
                    product.name
                  }`,
                  "success"
                );
                close();
              }}
              onViewHistory={(p) => {
                close();
                navigate(`/app/recent?barcode=${p.barcode}`);
              }}
            />
          ) : notFound ? (
            <EmptyState
              icon={PackageX}
              title="Product not found. Please register the product."
              subtitle={`We couldn't match barcode "${notFound}" to any product in this catalog.`}
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => setRegistering(true)}>
                    <PackagePlus className="h-4 w-4" /> Register product
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Try again
                  </Button>
                </div>
              }
            />
          ) : (
            <Scanner onResult={onResult} />
          )}
        </div>
      </Modal>

      {/* Registration prefilled from the scan that wasn't found. */}
      <ProductFormModal
        open={registering}
        onClose={() => setRegistering(false)}
        prefill={registerPrefill}
        onSaved={() => {
          toast("Product registered", "success");
          refreshProducts();
          close();
        }}
      />
    </>
  );
}
