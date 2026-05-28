import { useState, useRef, useEffect } from "react";

const STAT_GLOSSARY: Record<string, string> = {
  "AVG": "Batting Average — hits ÷ at-bats. .300 means 3 hits per 10 ABs.",
  "OBP": "On-Base Percentage — how often you reach base.",
  "SLG": "Slugging — total bases ÷ at-bats. Power stat.",
  "OPS": "OBP + SLG. Quick overall hitting score. .800 good, .900 elite.",
  "HR": "Home Run — hit over the fence.",
  "RBI": "Run Batted In — a runner scored on your hit.",
  "R": "Run scored.",
  "H": "Hits.",
  "AB": "At-Bat — official trip to the plate (walks don't count).",
  "PA": "Plate Appearance — any trip to the plate.",
  "BB": "Walk (Base on Balls).",
  "K": "Strikeout.",
  "SB": "Stolen Base.",
  "CS": "Caught Stealing.",
  "ERA": "Earned Run Average — runs allowed per 9 innings.",
  "WHIP": "Walks + Hits per Inning Pitched.",
  "IP": "Innings Pitched.",
  "W": "Wins (pitcher).",
  "L": "Losses (pitcher).",
  "SV": "Saves — closing out a close win.",
  "HLD": "Holds — keeping a lead in the middle innings.",
  "OVR": "Overall — overall rating 1-99.",
  "GB": "Games Back — how many games behind the leader.",
  "WAR": "Wins Above Replacement — total value vs. a replacement-level player.",
  "AAV": "Average Annual Value — yearly salary in the contract."
};

interface TooltipProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
}

export function StatTip({ term, children, className = "" }: TooltipProps) {
  const def = STAT_GLOSSARY[term.toUpperCase()];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  if (!def) return <span className={className}>{children ?? term}</span>;

  return (
    <span
      ref={ref}
      className={`relative inline-block cursor-help underline decoration-dotted decoration-ink-300 underline-offset-2 ${className}`}
      onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children ?? term}
      {open && (
        <span className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1.5 glass border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-ink-100 whitespace-normal w-48 pointer-events-none shadow-2xl">
          <span className="block font-display text-xs text-accent mb-0.5">{term.toUpperCase()}</span>
          {def}
        </span>
      )}
    </span>
  );
}
