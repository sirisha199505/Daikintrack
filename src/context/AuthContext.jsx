/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { USERS, BRANCHES } from "../data/seed";

const AuthContext = createContext(null);
const STORAGE_KEY = "daikin.auth.user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  // role: 'admin' | 'manager'. Demo auth — matches against seed users.
  function login({ role, username, password }) {
    const candidate = USERS.find(
      (u) => u.role === role && (u.username === username || username === "")
    );
    // Lenient demo auth: any non-empty password works for the matched role.
    if (!candidate) {
      return { ok: false, error: "No account found for this role." };
    }
    if (!password) {
      return { ok: false, error: "Please enter your password." };
    }
    const branch = candidate.branchId
      ? BRANCHES.find((b) => b.id === candidate.branchId)
      : null;
    setUser({ ...candidate, branch });
    return { ok: true, user: candidate };
  }

  function logout() {
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
