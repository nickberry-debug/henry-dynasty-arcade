// Composite hero sprite — DiceBear lorelei portrait on top, hand-drawn
// SVG body below, optional facial-hair overlay near the chin.
// Lorelei portrait gives us a face that visibly changes with every
// picker tap; the SVG body restores the upper-torso look the user
// wanted, and the facial-hair overlay re-enables that picker option
// (lorelei has no documented beard field of its own).

import { useEffect, useMemo, useRef, useState } from "react";
import type { HeroAppearance } from "../types";

// ── Lorelei variant catalogs ──────────────────────────────────────────
export const LORELEI_SKIN = [
  "f3d1ac", "ecad80", "d4a373", "c1996b",
  "b07d62", "9b6a4a", "8a5c3a", "6f4530",
  "5a3a25", "452b18", "2f1d10", "ecdcbf",
];
export const LORELEI_HAIR_COLOR = [
  "0e0e0e", "362c20", "5e3624", "8b5a2b",
  "b87333", "d4a373", "f2d3b1", "ecdcbf",
  "a06a4a", "3eac2c", "ab2a18", "5a3a90",
];
const NV = (n: number) => Array.from({ length: n }, (_, i) => `variant${String(i + 1).padStart(2, "0")}`);
export const LORELEI_HAIR     = NV(29);
export const LORELEI_EYES     = NV(24);
export const LORELEI_EYEBROWS = NV(13);
export const LORELEI_NOSE     = NV(6);
export const LORELEI_MOUTH = [
  ...Array.from({ length: 19 }, (_, i) => `happy${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 10 }, (_, i) => `sad${String(i + 1).padStart(2, "0")}`),
];

interface Props {
  seed: string;
  appearance?: HeroAppearance;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function CharacterSprite({ seed, appearance, size = "md", className = "" }: Props) {
  const url = useMemo(() => {
    const params = new URLSearchParams({
      seed: seed || "hero",
      backgroundType: "solid",
      backgroundColor: "0F1B2D",
    });
    if (appearance) {
      const a = appearance;
      params.set("skinColor", LORELEI_SKIN[mod(a.skinTone, LORELEI_SKIN.length)]);
      params.set("hairColor", LORELEI_HAIR_COLOR[mod(a.hairColor, LORELEI_HAIR_COLOR.length)]);
      params.set("hair",      LORELEI_HAIR[mod(a.hairStyle, LORELEI_HAIR.length)]);
      params.set("eyes",      LORELEI_EYES[mod(a.eyeColor, LORELEI_EYES.length)]);
      params.set("eyebrows",  LORELEI_EYEBROWS[mod(a.build, LORELEI_EYEBROWS.length)]);
      const mouthIdx = a.mouth ?? a.hairStyle;
      const noseIdx  = a.nose  ?? a.skinTone;
      params.set("mouth", LORELEI_MOUTH[mod(mouthIdx, LORELEI_MOUTH.length)]);
      params.set("nose",  LORELEI_NOSE[mod(noseIdx, LORELEI_NOSE.length)]);
    }
    return `https://api.dicebear.com/7.x/lorelei/svg?${params.toString()}`;
  }, [seed, appearance]);

  // Bucket → outer composite frame size.
  const bucket = { sm: 64, md: 128, lg: 224, xl: 288 }[size];
  // The lorelei portrait is square (1:1). Show it at its natural size
  // so face features sit where they're supposed to — no cropping. The
  // SVG body is rendered BELOW the portrait at half-height so the
  // composite is portrait-shaped (1 : 1.5).
  const faceSize = bucket;
  const bodySize = Math.round(bucket * 0.55);

  const [failed, setFailed] = useState(false);
  const retriedRef = useRef(false);
  useEffect(() => { setFailed(false); retriedRef.current = false; }, [url]);

  const skin = appearance ? `#${LORELEI_SKIN[mod(appearance.skinTone, LORELEI_SKIN.length)]}` : "#c68642";
  const hairCol = appearance ? `#${LORELEI_HAIR_COLOR[mod(appearance.hairColor, LORELEI_HAIR_COLOR.length)]}` : "#3e2a1a";
  const tunic = appearance?.tunicColor ?? "#5a4a3a";
  const cloak = appearance?.cloakColor ?? "#3a3a3a";
  const gender = appearance?.gender ?? "male";
  const facialHair = appearance?.facialHair ?? 0;

  return (
    <div className={`relative inline-block ${className}`} style={{ width: bucket }}>
      {/* Face — DiceBear lorelei portrait (or silhouette fallback). */}
      <div className="relative overflow-hidden rounded-t-xl" style={{ width: bucket, height: faceSize, background: "#0F1B2D" }}>
        {failed ? (
          <FaceSilhouette skin={skin} hair={hairCol} />
        ) : (
          <img
            src={url}
            alt="Character face"
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            loading="eager"
            decoding="async"
            onError={(e) => {
              if (!retriedRef.current) {
                retriedRef.current = true;
                const img = e.currentTarget;
                const sep = img.src.includes("?") ? "&" : "?";
                setTimeout(() => { img.src = `${img.src}${sep}r=${Date.now()}`; }, 300);
                return;
              }
              setFailed(true);
            }}
          />
        )}
        {/* Facial-hair overlay — sits over the lower-face region. */}
        {facialHair > 0 && (
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          >
            <FacialHair variant={facialHair} skin={skin} hair={hairCol} />
          </svg>
        )}
      </div>
      {/* Body — hand-drawn SVG using the picker's tunic + cloak colors.
          Negative margin pulls the body up so its top shoulders meet the
          lorelei's natural neckline, instead of leaving a gap or
          rendering as its own boxed unit. */}
      <div
        style={{ width: bucket, height: bodySize, background: "#0F1B2D", marginTop: -Math.round(bucket * 0.08) }}
        className="rounded-b-xl overflow-hidden"
      >
        <svg viewBox="0 0 100 60" className="w-full h-full" preserveAspectRatio="xMidYMin meet">
          <Body skin={skin} tunic={tunic} cloak={cloak} gender={gender} build={appearance?.build ?? 1} />
        </svg>
      </div>
    </div>
  );
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

