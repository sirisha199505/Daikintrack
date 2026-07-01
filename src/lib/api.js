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
    // Do NOT clear the token here. A single 401 from a background request that
    // raced ahead of the session being ready would otherwise wipe the shared
    // token and cascade EVERY subsequent request into 401 (including writes like
    // POST /purchases). Session invalidation is owned by AuthContext, which
    // clears the token only after a *verified* failure of the /me check.
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
    method: s.method || "trace", // trace | coil | weight
    product: s.product || null,
    startLengthM: s.start_length_m ?? null,
    remainingLengthM: s.remaining_length_m ?? null,
    leftoverWeightG: s.leftover_weight_g ?? null,
    leftoverWeightKg:
      s.leftover_weight_g != null ? s.leftover_weight_g / 1000 : null,
    kgPerM: s.kg_per_m ?? null,
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
    method: form.method || "trace",
    product: form.product || null,
    start_length_m: form.startLengthM != null ? Number(form.startLengthM) : null,
    remaining_length_m:
      form.remainingLengthM != null ? Number(form.remainingLengthM) : null,
    leftover_weight_g:
      form.leftoverWeightG != null ? Number(form.leftoverWeightG) : null,
    kg_per_m: form.kgPerM != null ? Number(form.kgPerM) : null,
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

// ---- Inventory (Tally-style) mappers -------------------------------------
function slugFor(branchId) {
  if (branchId == null) return null;
  const { idToSlug } = branchMap();
  return idToSlug[branchId] ?? branchId;
}
function idFor(slug) {
  if (slug == null) return null;
  const { slugToId } = branchMap();
  return slugToId[slug] ?? (Number.isFinite(+slug) ? +slug : null);
}

export function mapSupplierFromApi(s) {
  if (!s) return null;
  return {
    id: s.id, name: s.name, code: s.code || "", gstin: s.gstin || "",
    contact: s.contact || "", email: s.email || "", phone: s.phone || "",
    address: s.address || "", branchId: slugFor(s.branch_id), branchName: s.branch_name,
    active: s.active !== false, createdAt: s.created_at, updatedAt: s.updated_at,
  };
}
export function mapPartyToApi(form) {
  const payload = {
    name: (form.name || "").trim(), code: (form.code || "").trim(),
    gstin: (form.gstin || "").trim(), contact: (form.contact || "").trim(),
    email: (form.email || "").trim(), phone: (form.phone || "").trim(),
    address: form.address || "", active: form.active !== false,
  };
  if (form.branchId != null) payload.branch_id = idFor(form.branchId);
  return payload;
}
// Customers share the same shape as suppliers.
export const mapCustomerFromApi = mapSupplierFromApi;

export function mapSerialFromApi(u) {
  if (!u) return null;
  return {
    id: u.id, serialNo: u.serial_no, productId: u.product_id,
    productName: u.product_name, barcode: u.barcode, categoryName: u.category_name,
    branchId: slugFor(u.branch_id), branchName: u.branch_name, status: u.status,
    costPrice: u.cost_price ?? 0, soldPrice: u.sold_price ?? null,
    supplierName: u.supplier_name, customerName: u.customer_name,
    purchaseInvoiceId: u.purchase_invoice_id, salesInvoiceId: u.sales_invoice_id,
    purchasedAt: u.purchased_at, soldAt: u.sold_at,
    returnReason: u.return_reason, inspectionNotes: u.inspection_notes,
    disposedBy: u.disposed_by, createdAt: u.created_at,
  };
}

