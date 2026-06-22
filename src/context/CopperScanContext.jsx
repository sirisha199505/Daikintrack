/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  Api,
  mapCopperScanFromApi,
  mapCopperScanToApi,
} from "../lib/api";

const CopperScanContext = createContext(null);

export function CopperScanProvider({ children }) {
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load the list for the given filters ({ branchId, search, from, to, gaugeSystem }).
  const refresh = useCallback(
    async (params = {}) => {
      if (!user) {
        setScans([]);
        return [];
      }
      setLoading(true);
      setError(null);
      try {
        const rows = (await Api.listCopperScans(params)).map(mapCopperScanFromApi);
        setScans(rows);
        return rows;
      } catch (e) {
        console.error("Failed to load copper scans:", e);
        setError(e.message || "Failed to load copper scans.");
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  // Persist a new scan; prepend it so any open list reflects it immediately.
  const createScan = useCallback(async (form) => {
    const created = await Api.createCopperScan(mapCopperScanToApi(form));
    const mapped = mapCopperScanFromApi(created);
    setScans((prev) => [mapped, ...prev]);
    return mapped;
  }, []);

  const removeScan = useCallback(async (id) => {
    await Api.deleteCopperScan(id);
    setScans((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Fetch a single scan including its full base64 image (list rows omit it).
  const getScan = useCallback(async (id) => {
    const full = await Api.getCopperScan(id);
    return mapCopperScanFromApi(full);
  }, []);

  // Never reject — return an empty summary if the endpoint is missing/erroring
  // (e.g. backend not yet redeployed), so the dashboard shows an empty state
  // instead of an uncaught promise rejection.
  const loadSummary = useCallback(async (params = {}) => {
    try {
      return await Api.copperSummary(params);
    } catch (e) {
      console.error("Copper summary unavailable:", e.message);
      return {};
    }
  }, []);

  const value = useMemo(
    () => ({ scans, loading, error, refresh, createScan, removeScan, getScan, loadSummary }),
    [scans, loading, error, refresh, createScan, removeScan, getScan, loadSummary]
  );

  return (
    <CopperScanContext.Provider value={value}>{children}</CopperScanContext.Provider>
  );
}

export function useCopperScans() {
  const ctx = useContext(CopperScanContext);
  if (!ctx) throw new Error("useCopperScans must be used within CopperScanProvider");
  return ctx;
}
