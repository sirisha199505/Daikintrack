// Product classification mapping supplied by the client.
// Each Model No maps to a Category / Type / Capacity / Unit. The Model No is what
// the operator scans (barcode/QR) or types in on Check-In / Check-Out, so we key
// the lookup by Model No and auto-fill the rest. `capacity: null` / `unit: ""`
// means the client left them blank for that model (receivers, remotes, panels,
// refnets).

export const CATEGORIES = ["INDOOR UNIT", "OUTDOOR UNIT", "REFNETS"];
export const UNITS = ["TON", "HP"];

// ---- Builders (keep the data compact & transcription-safe) ----
const M = [];
const add = (model, category, type, capacity, unit) =>
  M.push({ model, category, type, capacity, unit });

// Indoor units — [model, capacity], all TON.
const indoor = (type, rows) => rows.forEach(([m, c]) => add(m, "INDOOR UNIT", type, c, "TON"));
// Accessories (receiver / remote / panel) — no capacity/unit.
const acc = (type, models) => models.forEach((m) => add(m, "INDOOR UNIT", type, null, ""));

indoor("Four Way Cassettes", [
  ["FXFSQ25ARV16", 0.83], ["FXFSQ32ARV16", 1.04], ["FXFSQ40ARV16", 1.32],
  ["FXFSQ50ARV16", 1.65], ["FXFSQ63ARV16", 2.08], ["FXFSQ80ARV16", 2.65],
  ["FXFSQ100ARV16", 3.31], ["FXFSQ125ARV16", 4.15], ["FXFSQ140ARV16", 4.65],
]);
indoor("One Way Cassettes", [
  ["FXKQ32ARV16", 1.04], ["FXKQ40ARV16", 1.32], ["FXKQ50ARV16", 1.65], ["FXKQ63ARV16", 2.08],
]);
indoor("Compact Cassette", [
  ["FXZQ20CRV16", 0.63], ["FXZQ25CRV16", 0.83], ["FXZQ32CRV16", 1.04],
  ["FXZQ40CRV16", 1.32], ["FXZQ50CRV16", 1.65],
]);
indoor("Two Way Cassette", [
  ["FXCQ25BVM6", 0.83], ["FXCQ32BVM6", 1.04], ["FXCQ40BVM6", 1.32], ["FXCQ50BVM6", 1.65],
  ["FXCQ63BVM6", 2.08], ["FXCQ80BVM6", 2.65], ["FXCQ125BVM6", 4.15],
]);
indoor("Hi Walls", [
  ["FXAQ20ARVE6", 0.63], ["FXAQ25ARVE6", 0.83], ["FXAQ32ARVE6", 1.04], ["FXAQ40ARVE6", 1.32],
  ["FXAQ50ARVE6", 1.65], ["FXAQ63ARVE6", 2.08], ["FXAQ71BRV16", 2.5], ["FXAQ80ARV16", 2.65],
  ["FXAQ90ARV16", 3],
]);
indoor("Low Static Ductable", [
  ["FXDQ20PDV36", 0.63], ["FXDQ25PDV36", 0.83], ["FXDQ32PDV36", 1.04],
  ["FXDQ40PDV36", 1.32], ["FXDQ50PDV36", 1.65], ["FXDQ63PDV36", 2.08],
]);
indoor("Mid Static Ductable", [
  ["FXMQ40ARV16", 1.32], ["FXMQ50ARV16", 1.65], ["FXMQ63ARV16", 2.08],
  ["FXMQ80ARV16", 2.65], ["FXMQ100ARV16", 3.31],
]);
indoor("High Static Ductable", [
  ["FXMQ20PBV36", 0.63], ["FXMQ25PBV36", 0.83], ["FXMQ32PBV36", 1.04], ["FXMQ40PBV36", 1.32],
  ["FXMQ50PBV36", 1.65], ["FXMQ63PBV36", 2.08], ["FXMQ80PBV36", 2.65], ["FXMQ100PBV36", 3.31],
  ["FXMQ125PBV36", 4.15], ["FXMQ140PBV36", 4.65], ["FXMQ170NVE6", 5.5], ["FXMQ200NVE6", 6.3],
  ["FXMQ250NVE6", 8.3],
]);

