// ParticleSystem — canvas-based ambient + burst particles. No assets;
// particles are drawn as soft radial-gradient dots / shapes so it works
// before any Kenney pack is installed. When a Kenney particle PNG is
// present in the manifest, pass `texture` to use it instead.

import { useEffect, useRef } from "react";
import { KENNEY } from "./kenney-manifest";

export type ParticleKind = "dust" | "spark" | "ember" | "snow" | "magic" | "leaf" | "confetti" | "smokeDark" | "smokeLight";

/** Which manifest texture (if any) backs each particle kind. Kinds without a
 *  texture mapping fall through to the procedural circle/rect renderer.
 *  `natural: true` means draw the texture as-is (no source-in tint); used
 *  for grayscale smoke that already has its own value range. */
const KIND_TEXTURE: Partial<Record<ParticleKind, { path: string; installed: boolean; natural?: boolean }>> = {
  spark:      KENNEY.particles.spark,
  magic:      KENNEY.particles.magic,
  ember:      KENNEY.particles.spark,    // same warm glow, recolored to oranges
  dust:       KENNEY.particles.smoke,    // soft puff
  snow:       KENNEY.particles.smoke,    // soft puff, tinted white
  confetti:   KENNEY.particles.star,     // sparkle twinkle for celebrations
  smokeDark:  { ...KENNEY.smoke.darkSmoke,  natural: true },
  smokeLight: { ...KENNEY.smoke.whitePuff,  natural: true },
};

/** Per-color tint cache: keyed by "path::color". White-on-transparent PNG
 *  drawn via source-in produces a flat-colored, alpha-preserving sprite. */
const TINT_CACHE = new Map<string, HTMLCanvasElement>();
const IMAGE_CACHE = new Map<string, HTMLImageElement>();

function loadImage(path: string): HTMLImageElement {
  const hit = IMAGE_CACHE.get(path);
  if (hit) return hit;
  const img = new Image();
  img.src = path;
  IMAGE_CACHE.set(path, img);
  return img;
}

function getTinted(path: string, color: string): HTMLCanvasElement | null {
  const img = loadImage(path);
  if (!img.complete || img.naturalWidth === 0) return null;
  const key = `${path}::${color}`;
  const hit = TINT_CACHE.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const x = c.getContext("2d");
  if (!x) return null;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  TINT_CACHE.set(key, c);
  return c;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; rot: number; vr: number; color: string;
}

interface Props {
  /** Ambient effect that runs continuously. */
  kind?: ParticleKind;
  /** Particles per second for ambient mode. */
  rate?: number;
  /** Color palette (overrides per-kind default). */
  colors?: string[];
  className?: string;
  style?: React.CSSProperties;
}

const KIND_DEFAULTS: Record<ParticleKind, { colors: string[]; gravity: number; drift: number; size: [number, number]; life: [number, number] }> = {
  dust:     { colors: ["#cbb89a", "#a8927a"], gravity: -2,  drift: 8,  size: [1, 3],  life: [2.5, 5] },
  spark:    { colors: ["#fde68a", "#fbbf24", "#fff"], gravity: 30, drift: 40, size: [1, 2.5], life: [0.4, 0.9] },
  ember:    { colors: ["#f97316", "#fb923c", "#fbbf24"], gravity: -14, drift: 12, size: [1.5, 3], life: [1.8, 3.5] },
  snow:     { colors: ["#fff", "#e0f2fe"], gravity: 18, drift: 14, size: [1.5, 3.5], life: [4, 7] },
  magic:    { colors: ["#c4b5fd", "#a78bfa", "#f0abfc"], gravity: -8, drift: 20, size: [1.5, 3], life: [1.5, 3] },
  leaf:     { colors: ["#86efac", "#4ade80", "#22c55e"], gravity: 12, drift: 30, size: [2, 4], life: [3, 6] },
  confetti: { colors: ["#fde68a", "#86efac", "#7dd3fc", "#f472b6", "#c4b5fd"], gravity: 60, drift: 50, size: [3, 6], life: [1.2, 2.2] },
  // Smoke kinds — slow drift, long life, large size so wisps actually read.
  smokeDark:  { colors: ["#222"], gravity: -10, drift: 18, size: [5, 9],  life: [3, 6] },
  smokeLight: { colors: ["#ddd"], gravity: -8,  drift: 16, size: [5, 9],  life: [3, 6] },
};

export function ParticleSystem({ kind = "dust", rate = 18, colors, className, style }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const def = KIND_DEFAULTS[kind];
    const palette = colors ?? def.colors;
    const tex = KIND_TEXTURE[kind];
    const useTexture = !!(tex && tex.installed);
    const naturalTexture = !!(tex && tex.natural);
    if (useTexture && tex) loadImage(tex.path);
    // Texture sprites already include their own glow/falloff, so they need
    // a larger draw size than the procedural pixel dots.
    const sizeScale = useTexture ? 6 : 1;
    let particles: Particle[] = [];
    let raf = 0;
    let last = performance.now();
    let spawnAcc = 0;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas!.getBoundingClientRect();
      canvas!.width = Math.max(1, Math.floor(r.width * dpr));
      canvas!.height = Math.max(1, Math.floor(r.height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function spawn(w: number, h: number) {
      const [smin, smax] = def.size;
      const [lmin, lmax] = def.life;
      const life = lmin + Math.random() * (lmax - lmin);
      // Spawn position depends on kind: falling kinds from top, rising from bottom.
      const risesUp = def.gravity < 0;
      particles.push({
        x: Math.random() * w,
        y: risesUp ? h + 4 : -4,
        vx: (Math.random() * 2 - 1) * def.drift,
        vy: risesUp ? -(10 + Math.random() * 20) : (10 + Math.random() * 20),
        life, maxLife: life,
        size: smin + Math.random() * (smax - smin),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() * 2 - 1) * 3,
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = canvas!.clientWidth, h = canvas!.clientHeight;
      ctx!.clearRect(0, 0, w, h);

      if (!reduce) {
        spawnAcc += rate * dt;
        while (spawnAcc >= 1) { spawn(w, h); spawnAcc -= 1; }
      }

      particles = particles.filter(p => {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.vy += def.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        ctx!.globalAlpha = alpha * 0.9;
        if (useTexture && tex) {
          // Natural-colour textures (grayscale smoke) draw as-is; tinted
          // kinds (white sprites) get a per-colour source-in fill.
          const sprite = naturalTexture ? loadImage(tex.path) : getTinted(tex.path, p.color);
          const ready = naturalTexture
            ? (sprite as HTMLImageElement).complete && (sprite as HTMLImageElement).naturalWidth > 0
            : !!sprite;
          if (sprite && ready) {
            const s = p.size * sizeScale;
            ctx!.save();
            ctx!.translate(p.x, p.y);
            ctx!.rotate(p.rot);
            ctx!.drawImage(sprite as CanvasImageSource, -s / 2, -s / 2, s, s);
            ctx!.restore();
            return true;
          }
          // image not loaded yet — fall through to procedural this frame
        }
        ctx!.fillStyle = p.color;
        if (kind === "confetti") {
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.rot);
          ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
          ctx!.restore();
        } else {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx!.fill();
        }
        return true;
      });
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [kind, rate, colors]);

  return (
    <canvas ref={canvasRef} aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", ...style }} />
  );
}