// ── Body: shoulders, neck, torso, belt, optional cloak drape ─────────
function Body({
  skin, tunic, cloak, gender, build,
}: {
  skin: string; tunic: string; cloak: string;
  gender: "male" | "female"; build: number;
}) {
  // Body sits directly under the lorelei portrait — its shoulder line
  // is at the TOP of this viewBox (no empty space above), so the
  // shoulders pick up right where the portrait's neckline ends.
  // Female silhouette narrower; build axis bumps span ±2.
  const baseShoulder = gender === "female" ? 32 : 38;
  const shoulderSpan = baseShoulder + (build - 1) * 2;
  // No neck — the lorelei portrait already has the neck. We open
  // directly with shoulders.
  const shoulderY = 4;
  const beltY = 42;
  const midX = 50;

  // Body outline. The female silhouette has a subtle bust line, narrower
  // shoulders, slightly curvier waist.
  const torsoPath = gender === "female"
    ? `M ${midX - shoulderSpan} ${shoulderY}
       C ${midX - shoulderSpan + 4} ${shoulderY + 14}, ${midX - shoulderSpan + 2} ${shoulderY + 22}, ${midX - shoulderSpan - 2} ${beltY}
       L ${midX + shoulderSpan + 2} ${beltY}
       C ${midX + shoulderSpan - 2} ${shoulderY + 22}, ${midX + shoulderSpan - 4} ${shoulderY + 14}, ${midX + shoulderSpan} ${shoulderY}
       Q ${midX} ${shoulderY - 4}, ${midX - shoulderSpan} ${shoulderY} Z`
    : `M ${midX - shoulderSpan} ${shoulderY}
       L ${midX - shoulderSpan + 2} ${beltY}
       L ${midX + shoulderSpan - 2} ${beltY}
       L ${midX + shoulderSpan} ${shoulderY}
       Q ${midX} ${shoulderY - 4}, ${midX - shoulderSpan} ${shoulderY} Z`;

  return (
    <g>
      {/* Cloak drape behind shoulders */}
      <path
        d={`M ${midX - shoulderSpan - 4} ${shoulderY + 2}
            L ${midX - shoulderSpan - 8} ${beltY + 10}
            L ${midX + shoulderSpan + 8} ${beltY + 10}
            L ${midX + shoulderSpan + 4} ${shoulderY + 2}
            Q ${midX} ${shoulderY - 2}, ${midX - shoulderSpan - 4} ${shoulderY + 2} Z`}
        fill={cloak}
        opacity={0.85}
      />
      {/* Torso (tunic) */}
      <path d={torsoPath} fill={tunic} stroke="rgba(0,0,0,0.25)" strokeWidth={0.4} />
      {/* Female: subtle bust line indication */}
      {gender === "female" && (
        <path
          d={`M ${midX - 7} ${shoulderY + 12} Q ${midX} ${shoulderY + 16}, ${midX + 7} ${shoulderY + 12}`}
          fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={0.5}
        />
      )}
      {/* Belt */}
      <rect x={midX - shoulderSpan + 1} y={beltY - 3} width={(shoulderSpan - 1) * 2} height={4} fill="#DAA520" opacity={0.92} />
      <rect x={midX - 3} y={beltY - 4} width={6} height={6} fill="#b87333" stroke="#DAA520" strokeWidth={0.4} />
      {/* Subtle tunic-edge highlight */}
      <path
        d={`M ${midX - shoulderSpan + 2} ${shoulderY + 4} Q ${midX} ${shoulderY + 8}, ${midX + shoulderSpan - 2} ${shoulderY + 4}`}
        fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={0.5}
      />
    </g>
  );
}

