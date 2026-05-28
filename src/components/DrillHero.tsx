// Drill hero with progressive enhancement:
// 1) Embedded YouTube video (curated coaching clip) — best
// 2) Unsplash CDN photo — second best
// 3) Rich SVG illustration per category — always works offline
import { useState } from "react";
import type { Drill } from "../data/drills";
import { drillMedia } from "../data/drillMedia";
import { videoForDrill } from "../data/drillVideos";
import { Play, Image as ImageIcon } from "lucide-react";

interface Props {
  drill: Drill;
  height?: number;
  /** When true, default to video if available. When false, default to image. */
  preferVideo?: boolean;
}

export function DrillHero({ drill, height = 200, preferVideo = false }: Props) {
  const media = drillMedia(drill.id);
  const video = videoForDrill(drill.id);
  const [errored, setErrored] = useState(false);
  const [mode, setMode] = useState<"video" | "image">(video && preferVideo ? "video" : "image");

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-ink-800 border border-white/10" style={{ height }}>
      {mode === "video" && video ? (
        <>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.id}?rel=0&modestbranding=1&playsinline=1${video.start ? `&start=${video.start}` : ""}`}
            title={`${drill.name} — ${video.channel}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
          <div className="absolute bottom-1 left-2 text-[9px] text-white/70 pointer-events-none">via {video.channel}</div>
        </>
      ) : !errored ? (
        <img
          src={media.hero}
          alt={media.alt}
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <CategoryArt category={drill.category} drill={drill} />
      )}
      {/* Color veil for readability (skip for video) */}
      {mode !== "video" && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />}
      {/* Drill name overlay (skip for video — youtube has its own) */}
      {mode !== "video" && (
        <div className="absolute bottom-2 left-3 right-3 text-white">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{drill.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="font-display tracking-wide text-lg leading-none" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>{drill.name}</div>
              <div className="text-[10px] opacity-80 uppercase tracking-widest">{drill.category}</div>
            </div>
          </div>
        </div>
      )}
      {/* Video/image toggle */}
      {video && (
        <button
          onClick={(e) => { e.stopPropagation(); setMode(m => m === "video" ? "image" : "video"); }}
          className="absolute top-2 right-2 z-10 px-2 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] flex items-center gap-1 pressable touch-target"
        >
          {mode === "video" ? (<><ImageIcon size={11}/> Photo</>) : (<><Play size={11}/> Video</>)}
        </button>
      )}
    </div>
  );
}

