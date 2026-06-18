/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { useAdmin } from "./AdminContext";

const AuthContext = createContext(null);
const STORAGE_KEY = "daikin.auth.user.v2";

export function AuthProvider({ children }) {
  const { users, branches } = useAdmin();
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

  // Credential-based auth — matches username + password against seed users.
  // The matched user's role decides which pages they land on after login.
  function login({ username, password }) {
    if (!username) {
      return { ok: false, error: "Please enter your username." };
    }
    if (!password) {
      return { ok: false, error: "Please enter your password." };
    }
    const normalized = username.trim().toLowerCase();
    const candidate = users.find(
      (u) => u.username?.trim().toLowerCase() === normalized
    );
    if (!candidate || candidate.password !== password) {
      return { ok: false, error: "Invalid username or password." };
    }
    if (candidate.status === "Inactive") {
      return { ok: false, error: "This account is disabled. Contact an admin." };
    }
    const branch = candidate.branchId
      ? branches.find((b) => b.id === candidate.branchId)
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
