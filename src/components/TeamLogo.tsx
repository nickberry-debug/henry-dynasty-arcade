import { useMemo, useRef, useState } from "react";
import type { Team } from "../store/types";
import { teamLogoSVG } from "../generators/logo";

interface Props {
  team: Team;
  size?: number;
  variant?: "primary" | "cap" | "wordmark";
  glow?: boolean;
  className?: string;
}

export function TeamLogo({ team, size = 64, variant = "primary", glow, className }: Props) {
  // K.19 — Tap logo 10 times → throwback variant
  const tapCount = useRef(0);
  const tapTimer = useRef<any>(null);
  const [throwback, setThrowback] = useState(false);

  const effectiveTeam = useMemo(() => {
    if (!throwback) return team;
    // Throwback: shift logoVariant by half the catalog + swap accent to a parchment cream
    return {
      ...team,
      logoVariant: (team.logoVariant + 15) % 30,
      accent: "#f3e9c8",
      primary: tintTo(team.primary, "#5a3a1c", 0.18),
      secondary: tintTo(team.secondary, "#7a4b1c", 0.2)
    };
  }, [team, throwback]);

  const svg = useMemo(
    () => teamLogoSVG(effectiveTeam, { size, variant, glow }),
    [effectiveTeam, size, variant, glow]
  );

  const handleTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1200);
    if (tapCount.current >= 10) {
      tapCount.current = 0;
      setThrowback(v => !v);
    }
  };

  return (
    <span
      className={className}
      onClick={handleTap}
      style={{ display: "inline-block", width: size, height: variant === "wordmark" ? size * 0.62 : size, lineHeight: 0, cursor: "default" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function tintTo(from: string, to: string, t: number): string {
  const parse = (h: string) => {
    const x = h.replace("#", "");
    const n = parseInt(x.length === 3 ? x.split("").map(c => c + c).join("") : x, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const c = (a: number, b: number) => Math.round(a + (b - a) * t).toString(16).padStart(2, "0");
  return "#" + c(r1, r2) + c(g1, g2) + c(b1, b2);
}
