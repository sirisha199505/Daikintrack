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

// ---- Branch mappers ------------------------------------------------------
// The frontend keys branches by their slug ("north") everywhere — user.branchId,
// product.branchId, etc. — so we keep `id` as the slug and carry the backend's
// integer primary key separately as `apiId` for update/delete calls.
export function mapBranchFromApi(b) {
  if (!b) return null;
  return {
    apiId: b.id,
    id: b.slug,
    slug: b.slug,
    name: b.name,
    code: b.code || "",
    location: b.location || "",
    address: b.address || "",
    contact: b.contact || "",
    manager: b.manager || "",
    status: b.status || (b.active === false ? "Inactive" : "Active"),
    color: b.color || null,
    gradient: b.gradient || null,
  };
}

export function mapBranchToApi(form) {
  const status = form.status || "Active";
  const payload = {
    name: (form.name || "").trim(),
    code: (form.code || "").trim(),
    location: form.location || "",
    address: form.address || "",
    contact: form.contact || "",
    manager: form.manager || "",
    status,
    active: status !== "Inactive",
  };
  if (form.color) payload.color = form.color;
  if (form.gradient) payload.gradient = form.gradient;
  // slug is required by the backend; on create we generate it, on edit it's carried.
  const slug = form.slug || form.id;
  if (slug) payload.slug = slug;
  return payload;
}

// ---- CopperScan mappers --------------------------------------------------
// Backend rows reference branches by integer id; the frontend keys by slug.
// `list`/`summary` use the lean projection (no base64 image); `get` returns the
// full row including the image.
export function mapCopperScanFromApi(s) {
  if (!s) return null;
  const { idToSlug } = branchMap();
  return {
    id: s.id,
    branchId: s.branch_id != null ? idToSlug[s.branch_id] ?? s.branch_id : null,
    branchName: s.branch_name,
    referenceType: s.reference_type,
    referenceMm: s.reference_mm,
    pxPerMm: s.px_per_mm,
    lengthM: s.length_m ?? 0,
    gaugeSystem: s.gauge_system,
    gaugeValue: s.gauge_value,
    diameterMm: s.diameter_mm,
    weightG: s.weight_g ?? 0,
    weightKg: s.weight_kg ?? (s.weight_g ?? 0) / 1000,
    image: s.image ?? null,
    hasImage: s.has_image ?? Boolean(s.image),
    points: s.points,
    notes: s.notes,
    actor: s.actor,
    status: s.status,
    createdAt: s.created_at,
  };
}

export function mapCopperScanToApi(form) {
  const { slugToId } = branchMap();
  const branchId =
    form.branchId != null
      ? slugToId[form.branchId] ?? (Number.isFinite(+form.branchId) ? +form.branchId : null)
      : null;
  return {
    branch_id: branchId,
    reference_type: form.referenceType || "a4",
    reference_mm: form.referenceMm,
    px_per_mm: form.pxPerMm,
    length_m: Number(form.lengthM) || 0,
    gauge_system: form.gaugeSystem || "awg",
    gauge_value: form.gaugeValue != null ? String(form.gaugeValue) : null,
    diameter_mm: Number(form.diameterMm) || 0,
    weight_g: Number(form.weightG) || 0,
    image: form.image || null,
    points: form.points ? JSON.stringify(form.points) : null,
    notes: form.notes || null,
  };
}

// ---- Category mappers ----------------------------------------------------
// Like branches, categories are keyed by slug across the frontend (product.category
// is a slug). `apiId` carries the backend integer key for update/delete.
export function mapCategoryFromApi(c) {
  if (!c) return null;
  return {
    apiId: c.id,
    id: c.slug,
    slug: c.slug,
    name: c.name,
    color: c.color || null,
  };
}

export function mapCategoryToApi(form) {
  const payload = { name: (form.name || "").trim(), active: true };
  if (form.color) payload.color = form.color;
  const slug = form.slug || form.id;
  if (slug) payload.slug = slug;
  return payload;
}

