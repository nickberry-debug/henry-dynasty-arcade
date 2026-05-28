import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { useFootball } from "../store";
import { ArrowLeft, X, CalendarDays, Trophy, Newspaper, UserPlus, ScrollText, ArrowRight } from "lucide-react";
import type { FootballPlayer, FootballLeague, FootballTeam } from "../types";

export function FootballTeams() {
  const lg = useFootball(s => s.league);
  if (!lg) return <div className="p-8">No league</div>;
  return (
    <div className="space-y-4 pb-32">
      <header className="flex items-center gap-3">
        <Link to="/football" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center pressable touch-target"><ArrowLeft size={18} /></Link>
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>{lg.teams.length} franchises</div>
          <h1 className="font-display text-3xl">TEAMS</h1>
        </div>
      </header>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lg.teams.map(t => {
          const players = lg.players.filter(p => p.teamId === t.id);
          const ovr = Math.round(players.sort((a, b) => b.overall - a.overall).slice(0, 22).reduce((s, p) => s + p.overall, 0) / 22);
          return (
            <Link key={t.id} to={`/football/team/${t.id}`} className="text-left p-4 rounded-2xl border border-white/10 hover:border-amber-400 bg-white/3 pressable touch-target" style={{ background: `linear-gradient(135deg, ${t.primary}33, transparent 60%)` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-xl" style={{ background: t.primary, color: t.accent }}>{t.abbr}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display tracking-wide truncate">{t.city} {t.name}</div>
                  <div className="text-[10px] text-ink-300">Division {t.divisionId + 1}</div>
                </div>
                {t.id === lg.userTeamId && <div className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-ink-950 font-display tracking-widest">YOURS</div>}
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-200">
                <span>{t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ""}</span>
                <span className="text-ink-500">·</span>
                <span>OVR {ovr}</span>
                <span className="text-ink-500">·</span>
                <span>{t.pointsFor} PF</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function FootballTeamPage() {
  const { id } = useParams<{ id: string }>();
  const lg = useFootball(s => s.league);
  const [openPlayer, setOpenPlayer] = useState<FootballPlayer | null>(null);
  if (!lg) return <div className="p-8">No league</div>;
  const t = lg.teams.find(x => x.id === id);
  if (!t) return <div className="p-8">Team not found</div>;
  const roster = lg.players.filter(p => p.teamId === t.id).sort((a, b) => positionOrder(a.position) - positionOrder(b.position) || b.overall - a.overall);
  const byPos = Object.entries(roster.reduce((acc, p) => { (acc[p.position] = acc[p.position] || []).push(p); return acc; }, {} as Record<string, typeof roster>));

  const recent = lg.schedule.filter(g => g.played && (g.homeId === t.id || g.awayId === t.id)).slice(-5).reverse();
  const isUserTeam = t.id === lg.userTeamId;

  return (
    <div className="space-y-4 pb-32">
      {/* HEADER — bigger, branded with team colors */}
      <header
        className="relative rounded-2xl overflow-hidden p-5 border"
        style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.primary}88 60%, rgba(8,12,16,0.92))`, borderColor: `${t.accent}55` }}
      >
        <div className="absolute inset-0" style={{ background: `radial-gradient(800px 320px at 95% -10%, ${t.accent}40, transparent 55%)` }} />
        <div className="relative flex items-center gap-4">
          <Link to="/football/teams" className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center pressable touch-target shrink-0"><ArrowLeft size={18} /></Link>
          <div className="w-20 h-20 rounded-xl flex items-center justify-center font-display text-3xl shrink-0 shadow-xl" style={{ background: t.primary, color: t.accent, border: `2px solid ${t.accent}` }}>{t.abbr}</div>
          <div className="flex-1 min-w-0">
            {isUserTeam && <div className="text-[9px] tracking-[0.35em] font-display" style={{ color: t.accent }}>YOUR FRANCHISE</div>}
            <div className="font-display text-xl leading-tight" style={{ color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>{t.city}</div>
            <div className="font-display text-2xl leading-none" style={{ color: t.accent, textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>{t.name.toUpperCase()}</div>
            <div className="text-white/90 text-xs mt-1.5 font-mono">
              {t.wins}-{t.losses}{t.ties ? `-${t.ties}` : ""} · PF {t.pointsFor} · PA {t.pointsAgainst}
            </div>
          </div>
        </div>
      </header>

      {/* MANAGE strip — only on the user's own team. Surfaces every
          franchise destination so the team page acts as the manage hub. */}
      {isUserTeam && <FootballManageStrip lg={lg} team={t} />}

      {recent.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-widest font-display mb-2" style={{ color: "#FFB81C" }}>Recent</div>
          <div className="space-y-1">
            {recent.map(g => {
              const opp = lg.teams.find(x => x.id === (g.homeId === t.id ? g.awayId : g.homeId))!;
              const myScore = g.homeId === t.id ? g.score?.home : g.score?.away;
              const oppScore = g.homeId === t.id ? g.score?.away : g.score?.home;
              const won = (myScore ?? 0) > (oppScore ?? 0);
              return (
                <Link key={g.id} to={`/football/game/${g.id}`} className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/5 text-sm pressable touch-target">
                  <span className={`font-mono w-4 ${won ? "text-emerald-400" : "text-red-400"}`}>{won ? "W" : "L"}</span>
                  <span className="text-ink-300 text-xs">{g.homeId === t.id ? "vs" : "@"}</span>
                  <span className="font-display">{opp.abbr}</span>
                  <span className="flex-1 text-right font-mono">{myScore}-{oppScore}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-4">
        <div className="text-[10px] uppercase tracking-widest font-display mb-3" style={{ color: "#FFB81C" }}>Roster ({roster.length})</div>
        <div className="space-y-3">
          {byPos.map(([pos, list]) => (
            <div key={pos}>
              <div className="text-[10px] text-ink-300 uppercase tracking-widest font-display mb-1">{pos}</div>
              <div className="space-y-1">
                {list.slice(0, 5).map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setOpenPlayer(p)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/3 hover:bg-white/8 text-sm pressable touch-target"
                  >
                    <span className="font-mono text-[10px] text-ink-300 w-5">{i === 0 ? "S1" : `B${i}`}</span>
                    <span className="font-mono text-[10px] w-7 text-ink-300">#{p.jersey}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    {p.injury && <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/30 text-red-200" title={p.injury.name}>IL</span>}
                    <span className="text-[10px] text-ink-300">Age {p.age}</span>
                    <span className={`text-xs font-mono font-bold w-8 text-right ${p.overall >= 85 ? "text-emerald-300" : p.overall >= 75 ? "text-amber-300" : "text-ink-200"}`}>{p.overall}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {openPlayer && (
        <FootballPlayerModal player={openPlayer} team={t} onClose={() => setOpenPlayer(null)} />
      )}
    </div>
  );
}

function FootballPlayerModal({ player, team, onClose }: { player: FootballPlayer; team: any; onClose: () => void }) {
  const ratings = player.ratings;
  // Pick the position-relevant ratings to show, instead of dumping the whole object.
  const relevantKeys: Array<{ key: keyof typeof ratings; label: string }> = (() => {
    if (player.position === "QB") return [
      { key: "armStrength", label: "Arm Strength" }, { key: "accuracy", label: "Accuracy" }, { key: "decision", label: "Decision" }, { key: "composure", label: "Composure" }, { key: "stamina", label: "Stamina" },
    ];
    if (player.position === "RB" || player.position === "FB") return [
      { key: "speed", label: "Speed" }, { key: "agility", label: "Agility" }, { key: "breakTackle", label: "Break Tackle" }, { key: "hands", label: "Hands" }, { key: "stamina", label: "Stamina" },
    ];
    if (player.position === "WR" || player.position === "TE") return [
      { key: "speed", label: "Speed" }, { key: "hands", label: "Hands" }, { key: "routeRunning", label: "Route Running" }, { key: "agility", label: "Agility" }, { key: "stamina", label: "Stamina" },
    ];
    if (player.position === "OL") return [
      { key: "blocking", label: "Blocking" }, { key: "awareness", label: "Awareness" }, { key: "stamina", label: "Stamina" }, { key: "composure", label: "Composure" },
    ];
    if (player.position === "DL") return [
      { key: "passRush", label: "Pass Rush" }, { key: "runDefense", label: "Run Defense" }, { key: "tackling", label: "Tackling" }, { key: "stamina", label: "Stamina" },
    ];
    if (player.position === "LB") return [
      { key: "tackling", label: "Tackling" }, { key: "runDefense", label: "Run Defense" }, { key: "coverage", label: "Coverage" }, { key: "awareness", label: "Awareness" }, { key: "stamina", label: "Stamina" },
    ];
    if (player.position === "CB" || player.position === "S") return [
      { key: "coverage", label: "Coverage" }, { key: "speed", label: "Speed" }, { key: "tackling", label: "Tackling" }, { key: "awareness", label: "Awareness" },
    ];
    if (player.position === "K" || player.position === "P") return [
      { key: "kickPower", label: "Kick Power" }, { key: "kickAccuracy", label: "Kick Accuracy" }, { key: "composure", label: "Composure" },
    ];
    return [{ key: "stamina", label: "Stamina" }, { key: "composure", label: "Composure" }];
  })();

  const stats = player.seasonStats;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl"
        style={{ background: "linear-gradient(180deg, #1A2526 0%, #0a0d13 100%)", border: "1px solid rgba(255,184,28,0.3)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ background: "rgba(26,37,38,0.95)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-display text-sm" style={{ background: team.primary, color: team.accent }}>{team.abbr}</div>
            <div className="min-w-0">
              <div className="font-display text-base truncate">{player.name}</div>
              <div className="text-[10px] text-ink-300 uppercase tracking-widest">#{player.jersey} · {player.position} · Age {player.age}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/5 pressable touch-target"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Overall" value={player.overall} accent />
            <Stat label="Potential" value={player.potential} />
            <Stat label="Morale" value={player.morale} />
          </div>

          {player.injury && (
            <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(199,80,80,0.15)", border: "1px solid rgba(199,80,80,0.35)", color: "#ffb0b0" }}>
              🤕 {player.injury.name} · {player.injury.weeksOut} week{player.injury.weeksOut === 1 ? "" : "s"} out
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-widest font-display mb-2" style={{ color: "#FFB81C" }}>Key Ratings</div>
            <div className="space-y-1.5">
              {relevantKeys.map(({ key, label }) => (
                <RatingBar key={key} label={label} value={ratings[key]} />
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest font-display mb-2" style={{ color: "#FFB81C" }}>This Season</div>
            <div className="text-xs grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
              <div>GP: <span className="text-amber-300">{stats.games}</span></div>
              {player.position === "QB" && <>
                <div>YDS: <span className="text-amber-300">{stats.passYds}</span></div>
                <div>TD: <span className="text-amber-300">{stats.passTD}</span></div>
                <div>INT: <span className="text-amber-300">{stats.passInt}</span></div>
                <div>C/A: <span className="text-amber-300">{stats.passComp}/{stats.passAtt}</span></div>
                <div>SACK: <span className="text-amber-300">{stats.sacked}</span></div>
              </>}
              {(player.position === "RB" || player.position === "FB") && <>
                <div>YDS: <span className="text-amber-300">{stats.rushYds}</span></div>
                <div>TD: <span className="text-amber-300">{stats.rushTD}</span></div>
                <div>CAR: <span className="text-amber-300">{stats.rushAtt}</span></div>
                <div>FUM: <span className="text-amber-300">{stats.fumbles}</span></div>
              </>}
              {(player.position === "WR" || player.position === "TE") && <>
                <div>REC: <span className="text-amber-300">{stats.receptions}</span></div>
                <div>YDS: <span className="text-amber-300">{stats.recYds}</span></div>
                <div>TD: <span className="text-amber-300">{stats.recTD}</span></div>
                <div>TGT: <span className="text-amber-300">{stats.targets}</span></div>
              </>}
              {(player.position === "DL" || player.position === "LB" || player.position === "CB" || player.position === "S") && <>
                <div>TKL: <span className="text-amber-300">{stats.tackles}</span></div>
                <div>SACK: <span className="text-amber-300">{stats.sacks}</span></div>
                <div>INT: <span className="text-amber-300">{stats.interceptions}</span></div>
                <div>FF: <span className="text-amber-300">{stats.forcedFumbles}</span></div>
              </>}
              {(player.position === "K" || player.position === "P") && <>
                <div>FG: <span className="text-amber-300">{stats.fgMade}/{stats.fgAtt}</span></div>
                <div>XP: <span className="text-amber-300">{stats.xpMade}/{stats.xpAtt}</span></div>
              </>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// MANAGE STRIP — top-of-page quick-actions for the user's own team.
// Surfaces every franchise destination (next game, schedule, news,
// league actions, IL) so the team page lives up to its hub role.
function FootballManageStrip({ lg, team }: { lg: FootballLeague; team: FootballTeam }) {
  const myGame = lg.schedule.find(g => !g.played && g.week === lg.week && (g.homeId === team.id || g.awayId === team.id));
  const opp = myGame ? lg.teams.find(x => x.id === (myGame.homeId === team.id ? myGame.awayId : myGame.homeId)) : null;
  const myNewsCount = lg.newsLog.filter(n => Array.isArray(n.teamIds) && n.teamIds!.includes(team.id)).length;
  const injured = lg.players.filter(p => p.teamId === team.id && p.injury).length;
  const sorted = [...lg.teams].sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst));
  const overallRank = sorted.findIndex(t => t.id === team.id) + 1;
  const fa = lg.phase === "freeagency";
  const draft = lg.phase === "draft";
  const playoffs = lg.phase === "playoffs" || !!lg.playoffsBracket;

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1">MANAGE — {team.abbr}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <FbActionTile
          to="/football"
          icon={<CalendarDays size={16} />}
          label={myGame && opp ? `Next: ${myGame.homeId === team.id ? "vs" : "@"} ${opp.abbr}` : "No game scheduled"}
          sub={myGame ? `Week ${myGame.week}` : "—"}
          tint={team.accent}
        />
        <FbActionTile to="/football/schedule" icon={<CalendarDays size={16} />} label="Schedule" sub="17-week slate" tint="#94a3b8" />
        <FbActionTile to="/football/standings" icon={<Trophy size={16} />} label="Standings" sub={overallRank > 0 ? `You're ${ordinalSm(overallRank)}` : "Around the league"} tint="#94a3b8" />
        <FbActionTile to="/football/league" icon={<Trophy size={16} />} label="League" sub="Hub of everything" tint="#94a3b8" />
        <FbActionTile to="/football/league" icon={<Newspaper size={16} />} label="News" sub={myNewsCount > 0 ? `${myNewsCount} about ${team.abbr}` : "League beat"} tint="#94a3b8" chip={myNewsCount > 0 ? String(myNewsCount) : undefined} />
        {fa && <FbActionTile to="/football/freeagency" icon={<UserPlus size={16} />} label="Free Agency" sub="Open now" tint="#34d399" hot />}
        {draft && <FbActionTile to="/football" icon={<ScrollText size={16} />} label="Draft" sub="On the clock" tint="#a78bfa" hot />}
        {playoffs && <FbActionTile to="/football" icon={<Trophy size={16} />} label="Playoffs" sub="Bracket open" tint="#fb7185" hot />}
        {injured > 0 && (
          <FbActionTile to={`/football/team/${team.id}`} icon={<UserPlus size={16} />} label="Injured List" sub={`${injured} on the IL`} tint="#f87171" hot />
        )}
      </div>
    </div>
  );
}

function FbActionTile({ to, icon, label, sub, tint, hot, chip }: {
  to: string; icon: React.ReactNode; label: string; sub: string; tint: string;
  hot?: boolean; chip?: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl px-3 py-2.5 pressable touch-target flex items-center gap-2.5 min-h-[56px] relative"
      style={{
        background: hot ? `linear-gradient(135deg, ${tint}22, rgba(15,20,28,0.65))` : "rgba(255,255,255,0.04)",
        border: `1px solid ${hot ? tint + "77" : "rgba(255,255,255,0.07)"}`,
        touchAction: "manipulation",
      }}
    >
      <span className="shrink-0" style={{ color: tint }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-display tracking-widest truncate" style={{ color: hot ? tint : "#fff" }}>{label}</div>
        <div className="text-[10px] text-ink-300 truncate">{sub}</div>
      </div>
      {chip && (
        <span className="text-[9px] px-1.5 py-0.5 rounded font-display" style={{ background: tint, color: "#0a0d13" }}>{chip}</span>
      )}
    </Link>
  );
}

function ordinalSm(n: number): string {
  const suf = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suf[(v - 20) % 10] || suf[v] || suf[0]);
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  const color = value >= 85 ? "#3fcc6a" : value >= 75 ? "#FFB81C" : "#e9e3d2";
  return (
    <div className="p-2 rounded-lg" style={{ background: accent ? "rgba(255,184,28,0.15)" : "rgba(15,27,45,0.5)", border: accent ? "1px solid rgba(255,184,28,0.3)" : "1px solid rgba(255,255,255,0.05)" }}>
      <div className="text-[9px] uppercase tracking-widest text-ink-300">{label}</div>
      <div className="font-display text-2xl" style={{ color: accent ? "#FFB81C" : color }}>{value}</div>
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const color = value >= 85 ? "#3fcc6a" : value >= 75 ? "#FFB81C" : value >= 60 ? "#c79c5c" : "#9aa6bf";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 text-ink-300">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono font-bold w-6 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

function positionOrder(pos: string): number {
  const order = ["QB", "RB", "FB", "WR", "TE", "OL", "DL", "LB", "CB", "S", "K", "P"];
  return order.indexOf(pos);
}
