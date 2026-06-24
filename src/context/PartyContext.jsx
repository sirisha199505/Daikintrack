/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  Api,
  mapSupplierFromApi,
  mapCustomerFromApi,
  mapPartyToApi,
} from "../lib/api";

const PartyContext = createContext(null);

// Suppliers + Customers master data. Both are org-wide (not branch-scoped) so a
// store manager can transact with any party.
export function PartyProvider({ children }) {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshSuppliers = useCallback(
    async (params = {}) => {
      if (!user) return setSuppliers([]);
      const rows = (await Api.listSuppliers(params)).map(mapSupplierFromApi);
      setSuppliers(rows);
      return rows;
    },
    [user]
  );

  const refreshCustomers = useCallback(
    async (params = {}) => {
      if (!user) return setCustomers([]);
      const rows = (await Api.listCustomers(params)).map(mapCustomerFromApi);
      setCustomers(rows);
      return rows;
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([refreshSuppliers(), refreshCustomers()])
      .catch((e) => console.error("Failed to load parties:", e))
      .finally(() => setLoading(false));
  }, [user, refreshSuppliers, refreshCustomers]);

  const addSupplier = useCallback(async (form) => {
    const created = mapSupplierFromApi(await Api.createSupplier(mapPartyToApi(form)));
    setSuppliers((prev) => [created, ...prev]);
    return created;
  }, []);
  const updateSupplier = useCallback(async (id, form) => {
    const updated = mapSupplierFromApi(await Api.updateSupplier(id, mapPartyToApi(form)));
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  }, []);
  const deleteSupplier = useCallback(async (id) => {
    await Api.deleteSupplier(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addCustomer = useCallback(async (form) => {
    const created = mapCustomerFromApi(await Api.createCustomer(mapPartyToApi(form)));
    setCustomers((prev) => [created, ...prev]);
    return created;
  }, []);
  const updateCustomer = useCallback(async (id, form) => {
    const updated = mapCustomerFromApi(await Api.updateCustomer(id, mapPartyToApi(form)));
    setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);
  const deleteCustomer = useCallback(async (id) => {
    await Api.deleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      suppliers, customers, loading,
      refreshSuppliers, addSupplier, updateSupplier, deleteSupplier,
      refreshCustomers, addCustomer, updateCustomer, deleteCustomer,
    }),
    [suppliers, customers, loading, refreshSuppliers, addSupplier, updateSupplier,
     deleteSupplier, refreshCustomers, addCustomer, updateCustomer, deleteCustomer]
  );

  return <PartyContext.Provider value={value}>{children}</PartyContext.Provider>;
}

export function useParties() {
  const ctx = useContext(PartyContext);
  if (!ctx) throw new Error("useParties must be used within PartyProvider");
  return ctx;
}
