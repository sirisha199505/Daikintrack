/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useAdmin } from "./AdminContext";
import { useAuth } from "./AuthContext";
import { Api } from "../lib/api";

const InventoryContext = createContext(null);

export function InventoryProvider({ children }) {
  const { user } = useAuth();
  // Branches & categories are owned (and editable) by the Admin module. We use
  // them to translate between the frontend's slug keys and the backend's ids.
  const { branches, categories } = useAdmin();

  // Raw API rows are kept as-is and mapped lazily, so a product/transaction list
  // that loads before branches/categories still resolves once those arrive.
  const [rawProducts, setRawProducts] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(null);

  // ---- slug <-> backend id helpers (authoritative: the loaded admin lists) ----
  const branchSlug = useCallback(
    (apiId) => branches.find((b) => b.apiId === apiId)?.id ?? null,
    [branches]
  );
  const branchApiId = useCallback(
    (slug) => branches.find((b) => b.id === slug)?.apiId ?? null,
    [branches]
  );
  const catSlug = useCallback(
    (apiId) => categories.find((c) => c.apiId === apiId)?.id ?? null,
    [categories]
  );
  const catApiId = useCallback(
    (slug) => categories.find((c) => c.id === slug)?.apiId ?? null,
    [categories]
  );

  const mapProductFromApi = useCallback(
    (p) => {
      if (!p) return null;
      return {
        id: p.id, // backend integer id (used for update/delete and as React key)
        name: p.name,
        branchId: branchSlug(p.branch_id),
        branchName: p.branch_name,
        category: catSlug(p.category_id),
        categoryName: p.category_name,
        stock: p.stock ?? 0,
        lowStockThreshold: p.low_stock_threshold ?? 10,
        price: p.price ?? 0, // whole rupees
        barcode: p.barcode,
        updatedAt: p.updated_at,
      };
    },
    [branchSlug, catSlug]
  );

  const mapProductToApi = useCallback(
    (form) => {
      const payload = {
        name: (form.name || "").trim(),
        branch_id: form.branchId ? branchApiId(form.branchId) : null,
        category_id: form.category ? catApiId(form.category) : null,
        stock: Number(form.stock) || 0,
        low_stock_threshold:
          form.lowStockThreshold != null ? Number(form.lowStockThreshold) : 10,
        price: Number(form.price) || 0,
      };
      if (form.barcode) payload.barcode = String(form.barcode).trim();
      return payload;
    },
    [branchApiId, catApiId]
  );

  const mapTxnFromApi = useCallback(
    (t) => {
      if (!t) return null;
      return {
        id: t.id,
        invoiceNo: t.invoice_no,
        type: t.txn_type,
        date: t.occurred_at || t.created_at,
        branchId: branchSlug(t.branch_id),
        branchName: t.branch_name,
        productId: t.product_id,
        productName: t.product_name,
        barcode: t.barcode,
        category: t.category,
        quantity: t.quantity,
        actor: t.actor,
        status: t.status,
      };
    },
    [branchSlug]
  );

  // Derived (mapped) views — re-map whenever branches/categories change so slugs
  // resolve correctly even if the admin lists arrived after the inventory lists.
  const products = useMemo(
    () => rawProducts.map(mapProductFromApi),
    [rawProducts, mapProductFromApi]
  );
  const transactions = useMemo(
    () => rawTransactions.map(mapTxnFromApi),
    [rawTransactions, mapTxnFromApi]
  );

  // ---- Loaders -------------------------------------------------------------
  const refreshProducts = useCallback(async () => {
    if (!user) {
      setRawProducts([]);
      return;
    }
    setProductsLoading(true);
    setProductsError(null);
    try {
      setRawProducts(await Api.listProducts());
    } catch (e) {
      console.error("Failed to load products:", e);
      setProductsError(e.message || "Failed to load products.");
    } finally {
      setProductsLoading(false);
    }
  }, [user]);

  const refreshTransactions = useCallback(async () => {
    if (!user) {
      setRawTransactions([]);
      return;
    }
    try {
      setRawTransactions(await Api.listTransactions());
    } catch (e) {
      console.error("Failed to load transactions:", e);
    }
  }, [user]);

  useEffect(() => {
    refreshProducts();
    refreshTransactions();
  }, [refreshProducts, refreshTransactions]);

  // ---- Reads (over loaded state) ------------------------------------------
  const findByBarcode = useCallback(
    (code) => products.find((p) => p.barcode === String(code).trim()) || null,
    [products]
  );

  const getProduct = useCallback(
    (id) => products.find((p) => p.id === id) || null,
    [products]
  );

  // ---- Mutations (server-backed) ------------------------------------------
  // Record a check-in / check-out. The backend adjusts the product's stock
  // atomically, so we refresh products afterwards and prepend the new movement.
  const recordMovement = useCallback(
    async ({ productId, type, quantity, actor, branchName, invoiceNo }) => {
      const created = await Api.createTransaction({
        product_id: productId,
        type,
        quantity: Math.max(1, Number(quantity) || 1),
        invoice_no: invoiceNo || undefined,
        actor: actor || undefined,
        branch_name: branchName || undefined,
      });
      setRawTransactions((prev) => [created, ...prev]);
      await refreshProducts(); // stock changed server-side
      return created.invoice_no;
    },
    [refreshProducts]
  );

  const addProduct = useCallback(
    async (data) => {
      const created = await Api.createProduct(mapProductToApi(data));
      setRawProducts((prev) => [created, ...prev]);
    },
    [mapProductToApi]
  );

  const updateProduct = useCallback(
    async (id, data) => {
      const updated = await Api.updateProduct(id, mapProductToApi(data));
      setRawProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    },
    [mapProductToApi]
  );

  const deleteProduct = useCallback(async (id) => {
    await Api.deleteProduct(id);
    setRawProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ---- Aggregates ----------------------------------------------------------
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
      return categories
        .map((c) => {
          const items = scope.filter((p) => p.category === c.id);
          const value = items.reduce((s, p) => s + p.stock, 0);
          const lowItems = items.filter(
            (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
          );
          const lowCount = lowItems.length;
          // Units (stock quantity) tied up in low-stock products for this category.
          const lowValue = lowItems.reduce((s, p) => s + p.stock, 0);
          const outCount = items.filter((p) => p.stock === 0).length;
          return { ...c, value, lowCount, lowValue, outCount, low: lowCount > 0 };
        })
        .filter((c) => c.value >= 0);
    },
    [products, categories]
  );

  // Suggested next invoice number for a check-out (the backend assigns the real
  // one when none is supplied; this is just a friendly default in the form).
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
      productsLoading,
      productsError,
      refreshProducts,
      refreshTransactions,
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
      productsLoading,
      productsError,
      refreshProducts,
      refreshTransactions,
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
