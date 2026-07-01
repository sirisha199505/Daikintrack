/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  Api,
  ensureBranchMap,
  getToken,
  mapUserFromApi,
  mapBranchFromApi,
  setToken,
} from "../lib/api";

const AuthContext = createContext(null);
const USER_KEY = "daikin.auth.user.v3";

// Attach the full branch object (name/location/code) the UI expects, resolved
// from the live branch list against the slug we mapped onto the user.
async function attachBranch(u) {
  if (!u) return u;
  if (!u.branchId) return { ...u, branch: null };
  try {
    const list = await Api.listBranches();
    const branch = list.map(mapBranchFromApi).find((b) => b.id === u.branchId) || null;
    return { ...u, branch };
  } catch {
    return { ...u, branch: null };
  }
}

// Shown for the brief moment while we verify an existing token on load. Keeping
// it minimal avoids pulling in app chrome before we know who (if anyone) is
// logged in.
function AuthBootstrapping() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1e3f",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        fontSize: "0.95rem",
        letterSpacing: "0.02em",
      }}
    >
      Loading…
    </div>
  );
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

  // Gate: stays false until the initial session check finishes. We do NOT render
  // the app (and therefore the data-context providers) until it flips true, so
  // no authenticated request can fire off a stale cached user before we've
  // confirmed the token is still valid. This is what prevents the 401 burst.
  const [authReady, setAuthReady] = useState(false);

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
      try {
        // No token means there is no live session — clear any stale cached user
        // so the UI never presents a tokenless cache as a logged-in admin.
        if (!getToken()) {
          if (!cancelled) setUser(null);
          return;
        }
        try {
          await ensureBranchMap();
          const info = await Api.me();
          const withBranch = await attachBranch(mapUserFromApi(info));
          if (!cancelled) setUser(withBranch);
        } catch {
          // Verified auth failure: the token is genuinely invalid/expired, so
          // this is the one place we clear it (and the cached user).
          if (!cancelled) {
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        // Whatever the outcome, the app may now render and its providers may
        // start fetching — with a token we know is valid, or none at all.
        if (!cancelled) setAuthReady(true);
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
      const mapped = await attachBranch(mapUserFromApi(info));
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
    <AuthContext.Provider value={{ user, login, logout, authReady }}>
      {authReady ? children : <AuthBootstrapping />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
