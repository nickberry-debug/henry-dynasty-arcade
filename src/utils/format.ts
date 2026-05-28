export const fmt = {
  money(n: number) {
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
    return "$" + n.toFixed(0);
  },
  avg(n: number) {
    if (!isFinite(n) || isNaN(n)) return ".000";
    return n.toFixed(3).replace(/^0/, "");
  },
  era(n: number) {
    if (!isFinite(n) || isNaN(n)) return "—";
    return n.toFixed(2);
  },
  pct(n: number) {
    return (n * 100).toFixed(1) + "%";
  },
  height(inches: number) {
    return `${Math.floor(inches / 12)}'${inches % 12}"`;
  },
  ratingColor(r: number) {
    if (r >= 92) return "#ffd54a";
    if (r >= 84) return "#2ecc71";
    if (r >= 75) return "#4aa8ff";
    if (r >= 65) return "#a072ff";
    if (r >= 50) return "#9aa6bf";
    return "#ff5b3a";
  },
  ratingLabel(r: number) {
    if (r >= 92) return "Elite";
    if (r >= 85) return "All-Star";
    if (r >= 77) return "Plus";
    if (r >= 68) return "Avg+";
    if (r >= 55) return "Avg";
    return "Below";
  },
  date(year: number, dayIdx: number) {
    // opening day late March
    const d = new Date(year, 2, 28);
    d.setDate(d.getDate() + dayIdx);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  },
  number(n: number) {
    return n.toLocaleString("en-US");
  }
};

export function clsx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}
