// Deterministic seed data for the Daikin Inventory Management System.
// A tiny seeded PRNG keeps the demo data stable across reloads.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CATEGORIES = [
  { id: "split", name: "Split AC", color: "#22b8e6" },
  { id: "window", name: "Window AC", color: "#16a34a" },
  { id: "cassette", name: "Cassette AC", color: "#f59e0b" },
  { id: "ducted", name: "Ducted AC", color: "#ef4444" },
  { id: "vrv", name: "VRV / VRF Systems", color: "#8b5cf6" },
  { id: "chillers", name: "Chillers", color: "#14b8a6" },
  { id: "purifier", name: "Air Purifiers", color: "#6366f1" },
  { id: "refrigeration", name: "Commercial Refrigeration", color: "#f97316" },
];

export const BRANCHES = [
  {
    id: "north",
    name: "North Hub",
    code: "WH-NORTH",
    location: "Delhi NCR",
    manager: "Rahul Verma",
    color: "#0098d8",
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #06b6d4 100%)",
  },
  {
    id: "west",
    name: "West Hub",
    code: "WH-WEST",
    location: "Mumbai",
    manager: "Priya Nair",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #312e81 0%, #7c3aed 50%, #d946ef 100%)",
  },
  {
    id: "south",
    name: "South Hub",
    code: "WH-SOUTH",
    location: "Bengaluru",
    manager: "Arjun Reddy",
    color: "#16a34a",
    gradient: "linear-gradient(135deg, #065f46 0%, #0d9488 50%, #0ea5e9 100%)",
  },
  {
    id: "east",
    name: "East Hub",
    code: "WH-EAST",
    location: "Kolkata",
    manager: "Sneha Das",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #9f1239 0%, #ea580c 50%, #f59e0b 100%)",
  },
];

// Product model catalog per category (realistic Daikin-style names).
const MODELS = {
  split: [
    "FTKF50 1.5 Ton 5 Star Inverter",
    "FTKM35 1.0 Ton 4 Star Inverter",
    "FTKL60 1.8 Ton 3 Star",
    "MTKL50 1.5 Ton Hot & Cold",
  ],
  window: [
    "DRC18 1.5 Ton 3 Star",
    "FRWL12 1.0 Ton 5 Star",
    "DRW24 2.0 Ton 2 Star",
  ],
  cassette: [
    "FCVF50 Round Flow Cassette",
    "FCAG71 Ceiling Cassette",
    "FCVF100 Round Flow Cassette",
  ],
  ducted: ["FDMF60 Ducted Splittable", "FDMF100 Concealed Ducted"],
  vrv: [
    "RXYQ8 VRV IV Outdoor",
    "RXYQ14 VRV X Outdoor",
    "VRV Indoor FXFA50",
  ],
  chillers: [
    "EWAD-TZ Air Cooled Chiller",
    "EWWD-J Water Cooled Chiller",
  ],
  purifier: [
    "MC55 Streamer Purifier",
    "MCK70 Humidifying Purifier",
    "MC30 Compact Purifier",
  ],
  refrigeration: [
    "ZEAS Condensing Unit",
    "Conveni-Pack Refrigeration",
    "LRMEQ Refrigeration Unit",
  ],
};

// Target category quantities for North Hub (matches the design mock = 577 units).
const NORTH_TARGET = {
  split: 180,
  window: 75,
  cassette: 64,
  ducted: 38,
  vrv: 22,
  chillers: 44,
  purifier: 96,
  refrigeration: 58,
};

function splitQty(total, n, rand) {
  // distribute `total` across n buckets with some variation, min 1 each
  const weights = Array.from({ length: n }, () => 0.5 + rand());
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.max(1, Math.round((w / sum) * total)));
  let diff = total - parts.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0) {
    const idx = i % n;
    if (diff > 0) {
      parts[idx]++;
      diff--;
    } else if (parts[idx] > 1) {
      parts[idx]--;
      diff++;
    }
    i++;
  }
  return parts;
}

const rand = mulberry32(20260616);
const PRICE = {
  split: 38900,
  window: 28500,
  cassette: 86000,
  ducted: 112000,
  vrv: 245000,
  chillers: 520000,
  purifier: 19900,
  refrigeration: 168000,
};

function makeBarcode(branchIdx, seq) {
  // 13-digit EAN-style: 890 (India) + branch + sequence
  const base = `890${branchIdx}${String(seq).padStart(7, "0")}`;
  return base.padEnd(13, "0").slice(0, 13);
}

let seq = 1000;
export const PRODUCTS = [];

BRANCHES.forEach((branch, bIdx) => {
  CATEGORIES.forEach((cat) => {
    const models = MODELS[cat.id];
    let target;
    if (branch.id === "north") {
      target = NORTH_TARGET[cat.id];
    } else {
      // other hubs: derive a varied but plausible total
      target = Math.round(NORTH_TARGET[cat.id] * (0.7 + rand() * 0.9));
    }
    const parts = splitQty(target, models.length, rand);
    models.forEach((model, mIdx) => {
      seq += 7;
      let stock = parts[mIdx];
      const threshold = 10;
      // Engineer one low-stock VRV product in North Hub (matches "1 alert" mock).
      if (branch.id === "north" && cat.id === "vrv" && mIdx === 0) {
        // pull this one down to 4 and push the difference into the next model
        const give = stock - 4;
        stock = 4;
        parts[mIdx + 1] = (parts[mIdx + 1] || 0) + give;
      }
      PRODUCTS.push({
        id: `${branch.id}-${cat.id}-${mIdx}`,
        name: model,
        category: cat.id,
        categoryName: cat.name,
        branchId: branch.id,
        barcode: makeBarcode(bIdx + 1, seq),
        stock: stock,
        lowStockThreshold: threshold,
        price: PRICE[cat.id],
        updatedAt: "2026-06-15T18:30:00.000Z",
      });
    });
  });
});

// ----- Seed transaction history -----
function isoDaysAgo(days, hour, min) {
  // 2026-06-16 is "today"; build dates by subtracting days
  const base = Date.UTC(2026, 5, 16, hour, min, 0);
  return new Date(base - days * 86400000).toISOString();
}

export const TRANSACTIONS = [];
let inv = 4820;
for (let i = 0; i < 64; i++) {
  const p = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
  const branch = BRANCHES.find((b) => b.id === p.branchId);
  const type = rand() > 0.45 ? "out" : "in";
  const qty = 1 + Math.floor(rand() * 8);
  const daysAgo = Math.floor(rand() * 40);
  inv += 1;
  TRANSACTIONS.push({
    id: `txn-${i}`,
    invoiceNo: `INV-2026-${inv}`,
    type, // 'in' = check in, 'out' = check out
    date: isoDaysAgo(daysAgo, 9 + (i % 9), (i * 7) % 60),
    branchId: branch.id,
    branchName: branch.name,
    productId: p.id,
    productName: p.name,
    barcode: p.barcode,
    category: p.categoryName,
    quantity: qty,
    actor: branch.manager,
    status: type === "in" ? "Checked In" : "Checked Out",
  });
}
TRANSACTIONS.sort((a, b) => new Date(b.date) - new Date(a.date));

// ----- Demo users -----
export const USERS = [
  {
    id: "u-admin",
    name: "Vikram Daikin",
    role: "admin",
    title: "Store Manager",
    username: "admin",
    password: "admin",
    branchId: null,
    initials: "V",
  },
  {
    id: "u-north",
    name: "Rahul Verma",
    role: "manager",
    title: "Distributor",
    username: "rahul",
    password: "manager",
    branchId: "north",
    initials: "R",
  },
];
