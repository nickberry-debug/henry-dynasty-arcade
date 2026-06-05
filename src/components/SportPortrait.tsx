// Unified sport-player portrait.
//
// Goal: every sport's player face uses the SAME headshot composer
// (src/generators/portrait.ts) so a baseball card, football card, and
// any future hockey/basketball/college-football card all share the same
// proportions, lighting, and chrome — only the helmet/cap/jersey changes.
//
// The portrait composer is keyed by `player.appearance` + `portraitSeed`,
// which both Baseball and Football already populate on their player
// records. We adapt the football shape to the composer's expected Player
// shape via a thin adapter so the SAME function renders both.

import { useMemo } from "react";
import type { Player as BaseballPlayer, Team as BaseballTeam } from "../store/types";
import { portraitSVG } from "../generators/portrait";

interface FootballLike {
  id: string;
  name: string;
  jersey: number;            // football uses `jersey`
  position: string;
  age: number;
  overall: number;
  appearance: { skinTone: number; hairStyle: number; faceShape: number; portraitSeed: number };
}

interface FootballTeamLike {
  id: string;
  primary: string;
  secondary?: string;
  accent?: string;
}

interface Props {
  /** Provide either a baseball player or a football-shaped player. */
  player: BaseballPlayer | FootballLike;
  /** Team color source for the jersey/cap stripes. */
  team: BaseballTeam | FootballTeamLike | null;
  size?: number;
  /** Sport hint for helmet vs cap selection (defaults to baseball). */
  sport?: "baseball" | "football";
  className?: string;
}

/** Adapt a FootballLike shape to the BaseballPlayer shape the portrait
 *  composer expects. Cast through unknown — the composer only reads
 *  appearance, portraitSeed, jerseyNumber, name, and overall; everything
 *  else can be missing. */
function asBaseballPlayer(p: FootballLike | BaseballPlayer): BaseballPlayer {
  if ("jerseyNumber" in p) return p as BaseballPlayer;
  const fb = p as FootballLike;
  return {
    id: fb.id,
    name: fb.name,
    firstName: fb.name.split(" ")[0] ?? fb.name,
    lastName: fb.name.split(" ").slice(1).join(" ") ?? "",
    age: fb.age,
    overall: fb.overall,
    jerseyNumber: fb.jersey,
    portraitSeed: fb.appearance.portraitSeed,
    appearance: fb.appearance,
  } as unknown as BaseballPlayer;
}

function asBaseballTeam(t: BaseballTeam | FootballTeamLike | null): BaseballTeam | null {
  if (!t) return null;
  if ("city" in t) return t as BaseballTeam;
  const ft = t as FootballTeamLike;
  return {
    id: ft.id,
    abbr: "",
    city: "",
    name: "",
    primary: ft.primary,
    secondary: ft.secondary ?? ft.primary,
    accent: ft.accent ?? "#fef3c7",
  } as BaseballTeam;
}

export function SportPortrait({ player, team, size = 96, sport = "baseball", className }: Props) {
  const svg = useMemo(
    () => portraitSVG(asBaseballPlayer(player), asBaseballTeam(team), {
      size, pose: "neutral",
      starQuality: player.overall >= 90,
    }),
    // The portrait composer is content-addressable by these inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      player.id,
      (player as FootballLike).appearance?.portraitSeed
        ?? (player as BaseballPlayer).portraitSeed,
      (player as { appearance?: { skinTone?: number } }).appearance?.skinTone,
      (player as { appearance?: { hairStyle?: number } }).appearance?.hairStyle,
      (player as { appearance?: { faceShape?: number } }).appearance?.faceShape,
      (team as { id?: string } | null)?.id,
      (team as { primary?: string } | null)?.primary,
      size, player.overall, sport,
    ]
  );
  return (
    <span className={className}
      style={{ display: "inline-block", width: size, height: size * 1.25, lineHeight: 0 }}>
      <span dangerouslySetInnerHTML={{ __html: svg }} />
    </span>
  );
}
