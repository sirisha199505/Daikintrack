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

// Reference objects used to calibrate scale. `cm` is the real-world length of
// the dimension the user drags a line across; it stays editable in the UI.
export const REFERENCES = [
  {
    id: "coin10",
    label: "₹10 Coin",
    cm: 2.7,
    dimLabel: "diameter",
    hint: "Drag a line straight across the coin (about 2.7 cm).",
  },
  {
    id: "a4",
    label: "A4 sheet",
    cm: 21.0,
    dimLabel: "short edge",
    hint: "Drag across the short edge (21 cm), or set 29.7 for the long edge.",
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

// ---- AC copper TUBE geometry (hollow) -----------------------------------
// AC refrigerant pipe is a hollow seamless tube, not solid wire. Its metal
// cross-section is the annulus between the outer wall and the bore:
//   ID = OD − 2·wall
//   area(mm²) = π/4 · (OD² − ID²)
// Weight per metre then follows the same unit-cancelling identity as above:
//   kg/m = area_mm² · density(g/cm³) / 1000.
export function tubeAreaMm2(odMm, wallMm) {
  const od = Number(odMm) || 0;
  const id = Math.max(0, od - 2 * (Number(wallMm) || 0));
  return (Math.PI / 4) * (od * od - id * id);
}

// Kilograms of copper per metre of tube, from pure geometry.
export function tubeKgPerMetre(odMm, wallMm) {
  return (tubeAreaMm2(odMm, wallMm) * COPPER_DENSITY) / 1000;
}

// Remaining tube length (metres) for a weighed leftover coil.
export function remainingMetres(leftoverKg, kgPerM) {
  const k = Number(kgPerM) || 0;
  if (k <= 0) return 0;
  return Math.max(0, (Number(leftoverKg) || 0) / k);
}

// Known coil products (JIS H3300 C1220 ACR seamless tube, standard 15 m coil).
// `kgPerM` is derived from geometry; `packedKg` (where published on the label)
// is the gross weight incl. caps/wrap and is shown only as a reference.
// A preset fixes the tube *size* (→ kg/m). The coil length is independent and
// chosen per scan, since the same size ships in many lengths (15/30/50/100 m).
// `lengthM` here is only the default the picker starts at.
function preset(id, sizeLabel, odMm, wallMm, lengthM, packedKg) {
  return {
    id,
    sizeLabel,
    odMm,
    wallMm,
    lengthM,
    packedKg,
    kgPerM: Math.round(tubeKgPerMetre(odMm, wallMm) * 1e4) / 1e4,
    label: `${sizeLabel} × ${wallMm} mm`,
  };
}

export const COIL_PRESETS = [
  preset("q14", '1/4" (6.35 mm)', 6.35, 0.71, 15),
  preset("q38", '3/8" (9.52 mm)', 9.52, 0.71, 15),
  preset("q12", '1/2" (12.70 mm)', 12.7, 0.71, 15),
  preset("q58", '5/8" (15.88 mm)', 15.88, 0.7, 15, 4.6),
  preset("q34", '3/4" (19.05 mm)', 19.05, 0.81, 15),
];

export const coilPresetById = (id) =>
  COIL_PRESETS.find((p) => p.id === id) || COIL_PRESETS[3];

// Common coil lengths offered as quick-picks (metres).
export const COIL_LENGTHS = [15, 30, 50, 100];

// ---- Flat spiral (Archimedean) coil — top-view photo method --------------
// A flat-wound coil photographed from above is an Archimedean spiral: the
// diameter of each successive turn grows by a constant step, so the loop
// diameters form an arithmetic progression D_inner … D_outer.
//
// Total wire length is the sum of every loop's circumference (π·D). Because the
// diameters are an arithmetic series, that whole sum collapses to the number of
// turns times the *average* circumference — no need to measure each loop:
//
//   length = π · (D₁ + D₂ + … + Dₙ) = π · N · (D_outer + D_inner) / 2
//
// Inputs are centimetres (the 10 cm calibration frame sets the scale); the
// result is returned in metres.
export function spiralLengthM({ turns, outerCm, innerCm }) {
  const n = Math.max(0, Number(turns) || 0);
  const dOut = Math.max(0, Number(outerCm) || 0);
  const dIn = Math.max(0, Number(innerCm) || 0);
  const avgDia = (dOut + dIn) / 2;
  return (Math.PI * n * avgDia) / 100; // cm → m
}

// Heuristic confidence (0–100) for a spiral measurement. The method is only as
// trustworthy as its inputs, so we dock points for the things that make a
// single top-view photo unreliable: missing measurements, an inner diameter
// that meets/exceeds the outer (lines mis-placed), and very low turn counts
// where a miscount of ±1 is a large relative error.
export function spiralConfidence({ turns, outerCm, innerCm }) {
  const n = Number(turns) || 0;
  const dOut = Number(outerCm) || 0;
  const dIn = Number(innerCm) || 0;
  let score = 96;
  if (dOut <= 0) score -= 40;
  if (dIn <= 0) score -= 12;
  if (dOut > 0 && dIn >= dOut) score -= 30;
  if (n < 1) score -= 40;
  else if (n < 3) score -= 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---- Automatic spiral detection from a top-view photo --------------------
// Given RGBA pixels of the still and the calibration-frame square (whose side
// is 10 cm), find the coil and measure it without any manual marking:
//
//   1. Threshold inside the frame to separate the coil ("ink", darker) from
//      the background, using mean − k·std so it adapts to lighting.
//   2. The centroid of the ink pixels is the coil centre.
//   3. Sweep a radius outward from the centre; at each radius sample many
//      angles and record the fraction that land on ink. This radial profile
//      rises where wire rings sit and falls over the empty centre / outside.
//   4. Inner Ø = first radius the profile crosses the boundary level (edge of
//      the centre hole); Outer Ø = last such radius; the number of profile
//      peaks between them is the visible turn count N.
//
// Returns coordinates/radii in the SAME pixel space as `frame` (i.e. the
// canvas you read the pixels from), or null if no coil is found.
function smoothProfile(p, win = 2) {
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i++) {
    let s = 0;
    let n = 0;
    for (let j = -win; j <= win; j++) {
      const k = i + j;
      if (k >= 0 && k < p.length) {
        s += p[k];
        n++;
      }
    }
    out[i] = s / n;
  }
  return out;
}

export function detectSpiral({ data, width, height, frame, sensitivity = 0 }) {
  if (!data || !frame || !frame.side) return null;
  const x0 = Math.max(0, Math.floor(frame.x));
  const y0 = Math.max(0, Math.floor(frame.y));
  const x1 = Math.min(width, Math.ceil(frame.x + frame.side));
  const y1 = Math.min(height, Math.ceil(frame.y + frame.side));
  const lumAt = (x, y) => {
    const i = (y * width + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };

  // Mean / std of luminance inside the frame.
  let sum = 0;
  let pix = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      sum += lumAt(x, y);
      pix++;
    }
  if (!pix) return null;
  const mean = sum / pix;
  let varSum = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const d = lumAt(x, y) - mean;
      varSum += d * d;
    }
  const std = Math.sqrt(varSum / pix) || 1;
  const thresh = mean - (0.35 + sensitivity) * std; // ink is darker
  const isInk = (x, y) => lumAt(x, y) < thresh;

  // Centroid of ink pixels.
  let cx = 0;
  let cy = 0;
  let ink = 0;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++)
      if (isInk(x, y)) {
        cx += x;
        cy += y;
        ink++;
      }
  if (ink < 30) return null; // nothing coil-like found
  cx /= ink;
  cy /= ink;

  // Radial ink profile.
  const Rmax = Math.floor(frame.side / 2);
  const K = 256;
  const prof = new Float32Array(Rmax + 1);
  for (let r = 0; r <= Rmax; r++) {
    let hit = 0;
    let tot = 0;
    for (let a = 0; a < K; a++) {
      const th = (2 * Math.PI * a) / K;
      const x = Math.round(cx + r * Math.cos(th));
      const y = Math.round(cy + r * Math.sin(th));
      if (x >= x0 && x < x1 && y >= y0 && y < y1) {
        tot++;
        if (isInk(x, y)) hit++;
      }
    }
    prof[r] = tot ? hit / tot : 0;
  }
  const sm = smoothProfile(prof, 2);
  let peakMax = 0;
  for (let r = 0; r <= Rmax; r++) if (sm[r] > peakMax) peakMax = sm[r];
  if (peakMax < 0.08) return null;

  // Inner / outer boundary at a fixed fraction of the strongest ring.
  const bThresh = Math.max(0.1, 0.25 * peakMax);
  let innerR = 0;
  let outerR = 0;
  for (let r = 0; r <= Rmax; r++)
    if (sm[r] >= bThresh) {
      innerR = r;
      break;
    }
  for (let r = Rmax; r >= 0; r--)
    if (sm[r] >= bThresh) {
      outerR = r;
      break;
    }

  // Count rings = peaks in the profile between the boundaries.
  const peakThresh = Math.max(bThresh, 0.45 * peakMax);
  const minGap = Math.max(2, Math.round((outerR - innerR) / 40));
  let turns = 0;
  let last = -minGap;
  for (let r = Math.max(1, innerR); r < outerR; r++) {
    if (
      sm[r] >= peakThresh &&
      sm[r] >= sm[r - 1] &&
      sm[r] >= sm[r + 1] &&
      r - last >= minGap
    ) {
      turns++;
      last = r;
    }
  }

  return { cx, cy, innerR, outerR, turns, inkRatio: ink / pix };
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
