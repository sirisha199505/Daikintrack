// CopperScan domain math — wire gauge → diameter → weight, and the A4 reference.
//
// Weight derivation (pure geometry, no calibration of its own):
//   area(mm²) = π · (d/2)²
//   weight(g) = length(m) · area(mm²) · density(g/cm³)
// The unit factors cancel: 1 m = 100 cm and 1 cm² = 100 mm², so
//   weight_g = length_m · area_mm² · density.
export const COPPER_DENSITY = 8.96; // g/cm³

// A4 sheet edges in millimetres.
export const A4 = { short: 210, long: 297 };

// The single reference object used to calibrate scale (matches the repo).
// `cm` is the coin's real diameter; it stays editable in the UI.
export const REFERENCES = [
  {
    id: "coin10",
    label: "₹10 Coin",
    cm: 2.7,
    dimLabel: "diameter",
    hint: "Drag a line straight across the coin (about 2.7 cm).",
  },
];
export const referenceById = (id) => REFERENCES.find((r) => r.id === id) || REFERENCES[0];

// Diameter (mm) by gauge number. Common electrical/winding sizes.
export const AWG = {
  "0": 8.251, "2": 6.544, "4": 5.189, "6": 4.115, "8": 3.264,
  "10": 2.588, "12": 2.053, "14": 1.628, "16": 1.291, "18": 1.024,
  "20": 0.812, "22": 0.644, "24": 0.511, "26": 0.405, "28": 0.321,
};
export const SWG = {
  "6": 4.877, "8": 4.064, "10": 3.251, "12": 2.642, "14": 2.032,
  "16": 1.626, "18": 1.219, "20": 0.914, "22": 0.711, "24": 0.559,
};

export const GAUGE_SYSTEMS = [
  { id: "awg", label: "AWG", table: AWG },
  { id: "swg", label: "SWG", table: SWG },
  { id: "mm", label: "Diameter (mm)", table: null },
];

// Resolve a gauge selection to a diameter in millimetres.
// For the "mm" system, `value` is the diameter itself.
export function diameterFor(system, value) {
  if (value == null || value === "") return 0;
  if (system === "mm") return Number(value) || 0;
  const table = system === "swg" ? SWG : AWG;
  return table[String(value)] ?? 0;
}

export function areaMm2(diameterMm) {
  const r = (Number(diameterMm) || 0) / 2;
  return Math.PI * r * r;
}

// Estimated weight in grams for a length (metres) of solid copper wire.
export function weightGrams(lengthM, diameterMm) {
  return (Number(lengthM) || 0) * areaMm2(diameterMm) * COPPER_DENSITY;
}

// Sum a polyline's segment lengths in pixels.
export function polylinePx(points = []) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.hypot(dx, dy);
  }
  return total;
}

// Display helpers.
export function fmtLength(m) {
  const v = Number(m) || 0;
  return v >= 1 ? `${v.toFixed(2)} m` : `${(v * 100).toFixed(1)} cm`;
}
export function fmtWeight(g) {
  const v = Number(g) || 0;
  return v >= 1000 ? `${(v / 1000).toFixed(3)} kg` : `${v.toFixed(1)} g`;
}
export function gaugeLabel(system, value) {
  if (!value && value !== 0) return "—";
  if (system === "mm") return `${value} mm`;
  return `${system.toUpperCase()} ${value}`;
}