// ---- Endpoints -----------------------------------------------------------
export const Api = {
  // Public counts for the login screen (no auth required).
  async publicStats() {
    const res = await apiRequest("/stats", { auth: false });
    return res.data || {};
  },

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

  // ---- Branches (server-backed, shared across all devices) ----
  async listBranches() {
    const res = await apiRequest("/branches");
    return res.data || [];
  },

  async createBranch(payload) {
    const res = await apiRequest("/branches", { method: "POST", body: payload });
    return res.data;
  },

  async updateBranch(apiId, payload) {
    const res = await apiRequest(`/branches/${apiId}`, { method: "PUT", body: payload });
    return res.data;
  },

  async deleteBranch(apiId) {
    await apiRequest(`/branches/${apiId}`, { method: "DELETE" });
  },

  // ---- Categories (server-backed) ----
  async listCategories() {
    const res = await apiRequest("/categories");
    return res.data || [];
  },
  async createCategory(payload) {
    const res = await apiRequest("/categories", { method: "POST", body: payload });
    return res.data;
  },
  async updateCategory(apiId, payload) {
    const res = await apiRequest(`/categories/${apiId}`, { method: "PUT", body: payload });
    return res.data;
  },
  async deleteCategory(apiId) {
    await apiRequest(`/categories/${apiId}`, { method: "DELETE" });
  },

  // ---- Products (server-backed). Prices are whole rupees. ----
  // Pass { branchId } to scope the read to one branch (used by the store
  // manager's read-only "Switch Branch" view; backend allows GET cross-branch).
  async listProducts({ branchId } = {}) {
    const q = branchId != null ? `&branch_id=${encodeURIComponent(branchId)}` : "";
    const res = await apiRequest(`/products?page_size=300${q}`);
    return res.data || [];
  },
  async createProduct(payload) {
    const res = await apiRequest("/products", { method: "POST", body: payload });
    return res.data;
  },
  async updateProduct(id, payload) {
    const res = await apiRequest(`/products/${id}`, { method: "PUT", body: payload });
    return res.data;
  },
  async deleteProduct(id) {
    await apiRequest(`/products/${id}`, { method: "DELETE" });
  },
  // Look a product up by barcode across ALL branches (returns null if none).
  async getProductByBarcode(code) {
    try {
      const res = await apiRequest(
        `/products/by-barcode?barcode=${encodeURIComponent(String(code).trim())}`
      );
      return res.data;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  // ---- Transactions (server-backed; create adjusts stock atomically) ----
  // Pass { branchId } to scope the read to one branch (store manager view).
  async listTransactions({ branchId } = {}) {
    const q = branchId != null ? `&branch_id=${encodeURIComponent(branchId)}` : "";
    const res = await apiRequest(`/transactions?page_size=300${q}`);
    return res.data || [];
  },
  async createTransaction(payload) {
    const res = await apiRequest("/transactions", { method: "POST", body: payload });
    return res.data;
  },

  // ---- CopperScan (waste copper wire measurements) ----
  // `params` may include: branchId, search, from, to, gaugeSystem, page.
  async listCopperScans(params = {}) {
    const q = new URLSearchParams({ page_size: "300" });
    if (params.branchId != null) q.set("branch_id", params.branchId);
    if (params.search) q.set("search", params.search);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.gaugeSystem) q.set("gauge_system", params.gaugeSystem);
    const res = await apiRequest(`/copper-scans?${q.toString()}`);
    return res.data || [];
  },
  async getCopperScan(id) {
    const res = await apiRequest(`/copper-scans/${id}`);
    return res.data;
  },
  async createCopperScan(payload) {
    const res = await apiRequest("/copper-scans", { method: "POST", body: payload });
    return res.data;
  },
  async deleteCopperScan(id) {
    await apiRequest(`/copper-scans/${id}`, { method: "DELETE" });
  },
  async copperSummary(params = {}) {
    const q = new URLSearchParams();
    if (params.branchId != null) q.set("branch_id", params.branchId);
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.gaugeSystem) q.set("gauge_system", params.gaugeSystem);
    const res = await apiRequest(`/copper-scans/summary?${q.toString()}`);
    return res.data || {};
  },
};
