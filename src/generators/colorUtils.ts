// Color manipulation helpers used by logo & portrait studio-quality renderers.

function parseHex(h: string): [number, number, number] {
  const x = h.replace("#", "");
  const n = parseInt(x.length === 3 ? x.split("").map(c => c + c).join("") : x, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}

export function mixColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

export function lighten(hex: string, amt: number): string {
  return mixColor(hex, "#ffffff", amt);
}
export function darken(hex: string, amt: number): string {
  return mixColor(hex, "#000000", amt);
}

export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Returns a perceived luma 0..1; helps pick text color over a background. */
export function luma(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function textOn(hex: string): string {
  return luma(hex) > 0.55 ? "#0a0d13" : "#ffffff";
}
