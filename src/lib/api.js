// Lightweight client for the DaikinTrack backend API.
//
// The base URL comes from VITE_API_URL (set in Vercel / a local .env). The API
// wraps request bodies in a { data: ... } envelope and replies with
// { status: "success", data: ... } — this module hides both conventions.

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "daikin.auth.token";

// ---- Token storage -------------------------------------------------------
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

// ---- Role mapping (backend integers <-> frontend strings) ----------------
export const ROLE_INT_TO_STR = { 1: "admin", 2: "store_manager", 3: "distributor" };
export const ROLE_STR_TO_INT = { admin: 1, store_manager: 2, distributor: 3 };

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function extractError(json) {
  if (!json) return null;
  const d = json.data ?? json.message ?? json.status;
  if (typeof d === "string") return d;
  if (d && typeof d === "object") {
    // Validation errors look like { field: ["message"] }.
    const first = Object.entries(d)[0];
    if (first) return `${first[0]}: ${[].concat(first[1]).join(", ")}`;
  }
  return null;
}

// ---- Core request helper -------------------------------------------------
export async function apiRequest(path, { method = "GET", body, auth = true } = {}) {
  if (!BASE) {
    throw new ApiError(
      "API URL is not configured. Set VITE_API_URL and redeploy.",
      0,
      null
    );
  }

  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify({ data: body }) : undefined,
    });
  } catch {
    throw new ApiError("Network error — could not reach the server.", 0, null);
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* response was not JSON */
  }

  if (res.status === 401) {
    setToken(null);
    throw new ApiError(extractError(json) || "Session expired. Please log in again.", 401, json);
  }
  if (!res.ok || (json && json.status && json.status !== "success")) {
    throw new ApiError(extractError(json) || `Request failed (${res.status})`, res.status, json);
  }
  return json;
}

// ---- Branch id <-> slug map ----------------------------------------------
// Backend products/users reference branches by integer id, while the frontend
// inventory demo still keys off slug strings ("north"). We translate using the
// backend branch list so both worlds stay consistent.
let _branchMap = null;

export async function ensureBranchMap(force = false) {
  if (_branchMap && !force) return _branchMap;
  try {
    const res = await apiRequest("/branches");
    const list = res.data || [];
    const idToSlug = {};
    const slugToId = {};
    for (const b of list) {
      idToSlug[b.id] = b.slug;
      slugToId[b.slug] = b.id;
    }
    _branchMap = { idToSlug, slugToId };
  } catch {
    _branchMap = { idToSlug: {}, slugToId: {} };
  }
  return _branchMap;
}

export function branchMap() {
  return _branchMap || { idToSlug: {}, slugToId: {} };
}

// ---- User mappers --------------------------------------------------------
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

// Backend user -> frontend user shape used throughout the React app.
export function mapUserFromApi(u) {
  if (!u) return null;
  const { idToSlug } = branchMap();
  return {
    id: u.id,
    name: u.full_name,
    username: u.username,
    email: u.email,
    mobile: u.phone_number,
    role: ROLE_INT_TO_STR[u.role] || "distributor",
    title: u.role_name,
    branchId: u.branch_id != null ? idToSlug[u.branch_id] ?? u.branch_id : null,
    status: u.status || (u.active === false ? "Inactive" : "Active"),
    initials: initials(u.full_name || ""),
  };
}

// Frontend form -> backend payload. Only includes password when one is entered.
export function mapUserToApi(form) {
  const { slugToId } = branchMap();
  const payload = {
    full_name: (form.name || "").trim(),
    username: (form.username || "").trim(),
    email: (form.email || "").trim(),
    phone_number: form.mobile || "",
    role: ROLE_STR_TO_INT[form.role] || 3,
    status: form.status || "Active",
    active: (form.status || "Active") !== "Inactive",
  };
  if (form.role === "admin" || !form.branchId) {
    payload.branch_id = null;
  } else {
    payload.branch_id = slugToId[form.branchId] ?? (Number.isFinite(+form.branchId) ? +form.branchId : null);
  }
  if (form.password && form.password.trim()) payload.password = form.password;
  return payload;
}

// ---- Endpoints -----------------------------------------------------------
export const Api = {
  async login(username, password) {
    const res = await apiRequest("/login", {
      method: "POST",
      auth: false,
      body: { username, password },
    });
    return res.data; // { token, info }
  },

  async me() {
    const res = await apiRequest("/me/info");
    return res.data;
  },

  async listUsers() {
    const res = await apiRequest("/users?page_size=300");
    return res.data || [];
  },

  async createUser(payload) {
    const res = await apiRequest("/users", { method: "POST", body: payload });
    return res.data;
  },

  async updateUser(id, payload) {
    const res = await apiRequest(`/users/${id}`, { method: "PUT", body: payload });
    return res.data;
  },

  async deleteUser(id) {
    await apiRequest(`/users/${id}`, { method: "DELETE" });
  },
};
