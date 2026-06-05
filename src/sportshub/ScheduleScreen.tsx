// Sports Hub — full schedule view for Hockey / Basketball / CFB.
// Shows every game in the season, grouped by week, with played results
// inline and tap-to-view detail for any played game. Mirrors Baseball
// Dynasty's Schedule.tsx so each sport has the same depth available.

import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { Crest } from "../art/CrestGenerator";
import { TEAMS_BY_SPORT } from "./teams";
import { SPORT_CONFIGS, type SportId, type SeasonState, type Result } from "./franchise";
import { profileKey } from "../profiles/store";

const VALID_SPORTS: SportId[] = ["hockey", "basketball", "cfb"];

function saveKey(sport: SportId): string { return profileKey(`dd_sports_${sport}_v1`); }

function loadSave(sport: SportId): SeasonState | null {
  try {
    const raw = localStorage.getItem(saveKey(sport));
    return raw ? (JSON.parse(raw) as SeasonState) : null;
  } catch { return null; }
}

export default function ScheduleScreen() {
  const navigate = useNavigate();
  const { sport } = useParams<{ sport: string }>();
  const validSport = sport && VALID_SPORTS.includes(sport as SportId);
  const cfg = validSport ? SPORT_CONFIGS[sport as SportId] : null;
  const state = useMemo(() => validSport ? loadSave(sport as SportId) : null, [sport]);
  const [openGame, setOpenGame] = useState<Result | null>(null);

  if (!cfg || !state || !validSport) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#050308" }}>
        <div className="max-w-sm w-full rounded-2xl p-5 text-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-4xl mb-2">📅</div>
          <div className="font-display tracking-widest text-lg" style={{ color: "#fef3c7" }}>NO SEASON IN PROGRESS</div>
          <div className="text-[12px] mt-2 mb-3" style={{ color: "rgba(229,231,235,0.7)" }}>
            Pick a team and start a season to see the schedule.
          </div>
          <button onClick={() => navigate(`/sports/${sport ?? ""}`)}
            className="mt-2 px-4 py-2 rounded-full font-display tracking-widest text-[11px] pressable touch-target"
            style={{ background: "#a78bfa", color: "#0a0a14" }}>
            BACK TO SPORTS HUB
          </button>
        </div>
      </div>
    );
  }

  const teamById = new Map(state.teams.map(t => [t.id, t]));
  const resultsByKey = new Map<string, Result>(
    state.results.map(r => [`${r.week}|${r.away}|${r.home}`, r])
  );
  const playerTeam = teamById.get(state.playerTeamId);

  // Group schedule by week.
  const byWeek = new Map<number, typeof state.schedule>();
  for (const g of state.schedule) {
    if (!byWeek.has(g.week)) byWeek.set(g.week, []);
    byWeek.get(g.week)!.push(g);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);

  return (
    <div className="min-h-screen pb-12" style={{
      background: `radial-gradient(900px 600px at 50% 0%, ${cfg.accent}1f, transparent 60%), linear-gradient(180deg, #0a0814 0%, #050308 100%)`,
    }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-5xl mx-auto safe-top">
        <button onClick={() => navigate(`/sports/${sport}`)} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: cfg.accent }}>
            {cfg.emoji} {cfg.name.toUpperCase()} · YEAR {state.year}
          </div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fef3c7" }}>
            FULL SCHEDULE
          </h1>
        </div>
        <div className="text-right text-[10px]" style={{ color: "rgba(229,231,235,0.7)" }}>
          {state.results.length} / {state.schedule.length}<br />
          <span style={{ color: cfg.accent }}>played</span>
        </div>
      </header>

      <main className="px-4 max-w-5xl mx-auto space-y-3">
        {weeks.map(w => {
          const games = byWeek.get(w)!;
          const isCurrent = w === state.currentWeek;
          const isPast = w < state.currentWeek;
          return (
            <section key={w} className="rounded-2xl p-3"
              style={{
                background: isCurrent ? `${cfg.accent}14` : "rgba(255,255,255,0.04)",
                border: `1px solid ${isCurrent ? `${cfg.accent}66` : "rgba(255,255,255,0.10)"}`,
              }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: isCurrent ? cfg.accent : "#fef3c7" }}>
                  WEEK {w}
                  {isCurrent && <span className="ml-2 px-2 py-0.5 rounded-full text-[9px]" style={{ background: cfg.accent, color: "#0a0a14" }}>CURRENT</span>}
                </div>
                <div className="text-[10px] opacity-70" style={{ color: "#fef3c7" }}>
                  {games.filter(g => resultsByKey.has(`${g.week}|${g.away}|${g.home}`)).length} / {games.length}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {games.map(g => {
                  const away = teamById.get(g.away);
                  const home = teamById.get(g.home);
                  if (!away || !home) return null;
                  const result = resultsByKey.get(`${g.week}|${g.away}|${g.home}`);
                  const isPlayerGame = g.away === state.playerTeamId || g.home === state.playerTeamId;
                  return (
                    <button key={`${g.week}|${g.away}|${g.home}`}
                      onClick={() => result && setOpenGame(result)}
                      disabled={!result}
                      className="rounded-lg px-2 py-2 text-left pressable touch-target flex items-center gap-1.5"
                      style={{
                        background: isPlayerGame ? `${cfg.accent}1a` : "rgba(0,0,0,0.3)",
                        border: `1px solid ${isPlayerGame ? `${cfg.accent}55` : "rgba(255,255,255,0.08)"}`,
                        opacity: !result && isPast ? 0.5 : 1,
                      }}>
                      <Crest spec={away.crest} size={18} />
                      <span className="font-display text-[10px]"
                        style={{ color: result && result.awayScore > result.homeScore ? cfg.accent : "rgba(229,231,235,0.75)" }}>
                        {away.abbr}
                      </span>
                      {result ? (
                        <span className="font-mono text-[10px]"
                          style={{ color: result.awayScore > result.homeScore ? cfg.accent : "rgba(229,231,235,0.55)" }}>
                          {result.awayScore}
                        </span>
                      ) : <span className="text-[9px] opacity-60" style={{ color: "#fef3c7" }}>@</span>}
                      {result ? (
                        <span className="font-mono text-[10px]"
                          style={{ color: result.homeScore > result.awayScore ? cfg.accent : "rgba(229,231,235,0.55)" }}>
                          {result.homeScore}
                        </span>
                      ) : <span className="text-[9px] opacity-60" style={{ color: "#fef3c7" }}>at</span>}
                      <span className="font-display text-[10px]"
                        style={{ color: result && result.homeScore > result.awayScore ? cfg.accent : "rgba(229,231,235,0.75)" }}>
                        {home.abbr}
                      </span>
                      <Crest spec={home.crest} size={18} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {weeks.length === 0 && (
          <div className="text-center py-12 text-[12px]" style={{ color: "rgba(229,231,235,0.65)" }}>
            No games scheduled yet.
          </div>
        )}
      </main>

      {openGame && (
        <GameDetailModal game={openGame}
          state={state}
          sport={sport as SportId}
          onClose={() => setOpenGame(null)}
          onPickTeam={tid => { setOpenGame(null); navigate(`/sports/${sport}/team/${tid}`); }}
        />
      )}

      {playerTeam && (
        <div className="fixed bottom-3 left-3 right-3 max-w-5xl mx-auto safe-bottom">
          <button onClick={() => navigate(`/sports/${sport}`)}
            className="w-full rounded-xl px-4 py-3 font-display tracking-widest text-[11px] pressable touch-target"
            style={{
              background: `linear-gradient(135deg, ${playerTeam.crest.primary}cc, ${playerTeam.crest.primary}66)`,
              border: `1px solid ${playerTeam.crest.secondary}`,
              color: "#fef3c7",
              backdropFilter: "blur(6px)",
            }}>
            ← BACK TO {playerTeam.abbr} SEASON
          </button>
        </div>
      )}
    </div>
  );
}

// ── Game Detail Modal ───────────────────────────────────────────────

function GameDetailModal({ game, state, sport, onClose, onPickTeam }: {
  game: Result;
  state: SeasonState;
  sport: SportId;
  onClose: () => void;
  onPickTeam: (teamId: string) => void;
}) {
  const cfg = SPORT_CONFIGS[sport];
  const away = state.teams.find(t => t.id === game.away)!;
  const home = state.teams.find(t => t.id === game.home)!;
  const awayWon = game.awayScore > game.homeScore;
  const homeWon = game.homeScore > game.awayScore;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="max-w-md w-full rounded-2xl p-4"
        style={{
          background: `linear-gradient(135deg, ${cfg.accent}22, rgba(15,8,22,0.97))`,
          border: `1.5px solid ${cfg.accent}`,
        }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] tracking-widest font-display" style={{ color: cfg.accent }}>
            WEEK {game.week} · FINAL
          </div>
          <button onClick={onClose}
            className="px-3 py-1 rounded text-[10px] font-display tracking-widest pressable"
            style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>CLOSE</button>
        </div>

        <div className="grid grid-cols-3 items-center gap-3 mb-4">
          <button onClick={() => onPickTeam(away.id)} className="flex flex-col items-center gap-1 pressable">
            <Crest spec={away.crest} size={56} />
            <div className="text-[11px] font-display" style={{ color: "#fef3c7" }}>{away.abbr}</div>
            <div className="font-mono text-2xl" style={{ color: awayWon ? cfg.accent : "rgba(229,231,235,0.55)" }}>
              {game.awayScore}
            </div>
          </button>
          <div className="text-center text-[10px]" style={{ color: "rgba(229,231,235,0.55)" }}>
            <div className="font-display tracking-widest">AT</div>
            <div className="mt-1">{awayWon ? `${away.abbr} WIN` : homeWon ? `${home.abbr} WIN` : "TIE"}</div>
          </div>
          <button onClick={() => onPickTeam(home.id)} className="flex flex-col items-center gap-1 pressable">
            <Crest spec={home.crest} size={56} />
            <div className="text-[11px] font-display" style={{ color: "#fef3c7" }}>{home.abbr}</div>
            <div className="font-mono text-2xl" style={{ color: homeWon ? cfg.accent : "rgba(229,231,235,0.55)" }}>
              {game.homeScore}
            </div>
          </button>
        </div>

        <div className="rounded-lg p-3 grid grid-cols-2 gap-3 text-[11px]"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div className="text-[9px] tracking-widest opacity-60 mb-1" style={{ color: "#fef3c7" }}>{away.city.toUpperCase()} STAR</div>
            <div className="font-display" style={{ color: cfg.accent }}>
              {away.star.pos} {away.star.name}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>
              {synthLine(sport, away.star.pos, game.awayScore)}
            </div>
          </div>
          <div>
            <div className="text-[9px] tracking-widest opacity-60 mb-1" style={{ color: "#fef3c7" }}>{home.city.toUpperCase()} STAR</div>
            <div className="font-display" style={{ color: cfg.accent }}>
              {home.star.pos} {home.star.name}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.7)" }}>
              {synthLine(sport, home.star.pos, game.homeScore)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Synthetic but plausible star-of-the-game stat line — derived from the
// star's position and the team's score so the line is consistent with the
// box score the player just saw, without us needing to actually simulate
// individual plays for every result.
function synthLine(sport: SportId, pos: string, teamScore: number): string {
  if (sport === "hockey") {
    if (pos === "G") {
      const sa = 25 + Math.round(Math.random() * 15);
      const ga = Math.max(0, Math.round((sa - 28) * 0.7));
      return `${sa - ga} saves, ${ga} GA`;
    }
    const goals = teamScore >= 3 ? 1 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 2);
    const assists = Math.floor(Math.random() * 3);
    return `${goals} G, ${assists} A`;
  }
  if (sport === "basketball") {
    const pts = Math.round(teamScore * (0.18 + Math.random() * 0.10));
    const reb = pos === "C" || pos === "PF" ? 7 + Math.floor(Math.random() * 6) : 3 + Math.floor(Math.random() * 4);
    const ast = pos === "PG" ? 6 + Math.floor(Math.random() * 6) : 2 + Math.floor(Math.random() * 4);
    return `${pts} PTS, ${reb} REB, ${ast} AST`;
  }
  // CFB
  if (pos === "QB") {
    const yds = 180 + Math.floor(Math.random() * 200);
    const td = Math.max(0, Math.round(teamScore / 8) + Math.floor(Math.random() * 2) - 1);
    return `${yds} yds, ${td} TD`;
  }
  if (pos === "RB") {
    const car = 14 + Math.floor(Math.random() * 12);
    const yds = car * (3 + Math.floor(Math.random() * 4));
    return `${car} car, ${yds} yds`;
  }
  if (pos === "WR") {
    const rec = 4 + Math.floor(Math.random() * 6);
    const yds = rec * (10 + Math.floor(Math.random() * 12));
    return `${rec} rec, ${yds} yds`;
  }
  const tkl = 5 + Math.floor(Math.random() * 7);
  return `${tkl} tackles`;
}

// Re-export expand-collapse icon set so they're tree-shaken into this chunk.
export { ChevronDown, ChevronRight };
