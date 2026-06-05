// LightingOverlay — per-scene color grade + soft light source. Pure CSS
// gradients/blend modes, no assets. Drop on top of a scene (above
// background + sprites, below UI) to give each region a distinct mood.

export type LightingMood =
  | "warm" | "cool" | "golden" | "eerie" | "underworld"
  | "stadium-night" | "sunset" | "dawn" | "neutral";

interface Props {
  mood?: LightingMood;
  /** 0..1 strength of the grade. */
  intensity?: number;
  /** Optional point light position as CSS (e.g. "30% 20%"). */
  lightAt?: string;
  style?: React.CSSProperties;
}

const MOODS: Record<LightingMood, { grade: string; blend: string; vignette: number }> = {
  warm:           { grade: "linear-gradient(180deg, rgba(255,200,120,0.18), rgba(180,90,30,0.12))", blend: "soft-light", vignette: 0.35 },
  cool:           { grade: "linear-gradient(180deg, rgba(120,180,255,0.16), rgba(30,60,120,0.16))", blend: "soft-light", vignette: 0.35 },
  golden:         { grade: "linear-gradient(180deg, rgba(255,215,90,0.22), rgba(200,140,30,0.14))", blend: "overlay", vignette: 0.3 },
  eerie:          { grade: "linear-gradient(180deg, rgba(80,200,160,0.14), rgba(20,40,30,0.30))", blend: "soft-light", vignette: 0.5 },
  underworld:     { grade: "linear-gradient(180deg, rgba(120,30,30,0.20), rgba(20,5,10,0.45))", blend: "multiply", vignette: 0.6 },
  "stadium-night":{ grade: "linear-gradient(180deg, rgba(180,200,255,0.10), rgba(10,15,40,0.35))", blend: "soft-light", vignette: 0.45 },
  sunset:         { grade: "linear-gradient(180deg, rgba(255,140,80,0.22), rgba(120,40,90,0.18))", blend: "overlay", vignette: 0.35 },
  dawn:           { grade: "linear-gradient(180deg, rgba(255,200,200,0.16), rgba(150,170,255,0.12))", blend: "soft-light", vignette: 0.25 },
  neutral:        { grade: "linear-gradient(180deg, rgba(255,255,255,0.0), rgba(0,0,0,0.10))", blend: "normal", vignette: 0.25 },
};

export function LightingOverlay({ mood = "neutral", intensity = 1, lightAt, style }: Props) {
  const m = MOODS[mood];
  return (
    <>
      {/* Color grade */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: m.grade,
        mixBlendMode: m.blend as any,
        opacity: intensity,
        ...style,
      }} />
      {/* Vignette + optional point light */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: lightAt
          ? `radial-gradient(circle at ${lightAt}, rgba(255,255,235,${0.18 * intensity}) 0%, transparent 40%), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${m.vignette * intensity}) 100%)`
          : `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,${m.vignette * intensity}) 100%)`,
      }} />
    </>
  );
}
