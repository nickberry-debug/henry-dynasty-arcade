// Team roster screen — per-sport deep-dive into one team's players.
// Lists every player on the team with rating bar, position, number,
// jersey colors. Tap a player to see their detail card with stats
// breakdown. Stars highlighted.

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Award } from "lucide-react";
import { Crest } from "../art/CrestGenerator";
import { TEAMS_BY_SPORT } from "./teams";
import { SPORT_CONFIGS, type SportId, type SeasonState } from "./franchise";
import { generateRoster, type Player } from "./roster";
import { athleteSpriteFor } from "./athleteSprite";
import { profileKey } from "../profiles/store";

function loadSave(sport: SportId): SeasonState | null {
  try {
    const raw = localStorage.getItem(profileKey(`dd_sports_${sport}_v1`));
    return raw ? (JSON.parse(raw) as SeasonState) : null;
  } catch { return null; }
}

const VALID_SPORTS: SportId[] = ["hockey", "basketball", "cfb"];

export default function RosterScreen() {
  const navigate = useNavigate();
  const { sport, teamId } = useParams<{ sport: string; teamId: string }>();
  const validSport = sport && VALID_SPORTS.includes(sport as SportId);
  const cfg = validSport ? SPORT_CONFIGS[sport as SportId] : null;
  const team = validSport && teamId
    ? TEAMS_BY_SPORT[sport as SportId].find(t => t.id === teamId)
    : null;
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  // Pull the live save so we can show this team's recent results inline —
  // matches Baseball Dynasty's TeamPage which has both roster + last games.
  const save = useMemo(() => cfg ? loadSave(cfg.id) : null, [cfg?.id]);
  const recentForTeam = useMemo(() => {
    if (!save || !team) return [];
    return save.results.filter(r => r.away === team.id || r.home === team.id).slice(-5);
  }, [save, team?.id]);

  const roster = useMemo<Player[]>(() => {
    if (!team || !cfg) return [];
    return generateRoster(team, cfg.id);
  }, [team?.id, cfg?.id]);
  const selectedPlayer = roster.find(p => p.id === selectedPlayerId);

  if (!cfg || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#050308" }}>
        <div className="max-w-sm w-full rounded-2xl p-5 text-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-4xl mb-2">🤔</div>
          <div className="font-display tracking-widest text-lg" style={{ color: "#fef3c7" }}>TEAM NOT FOUND</div>
          <button onClick={() => navigate("/sports")}
            className="mt-3 px-4 py-2 rounded-full font-display tracking-widest text-[11px] pressable touch-target"
            style={{ background: "#a78bfa", color: "#0a0a14" }}>
            BACK TO SPORTS HUB
          </button>
        </div>
      </div>
    );
  }

  // Group by position
  const byPos = new Map<string, Player[]>();
  for (const p of roster) {
    if (!byPos.has(p.position)) byPos.set(p.position, []);
    byPos.get(p.position)!.push(p);
  }
  const positions = Array.from(byPos.keys());

  return (
    <div className="min-h-screen pb-12" style={{
      background: `radial-gradient(900px 600px at 50% 0%, ${team.crest.primary}33, transparent 60%), linear-gradient(180deg, #0a0814 0%, #050308 100%)`,
    }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-5xl mx-auto safe-top">
        <button onClick={() => navigate(`/sports/${cfg.id}`)} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <Crest spec={team.crest} size={56} />
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: cfg.accent }}>
            {cfg.emoji} {cfg.name.toUpperCase()} · ROSTER
          </div>
          <h1 className="font-display text-xl tracking-wider" style={{ color: team.crest.secondary }}>
            {team.city} {team.nickname}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-[9px] tracking-widest opacity-70" style={{ color: "#fef3c7" }}>TEAM RTG</div>
          <div className="font-mono text-[16px]" style={{ color: team.crest.secondary }}>{team.rating}</div>
        </div>
      </header>

      <main className="px-4 max-w-5xl mx-auto space-y-3">
        {recentForTeam.length > 0 && (
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: cfg.accent }}>
                LAST {recentForTeam.length} GAME{recentForTeam.length === 1 ? "" : "S"}
              </div>
              <button onClick={() => navigate(`/sports/${cfg.id}/schedule`)}
                className="text-[10px] font-display tracking-widest pressable"
                style={{ color: cfg.accent }}>
                FULL SCHEDULE →
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {recentForTeam.map((r, i) => {
                const isHome = r.home === team!.id;
                const myScore = isHome ? r.homeScore : r.awayScore;
                const oppScore = isHome ? r.awayScore : r.homeScore;
                const won = myScore > oppScore;
                const oppId = isHome ? r.away : r.home;
                const opp = save!.teams.find(t => t.id === oppId);
                return (
                  <div key={i} className="rounded-lg px-1.5 py-1.5 text-center"
                    style={{
                      background: won ? "rgba(52,211,153,0.10)" : "rgba(239,68,68,0.10)",
                      border: `1px solid ${won ? "rgba(52,211,153,0.30)" : "rgba(239,68,68,0.30)"}`,
                    }}>
                    <div className={`font-display text-sm ${won ? "text-emerald-300" : "text-red-300"}`}>
                      {won ? "W" : "L"}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: "rgba(229,231,235,0.85)" }}>
                      {myScore}-{oppScore}
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>
                      {isHome ? "vs" : "@"} {opp?.abbr ?? "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {positions.map(pos => (
          <section key={pos} className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: cfg.accent }}>
              {posLabel(pos, cfg.id)}
            </div>
            <div className="space-y-1.5">
              {byPos.get(pos)!.map(p => (
                <button key={p.id} onClick={() => setSelectedPlayerId(p.id)}
                  className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 pressable touch-target text-left"
                  style={{
                    background: p.star
                      ? `linear-gradient(90deg, ${team.crest.primary}55, rgba(255,255,255,0.04))`
                      : "rgba(0,0,0,0.3)",
                    border: `1px solid ${p.star ? team.crest.secondary : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {/* Player avatar — real Kenney sports-pack athlete sprite,
                   *  palette bucketed from team primary color, variant chosen
                   *  deterministically by player id. */}
                  <img
                    src={athleteSpriteFor(p.id, team.crest.primary).url}
                    alt=""
                    aria-hidden="true"
                    width={36}
                    height={36}
                    style={{
                      width: 36, height: 36, objectFit: "contain",
                      filter: `drop-shadow(0 1px 3px ${team.crest.primary})`,
                    }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0.2"; }}
                  />
                  <span className="font-mono text-[10px] w-6 text-center"
                    style={{ color: team.crest.secondary }}>#{p.number}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[12px] truncate flex items-center gap-1.5" style={{ color: "#fef3c7" }}>
                      {p.name}
                      {p.star && <Star size={10} fill={team.crest.secondary} style={{ color: team.crest.secondary }} />}
                    </div>
                    {/* Mini rating bar */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="flex-1 h-1 rounded-full overflow-hidden"
                        style={{ background: "rgba(0,0,0,0.5)" }}>
                        <div className="h-full rounded-full"
                          style={{
                            width: `${(p.rating - 50) * 2.2}%`,
                            background: p.rating >= 90 ? "#fde047"
                                      : p.rating >= 80 ? "#86efac"
                                      : p.rating >= 70 ? "#67e8f9"
                                      : "#9ca3af",
                          }} />
                      </div>
                      <span className="font-mono text-[10px] w-6 text-right" style={{ color: team.crest.secondary }}>
                        {p.rating}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Player detail modal */}
      {selectedPlayer && (
        <PlayerDetail
          player={selectedPlayer}
          team={team}
          cfg={cfg}
          roster={roster}
          onClose={() => setSelectedPlayerId(null)}
          onPick={(id) => setSelectedPlayerId(id)}
        />
      )}
    </div>
  );
}

function posLabel(pos: string, sport: SportId): string {
  if (sport === "hockey") {
    return pos === "G" ? "GOALIES" : pos === "D" ? "DEFENSEMEN"
         : pos === "C" ? "CENTERS" : pos === "LW" ? "LEFT WINGS" : "RIGHT WINGS";
  }
  if (sport === "basketball") {
    return pos === "PG" ? "POINT GUARDS" : pos === "SG" ? "SHOOTING GUARDS"
         : pos === "SF" ? "SMALL FORWARDS" : pos === "PF" ? "POWER FORWARDS" : "CENTERS";
  }
  // CFB
  return pos === "QB" ? "QUARTERBACKS" : pos === "RB" ? "RUNNING BACKS"
       : pos === "WR" ? "WIDE RECEIVERS" : pos === "TE" ? "TIGHT ENDS"
       : pos === "OL" ? "OFFENSIVE LINE" : pos === "DL" ? "DEFENSIVE LINE"
       : pos === "LB" ? "LINEBACKERS" : pos === "DB" ? "DEFENSIVE BACKS"
       : "SPECIAL TEAMS";
}

function PlayerDetail({ player, team, cfg, roster, onClose, onPick }: {
  player: Player;
  team: ReturnType<typeof useParams> extends infer T ? any : never;
  cfg: { id: SportId; accent: string; emoji: string };
  roster: Player[];
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  // Compute synthetic stat lines from rating + position
  const stats = useMemo(() => statsFor(player, cfg.id), [player.id, cfg.id]);
  const idx = roster.findIndex(p => p.id === player.id);
  const prev = idx > 0 ? roster[idx - 1] : null;
  const next = idx < roster.length - 1 ? roster[idx + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="max-w-md w-full rounded-2xl p-4"
        style={{
          background: `linear-gradient(135deg, ${team.crest.primary}55, rgba(15,8,22,0.97))`,
          border: `1.5px solid ${team.crest.secondary}`,
          maxHeight: "85vh", overflowY: "auto",
        }}>
        <div className="flex items-center gap-3">
          <img
            src={athleteSpriteFor(player.id, team.crest.primary).url}
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            style={{
              width: 64, height: 64, objectFit: "contain",
              filter: `drop-shadow(0 2px 6px ${team.crest.primary})`,
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-widest" style={{ color: team.crest.secondary }}>
              #{player.number} · {player.position} · {team.city} {team.nickname}
            </div>
            <div className="font-display text-xl flex items-center gap-1.5" style={{ color: "#fef3c7" }}>
              {player.name}
              {player.star && <Star size={14} fill={team.crest.secondary} style={{ color: team.crest.secondary }} />}
            </div>
            <div className="text-[10px] opacity-70" style={{ color: "#fef3c7" }}>
              Age {player.age} · {cfg.id === "cfb" ? classYear(player.years) : `Year ${player.years} on team`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[8px] tracking-widest opacity-70" style={{ color: "#fef3c7" }}>OVR</div>
            <div className="font-display text-3xl" style={{ color: team.crest.secondary }}>{player.rating}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {stats.map(s => (
            <div key={s.label} className="rounded-lg p-2"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[9px] tracking-widest opacity-70" style={{ color: cfg.accent }}>{s.label}</div>
              <div className="font-mono text-base mt-0.5" style={{ color: "#fef3c7" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {player.star && (
          <div className="mt-3 rounded-lg p-2 flex items-center gap-2"
            style={{ background: `${team.crest.secondary}22`, border: `1px solid ${team.crest.secondary}66` }}>
            <Award size={14} style={{ color: team.crest.secondary }} />
            <div className="text-[11px]" style={{ color: "#fef3c7" }}>
              Franchise cornerstone — {player.name} is your team's signature player.
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => prev && onPick(prev.id)} disabled={!prev}
            className="flex-1 py-2 rounded-lg text-[10px] font-display tracking-widest pressable touch-target"
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fef3c7", opacity: prev ? 1 : 0.3,
            }}>
            <ChevronLeft size={12} className="inline mr-1" /> PREV
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-[10px] font-display tracking-widest pressable touch-target"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
            CLOSE
          </button>
          <button onClick={() => next && onPick(next.id)} disabled={!next}
            className="flex-1 py-2 rounded-lg text-[10px] font-display tracking-widest pressable touch-target"
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fef3c7", opacity: next ? 1 : 0.3,
            }}>
            NEXT <ChevronRight size={12} className="inline ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}

function classYear(years: number): string {
  return ["Freshman", "Sophomore", "Junior", "Senior"][Math.max(0, Math.min(3, years - 1))];
}

function statsFor(p: Player, sport: SportId): Array<{ label: string; value: string }> {
  const r = p.rating;
  // Derived stats — illustrative, not simulated.
  if (sport === "hockey") {
    if (p.position === "G") {
      return [
        { label: "GP",    value: String(40 + Math.floor(r / 4)) },
        { label: "GAA",   value: ((3.5 - (r - 60) * 0.03)).toFixed(2) },
        { label: "SV %",  value: (0.880 + (r - 60) * 0.0015).toFixed(3) },
        { label: "SO",    value: String(Math.max(0, Math.floor((r - 75) * 0.4))) },
      ];
    }
    return [
      { label: "GP",  value: String(60 + Math.floor(r / 5)) },
      { label: "G",   value: String(Math.max(2, Math.floor((r - 50) * 0.6))) },
      { label: "A",   value: String(Math.max(3, Math.floor((r - 50) * 0.9))) },
      { label: "+/-", value: String(Math.floor((r - 70) * 0.5)) },
    ];
  }
  if (sport === "basketball") {
    return [
      { label: "GP",   value: String(50 + Math.floor(r / 6)) },
      { label: "PPG",  value: ((r - 50) * 0.4).toFixed(1) },
      { label: "RPG",  value: ((r - 60) * 0.15 + (p.position === "C" ? 4 : p.position === "PF" ? 3 : 1)).toFixed(1) },
      { label: "APG",  value: ((r - 60) * 0.12 + (p.position === "PG" ? 5 : p.position === "SG" ? 3 : 1)).toFixed(1) },
      { label: "FG %", value: (0.40 + (r - 60) * 0.004).toFixed(3) },
      { label: "3P %", value: (0.28 + (r - 60) * 0.003).toFixed(3) },
    ];
  }
  // CFB
  if (p.position === "QB") {
    return [
      { label: "GP",  value: "12" },
      { label: "YDS", value: String(2200 + (r - 60) * 90) },
      { label: "TD",  value: String(Math.max(5, Math.floor((r - 60) * 0.7))) },
      { label: "INT", value: String(Math.max(3, Math.floor(15 - (r - 60) * 0.25))) },
    ];
  }
  if (p.position === "RB") {
    return [
      { label: "GP",  value: "12" },
      { label: "ATT", value: String(120 + (r - 60) * 6) },
      { label: "YDS", value: String(500 + (r - 60) * 35) },
      { label: "TD",  value: String(Math.max(2, Math.floor((r - 60) * 0.4))) },
    ];
  }
  if (p.position === "WR" || p.position === "TE") {
    return [
      { label: "GP",  value: "12" },
      { label: "REC", value: String(20 + (r - 60) * 1.5) },
      { label: "YDS", value: String(300 + (r - 60) * 22) },
      { label: "TD",  value: String(Math.max(1, Math.floor((r - 60) * 0.35))) },
    ];
  }
  // Defense / OL — show tackles, sacks, INTs as appropriate.
  return [
    { label: "GP",   value: "12" },
    { label: "TKL",  value: String(20 + (r - 60) * 2) },
    { label: "SACK", value: ((r - 65) * 0.3).toFixed(1) },
    { label: "INT",  value: String(Math.max(0, Math.floor((r - 75) * 0.3))) },
  ];
}
