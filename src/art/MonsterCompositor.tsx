// MonsterCompositor — deterministic Kenney monster-builder-pack
// composite. Given a stable id, picks a body / eyes / mouth / optional
// detail from the CC0 pack and stacks them as one sprite. Same id =
// same monster every time.
//
// The pack ships ~36 bodies × 20 eyes × dozens of mouths/details, so
// every creature in the arcade can have a unique procedural look
// without us hand-drawing 36 sprites. Used as cosmetic accent (avatar
// strip, wild encounter preview, family stats roster).

import { useMemo } from "react";

const PACK = "/assets/kenney/monster-builder-pack/PNG/Default";

const BODY_COLORS = ["blue", "dark", "green", "red", "white", "yellow"] as const;
const BODY_SHAPES = ["A", "B", "C", "D", "E", "F"] as const;
const EYES = [
  "eye_angry_blue", "eye_angry_green", "eye_angry_red",
  "eye_blue", "eye_human", "eye_human_red",
  "eye_cute_dark", "eye_cute_light",
  "eye_closed_happy", "eye_closed_feminine",
] as const;
const MOUTHS = [
  "mouthA", "mouthB", "mouthC", "mouthD", "mouthE", "mouthF",
  "mouth_closed_teeth",
] as const;
const DETAIL_COLORS = ["blue", "dark", "green", "red", "white", "yellow"] as const;
const DETAIL_KINDS = [
  "antenna_large", "antenna_small", "ear", "ear_round",
  "horn_large", "horn_small",
] as const;

// Simple FNV hash so two strings with the same content always pick
// the same parts (deterministic per id).
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function pick<T>(arr: readonly T[], n: number): T { return arr[n % arr.length]; }

interface Props {
  /** Stable id — same id always yields the same monster. */
  id: string;
  /** Rendered pixel size (square). */
  size?: number;
  /** Optional class for the wrapper. */
  className?: string;
  /** If true, render with no eyes/mouth (silhouette-only). */
  silhouette?: boolean;
  /** Optional CSS filter (e.g. drop-shadow). */
  filter?: string;
}

export function MonsterCompositor({ id, size = 64, className, silhouette, filter }: Props) {
  const parts = useMemo(() => {
    const h = hash(id);
    const bodyColor = pick(BODY_COLORS, h);
    const bodyShape = pick(BODY_SHAPES, h >> 3);
    const eye = pick(EYES, h >> 6);
    const mouth = pick(MOUTHS, h >> 9);
    const hasDetail = (h >> 12) % 3 !== 0;       // ~67% chance of detail
    const detailColor = pick(DETAIL_COLORS, h >> 14);
    const detailKind = pick(DETAIL_KINDS, h >> 17);
    return {
      body: `${PACK}/body_${bodyColor}${bodyShape}.png`,
      eye:  `${PACK}/${eye}.png`,
      mouth: `${PACK}/${mouth}.png`,
      detail: hasDetail ? `${PACK}/detail_${detailColor}_${detailKind}.png` : null,
    };
  }, [id]);

  // Source sprites are 256x256 with the body centered. Layer them
  // at the same position so eyes/mouth land on the body's face.
  const stack: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    imageRendering: "pixelated",
    objectFit: "contain",
    pointerEvents: "none",
  };

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        filter: filter ?? `drop-shadow(0 2px 4px rgba(0,0,0,0.4))`,
        flexShrink: 0,
      }}
      aria-hidden="true">
      <img src={parts.body} alt="" style={stack} onError={hideOnError} />
      {parts.detail && <img src={parts.detail} alt="" style={stack} onError={hideOnError} />}
      {!silhouette && (
        <>
          <img src={parts.eye}   alt="" style={stack} onError={hideOnError} />
          <img src={parts.mouth} alt="" style={stack} onError={hideOnError} />
        </>
      )}
    </div>
  );
}

function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  (e.currentTarget as HTMLImageElement).style.display = "none";
}