// ── Facial-hair overlay (placed over the lower face area) ────────────
function FacialHair({ variant, skin, hair }: { variant: number; skin: string; hair: string }) {
  // Lorelei portrait actual layout (after closer inspection):
  //   eyes ~ y = 38-46
  //   nose ~ y = 44-50
  //   mouth ~ y = 50-54
  //   chin ~ y = 54-62
  //   neckline ~ y = 62-68
  // So the previous y=60+ anchors were still on the neck. Pulling
  // everything up another ~6 units lands these on the actual chin.
  const col = hair;
  switch (variant) {
    case 1: // Stubble — light dotted shading along chin + jaw
      return (
        <g opacity={0.5}>
          {Array.from({ length: 40 }).map((_, i) => {
            const x = 36 + (i % 8) * 3.6 + ((i * 7) % 3);
            const y = 52 + Math.floor(i / 8) * 2;
            return <circle key={i} cx={x} cy={y} r={0.5} fill={col} />;
          })}
        </g>
      );
    case 2: // Mustache only — just under the nose
      return (
        <path d="M 40 49 Q 50 46 60 49 Q 56 53 50 51 Q 44 53 40 49 Z" fill={col} />
      );
    case 3: // Goatee — small mustache + chin tuft
      return (
        <>
          <path d="M 40 49 Q 50 46 60 49 Q 56 53 50 51 Q 44 53 40 49 Z" fill={col} opacity={0.92} />
          <path d="M 45 55 Q 50 57 55 55 Q 54 62 50 63 Q 46 62 45 55 Z" fill={col} />
        </>
      );
    case 4: // Chin beard (no mustache) — bottom-of-face arc
      return (
        <path d="M 40 55 Q 34 59 38 63 Q 42 65 50 65 Q 58 65 62 63 Q 66 59 60 55 Q 55 58 50 58 Q 45 58 40 55 Z" fill={col} />
      );
    case 5: // Full beard — mustache + chin/jawline coverage
      return (
        <>
          <path d="M 40 49 Q 50 46 60 49 Q 56 53 50 51 Q 44 53 40 49 Z" fill={col} opacity={0.95} />
          <path d="M 34 53 Q 30 61 34 65 Q 42 67 50 67 Q 58 67 66 65 Q 70 61 66 53 Q 60 57 50 57 Q 40 57 34 53 Z" fill={col} />
        </>
      );
    case 6: // Long beard — mustache + lower beard extending down past neck
      return (
        <>
          <path d="M 40 49 Q 50 46 60 49 Q 56 53 50 51 Q 44 53 40 49 Z" fill={col} opacity={0.95} />
          <path d="M 34 53 Q 28 65 32 75 Q 42 77 50 77 Q 58 77 68 75 Q 72 65 66 53 Q 60 57 50 57 Q 40 57 34 53 Z" fill={col} />
        </>
      );
    case 7: // Handlebar mustache — curled tips at the corners
      return (
        <path d="M 32 51 Q 38 45 44 49 Q 50 46 56 49 Q 62 45 68 51 Q 64 53 58 51 Q 54 53 50 51 Q 46 53 42 51 Q 36 53 32 51 Z" fill={col} />
      );
    default:
      return null;
  }
}

function FaceSilhouette({ skin, hair }: { skin: string; hair: string }) {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full">
      <defs>
        <radialGradient id="bg-grad" cx="30%" cy="20%" r="80%">
          <stop offset="0%" stopColor="rgba(218,165,32,0.15)" />
          <stop offset="100%" stopColor="rgba(15,27,45,0.6)" />
        </radialGradient>
      </defs>
      <rect width="80" height="80" rx="14" fill="url(#bg-grad)" />
      <rect x="34" y="50" width="12" height="14" fill={skin} />
      <ellipse cx="40" cy="40" rx="15" ry="18" fill={skin} stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" />
      <path d="M 25 36 Q 25 18 40 18 Q 55 18 55 36 Q 51 30 40 30 Q 29 30 25 36 Z" fill={hair} />
    </svg>
  );
}
