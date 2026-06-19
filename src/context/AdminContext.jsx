/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  Api,
  ensureBranchMap,
  mapUserFromApi,
  mapUserToApi,
  mapBranchFromApi,
  mapBranchToApi,
  mapCategoryFromApi,
  mapCategoryToApi,
} from "../lib/api";

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
  const [usersError, setUsersError] = useState(null);

  // ---- Branches: backed by the API (synced across all devices) ----
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState(null);

  // ---- Categories: backed by the API (synced across all devices) ----
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);

  const refreshUsers = useCallback(async () => {
    if (!user || user.role !== "admin") {
      setUsers([]);
      return;
    }
    setUsersLoading(true);
    setUsersError(null);
    try {
      await ensureBranchMap();
      const list = await Api.listUsers();
      setUsers(list.map(mapUserFromApi));
    } catch (e) {
      console.error("Failed to load users:", e);
      setUsersError(e.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  // Branches are readable by any authenticated user (the catalog needs them);
  // only admins can mutate them.
  const refreshBranches = useCallback(async () => {
    if (!user) {
      setBranches([]);
      return;
    }
    setBranchesLoading(true);
    setBranchesError(null);
    try {
      const list = await Api.listBranches();
      await ensureBranchMap(true);
      setBranches(list.map(mapBranchFromApi));
    } catch (e) {
      console.error("Failed to load branches:", e);
      setBranchesError(e.message || "Failed to load branches.");
    } finally {
      setBranchesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  // Categories are readable by any authenticated user; only admins can mutate.
  const refreshCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      return;
    }
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const list = await Api.listCategories();
      setCategories(list.map(mapCategoryFromApi));
    } catch (e) {
      console.error("Failed to load categories:", e);
      setCategoriesError(e.message || "Failed to load categories.");
    } finally {
      setCategoriesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  // Resolve a branch slug to its backend integer id (and back) straight from the
  // loaded branch list — the authoritative source — so a stale branch-id cache
  // can never silently drop a user's branch assignment.
  const branchApiIdBySlug = useCallback(
    (slug) => branches.find((b) => b.id === slug)?.apiId ?? null,
    [branches]
  );

  // After a write, the API returns branch_id as an integer. mapUserFromApi turns
  // it into a slug via the cache; if that misses, fall back to the branch list.
  const reconcileUserBranch = useCallback(
    (u) => {
      if (!u || u.branchId == null) return u;
      if (branches.some((b) => b.id === u.branchId)) return u; // already a known slug
      const slug = branches.find((b) => b.apiId === u.branchId)?.id;
      return slug ? { ...u, branchId: slug } : u;
    },
    [branches]
  );

  const addUser = useCallback(async (data) => {
    const payload = mapUserToApi(data);
    payload.branch_id =
      data.role === "admin" || !data.branchId ? null : branchApiIdBySlug(data.branchId);
    const created = await Api.createUser(payload);
    setUsers((prev) => [reconcileUserBranch(mapUserFromApi(created)), ...prev]);
  }, [branchApiIdBySlug, reconcileUserBranch]);

  const updateUser = useCallback(async (id, data) => {
    const payload = mapUserToApi(data);
    payload.branch_id =
      data.role === "admin" || !data.branchId ? null : branchApiIdBySlug(data.branchId);
    const updated = await Api.updateUser(id, payload);
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? reconcileUserBranch(mapUserFromApi(updated)) : u))
    );
  }, [branchApiIdBySlug, reconcileUserBranch]);

  const deleteUser = useCallback(async (id) => {
    await Api.deleteUser(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const setUserStatus = useCallback(async (id, status) => {
    const updated = await Api.updateUser(id, { status, active: status !== "Inactive" });
    setUsers((prev) => prev.map((u) => (u.id === id ? mapUserFromApi(updated) : u)));
  }, []);

  // ---- Branches (server-backed) ----
  const addBranch = useCallback(async (data) => {
    const slug = slugify(data.name) || `b-${Date.now()}`;
    const palette = BRANCH_PALETTE[branches.length % BRANCH_PALETTE.length];
    const created = await Api.createBranch(
      mapBranchToApi({ color: palette.color, gradient: palette.gradient, ...data, slug })
    );
    setBranches((prev) => [...prev, mapBranchFromApi(created)]);
    await ensureBranchMap(true);
  }, [branches.length]);

  const updateBranch = useCallback(async (id, data) => {
    const target = branches.find((b) => b.id === id);
    if (!target) return;
    const updated = await Api.updateBranch(target.apiId, mapBranchToApi({ ...target, ...data }));
    setBranches((prev) => prev.map((b) => (b.id === id ? mapBranchFromApi(updated) : b)));
    await ensureBranchMap(true);
  }, [branches]);

  const deleteBranch = useCallback(async (id) => {
    const target = branches.find((b) => b.id === id);
    if (!target) return;
    await Api.deleteBranch(target.apiId);
    setBranches((prev) => prev.filter((b) => b.id !== id));
    await ensureBranchMap(true);
  }, [branches]);

  // ---- Categories (server-backed) ----
  const addCategory = useCallback(async (data) => {
    const slug = slugify(data.name) || `c-${Date.now()}`;
    const color = data.color || CATEGORY_PALETTE[categories.length % CATEGORY_PALETTE.length];
    const created = await Api.createCategory(mapCategoryToApi({ ...data, color, slug }));
    setCategories((prev) => [...prev, mapCategoryFromApi(created)]);
  }, [categories.length]);

  const updateCategory = useCallback(async (id, data) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    const updated = await Api.updateCategory(target.apiId, mapCategoryToApi({ ...target, ...data }));
    setCategories((prev) => prev.map((c) => (c.id === id ? mapCategoryFromApi(updated) : c)));
  }, [categories]);

  const deleteCategory = useCallback(async (id) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    await Api.deleteCategory(target.apiId);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, [categories]);

  const value = useMemo(
    () => ({
      users,
      usersLoading,
      usersError,
      refreshUsers,
      branches,
      branchesLoading,
      branchesError,
      refreshBranches,
      categories,
      categoriesLoading,
      categoriesError,
      refreshCategories,
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
      usersError,
      refreshUsers,
      branches,
      branchesLoading,
      branchesError,
      refreshBranches,
      categories,
      categoriesLoading,
      categoriesError,
      refreshCategories,
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
