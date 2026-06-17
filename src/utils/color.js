// Lighten (pct > 0) or darken (pct < 0) a hex colour. Used to build the
// glossy top→bottom gradients that give charts a 3D look.
export function shade(hex, pct) {
  if (!hex || hex[0] !== "#") return hex;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  // pct > 0 → mix toward white; pct < 0 → mix toward black. This is
  // proportional so already-bright colours (e.g. purple) tint instead of
  // washing out to pure white.
  const mix = (c) => (pct >= 0 ? c + (255 - c) * pct : c * (1 + pct));
  const r = clamp(mix((n >> 16) & 255));
  const g = clamp(mix((n >> 8) & 255));
  const b = clamp(mix(n & 255));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
