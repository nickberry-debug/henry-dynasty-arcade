import { useMemo, useRef, useState } from "react";
import type { Player, Team } from "../store/types";
import { portraitSVG } from "../generators/portrait";
import { funFact } from "../utils/funFacts";

interface Props {
  player: Player;
  team: Team | null;
  size?: number;
  pose?: "neutral" | "batting" | "pitching" | "catcher";
  className?: string;
}

export function PlayerPortrait({ player, team, size = 96, pose = "neutral", className }: Props) {
  const svg = useMemo(
    () => portraitSVG(player, team, { size, pose, starQuality: player.overall >= 90 }),
    [player.id, player.portraitSeed, player.appearance, team?.id, team?.primary, team?.secondary, size, pose, player.overall, player.jerseyNumber]
  );
  // K.23 — Tap portrait 7 times → fun facts popover
  const tapCount = useRef(0);
  const tapTimer = useRef<any>(null);
  const [funFacts, setFunFacts] = useState<string[] | null>(null);
  const handleTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1200);
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      setFunFacts(funFact(player));
    }
  };
  return (
    <span
      className={className}
      onClick={handleTap}
      style={{ display: "inline-block", width: size, height: size * 1.25, lineHeight: 0, position: "relative" }}
    >
      <span dangerouslySetInnerHTML={{ __html: svg }} />
      {funFacts && (
        <span
          role="dialog"
          aria-label={`Fun facts about ${player.name}`}
          className="absolute z-50 top-full left-0 mt-1 glass rounded-xl p-3 w-56 text-left text-xs"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => { e.stopPropagation(); setFunFacts(null); }}
        >
          <span className="block font-display text-accent text-[11px] tracking-widest mb-1">FUN FACTS</span>
          <ul className="space-y-1">
            {funFacts.map((f, i) => <li key={i} className="leading-snug">• {f}</li>)}
          </ul>
        </span>
      )}
    </span>
  );
}