function mapInvoiceLineFromApi(l) {
  return {
    id: l.id, productId: l.product_id, productName: l.product_name, barcode: l.barcode,
    quantity: l.quantity, price: l.cost_price ?? l.sold_price ?? 0, amount: l.line_total ?? 0,
    serials: (l.serials || []).map((s) => ({ id: s.id, serialNo: s.serial_no, status: s.status })),
  };
}
export function mapPurchaseFromApi(p) {
  if (!p) return null;
  return {
    id: p.id, invoiceNo: p.invoice_no, supplierInvoiceNo: p.supplier_invoice_no,
    supplierId: p.supplier_id, supplierName: p.supplier_name,
    branchId: slugFor(p.branch_id), branchName: p.branch_name, status: p.status,
    totalQty: p.total_qty ?? 0, totalAmount: p.total_amount ?? 0, notes: p.notes,
    actor: p.actor, date: p.occurred_at, lineCount: p.line_count, unitCount: p.unit_count,
    lines: (p.items || []).map(mapInvoiceLineFromApi),
  };
}
export function mapSaleFromApi(s) {
  if (!s) return null;
  return {
    id: s.id, invoiceNo: s.invoice_no, customerId: s.customer_id, customerName: s.customer_name,
    branchId: slugFor(s.branch_id), branchName: s.branch_name, status: s.status,
    totalQty: s.total_qty ?? 0, totalAmount: s.total_amount ?? 0, notes: s.notes,
    actor: s.actor, date: s.occurred_at, lineCount: s.line_count, unitCount: s.unit_count,
    lines: (s.items || []).map(mapInvoiceLineFromApi),
  };
}
export function mapLedgerFromApi(e) {
  if (!e) return null;
  return {
    id: e.id, movementType: e.movement_type, productId: e.product_id, productName: e.product_name,
    serialNo: e.serial_no, qty: e.qty, fromStatus: e.from_status, toStatus: e.to_status,
    invoiceNo: e.invoice_no, partyName: e.party_name, branchId: slugFor(e.branch_id),
    branchName: e.branch_name, balanceAfter: e.balance_after, unitPrice: e.unit_price,
    actor: e.actor, date: e.occurred_at,
  };
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
  // AI label scan: send a base64 label photo, get back tube specs.
  async identifyCopperLabel(image) {
    const res = await apiRequest("/copper-scans/identify", { method: "POST", body: { image } });
    return res.data;
  },
  // AI photo estimate: send a coil photo + known full length, get remaining/used + confidence.
  async estimateCopperCoil(payload) {
    const res = await apiRequest("/copper-scans/estimate", { method: "POST", body: payload });
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

  // ---- Tally-style inventory: suppliers & customers (master data) ----
  async listSuppliers({ search } = {}) {
    const q = new URLSearchParams({ page_size: "300" });
    if (search) q.set("search", search);
    const res = await apiRequest(`/suppliers?${q.toString()}`);
    return res.data || [];
  },
  async createSupplier(payload) {
    const res = await apiRequest("/suppliers", { method: "POST", body: payload });
    return res.data;
  },
  async updateSupplier(id, payload) {
    const res = await apiRequest(`/suppliers/${id}`, { method: "PUT", body: payload });
    return res.data;
  },
  async deleteSupplier(id) {
    await apiRequest(`/suppliers/${id}`, { method: "DELETE" });
  },
  async listCustomers({ search } = {}) {
    const q = new URLSearchParams({ page_size: "300" });
    if (search) q.set("search", search);
    const res = await apiRequest(`/customers?${q.toString()}`);
    return res.data || [];
  },
  async createCustomer(payload) {
    const res = await apiRequest("/customers", { method: "POST", body: payload });
    return res.data;
  },
  async updateCustomer(id, payload) {
    const res = await apiRequest(`/customers/${id}`, { method: "PUT", body: payload });
    return res.data;
  },
  async deleteCustomer(id) {
    await apiRequest(`/customers/${id}`, { method: "DELETE" });
  },

  // ---- Purchase invoices (Check-In) ----
  async listPurchases({ branchId, search, from, to } = {}) {
    const q = new URLSearchParams({ page_size: "300" });
    if (branchId != null) q.set("branch_id", branchId);
    if (search) q.set("search", search);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await apiRequest(`/purchases?${q.toString()}`);
    return res.data || [];
  },
  async getPurchase(id) {
    const res = await apiRequest(`/purchases/${id}`);
    return res.data;
  },
  async createPurchase(payload) {
    const res = await apiRequest("/purchases", { method: "POST", body: payload });
    return res.data;
  },

  // ---- Sales invoices (Check-Out) ----
  async listSales({ branchId, search, from, to } = {}) {
    const q = new URLSearchParams({ page_size: "300" });
    if (branchId != null) q.set("branch_id", branchId);
    if (search) q.set("search", search);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const res = await apiRequest(`/sales?${q.toString()}`);
    return res.data || [];
  },
  async getSale(id) {
    const res = await apiRequest(`/sales/${id}`);
    return res.data;
  },
  async createSale(payload) {
    const res = await apiRequest("/sales", { method: "POST", body: payload });
    return res.data;
  },

  // ---- Returns / quarantine / replacements ----
  async createReturn(payload) {
    const res = await apiRequest("/returns", { method: "POST", body: payload });
    return res.data;
  },
  async createReplacement(payload) {
    const res = await apiRequest("/replacements", { method: "POST", body: payload });
    return res.data;
  },
  async unitInspect(id, payload) {
    const res = await apiRequest(`/units/${id}/inspect`, { method: "POST", body: payload });
    return res.data;
  },
  async unitDispose(id, payload) {
    const res = await apiRequest(`/units/${id}/dispose`, { method: "POST", body: payload });
    return res.data;
  },
  async unitRepairComplete(id, payload) {
    const res = await apiRequest(`/units/${id}/repair-complete`, { method: "POST", body: payload });
    return res.data;
  },

  // ---- Units (serials) ----
  async listUnits({ branchId, productId, status, quarantine, search } = {}) {
    const q = new URLSearchParams({ page_size: "300" });
    if (branchId != null) q.set("branch_id", branchId);
    if (productId != null) q.set("product_id", productId);
    if (status) q.set("status", status);
    if (quarantine) q.set("quarantine", "1");
    if (search) q.set("search", search);
    const res = await apiRequest(`/units?${q.toString()}`);
    return res.data || [];
  },
  async getUnitBySerial(serialNo) {
    const res = await apiRequest(`/units/by-serial?serial_no=${encodeURIComponent(serialNo)}`);
    return res.data;
  },

  // ---- Ledger ----
  async listLedger({ branchId, type, from, to, search, page } = {}) {
    const q = new URLSearchParams({ page_size: "300" });
    if (branchId != null) q.set("branch_id", branchId);
    if (type) q.set("type", type);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (search) q.set("search", search);
    if (page) q.set("page", page);
    const res = await apiRequest(`/ledger?${q.toString()}`);
    return res.data || [];
  },

  // ---- Universal search + product history ----
  async searchInventory({ q, type } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    const res = await apiRequest(`/inventory/search?${params.toString()}`);
    return res.data || {};
  },
  async productHistory({ serialNo, productId } = {}) {
    const params = new URLSearchParams();
    if (serialNo) params.set("serial_no", serialNo);
    if (productId != null) params.set("product_id", productId);
    const res = await apiRequest(`/product-history?${params.toString()}`);
    return res.data || {};
  },

  // ---- Reports (return { data, totals }) ----
  async report(name, params = {}) {
    const q = new URLSearchParams({ page_size: "300" });
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== "") q.set(k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`), v);
    });
    const res = await apiRequest(`/reports/${name}?${q.toString()}`);
    return { data: res.data || [], totals: res.totals || null, total: res.total };
  },
};
