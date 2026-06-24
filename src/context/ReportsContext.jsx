/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo } from "react";
import { Api, mapLedgerFromApi, mapSerialFromApi } from "../lib/api";

const ReportsContext = createContext(null);

// Thin, read-only passthroughs for reports / search / history. Nothing is
// cached as state — callers fetch on demand with their own filters.
export function ReportsProvider({ children }) {
  const ledger = useCallback(async (params = {}) => {
    const rows = await Api.listLedger(params);
    return rows.map(mapLedgerFromApi);
  }, []);

  const stockLedger = useCallback((params) => Api.report("stock-ledger", params), []);
  const purchaseRegister = useCallback((params) => Api.report("purchase-register", params), []);
  const salesRegister = useCallback((params) => Api.report("sales-register", params), []);
  const outstandingStock = useCallback((params) => Api.report("outstanding-stock", params), []);
  const traceability = useCallback((params) => Api.report("traceability", params), []);

  const search = useCallback(async (q, type) => {
    const res = await Api.searchInventory({ q, type });
    return {
      units: (res.units || []).map(mapSerialFromApi),
      purchaseInvoices: res.purchase_invoices || [],
      salesInvoices: res.sales_invoices || [],
      suppliers: res.suppliers || [],
      customers: res.customers || [],
      products: res.products || [],
    };
  }, []);

  const productHistory = useCallback(async ({ serialNo, productId } = {}) => {
    const res = await Api.productHistory({ serialNo, productId });
    return {
      unit: res.unit ? mapSerialFromApi(res.unit) : null,
      units: (res.units || []).map(mapSerialFromApi),
      trail: (res.trail || []).map(mapLedgerFromApi),
    };
  }, []);

  const value = useMemo(
    () => ({ ledger, stockLedger, purchaseRegister, salesRegister, outstandingStock, traceability, search, productHistory }),
    [ledger, stockLedger, purchaseRegister, salesRegister, outstandingStock, traceability, search, productHistory]
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within ReportsProvider");
  return ctx;
}
