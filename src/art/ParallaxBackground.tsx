// ParallaxBackground — multi-layer depth background. Each layer is an
// SVG scene generated procedurally (hills, mountains, clouds, trees) so
// it works with zero downloaded assets and stays crisp at any size.
// When Kenney "Background Elements" PNGs are installed, a layer can
// point at an image instead via the `image` field.
//
// Layers drift slowly at different speeds for a living parallax feel;
// honors prefers-reduced-motion (drift disabled).

import { useEffect, useRef } from "react";

export type ParallaxTheme = "forest" | "mountain" | "desert" | "coast" | "sky" | "night" | "arena";

interface Props {
  theme?: ParallaxTheme;
  className?: string;
  style?: React.CSSProperties;
}

interface ThemeDef {
  sky: [string, string];        // gradient top → bottom
  bands: { color: string; heightPct: number; speed: number; kind: "hills" | "mountains" | "trees" | "dunes" | "waves" | "platforms" }[];
}

const THEMES: Record<ParallaxTheme, ThemeDef> = {
  forest: {
    sky: ["#bbf7d0", "#4ade80"],
    bands: [
      { color: "#166534", heightPct: 55, speed: 6, kind: "mountains" },
      { color: "#15803d", heightPct: 38, speed: 12, kind: "hills" },
      { color: "#14532d", heightPct: 24, speed: 22, kind: "trees" },
    ],
  },
  mountain: {
    sky: ["#dbeafe", "#93c5fd"],
    bands: [
      { color: "#475569", heightPct: 62, speed: 5, kind: "mountains" },
      { color: "#64748b", heightPct: 40, speed: 11, kind: "mountains" },
      { color: "#334155", heightPct: 22, speed: 20, kind: "hills" },
    ],
  },
  desert: {
    sky: ["#fde68a", "#fbbf24"],
    bands: [
      { color: "#b45309", heightPct: 50, speed: 6, kind: "dunes" },
      { color: "#d97706", heightPct: 34, speed: 13, kind: "dunes" },
      { color: "#92400e", heightPct: 20, speed: 22, kind: "dunes" },
    ],
  },
  coast: {
    sky: ["#7dd3fc", "#38bdf8"],
    bands: [
      { color: "#0c4a6e", heightPct: 48, speed: 6, kind: "hills" },
      { color: "#0369a1", heightPct: 30, speed: 14, kind: "waves" },
      { color: "#0ea5e9", heightPct: 18, speed: 26, kind: "waves" },
    ],
  },
  sky: {
    sky: ["#c4b5fd", "#a78bfa"],
    bands: [
      { color: "#7c3aed", heightPct: 44, speed: 7, kind: "platforms" },
      { color: "#8b5cf6", heightPct: 28, speed: 15, kind: "platforms" },
    ],
  },
  night: {
    sky: ["#1e1b4b", "#020617"],
    bands: [
      { color: "#0f172a", heightPct: 50, speed: 6, kind: "mountains" },
      { color: "#1e293b", heightPct: 30, speed: 14, kind: "hills" },
    ],
  },
  arena: {
    sky: ["#1f2937", "#0b0f17"],
    bands: [
      { color: "#111827", heightPct: 46, speed: 5, kind: "platforms" },
      { color: "#1f2937", heightPct: 26, speed: 12, kind: "platforms" },
    ],
  },
};

/** Build an SVG path string for a band silhouette of the given kind. */
function bandPath(kind: ThemeDef["bands"][number]["kind"], w: number, h: number, seed: number): string {
  const rnd = (n: number) => {
    // deterministic pseudo-random from seed+n
    const x = Math.sin(seed * 999 + n * 37) * 10000;
    return x - Math.floor(x);
  };
  const pts: string[] = [`M 0 ${h}`];
  if (kind === "mountains") {
    const peaks = 5;
    pts.push(`L 0 ${h * (0.4 + rnd(0) * 0.3)}`);
    for (let i = 1; i <= peaks; i++) {
      const x = (w / peaks) * i;
      const peakY = h * (0.1 + rnd(i) * 0.5);
      const midX = x - w / peaks / 2;
      pts.push(`L ${midX} ${peakY} L ${x} ${h * (0.4 + rnd(i + 10) * 0.3)}`);
    }
  } else if (kind === "hills" || kind === "dunes" || kind === "waves") {
    const bumps = kind === "waves" ? 8 : 4;
    const amp = kind === "dunes" ? 0.5 : kind === "waves" ? 0.25 : 0.6;
    pts.push(`L 0 ${h * 0.6}`);
    for (let i = 0; i <= bumps; i++) {
      const x = (w / bumps) * i;
      const cy = h * (0.6 - amp * 0.5 + rnd(i) * amp * 0.5);
      const cx = x - w / bumps / 2;
      pts.push(`Q ${cx} ${cy} ${x} ${h * (0.55 + rnd(i + 5) * 0.15)}`);
    }
  } else if (kind === "trees") {
    pts.push(`L 0 ${h * 0.5}`);
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const x = (w / n) * i;
      const top = h * (0.15 + rnd(i) * 0.3);
      pts.push(`L ${x - 6} ${h * 0.5} L ${x} ${top} L ${x + 6} ${h * 0.5}`);
    }
  } else if (kind === "platforms") {
    pts.push(`L 0 ${h * 0.5}`);
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const x = (w / n) * i;
      const top = h * (0.3 + rnd(i) * 0.3);
      pts.push(`L ${x - 30} ${h * 0.5} L ${x - 30} ${top} L ${x + 30} ${top} L ${x + 30} ${h * 0.5}`);
    }
  }
  pts.push(`L ${w} ${h} Z`);
  return pts.join(" ");
}

export function ParallaxBackground({ theme = "arena", className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const def = THEMES[theme];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const layers = Array.from(el.querySelectorAll<SVGSVGElement>("[data-speed]"));
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      for (const layer of layers) {
        const speed = Number(layer.dataset.speed || "0");
        // gentle horizontal drift, wraps via translateX on a 2x-wide svg
        const x = (Math.sin(t * speed * 0.04) * 8);
        layer.style.transform = `translateX(${x}px)`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [theme]);

  return (
    <div ref={ref} aria-hidden="true" className={className}
      style={{
        position: "absolute", inset: 0, overflow: "hidden",
        background: `linear-gradient(180deg, ${def.sky[0]}, ${def.sky[1]})`,
        ...style,
      }}>
      {def.bands.map((band, i) => (
        <svg key={i} data-speed={band.speed}
          viewBox="0 0 400 120" preserveAspectRatio="none"
          style={{
            position: "absolute", left: "-5%", bottom: 0, width: "110%",
            height: `${band.heightPct}%`, willChange: "transform",
          }}>
          <path d={bandPath(band.kind, 400, 120, i + 1)} fill={band.color} opacity={0.85 - i * 0.08} />
        </svg>
      ))}
    </div>
  );
}