/** Rich SVG illustration fallback — magazine-style scenes per category. */
function CategoryArt({ category, drill }: { category: Drill["category"]; drill: Drill }) {
  const id = drill.id;
  const isFence = id === "fence-drill";
  const isTowel = id === "towel-heel" || id === "towel-drill";
  const isTee = id === "sharpie-line" || id === "two-tee" || id === "one-knee" || id === "top-hand";
  const isKnee = id === "one-knee" || id === "knee-throws";
  const isLongToss = id === "long-toss";

  if (category === "hitting") {
    return (
      <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full drill-hero-hit" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky-h" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b5b85"/>
            <stop offset="100%" stopColor="#b27e3a"/>
          </linearGradient>
          <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d5b1f"/>
            <stop offset="100%" stopColor="#1c3a13"/>
          </linearGradient>
          <pattern id="mow-h" width="20" height="8" patternUnits="userSpaceOnUse">
            <rect width="20" height="8" fill="#264e1a"/>
            <rect width="10" height="8" fill="#2f5e22"/>
          </pattern>
        </defs>
        <rect width="400" height="120" fill="url(#sky-h)"/>
        {/* Distant outfield wall */}
        <rect y="105" width="400" height="20" fill="#1a2a3e" opacity="0.8"/>
        {/* Stadium silhouette */}
        <path d="M0 100 Q120 60 200 65 Q280 60 400 100 L400 120 L0 120 Z" fill="#23364e" opacity="0.6"/>
        {/* Grass */}
        <rect y="120" width="400" height="80" fill="url(#grass)"/>
        <rect y="120" width="400" height="80" fill="url(#mow-h)" opacity="0.5"/>
        {/* Dirt circle */}
        <ellipse cx="200" cy="190" rx="180" ry="22" fill="#8a6939" opacity="0.85"/>
        {/* Tee or fence accent */}
        {isFence && <path d="M30 60 L30 200 M50 60 L50 200 M70 60 L70 200 M90 60 L90 200 M0 60 L100 60" stroke="#4a5568" strokeWidth="2" opacity="0.7"/>}
        {isTee && <g><rect x="280" y="155" width="6" height="20" fill="#1a1a1a"/><circle cx="283" cy="150" r="8" fill="#fffaf0"/></g>}
        {/* Batter figure (richer than stick-figure: filled body, batting helmet, jersey) */}
        <g transform="translate(200,135)" className="hit-batter">
          {/* Back leg */}
          <path d="M-8 50 Q-12 35 -6 18" stroke="#0a0d13" strokeWidth="10" fill="none" strokeLinecap="round"/>
          {/* Front leg */}
          <path d="M10 50 Q14 35 8 18" stroke="#0a0d13" strokeWidth="10" fill="none" strokeLinecap="round"/>
          {/* Torso (jersey) */}
          <path d="M-14 -10 Q-16 12 -10 22 L12 22 Q18 12 14 -10 Z" fill="#1e3a8a"/>
          {/* Jersey number */}
          <text x="0" y="14" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="14" fill="#fbbf24" fontWeight="800">7</text>
          {/* Helmet */}
          <path d="M-12 -28 Q-12 -42 0 -42 Q12 -42 12 -28 L14 -22 L-14 -22 Z" fill="#1e3a8a"/>
          <path d="M-14 -22 L18 -22 L20 -18 L-16 -18 Z" fill="#152d6e"/>
          {/* Face */}
          <circle cx="0" cy="-30" r="8" fill="#dba884"/>
          {/* Arms gripping bat */}
          <path d="M-12 -8 Q-22 -18 -16 -28" stroke="#dba884" strokeWidth="6" fill="none" strokeLinecap="round"/>
          <path d="M14 -8 Q24 -18 30 -22" stroke="#dba884" strokeWidth="6" fill="none" strokeLinecap="round"/>
          {/* Bat */}
          <g className="hit-bat" style={{ transformOrigin: "30px -22px" }}>
            <line x1="30" y1="-22" x2="60" y2="-45" stroke="#d6a14a" strokeWidth="6" strokeLinecap="round"/>
            <line x1="30" y1="-22" x2="60" y2="-45" stroke="#fdd183" strokeWidth="2" strokeLinecap="round"/>
          </g>
          {/* Motion lines */}
          <path d="M40 -32 Q34 -28 30 -22" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.6"/>
        </g>
        <text x="20" y="20" fontFamily="Oswald, sans-serif" fontSize="10" fill="#fbbf24" letterSpacing="3" opacity="0.7">HITTING</text>
      </svg>
    );
  }

  if (category === "pitching") {
    return (
      <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full drill-hero-pitch" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky-p" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c4a7a"/>
            <stop offset="100%" stopColor="#d49e5e"/>
          </linearGradient>
        </defs>
        <rect width="400" height="120" fill="url(#sky-p)"/>
        <ellipse cx="200" cy="170" rx="80" ry="14" fill="#8a6939"/>
        <rect y="120" width="400" height="80" fill="#2d5b1f"/>
        {isLongToss && <g><path d="M80 60 Q200 30 320 80" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" fill="none" opacity="0.7"/><circle cx="320" cy="80" r="5" fill="#ffffff" stroke="#000" strokeWidth="0.5"/></g>}
        {/* Pitcher figure */}
        <g transform="translate(200,140)" className="pitch-pitcher">
          {/* Back leg */}
          <path d="M-2 30 Q4 18 0 0" stroke="#0a0d13" strokeWidth="10" fill="none" strokeLinecap="round"/>
          {/* Lifted leg */}
          <path d="M8 0 Q18 -8 22 -22" stroke="#0a0d13" strokeWidth="10" fill="none" strokeLinecap="round" className="pitch-leg"/>
          {/* Body */}
          <path d="M-12 -10 Q-14 8 -8 18 L10 18 Q16 8 12 -10 Z" fill="#7c2d12"/>
          <text x="0" y="10" textAnchor="middle" fontFamily="Anton, sans-serif" fontSize="14" fill="#fbbf24" fontWeight="800">7</text>
          {/* Head + cap */}
          <circle cx="0" cy="-22" r="8" fill="#dba884"/>
          <path d="M-10 -28 Q-10 -36 0 -36 Q10 -36 10 -28 L12 -22 L-12 -22 Z" fill="#7c2d12"/>
          <path d="M-12 -22 L14 -22 L16 -19 L-13 -19 Z" fill="#5a1f0a"/>
          {/* Pitching arm */}
          <path d="M-10 -10 Q-30 -22 -20 -40 Q-2 -50 12 -38" stroke="#dba884" strokeWidth="6" fill="none" strokeLinecap="round" className="pitch-arm"/>
          {/* Glove arm */}
          <path d="M10 -8 Q22 0 18 12" stroke="#dba884" strokeWidth="6" fill="none" strokeLinecap="round"/>
          <circle cx="20" cy="14" r="6" fill="#5a1f0a"/>
          {/* Ball */}
          <circle cx="12" cy="-38" r="4" fill="#ffffff" stroke="#000" strokeWidth="0.5"/>
        </g>
        <text x="20" y="20" fontFamily="Oswald, sans-serif" fontSize="10" fill="#fbbf24" letterSpacing="3" opacity="0.7">PITCHING</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 400 200" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2a4a"/>
          <stop offset="100%" stopColor="#06493a"/>
        </linearGradient>
      </defs>
      <rect width="400" height="200" fill="url(#sky-c)"/>
      <rect y="160" width="400" height="40" fill="#0d1f12"/>
      {/* Conditioning figure */}
      <g transform="translate(200,140)">
        <path d="M-12 -10 Q-14 10 -8 22 L10 22 Q16 10 12 -10 Z" fill="#0ea5e9"/>
        <circle cx="0" cy="-22" r="8" fill="#dba884"/>
        <path d="M-12 -8 L-30 -22" stroke="#dba884" strokeWidth="6" strokeLinecap="round"/>
        <path d="M12 -8 L30 -22" stroke="#dba884" strokeWidth="6" strokeLinecap="round"/>
        <path d="M-6 22 Q-14 38 -22 22" stroke="#0a0d13" strokeWidth="10" fill="none" strokeLinecap="round"/>
        <path d="M6 22 Q14 38 22 22" stroke="#0a0d13" strokeWidth="10" fill="none" strokeLinecap="round"/>
        {/* Motion lines */}
        <path d="M-40 -30 L-30 -22 M-40 -15 L-30 -10" stroke="#fbbf24" strokeWidth="2" opacity="0.6"/>
        <path d="M40 -30 L30 -22 M40 -15 L30 -10" stroke="#fbbf24" strokeWidth="2" opacity="0.6"/>
      </g>
      <text x="20" y="20" fontFamily="Oswald, sans-serif" fontSize="10" fill="#fbbf24" letterSpacing="3" opacity="0.7">CONDITIONING</text>
    </svg>
  );
}
