// CosmicBackdrop — decorative deep-space layer for Cosmic Squad: a sparse
// twinkling starfield plus a few slowly-drifting Kenney CC0 asteroids.
// Pure decoration (aria-hidden, pointer-events none); honors
// prefers-reduced-motion by freezing all motion. Sits behind shell content.
//
// The bespoke ship SVGs (ShipSprite) are intentionally NOT replaced — they
// carry the IP silhouettes (X-Wing, TIE, Galaxy, etc.). Kenney art is used
// only as set-dressing so the screens feel like real space without losing
// the recognizable fleet.

import { useMemo } from "react";

const METEORS = [
  "/assets/kenney/space/meteor-001.png",
  "/assets/kenney/space/meteor-002.png",
  "/assets/kenney/space/meteor-003.png",
  "/assets/kenney/space/meteor-004.png",
];

interface Props {
  /** Number of drifting asteroids. */
  rocks?: number;
  /** Number of stars. */
  stars?: number;
  style?: React.CSSProperties;
}

export function CosmicBackdrop({ rocks = 5, stars = 48, style }: Props) {
  const reduce = typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // Deterministic-ish layout generated once per mount.
  const starField = useMemo(() => Array.from({ length: stars }, (_, i) => ({
    left: (i * 53.13) % 100,
    top: (i * 31.7) % 100,
    size: 1 + ((i * 7) % 3) * 0.6,
    delay: (i % 7) * 0.5,
    dur: 2.5 + (i % 5),
  })), [stars]);

  const asteroids = useMemo(() => Array.from({ length: rocks }, (_, i) => ({
    src: METEORS[i % METEORS.length],
    left: (i * 37 + 8) % 92,
    top: (i * 29 + 6) % 80,
    size: 34 + ((i * 13) % 34),
    dur: 26 + (i % 4) * 10,
    delay: -(i * 5),
    opacity: 0.32 + ((i * 11) % 30) / 100,
    spin: 18 + (i % 3) * 12,
  })), [rocks]);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0, ...style }}>
      <style>{`
        @keyframes cosmicTwinkle { 0%,100%{opacity:.25} 50%{opacity:.9} }
        @keyframes cosmicDrift { 0%{transform:translate(0,0)} 100%{transform:translate(18px,26px)} }
        @keyframes cosmicSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
      `}</style>
      {/* Stars */}
      {starField.map((s, i) => (
        <span key={i} style={{
          position: "absolute", left: `${s.left}%`, top: `${s.top}%`,
          width: s.size, height: s.size, borderRadius: "50%",
          background: "#dbeafe", boxShadow: "0 0 4px rgba(155,227,255,0.8)",
          animation: reduce ? "none" : `cosmicTwinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          opacity: reduce ? 0.5 : undefined,
        }} />
      ))}
      {/* Asteroids */}
      {asteroids.map((a, i) => (
        <div key={i} style={{
          position: "absolute", left: `${a.left}%`, top: `${a.top}%`,
          width: a.size, height: a.size, opacity: a.opacity,
          animation: reduce ? "none" : `cosmicDrift ${a.dur}s ease-in-out ${a.delay}s infinite alternate`,
        }}>
          <img src={a.src} alt="" draggable={false} style={{
            width: "100%", height: "100%", imageRendering: "pixelated",
            animation: reduce ? "none" : `cosmicSpin ${a.spin}s linear infinite`,
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
          }} />
        </div>
      ))}
    </div>
  );
}