acc("Receiver - Four Way Cassettes", ["BRC7M632F-6"]);
acc("Receiver - One Way Cassettes", ["BRC63AV"]);
acc("Receiver - Compact Cassettes", ["BRC7M530W6"]);
acc("Receiver - Two Way Cassettes", ["BRC7M65"]);
acc("Receiver - Hi Walls", ["BRC7N618-6"]);
acc("Receiver - Low Static Ductable", ["BRC4M61-6"]);
acc("Receiver - Mid Static Ductable", ["BRC4M61-6"]);
acc("Receiver - High Static Ductable", ["BRC4M61-6"]);
acc("Remote - Four Way Cassettes", ["BRC4M150W16"]);
acc("Remote - One Way Cassettes", ["BRC4M150W17"]);
acc("Remote - Compact Cassettes", ["BRC4M150W18"]);
acc("Remote - Hi Walls", ["BRC4M150W16"]);
acc("Remote - Low Static Ductable", ["BRC4M150W16"]);
acc("Remote - Mid Static Ductable", ["BRC4M150W16"]);
acc("Remote - High Static Ductable", ["BRC4M150W16"]);
acc("Panel - Four Way Cassettes", ["BYCQ125EAF6"]);
acc("Panel - One Way Cassettes", ["BYKQ63AW"]);
acc("Panel - Compact Cassettes", ["BYFQ60CBW6"]);
acc("Panel - Two Way Cassettes", ["BYBCQ40CF", "BYBCQ63CF", "BYBCQ125CF"]);

// Outdoor units — RXQ{capacity}BRY16, HP. Suffix number == capacity (TON-equivalent
// label); the same model appears under both Cooling-only and Heat-Pump variants.
const TD = {
  6: "Single", 8: "Single", 10: "Single", 12: "Single", 14: "Single", 16: "Single",
  18: "Single", 20: "Single", 22: "Single", 24: "Single", 26: "Single",
  28: "14+14", 30: "12+18", 32: "14+18", 34: "16+18", 36: "18+18", 38: "14+24",
  40: "14+26", 42: "18+24", 44: "18+26", 46: "22+24", 48: "24+24", 50: "24+26",
  52: "26+26", 54: "18+18+18", 56: "12+18+26", 58: "14+18+26", 60: "18+18+24",
  62: "18+18+26", 64: "12+26+26", 66: "18+24+24", 68: "18+24+26", 70: "18+26+26",
  72: "24+24+24", 74: "24+24+26", 76: "24+26+26", 78: "26+26+26",
};
Object.entries(TD).forEach(([n, combo]) => {
  add(`RXQ${n}BRY16`, "OUTDOOR UNIT", `Cooling only/Top discharge - ${combo}`, Number(n), "HP");
});
Object.entries(TD).forEach(([n, combo]) => {
  add(`RXQ${n}BRY16`, "OUTDOOR UNIT", `Heat Pump/Top discharge - ${combo}`, Number(n), "HP");
});
[["RXMQ4BRV16", 4], ["RXMQ5BRV16", 5], ["RXMQ6BRV16", 6], ["RXMQ8BRV16", 8],
 ["RXMQ10BRV16", 10], ["RXMQ12BRV16", 12]].forEach(([m, c]) =>
  add(m, "OUTDOOR UNIT", "Cooling Only/Side Discharge", c, "HP"));

// Refnets — no capacity/unit.
[["KHRP26A22T6", "22T"], ["KHRP26A33T6", "33T"], ["KHRP26A72T6", "72T"],
 ["KHRP26A73T6", "73T"]].forEach(([m, t]) =>
  add(m, "REFNETS", `Refnets - ${t}`, null, ""));

export const MODELS = M;

// Model No (normalized) → detail. First occurrence wins for duplicated models.
const norm = (s) => String(s || "").trim().toUpperCase();
export const MODEL_MAP = MODELS.reduce((acc, row) => {
  const k = norm(row.model);
  if (!acc[k]) acc[k] = row;
  return acc;
}, {});

// Distinct suggestion lists for the free-text fields (insertion order).
export const MODEL_NOS = [...new Set(MODELS.map((m) => m.model))];
export const TYPES = [...new Set(MODELS.map((m) => m.type))];

// Look up a scanned/typed code; returns the detail row or null.
export function lookupModel(code) {
  return MODEL_MAP[norm(code)] || null;
}
