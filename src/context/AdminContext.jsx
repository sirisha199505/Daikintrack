/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { USERS, BRANCHES, CATEGORIES } from "../data/seed";

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

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

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
  const [users, setUsers] = usePersistentState("daikin.admin.users", USERS);
  const [branches, setBranches] = usePersistentState(
    "daikin.admin.branches",
    BRANCHES
  );
  const [categories, setCategories] = usePersistentState(
    "daikin.admin.categories",
    CATEGORIES
  );

  // ---- Users ----
  const addUser = useCallback((data) => {
    setUsers((prev) => [
      {
        id: `u-${Date.now()}`,
        status: "Active",
        branchId: null,
        ...data,
        title:
          ROLE_OPTIONS.find((r) => r.id === data.role)?.label || "User",
        initials: initials(data.name),
      },
      ...prev,
    ]);
  }, [setUsers]);

  const updateUser = useCallback((id, data) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              ...data,
              title:
                ROLE_OPTIONS.find((r) => r.id === (data.role || u.role))
                  ?.label || u.title,
              initials: initials(data.name ?? u.name),
            }
          : u
      )
    );
  }, [setUsers]);

  const deleteUser = useCallback(
    (id) => setUsers((prev) => prev.filter((u) => u.id !== id)),
    [setUsers]
  );

  const setUserStatus = useCallback(
    (id, status) =>
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status } : u))
      ),
    [setUsers]
  );

  // ---- Branches ----
  const addBranch = useCallback((data) => {
    setBranches((prev) => {
      const palette = BRANCH_PALETTE[prev.length % BRANCH_PALETTE.length];
      return [
        ...prev,
        {
          id: slugify(data.name) || `b-${Date.now()}`,
          status: "Active",
          ...palette,
          ...data,
        },
      ];
    });
  }, [setBranches]);

  const updateBranch = useCallback((id, data) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...data } : b))
    );
  }, [setBranches]);

  const deleteBranch = useCallback(
    (id) => setBranches((prev) => prev.filter((b) => b.id !== id)),
    [setBranches]
  );

  // ---- Categories ----
  const addCategory = useCallback((data) => {
    setCategories((prev) => [
      ...prev,
      {
        id: slugify(data.name) || `c-${Date.now()}`,
        color: CATEGORY_PALETTE[prev.length % CATEGORY_PALETTE.length],
        ...data,
      },
    ]);
  }, [setCategories]);

  const updateCategory = useCallback((id, data) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    );
  }, [setCategories]);

  const deleteCategory = useCallback(
    (id) => setCategories((prev) => prev.filter((c) => c.id !== id)),
    [setCategories]
  );

  const value = useMemo(
    () => ({
      users,
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

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
