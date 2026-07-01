import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageX } from "lucide-react";
import Modal from "../ui/Modal";
import Scanner from "./Scanner";
import ProductResult from "./ProductResult";
import { EmptyState, Button } from "../ui/Primitives";
import { useInventory } from "../../context/InventoryContext";
import { useToast } from "../ui/Toast";

// Self-contained scan → product → movement flow inside a modal.
export default function ScanFlowModal({ open, onClose }) {
  const { findByBarcode } = useInventory();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState("");

  function reset() {
    setProduct(null);
    setNotFound("");
  }
  function close() {
    reset();
    onClose?.();
  }

  function onResult(code) {
    const found = findByBarcode(code);
    if (found) {
      setProduct(found);
      setNotFound("");
    } else {
      setNotFound(code);
    }
  }

  return (
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
            title="No product found"
            subtitle={`We couldn't match barcode "${notFound}" to any product in this catalog.`}
            action={
              <Button variant="outline" onClick={reset}>
                Try again
              </Button>
            }
          />
        ) : (
          <Scanner onResult={onResult} />
        )}
      </div>
    </Modal>
  );
}
