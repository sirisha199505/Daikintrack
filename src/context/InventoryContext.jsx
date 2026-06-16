/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, useCallback } from "react";
import {
  PRODUCTS,
  TRANSACTIONS,
  BRANCHES,
  CATEGORIES,
} from "../data/seed";

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const [products, setProducts] = useState(() =>
    PRODUCTS.map((p) => ({ ...p }))
  );
  const [transactions, setTransactions] = useState(() =>
    TRANSACTIONS.map((t) => ({ ...t }))
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
  const recordMovement = useCallback(
    ({ productId, type, quantity, actor, branchName }) => {
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
        const branch = BRANCHES.find((b) => b.id === product?.branchId);
        const seq = 4900 + prev.length + 1;
        invoiceNo = `INV-2026-${seq}`;
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
    [products]
  );

  const addProduct = useCallback((data) => {
    setProducts((prev) => [
      {
        id: `p-${Date.now()}`,
        lowStockThreshold: 10,
        updatedAt: new Date().toISOString(),
        ...data,
      },
      ...prev,
    ]);
  }, []);

  const updateProduct = useCallback((id, data) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...data, updatedAt: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const deleteProduct = useCallback((id) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

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
      return CATEGORIES.map((c) => {
        const items = scope.filter((p) => p.category === c.id);
        const value = items.reduce((s, p) => s + p.stock, 0);
        const low = items.some(
          (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
        );
        return { ...c, value, low };
      }).filter((c) => c.value >= 0);
    },
    [products]
  );

  const value = useMemo(
    () => ({
      products,
      transactions,
      branches: BRANCHES,
      categories: CATEGORIES,
      findByBarcode,
      getProduct,
      recordMovement,
      addProduct,
      updateProduct,
      deleteProduct,
      statsFor,
      categoryBreakdown,
    }),
    [
      products,
      transactions,
      findByBarcode,
      getProduct,
      recordMovement,
      addProduct,
      updateProduct,
      deleteProduct,
      statsFor,
      categoryBreakdown,
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
