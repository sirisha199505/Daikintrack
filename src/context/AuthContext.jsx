/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { BRANCHES } from "../data/seed";
import {
  Api,
  ensureBranchMap,
  getToken,
  mapUserFromApi,
  setToken,
} from "../lib/api";

const AuthContext = createContext(null);
const USER_KEY = "daikin.auth.user.v3";

// Attach the full branch object (name/location/code/gradient) the UI expects,
// resolved from the slug we mapped onto the user.
function attachBranch(u) {
  if (!u) return u;
  const branch = u.branchId ? BRANCHES.find((b) => b.id === u.branchId) || null : null;
  return { ...u, branch };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Persist the mapped user so a reload renders instantly before we re-verify.
  useEffect(() => {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [user]);

  // On mount, if a token exists, verify it and refresh the user from the server.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      // No token means there is no live session — clear any stale cached user
      // so the UI never presents a tokenless cache as a logged-in admin.
      if (!getToken()) {
        if (!cancelled) setUser(null);
        return;
      }
      try {
        await ensureBranchMap();
        const info = await Api.me();
        if (!cancelled) setUser(attachBranch(mapUserFromApi(info)));
      } catch {
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // Real credential auth against POST /api/login. Returns { ok, error } so the
  // login page can keep its existing flow.
  const login = useCallback(async ({ username, password }) => {
    if (!username) return { ok: false, error: "Please enter your username." };
    if (!password) return { ok: false, error: "Please enter your password." };
    try {
      const { token, info } = await Api.login(username.trim(), password);
      setToken(token);
      await ensureBranchMap(true);
      const mapped = attachBranch(mapUserFromApi(info));
      setUser(mapped);
      return { ok: true, user: mapped };
    } catch (e) {
      return { ok: false, error: e.message || "Invalid username or password." };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

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
