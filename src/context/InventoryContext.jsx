/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useCallback } from "react";
import { PRODUCTS, TRANSACTIONS } from "../data/seed";
import { usePersistentState } from "../hooks/usePersistentState";
import { useAdmin } from "./AdminContext";

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  // Branches & categories are owned (and editable) by the Admin module.
  const { branches, categories } = useAdmin();
  const [products, setProducts] = usePersistentState(
    "daikin.inventory.products.v3",
    PRODUCTS
  );
  const [transactions, setTransactions] = usePersistentState(
    "daikin.inventory.transactions.v3",
    TRANSACTIONS
  );

  const findByBarcode = useCallback(
    (code) =>
      products.find((p) => p.barcode === String(code).trim()) || null,
    [products]
  );

  const getProduct = useCallback(
    (id) => products.find((p) => p.id === id) || null,
    [products]
  );

  // Record a check-in / check-out movement and adjust stock.
  // An explicit invoiceNo (e.g. entered during check-out) is used when given,
  // otherwise the next sequential invoice number is generated.
  const recordMovement = useCallback(
    ({ productId, type, quantity, actor, branchName, invoiceNo: invoiceArg }) => {
      const qty = Math.max(1, Number(quantity) || 1);
      let invoiceNo = "";
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const next =
            type === "in"
              ? p.stock + qty
              : Math.max(0, p.stock - qty);
          return { ...p, stock: next, updatedAt: new Date().toISOString() };
        })
      );
      setTransactions((prev) => {
        const product = products.find((p) => p.id === productId);
        const branch = branches.find((b) => b.id === product?.branchId);
        const seq = 4900 + prev.length + 1;
        invoiceNo = (invoiceArg && String(invoiceArg).trim()) || `INV-2026-${seq}`;
        const txn = {
          id: `txn-${Date.now()}`,
          invoiceNo,
          type,
          date: new Date().toISOString(),
          branchId: product?.branchId,
          branchName: branchName || branch?.name || "—",
          productId,
          productName: product?.name,
          barcode: product?.barcode,
          category: product?.categoryName,
          quantity: qty,
          actor: actor || "—",
          status: type === "in" ? "Checked In" : "Checked Out",
        };
        return [txn, ...prev];
      });
      return invoiceNo;
    },
    [products, branches, setProducts, setTransactions]
  );

  const addProduct = useCallback((data) => {
    setProducts((prev) => {
      const base = {
        id: `p-${Date.now()}`,
        lowStockThreshold: 10,
        price: 0,
        stock: 0,
        updatedAt: new Date().toISOString(),
        ...data,
      };
      // Barcode is no longer entered manually — auto-generate one so the
      // product stays scannable.
      if (!base.barcode) {
        const tail = String(Date.now()).slice(-9);
        base.barcode = `890${tail}0`.slice(0, 13).padEnd(13, "0");
      }
      return [base, ...prev];
    });
  }, [setProducts]);

  const updateProduct = useCallback((id, data) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...data, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, [setProducts]);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, [setProducts]);

  // Aggregate stats, optionally scoped to a branch.
  const statsFor = useCallback(
    (branchId = null) => {
      const scope = branchId
        ? products.filter((p) => p.branchId === branchId)
        : products;
      const totalStock = scope.reduce((s, p) => s + p.stock, 0);
      const lowStock = scope.filter(
        (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
      ).length;
      const outOfStock = scope.filter((p) => p.stock === 0).length;
      const today = new Date().toDateString();
      const moves = transactions.filter((t) => {
        if (branchId && t.branchId !== branchId) return false;
        return new Date(t.date).toDateString() === today;
      }).length;
      return {
        totalStock,
        totalProducts: scope.length,
        lowStock,
        outOfStock,
        moves,
      };
    },
    [products, transactions]
  );

  // Category breakdown for a branch (used by the manager donut chart).
  const categoryBreakdown = useCallback(
    (branchId = null) => {
      const scope = branchId
        ? products.filter((p) => p.branchId === branchId)
        : products;
      return categories.map((c) => {
        const items = scope.filter((p) => p.category === c.id);
        const value = items.reduce((s, p) => s + p.stock, 0);
        const lowCount = items.filter(
          (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
        ).length;
        const outCount = items.filter((p) => p.stock === 0).length;
        return { ...c, value, lowCount, outCount, low: lowCount > 0 };
      }).filter((c) => c.value >= 0);
    },
    [products, categories]
  );

  // Suggested next invoice number for a check-out.
  const nextInvoiceNo = useCallback(
    () => `INV-2026-${4900 + transactions.length + 1}`,
    [transactions]
  );

  const value = useMemo(
    () => ({
      products,
      transactions,
      branches,
      categories,
      findByBarcode,
      getProduct,
      recordMovement,
      addProduct,
      updateProduct,
      deleteProduct,
      statsFor,
      categoryBreakdown,
      nextInvoiceNo,
    }),
    [
      products,
      transactions,
      branches,
      categories,
      findByBarcode,
      getProduct,
      recordMovement,
      addProduct,
      updateProduct,
      deleteProduct,
      statsFor,
      categoryBreakdown,
      nextInvoiceNo,
    ]
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
