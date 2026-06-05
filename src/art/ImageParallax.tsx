// ImageParallax — multi-layer scrolling parallax backdrop from real
// art layers (ansimuz CC0 packs). Each layer scrolls at its own speed
// to create depth. Pure CSS transform animation (GPU-accelerated), so
// it's cheap even with 6 layers on mobile.
//
// Layers render back-to-front. Each layer is a horizontally-tiled strip
// that loops seamlessly via two side-by-side copies translated by the
// animation. Slower `speed` = further away.
//
// Usage:
//   <ImageParallax preset="mountainDusk" />
//   <ImageParallax preset="warpedCity" className="absolute inset-0" />

import { useMemo } from "react";

const A = "/assets/ansimuz";

export interface ParallaxLayer {
  /** URL (may contain spaces — encoded automatically). */
  src: string;
  /** Pixels/second horizontal scroll. Negative scrolls right→left. */
  speed: number;
  /** Vertical anchor: 'top' | 'bottom' | 'center' | number (% from top). */
  anchor?: "top" | "bottom" | "center";
  /** Optional opacity. */
  opacity?: number;
  /** Optional tint overlay color blended on top. */
  tint?: string;
}

export type ParallaxPreset = "mountainDusk" | "mountainDuskFull" | "warpedCity" | "sunnyLand";

const MD = `${A}/mountain-dusk/Super Mountain Dusk Files/Assets/version A/Layers`;
const MDB = `${A}/mountain-dusk/Super Mountain Dusk Files/Assets/version B/Layers`;
const WC = `${A}/warped-city/Warped City Godot/World/background`;
const SL = `${A}/sunny-land/Sunny-land-files/Assets/environment/Background`;

const PRESETS: Record<ParallaxPreset, ParallaxLayer[]> = {
  // Silhouette-only — small framed band of parallax mountains for use
  // as a footer skyline. Sky + clouds dropped because the sun/moon in
  // the source PNG stretches to a giant pixelated blob when sized to
  // viewport width.
  mountainDusk: [
    { src: `${MD}/far-mountains.png`, speed: 8,    anchor: "bottom" },
    { src: `${MD}/mountains.png`,     speed: 16,   anchor: "bottom" },
    { src: `${MD}/trees.png`,         speed: 28,   anchor: "bottom" },
  ],
  // Variant that includes the full sky+clouds — use only in a tall
  // hero section where the sky has room to breathe.
  mountainDuskFull: [
    { src: `${MD}/sky.png`,           speed: 0,    anchor: "center" },
    { src: `${MD}/far-clouds.png`,    speed: 6,    anchor: "top", opacity: 0.9 },
    { src: `${MD}/near-clouds.png`,   speed: 12,   anchor: "top", opacity: 0.85 },
    { src: `${MD}/far-mountains.png`, speed: 8,    anchor: "bottom" },
    { src: `${MD}/mountains.png`,     speed: 16,   anchor: "bottom" },
    { src: `${MD}/trees.png`,         speed: 28,   anchor: "bottom" },
  ],
  warpedCity: [
    { src: `${WC}/skyline-b.png`,         speed: 4,  anchor: "bottom" },
    { src: `${WC}/skyline-a.png`,         speed: 8,  anchor: "bottom" },
    { src: `${WC}/buildings-bg.png`,      speed: 16, anchor: "bottom" },
    { src: `${WC}/near-buildings-bg.png`, speed: 28, anchor: "bottom" },
  ],
  sunnyLand: [
    { src: `${SL}/back.png`,   speed: 6,  anchor: "bottom" },
    { src: `${SL}/middle.png`, speed: 16, anchor: "bottom" },
    { src: `${SL}/props.png`,  speed: 30, anchor: "bottom" },
  ],
};

interface Props {
  preset?: ParallaxPreset;
  layers?: ParallaxLayer[];
  className?: string;
  /** Global speed multiplier (1 = preset default). */
  speedScale?: number;
  /** Dim the whole thing with a dark scrim for foreground legibility. */
  scrim?: number;
  style?: React.CSSProperties;
}

let _kf = 0;

export function ImageParallax({ preset = "mountainDusk", layers, className, speedScale = 1, scrim = 0, style }: Props) {
  const resolved = layers ?? PRESETS[preset];
  // Unique keyframe names per mount so multiple instances don't collide.
  const kfId = useMemo(() => `pllx${_kf++}`, []);

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0, overflow: "hidden",
        pointerEvents: "none", ...style,
      }}>
      <style>{
        resolved.map((l, i) => {
          if (!l.speed) return "";
          // Duration for a full 100%-width scroll loop. Lower speed = longer.
          const dur = Math.max(8, 4000 / Math.abs(l.speed * speedScale));
          const dir = l.speed >= 0 ? "normal" : "reverse";
          return `@keyframes ${kfId}_${i} { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.${kfId}_${i} { animation: ${kfId}_${i} ${dur}s linear infinite ${dir}; }`;
        }).join("\n")
      }</style>
      {resolved.map((l, i) => {
        const anchorStyle: React.CSSProperties =
          l.anchor === "top" ? { top: 0 }
          : l.anchor === "center" ? { top: "50%", transform: "translateY(-50%)" }
          : { bottom: 0 };
        const url = encodeURI(l.src);
        if (!l.speed) {
          // Static layer (sky) — single stretched image.
          return (
            <div key={i}
              style={{
                position: "absolute", inset: 0,
                backgroundImage: `url("${url}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                imageRendering: "pixelated",
                opacity: l.opacity ?? 1,
              }} />
          );
        }
        // Scrolling layer: a 200%-wide strip containing two tiled copies,
        // translated -50% over the loop for seamless wrap.
        return (
          <div key={i}
            className={`${kfId}_${i}`}
            style={{
              position: "absolute",
              ...anchorStyle,
              left: 0,
              width: "200%",
              height: l.anchor === "center" ? "100%" : "auto",
              display: "flex",
              opacity: l.opacity ?? 1,
            }}>
            <div style={{
              width: "50%", height: "100%",
              backgroundImage: `url("${url}")`,
              backgroundRepeat: "repeat-x",
              backgroundSize: "auto 100%",
              backgroundPosition: l.anchor === "bottom" ? "left bottom" : "left top",
              imageRendering: "pixelated",
            }} />
            <div style={{
              width: "50%", height: "100%",
              backgroundImage: `url("${url}")`,
              backgroundRepeat: "repeat-x",
              backgroundSize: "auto 100%",
              backgroundPosition: l.anchor === "bottom" ? "left bottom" : "left top",
              imageRendering: "pixelated",
            }} />
          </div>
        );
      })}
      {scrim > 0 && (
        <div style={{ position: "absolute", inset: 0, background: `rgba(8,6,18,${scrim})` }} />
      )}
    </div>
  );
}
