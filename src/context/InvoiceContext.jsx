/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useInventory } from "./InventoryContext";
import {
  Api,
  mapPurchaseFromApi,
  mapSaleFromApi,
} from "../lib/api";

const InvoiceContext = createContext(null);

// Normalize the Check-In/Out product-detail rows before posting: drop fully
// empty rows, trim strings, coerce capacity to a number when present. Returns
// undefined when there's nothing to send.
function cleanProductDetails(entries) {
  const rows = (entries || [])
    .map((e) => ({
      model: (e.model || "").trim(),
      category: (e.category || "").trim(),
      type: (e.type || "").trim(),
      capacity: e.capacity === "" || e.capacity == null ? null : Number(e.capacity),
      unit: (e.unit || "").trim(),
    }))
    .filter((e) => e.model || e.category || e.type || e.capacity != null || e.unit);
  return rows.length ? rows : undefined;
}

// Purchase + Sales invoices, returns and replacements. Posting changes stock
// server-side, so each posting refreshes the InventoryContext product list.
export function InvoiceProvider({ children }) {
  const { user } = useAuth();
  const { refreshProducts } = useInventory();
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshPurchases = useCallback(
    async (params = {}) => {
      if (!user) return setPurchases([]);
      const rows = (await Api.listPurchases(params)).map(mapPurchaseFromApi);
      setPurchases(rows);
      return rows;
    },
    [user]
  );
  const refreshSales = useCallback(
    async (params = {}) => {
      if (!user) return setSales([]);
      const rows = (await Api.listSales(params)).map(mapSaleFromApi);
      setSales(rows);
      return rows;
    },
    [user]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([refreshPurchases(), refreshSales()]);
    } catch (e) {
      console.error("Failed to load invoices:", e);
    } finally {
      setLoading(false);
    }
  }, [refreshPurchases, refreshSales]);

  const getPurchase = useCallback(async (id) => mapPurchaseFromApi(await Api.getPurchase(id)), []);
  const getSale = useCallback(async (id) => mapSaleFromApi(await Api.getSale(id)), []);

  // Edit a check-in / check-out's descriptive fields; returns the mapped invoice.
  const updatePurchase = useCallback(async (id, payload) => {
    const updated = mapPurchaseFromApi(await Api.updatePurchase(id, payload));
    setPurchases((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    return updated;
  }, []);
  const updateSale = useCallback(async (id, payload) => {
    const updated = mapSaleFromApi(await Api.updateSale(id, payload));
    setSales((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    return updated;
  }, []);

  // Void a check-in / check-out. The backend reverses stock & serials, so we
  // drop the row locally and refresh product balances.
  const deletePurchase = useCallback(async (id) => {
    await Api.deletePurchase(id);
    setPurchases((prev) => prev.filter((p) => p.id !== id));
    refreshProducts();
  }, [refreshProducts]);
  const deleteSale = useCallback(async (id) => {
    await Api.deleteSale(id);
    setSales((prev) => prev.filter((s) => s.id !== id));
    refreshProducts();
  }, [refreshProducts]);

  // body: { supplierInvoiceNo, notes, lines:[{productId, quantity, price}] }
  // Supplier is no longer captured on check-in (optional server-side).
  const createPurchase = useCallback(
    async (form) => {
      const payload = {
        supplier_id: form.supplierId || undefined,
        invoice_no: form.invoiceNo || undefined,
        supplier_invoice_no: form.supplierInvoiceNo || undefined,
        branch_id: form.branchId ?? undefined,
        notes: form.notes || undefined,
        product_details: cleanProductDetails(form.productDetails),
        items: (form.lines || []).map((l) => ({
          product_id: l.productId, quantity: l.quantity, cost_price: l.price,
        })),
      };
      const created = mapPurchaseFromApi(await Api.createPurchase(payload));
      setPurchases((prev) => [created, ...prev]);
      // Refresh stock in the background so the modal can close immediately.
      refreshProducts();
      return created;
    },
    [refreshProducts]
  );

  // body: { customerId, notes, lines:[{productId, quantity, price, serialNos?}] }
  const createSale = useCallback(
    async (form) => {
      const payload = {
        customer_id: form.customerId || undefined,
        invoice_no: form.invoiceNo || undefined,
        branch_id: form.branchId ?? undefined,
        notes: form.notes || undefined,
        product_details: cleanProductDetails(form.productDetails),
        items: (form.lines || []).map((l) => ({
          product_id: l.productId, quantity: l.quantity, sold_price: l.price,
          serial_nos: l.serialNos && l.serialNos.length ? l.serialNos : undefined,
        })),
      };
      const created = mapSaleFromApi(await Api.createSale(payload));
      setSales((prev) => [created, ...prev]);
      // Refresh stock in the background so the modal can close immediately.
      refreshProducts();
      return created;
    },
    [refreshProducts]
  );

  const createReturn = useCallback(
    async (payload) => {
      const res = await Api.createReturn(payload);
      await refreshProducts();
      return res;
    },
    [refreshProducts]
  );
  const createReplacement = useCallback(
    async (payload) => {
      const res = await Api.createReplacement(payload);
      await refreshProducts();
      return res;
    },
    [refreshProducts]
  );

  // Per-unit quarantine actions; each can change available stock.
  const inspectUnit = useCallback((id, body) => Api.unitInspect(id, body), []);
  const disposeUnit = useCallback(
    async (id, body) => {
      const res = await Api.unitDispose(id, body);
      await refreshProducts();
      return res;
    },
    [refreshProducts]
  );
  const repairCompleteUnit = useCallback(
    async (id, body) => {
      const res = await Api.unitRepairComplete(id, body);
      await refreshProducts();
      return res;
    },
    [refreshProducts]
  );

  const value = useMemo(
    () => ({
      purchases, sales, loading,
      refreshPurchases, refreshSales, refreshAll, getPurchase, getSale,
      createPurchase, createSale, updatePurchase, updateSale, deletePurchase, deleteSale,
      createReturn, createReplacement, inspectUnit, disposeUnit, repairCompleteUnit,
    }),
    [purchases, sales, loading, refreshPurchases, refreshSales, refreshAll,
     getPurchase, getSale, createPurchase, createSale, updatePurchase, updateSale,
     deletePurchase, deleteSale, createReturn,
     createReplacement, inspectUnit, disposeUnit, repairCompleteUnit]
  );

  return <InvoiceContext.Provider value={value}>{children}</InvoiceContext.Provider>;
}

export function useInvoices() {
  const ctx = useContext(InvoiceContext);
  if (!ctx) throw new Error("useInvoices must be used within InvoiceProvider");
  return ctx;
}
