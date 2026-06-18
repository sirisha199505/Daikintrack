/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { BRANCHES, CATEGORIES } from "../data/seed";
import { useAuth } from "./AuthContext";
import { Api, ensureBranchMap, mapUserFromApi, mapUserToApi } from "../lib/api";

const AdminContext = createContext(null);

// Default gradients cycled through when an admin creates a brand-new branch.
const BRANCH_PALETTE = [
  { color: "#0098d8", gradient: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #06b6d4 100%)" },
  { color: "#8b5cf6", gradient: "linear-gradient(135deg, #312e81 0%, #7c3aed 50%, #d946ef 100%)" },
  { color: "#16a34a", gradient: "linear-gradient(135deg, #065f46 0%, #0d9488 50%, #0ea5e9 100%)" },
  { color: "#f59e0b", gradient: "linear-gradient(135deg, #9f1239 0%, #ea580c 50%, #f59e0b 100%)" },
];
const CATEGORY_PALETTE = [
  "#22b8e6", "#16a34a", "#f59e0b", "#ef4444",
  "#8b5cf6", "#14b8a6", "#6366f1", "#f97316",
];

function slugify(name = "") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export const ROLE_OPTIONS = [
  { id: "admin", label: "Admin" },
  { id: "store_manager", label: "Store Manager" },
  { id: "distributor", label: "Distributor" },
];

export function AdminProvider({ children }) {
  const { user } = useAuth();

  // ---- Users: backed by the API (synced across all devices) ----
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ---- Branches & categories: still local (seed) for now ----
  const [branches, setBranches] = usePersistentState("daikin.admin.branches", BRANCHES);
  const [categories, setCategories] = usePersistentState("daikin.admin.categories", CATEGORIES);

  const refreshUsers = useCallback(async () => {
    if (!user || user.role !== "admin") {
      setUsers([]);
      return;
    }
    setUsersLoading(true);
    try {
      await ensureBranchMap();
      const list = await Api.listUsers();
      setUsers(list.map(mapUserFromApi));
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setUsersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const addUser = useCallback(async (data) => {
    const created = await Api.createUser(mapUserToApi(data));
    setUsers((prev) => [mapUserFromApi(created), ...prev]);
  }, []);

  const updateUser = useCallback(async (id, data) => {
    const updated = await Api.updateUser(id, mapUserToApi(data));
    setUsers((prev) => prev.map((u) => (u.id === id ? mapUserFromApi(updated) : u)));
  }, []);

  const deleteUser = useCallback(async (id) => {
    await Api.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const setUserStatus = useCallback(async (id, status) => {
    const updated = await Api.updateUser(id, { status, active: status !== "Inactive" });
    setUsers((prev) => prev.map((u) => (u.id === id ? mapUserFromApi(updated) : u)));
  }, []);

  // ---- Branches (local only — backend wiring is a later step) ----
  const addBranch = useCallback((data) => {
    setBranches((prev) => {
      const palette = BRANCH_PALETTE[prev.length % BRANCH_PALETTE.length];
      return [
        ...prev,
        { id: slugify(data.name) || `b-${Date.now()}`, status: "Active", ...palette, ...data },
      ];
    });
  }, [setBranches]);

  const updateBranch = useCallback((id, data) => {
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
  }, [setBranches]);

  const deleteBranch = useCallback(
    (id) => setBranches((prev) => prev.filter((b) => b.id !== id)),
    [setBranches]
  );

  // ---- Categories (local only — backend wiring is a later step) ----
  const addCategory = useCallback((data) => {
    setCategories((prev) => [
      ...prev,
      { id: slugify(data.name) || `c-${Date.now()}`, color: CATEGORY_PALETTE[prev.length % CATEGORY_PALETTE.length], ...data },
    ]);
  }, [setCategories]);

  const updateCategory = useCallback((id, data) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, [setCategories]);

  const deleteCategory = useCallback(
    (id) => setCategories((prev) => prev.filter((c) => c.id !== id)),
    [setCategories]
  );

  const value = useMemo(
    () => ({
      users,
      usersLoading,
      refreshUsers,
      branches,
      categories,
      addUser,
      updateUser,
      deleteUser,
      setUserStatus,
      addBranch,
      updateBranch,
      deleteBranch,
      addCategory,
      updateCategory,
      deleteCategory,
    }),
    [
      users,
      usersLoading,
      refreshUsers,
      branches,
      categories,
      addUser,
      updateUser,
      deleteUser,
      setUserStatus,
      addBranch,
      updateBranch,
      deleteBranch,
      addCategory,
      updateCategory,
      deleteCategory,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
