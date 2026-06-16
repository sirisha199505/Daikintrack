import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package,
  Building2,
  MapPin,
  Layers,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Minus,
  Plus,
  Barcode,
} from "lucide-react";
import { Card, Button, Badge } from "../ui/Primitives";
import { useInventory } from "../../context/InventoryContext";
import { useAuth } from "../../context/AuthContext";
import { fmtDateTime, num } from "../../utils/format";

// Shows scanned product + branch info and Check In / Check Out / History actions.
export default function ProductResult({ product, onDone, onViewHistory }) {
  const { branches, recordMovement } = useInventory();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const branch = branches.find((b) => b.id === product.branchId);

  const lowState =
    product.stock === 0
      ? { tone: "red", label: "Out of Stock" }
      : product.stock <= product.lowStockThreshold
      ? { tone: "amber", label: "Low Stock" }
      : { tone: "green", label: "In Stock" };

  function move(type) {
    const invoiceNo = recordMovement({
      productId: product.id,
      type,
      quantity: qty,
      actor: user.name,
      branchName: branch?.name,
    });
    onDone?.(type, qty, invoiceNo);
  }

  const fields = [
    { icon: Building2, label: "Branch", value: branch?.name || "—" },
    { icon: MapPin, label: "Location", value: branch?.location || "—" },
    { icon: Layers, label: "Category", value: product.categoryName },
    {
      icon: Clock,
      label: "Last Updated",
      value: fmtDateTime(product.updatedAt),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-daikin-gradient p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight">
                  {product.name}
                </h3>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
                  <Barcode className="h-4 w-4" />
                  <span className="font-mono">{product.barcode}</span>
                </div>
              </div>
            </div>
            <Badge tone={lowState.tone}>{lowState.label}</Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-daikin-50 text-daikin-600">
                  <f.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {f.label}
                  </div>
                  <div className="truncate text-sm font-semibold text-slate-700">
                    {f.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Available stock */}
          <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-500">
              Available Stock
            </span>
            <span className="text-2xl font-bold text-slate-800">
              {num(product.stock)}
            </span>
          </div>

          {/* Quantity */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">
              Quantity
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-14 rounded-lg border border-slate-200 py-1.5 text-center text-sm font-bold outline-none focus:border-daikin-400"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button size="lg" onClick={() => move("in")} className="w-full">
              <ArrowDownLeft className="h-4 w-4" /> Check In
            </Button>
            <Button
              size="lg"
              variant="danger"
              onClick={() => move("out")}
              disabled={product.stock === 0}
              className="w-full"
            >
              <ArrowUpRight className="h-4 w-4" /> Check Out
            </Button>
          </div>
          {onViewHistory && (
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => onViewHistory(product)}
            >
              <History className="h-4 w-4" /> View History
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
