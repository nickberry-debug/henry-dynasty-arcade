// Team page — consolidated franchise team view. Four primary tabs:
// Lineup (editable batting order), Pitching (rotation + bullpen),
// Roster (full 26-man split by group), Depth (position-by-position).
// Secondary tabs preserved: Schedule, Stats, Finances, History.
//
// Only the user's own team is editable; other teams render read-only
// so Henry can scout them.
import { useParams, Link } from "react-router-dom";
import { useStore } from "../store";
import { TeamLogo } from "../components/TeamLogo";
import { PlayerPortrait } from "../components/PlayerPortrait";
import { useState, useMemo } from "react";
import { fmt } from "../utils/format";
import { rosterOf, payroll } from "../engine/league";
import { leagueStandings } from "../engine/season";
import { stadiumSVG } from "../generators/stadiumArt";
import type { Player, Team, League } from "../store/types";
import {
  ChevronUp, ChevronDown, RotateCcw, Lock,
  CalendarDays, BarChart3, Newspaper as NewspaperIcon, ClipboardList,
  Trophy, UserPlus, ScrollText, ArrowRight,
} from "lucide-react";

const TABS = ["Lineup", "Pitching", "Roster", "Depth", "Schedule", "Stats", "Finances", "History"] as const;
type Tab = typeof TABS[number];

export default function TeamPage() {
  const { id } = useParams();
  const league = useStore(s => s.league);
  const [tab, setTab] = useState<Tab>("Lineup");
  if (!league || !id) return null;
  const team = league.teams.find(t => t.id === id);
  if (!team) return <div>Team not found</div>;
  const roster = rosterOf(league, team.id);
  const teamPay = payroll(league, team.id);
  const isUserTeam = team.id === league.userTeamId;

  const stadiumBgUrl = useMemo(() => "data:image/svg+xml;utf8," + encodeURIComponent(stadiumSVG(team, { width: 1200, height: 300, time: "dusk", detail: "silhouette" })), [team.id]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl relative overflow-hidden card-elevated">
        <div className="absolute inset-0 opacity-90" style={{ backgroundImage: `url("${stadiumBgUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${team.primary}cc, ${team.primary}66 60%, rgba(10,13,19,0.85))` }} />
        <div className="relative p-6 flex flex-wrap items-center gap-6">
          <TeamLogo team={team} size={120} glow />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-widest" style={{ color: team.accent }}>{team.city}</div>
            <h1 className="font-display text-5xl" style={{ color: team.accent, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{team.name.toUpperCase()}</h1>
            <div className="text-white/90 text-sm mt-1">{team.wins}-{team.losses} • Est. {team.established} • Mgr {team.managerName}</div>
            <div className="text-white/75 text-xs mt-1">{team.stadium.name} • Cap {fmt.number(team.stadium.capacity)} • PF {team.stadium.parkFactor}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-white/80 uppercase tracking-widest">Payroll</div>
            <div className="font-display text-3xl text-white">{fmt.money(teamPay)}</div>
            <div className="text-[11px] text-white/70">Cap {league.settings.gameplay.salaryCapOn ? fmt.money(league.settings.gameplay.salaryCap) : "OFF"}</div>
          </div>
        </div>
      </div>

      {/* MANAGE strip — only on your own team. Surfaces the secondary
          franchise destinations (schedule, news, league actions) so the
          team page acts as the team-management hub. */}
      {isUserTeam && <ManageStrip league={league} team={team} />}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap touch-target pressable ${tab === t ? "bg-accent text-ink-950" : "bg-white/5 text-ink-200"}`} style={{ touchAction: "manipulation" }}>
            {t}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-4">
        {tab === "Lineup"   && <LineupTab team={team} roster={roster} league={league} editable={isUserTeam} />}
        {tab === "Pitching" && <PitchingTab team={team} roster={roster} league={league} />}
        {tab === "Roster"   && <RosterTab team={team} roster={roster} league={league} />}
        {tab === "Depth"    && <DepthTab team={team} roster={roster} league={league} />}
        {tab === "Schedule" && <TeamSchedule teamId={team.id} />}
        {tab === "Stats"    && <TeamStats teamId={team.id} />}
        {tab === "Finances" && <TeamFinances teamId={team.id} />}
        {tab === "History"  && <TeamHistory team={team} />}
      </div>
    </div>
  );
}

// ─── MANAGE STRIP ─────────────────────────────────────────────
// Top-of-page quick-actions for the user's own team. Surfaces every
// franchise destination (next game, schedule, news, lineup, league
// actions) so the team page lives up to its "hub for everything" role.

function ManageStrip({ league, team }: { league: League; team: Team }) {
  const userId = team.id;
  const myGame = league.schedule.find(g => !g.played && g.day === league.day && (g.homeId === userId || g.awayId === userId));
  const nextGame = myGame ?? league.schedule.find(g => !g.played && (g.homeId === userId || g.awayId === userId));
  const opp = nextGame ? league.teams.find(t => t.id === (nextGame.homeId === userId ? nextGame.awayId : nextGame.homeId)) : null;
  const myNewsCount = league.newsLog.filter(n => Array.isArray(n.teamIds) && n.teamIds!.includes(userId)).length;
  const injured = league.players.filter(p => p.teamId === userId && p.injury).length;
  const standings = leagueStandings(league);
  const myRank = standings.findIndex(s => s.team.id === userId) + 1;

  // Conditional surface for phase-windowed actions
  const fa = league.phase === "freeagency";
  const draft = league.phase === "draft";
  const playoffs = league.phase === "playoffs";

  return (
    <div className="space-y-2">
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 px-1">MANAGE — {team.abbr}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <ActionTile
          to="/dashboard"
          icon={<CalendarDays size={16} />}
          label={nextGame ? `Next: ${nextGame.homeId === userId ? "vs" : "@"} ${opp?.abbr ?? ""}` : "Off Day"}
          sub={nextGame ? `Day ${nextGame.day}` : "—"}
          tint={team.accent}
        />
        <ActionTile
          to="/schedule"
          icon={<CalendarDays size={16} />}
          label="Schedule"
          sub="17-week slate"
          tint="#94a3b8"
        />
        <ActionTile
          to="/coach"
          icon={<ClipboardList size={16} />}
          label="Coach's Corner"
          sub="Lineup, rotation, AI"
          tint="#94a3b8"
        />
        <ActionTile
          to="/news"
          icon={<NewspaperIcon size={16} />}
          label="News"
          sub={myNewsCount > 0 ? `${myNewsCount} about ${team.abbr}` : "League beat"}
          tint="#94a3b8"
          chip={myNewsCount > 0 ? String(myNewsCount) : undefined}
        />
        <ActionTile
          to="/stats"
          icon={<BarChart3 size={16} />}
          label="Stats"
          sub="Leaders & rankings"
          tint="#94a3b8"
        />
        <ActionTile
          to="/standings"
          icon={<Trophy size={16} />}
          label="Standings"
          sub={myRank > 0 ? `You're ${ordinal(myRank)}` : "Around the league"}
          tint="#94a3b8"
        />
        {fa && (
          <ActionTile to="/freeagency" icon={<UserPlus size={16} />} label="Free Agency" sub="Open now" tint="#34d399" hot />
        )}
        {draft && (
          <ActionTile to="/draft" icon={<ScrollText size={16} />} label="Draft" sub="On the clock" tint="#a78bfa" hot />
        )}
        {playoffs && (
          <ActionTile to="/playoffs" icon={<Trophy size={16} />} label="Playoffs" sub="Bracket open" tint="#fb7185" hot />
        )}
        {injured > 0 && (
          <ActionTile
            to={`/team/${team.id}`}
            icon={<UserPlus size={16} />}
            label="Injured List"
            sub={`${injured} on the IL`}
            tint="#f87171"
            hot
          />
        )}
      </div>
    </div>
  );
}

function ActionTile({ to, icon, label, sub, tint, hot, chip }: {
  to: string; icon: React.ReactNode; label: string; sub: string; tint: string;
  hot?: boolean; chip?: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl px-3 py-2.5 pressable touch-target flex items-center gap-2.5 min-h-[56px] relative"
      style={{
        background: hot ? `linear-gradient(135deg, ${tint}22, rgba(15,25,45,0.65))` : "rgba(255,255,255,0.04)",
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

function ordinal(n: number): string {
  const suf = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suf[(v - 20) % 10] || suf[v] || suf[0]);
}

// ─── LINEUP TAB ───────────────────────────────────────────────
// Editable 9-man batting order. Backed by team.rosterOrder, which the
// sim now reads (see engine/sim.ts:pickLineup). Up/down arrows reorder.
// "Auto-Set" picks best-by-position. A read-only mode renders for other
// teams so Henry can scout.

function LineupTab({ team, roster, league, editable }: { team: Team; roster: Player[]; league: League; editable: boolean }) {
  const mutate = useStore(s => s.mutate);
  const hitters = useMemo(() => roster.filter(p => !p.isPitcher && !p.injury), [roster]);
  const byId = useMemo(() => new Map(hitters.map(p => [p.id, p])), [hitters]);

  // Resolve the current 9-man order from team.rosterOrder; fill holes
  // with best-available so the user always sees a valid lineup.
  const currentOrder = useMemo(() => {
    const order: Player[] = [];
    const used = new Set<string>();
    for (const id of team.rosterOrder ?? []) {
      const p = byId.get(id);
      if (p && !used.has(id)) { order.push(p); used.add(id); if (order.length >= 9) break; }
    }
    if (order.length < 9) {
      const rest = hitters.filter(p => !used.has(p.id)).sort((a, b) => b.overall - a.overall);
      for (const p of rest) { order.push(p); used.add(p.id); if (order.length >= 9) break; }
    }
    return order;
  }, [team.rosterOrder, hitters]);

  const bench = useMemo(() => {
    const inLineup = new Set(currentOrder.map(p => p.id));
    return hitters.filter(p => !inLineup.has(p.id)).sort((a, b) => b.overall - a.overall);
  }, [currentOrder, hitters]);

  const swap = (a: number, b: number) => {
    if (b < 0 || b >= currentOrder.length) return;
    const next = currentOrder.slice();
    [next[a], next[b]] = [next[b], next[a]];
    saveOrder(next.map(p => p.id));
  };

  const swapInBench = (lineupIdx: number, benchPlayer: Player) => {
    const next = currentOrder.slice();
    next[lineupIdx] = benchPlayer;
    saveOrder(next.map(p => p.id));
  };

  const saveOrder = (ids: string[]) => {
    mutate(lg => {
      const t = lg.teams.find(x => x.id === team.id);
      if (t) t.rosterOrder = ids;
    });
  };

  const autoSet = () => {
    // Best-by-position (mirrors the sim's auto-lineup), then save.
    const positions = ["C","1B","2B","3B","SS","LF","CF","RF","DH"];
    const sorted = hitters.slice().sort((a, b) => b.overall - a.overall);
    const lineup: Player[] = [];
    const used = new Set<string>();
    positions.forEach(pos => {
      const best = sorted.find(p => p.position === pos && !used.has(p.id));
      if (best) { lineup.push(best); used.add(best.id); }
    });
    let i = 0;
    while (lineup.length < 9 && i < sorted.length) {
      const p = sorted[i++];
      if (!used.has(p.id)) { lineup.push(p); used.add(p.id); }
    }
    saveOrder(lineup.slice(0, 9).map(p => p.id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-head text-lg uppercase tracking-wider">Batting Order</h3>
          <div className="text-[11px] text-ink-200 mt-0.5">
            {editable ? "Tap arrows to reorder · Tap a bench player to sub in" : <span className="inline-flex items-center gap-1"><Lock size={11}/> Read-only — other team's lineup</span>}
          </div>
        </div>
        {editable && (
          <button onClick={autoSet} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs pressable touch-target inline-flex items-center gap-1.5">
            <RotateCcw size={12} /> Auto-Set
          </button>
        )}
      </div>

      <div className="space-y-1.5 mb-5">
        {currentOrder.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/3 border border-white/5">
            <div className="font-display text-lg text-accent w-7 text-center">{i + 1}</div>
            <Link to={`/player/${p.id}`} className="flex items-center gap-2 flex-1 min-w-0 pressable">
              <PlayerPortrait player={p} team={team} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-ink-200">{p.position} · {p.bats}/{p.throws} · OVR <span className="font-mono" style={{ color: fmt.ratingColor(p.overall) }}>{p.overall}</span></div>
              </div>
            </Link>
            {editable && (
              <div className="flex gap-1 shrink-0">
                <button onClick={() => swap(i, i - 1)} disabled={i === 0} className="w-9 h-9 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center pressable touch-target disabled:opacity-30" style={{ touchAction: "manipulation" }} aria-label="Move up"><ChevronUp size={14} /></button>
                <button onClick={() => swap(i, i + 1)} disabled={i === currentOrder.length - 1} className="w-9 h-9 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center pressable touch-target disabled:opacity-30" style={{ touchAction: "manipulation" }} aria-label="Move down"><ChevronDown size={14} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 className="font-head text-sm uppercase tracking-wider mb-2 text-ink-200">Bench / Sub In</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {bench.slice(0, 12).map(p => (
          <div key={p.id} className="flex items-center gap-2 px-2 py-2 rounded-xl bg-white/3 border border-white/5">
            <PlayerPortrait player={p} team={team} size={32} />
            <Link to={`/player/${p.id}`} className="flex-1 min-w-0 pressable">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-[10px] text-ink-200">{p.position} · OVR <span className="font-mono" style={{ color: fmt.ratingColor(p.overall) }}>{p.overall}</span></div>
            </Link>
            {editable && (
              <select
                onChange={e => { if (e.target.value) swapInBench(Number(e.target.value), p); }}
                className="text-[10px] bg-white/5 border border-white/10 rounded-md px-1.5 py-1 text-ink-100"
                defaultValue=""
                aria-label={`Sub ${p.name} into lineup`}
                style={{ touchAction: "manipulation" }}
              >
                <option value="">Sub in…</option>
                {currentOrder.map((cur, idx) => (
                  <option key={cur.id} value={idx}>{idx + 1}. {cur.lastName}</option>
                ))}
              </select>
            )}
          </div>
        ))}
        {bench.length === 0 && <div className="text-ink-300 text-sm">No bench players available.</div>}
      </div>
    </div>
  );
}

// ─── PITCHING TAB ─────────────────────────────────────────────

function PitchingTab({ team, roster, league }: { team: Team; roster: Player[]; league: League }) {
  const pitchers = roster.filter(p => p.isPitcher && !p.injury);
  const rotation = pitchers.filter(p => p.position === "SP").sort((a, b) => b.overall - a.overall).slice(0, 5);
  const closer = pitchers.filter(p => p.position === "CL").sort((a, b) => b.overall - a.overall).slice(0, 1);
  const setup = pitchers.filter(p => p.position === "RP").sort((a, b) => b.overall - a.overall).slice(0, 2);
  const middleReliefIds = new Set([...closer, ...setup].map(p => p.id));
  const middle = pitchers.filter(p => (p.position === "RP" || p.position === "SP") && !middleReliefIds.has(p.id) && !rotation.includes(p)).sort((a, b) => b.overall - a.overall);

  return (
    <div className="space-y-5">
      <h3 className="font-head text-lg uppercase tracking-wider">Starting Rotation</h3>
      <div className="space-y-1.5">
        {rotation.map((p, i) => (
          <PitcherRow key={p.id} player={p} team={team} role={`SP${i + 1}`} accent="#ffd54a" />
        ))}
        {rotation.length === 0 && <div className="text-ink-300 text-sm italic">No starting pitchers.</div>}
      </div>

      <h3 className="font-head text-lg uppercase tracking-wider mt-5">Bullpen</h3>
      <div className="space-y-1.5">
        {closer.map(p => <PitcherRow key={p.id} player={p} team={team} role="CLOSER" accent="#f87171" />)}
        {setup.map((p, i) => <PitcherRow key={p.id} player={p} team={team} role={i === 0 ? "SETUP" : "8TH INN"} accent="#fb923c" />)}
        {middle.slice(0, 4).map(p => <PitcherRow key={p.id} player={p} team={team} role="MIDDLE" accent="#94a3b8" />)}
        {closer.length === 0 && setup.length === 0 && middle.length === 0 && <div className="text-ink-300 text-sm italic">No relievers.</div>}
      </div>
    </div>
  );
}

function PitcherRow({ player, team, role, accent }: { player: Player; team: Team; role: string; accent: string }) {
  const era = player.seasonStats.era;
  const w = player.seasonStats.w ?? 0;
  const l = player.seasonStats.l ?? 0;
  return (
    <Link to={`/player/${player.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 pressable touch-target">
      <div className="w-16 shrink-0">
        <div className="text-[10px] font-display tracking-widest" style={{ color: accent }}>{role}</div>
      </div>
      <PlayerPortrait player={player} team={team} size={44} />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{player.name}</div>
        <div className="text-[11px] text-ink-200">{player.throws}-handed · Age {player.age}</div>
      </div>
      <div className="text-right">
        <div className="font-mono font-bold" style={{ color: fmt.ratingColor(player.overall) }}>{player.overall}</div>
        <div className="text-[10px] text-ink-200 font-mono">{w}-{l}{era != null ? ` · ${era.toFixed(2)}` : ""}</div>
      </div>
    </Link>
  );
}

// ─── ROSTER TAB ───────────────────────────────────────────────

function RosterTab({ team, roster, league }: { team: Team; roster: Player[]; league: League }) {
  const healthy = roster.filter(p => !p.injury);
  const injured = roster.filter(p => p.injury);
  const hitters = healthy.filter(p => !p.isPitcher).sort((a, b) => b.overall - a.overall);
  const pitchers = healthy.filter(p => p.isPitcher).sort((a, b) => b.overall - a.overall);

  return (
    <div className="space-y-5">
      <RosterGroup label="Position Players" players={hitters} team={team} />
      <RosterGroup label="Pitchers" players={pitchers} team={team} />
      {injured.length > 0 && <RosterGroup label="Disabled List" players={injured} team={team} />}
    </div>
  );
}

function RosterGroup({ label, players, team }: { label: string; players: Player[]; team: Team }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-head text-lg uppercase tracking-wider">{label}</h3>
        <span className="text-ink-200 text-xs">{players.length} players</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.map(p => (
          <Link to={`/player/${p.id}`} key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 pressable touch-target">
            <PlayerPortrait player={p} team={team} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold truncate">{p.name}</span>
                {p.injury && <span className="text-[10px] px-1.5 py-0.5 rounded bg-crimson/20 text-crimson">{p.injury.dlType}</span>}
              </div>
              <div className="text-[11px] text-ink-200">#{p.jerseyNumber} · {p.position} · Age {p.age}</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-lg" style={{ color: fmt.ratingColor(p.overall) }}>{p.overall}</div>
              <div className="text-[10px] text-ink-200">{fmt.money(p.contract.aav)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── DEPTH CHART TAB ──────────────────────────────────────────

const DEPTH_POSITIONS: Array<{ id: string; label: string }> = [
  { id: "C",  label: "Catcher" },
  { id: "1B", label: "1st Base" },
  { id: "2B", label: "2nd Base" },
  { id: "3B", label: "3rd Base" },
  { id: "SS", label: "Shortstop" },
  { id: "LF", label: "Left Field" },
  { id: "CF", label: "Center Field" },
  { id: "RF", label: "Right Field" },
  { id: "DH", label: "Designated Hitter" },
  { id: "SP", label: "Starting Pitcher" },
  { id: "RP", label: "Relief Pitcher" },
  { id: "CL", label: "Closer" },
];

function DepthTab({ team, roster, league }: { team: Team; roster: Player[]; league: League }) {
  return (
    <div className="space-y-4">
      <div className="text-[11px] text-ink-200">Depth at each position, sorted by overall. Injured players excluded.</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DEPTH_POSITIONS.map(pos => {
          const list = roster.filter(p => p.position === pos.id && !p.injury).sort((a, b) => b.overall - a.overall);
          return (
            <div key={pos.id} className="rounded-xl p-3 bg-white/3 border border-white/5">
              <div className="flex items-baseline justify-between mb-2">
                <div className="font-display text-sm tracking-widest">{pos.label}</div>
                <div className="text-[10px] text-ink-200">{pos.id} · {list.length}</div>
              </div>
              {list.length === 0 && <div className="text-[11px] text-ink-300 italic">No depth here.</div>}
              <div className="space-y-0.5">
                {list.slice(0, 4).map((p, i) => (
                  <Link to={`/player/${p.id}`} key={p.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white/5 pressable">
                    <span className="font-mono text-ink-300 w-4 text-right text-xs">{i + 1}</span>
                    <span className="flex-1 truncate text-sm">{p.name}</span>
                    <span className="font-mono text-xs" style={{ color: fmt.ratingColor(p.overall) }}>{p.overall}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── EXISTING SECONDARY TABS (unchanged) ──────────────────────

function TeamSchedule({ teamId }: { teamId: string }) {
  const league = useStore(s => s.league)!;
  const games = league.schedule.filter(g => g.homeId === teamId || g.awayId === teamId).slice(0, 30);
  return (
    <div className="space-y-1">
      {games.map(g => {
        const isHome = g.homeId === teamId;
        const opp = league.teams.find(t => t.id === (isHome ? g.awayId : g.homeId))!;
        const score = g.score;
        return (
          <div key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/3 text-sm">
            <span className="font-mono text-ink-200 w-12">Day {g.day}</span>
            <span>{isHome ? "vs" : "@"}</span>
            <TeamLogo team={opp} size={22} variant="cap" />
            <span className="flex-1">{opp.abbr}</span>
            {score && (
              <span className={`font-mono font-bold ${(isHome ? score.home : score.away) > (isHome ? score.away : score.home) ? "text-emerald" : "text-crimson"}`}>
                {(isHome ? score.home : score.away) > (isHome ? score.away : score.home) ? "W" : "L"} {isHome ? score.home : score.away}-{isHome ? score.away : score.home}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeamStats({ teamId }: { teamId: string }) {
  const league = useStore(s => s.league)!;
  const roster = rosterOf(league, teamId);
  const hitters = roster.filter(p => !p.isPitcher);
  const pitchers = roster.filter(p => p.isPitcher);
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-head text-lg uppercase tracking-wider mb-2">Hitting</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
              <tr><th className="text-left p-2">Player</th><th>AB</th><th>H</th><th>HR</th><th>RBI</th><th>AVG</th><th>OPS</th></tr>
            </thead>
            <tbody>
              {hitters.sort((a, b) => (b.seasonStats.ab ?? 0) - (a.seasonStats.ab ?? 0)).map(p => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="p-2"><Link to={`/player/${p.id}`} className="hover:underline">{p.name}</Link></td>
                  <td className="text-center font-mono">{p.seasonStats.ab ?? 0}</td>
                  <td className="text-center font-mono">{p.seasonStats.h ?? 0}</td>
                  <td className="text-center font-mono">{p.seasonStats.hr ?? 0}</td>
                  <td className="text-center font-mono">{p.seasonStats.rbi ?? 0}</td>
                  <td className="text-center font-mono">{fmt.avg(p.seasonStats.avg ?? 0)}</td>
                  <td className="text-center font-mono">{fmt.avg(p.seasonStats.ops ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="font-head text-lg uppercase tracking-wider mb-2">Pitching</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
              <tr><th className="text-left p-2">Player</th><th>W-L</th><th>ERA</th><th>IP</th><th>K</th><th>BB</th><th>SV</th></tr>
            </thead>
            <tbody>
              {pitchers.sort((a, b) => (a.seasonStats.era ?? 99) - (b.seasonStats.era ?? 99)).map(p => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="p-2"><Link to={`/player/${p.id}`} className="hover:underline">{p.name}</Link></td>
                  <td className="text-center font-mono">{p.seasonStats.w ?? 0}-{p.seasonStats.l ?? 0}</td>
                  <td className="text-center font-mono">{fmt.era(p.seasonStats.era ?? 0)}</td>
                  <td className="text-center font-mono">{p.seasonStats.ip ?? 0}</td>
                  <td className="text-center font-mono">{p.seasonStats.pk ?? 0}</td>
                  <td className="text-center font-mono">{p.seasonStats.pbb ?? 0}</td>
                  <td className="text-center font-mono">{p.seasonStats.sv ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TeamFinances({ teamId }: { teamId: string }) {
  const league = useStore(s => s.league)!;
  const roster = rosterOf(league, teamId);
  const total = roster.reduce((s, p) => s + p.contract.aav, 0);
  const cap = league.settings.gameplay.salaryCap;
  const sorted = roster.slice().sort((a, b) => b.contract.aav - a.contract.aav);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-white/5 rounded-xl p-4"><div className="text-[10px] text-ink-200 uppercase tracking-widest">Total Payroll</div><div className="font-display text-2xl">{fmt.money(total)}</div></div>
        <div className="bg-white/5 rounded-xl p-4"><div className="text-[10px] text-ink-200 uppercase tracking-widest">Salary Cap</div><div className="font-display text-2xl">{league.settings.gameplay.salaryCapOn ? fmt.money(cap) : "OFF"}</div></div>
        <div className="bg-white/5 rounded-xl p-4"><div className="text-[10px] text-ink-200 uppercase tracking-widest">Cap Space</div><div className={`font-display text-2xl ${cap - total >= 0 ? "text-emerald" : "text-crimson"}`}>{fmt.money(cap - total)}</div></div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-ink-200 text-[10px] uppercase tracking-widest">
          <tr><th className="text-left p-2">Player</th><th>Pos</th><th>Years</th><th className="text-right">AAV</th></tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} className="border-t border-white/5">
              <td className="p-2"><Link to={`/player/${p.id}`} className="hover:underline">{p.name}</Link></td>
              <td className="text-center text-ink-200">{p.position}</td>
              <td className="text-center font-mono">{p.contract.years}</td>
              <td className="text-right p-2 font-mono">{fmt.money(p.contract.aav)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamHistory({ team }: { team: Team }) {
  return (
    <div>
      <h3 className="font-head text-lg uppercase tracking-wider mb-3">Franchise History</h3>
      <div className="space-y-2">
        {team.history.length === 0 && <div className="text-ink-200">No completed seasons yet.</div>}
        {team.history.map(h => (
          <div key={h.year} className="flex justify-between p-2 bg-white/3 rounded-xl">
            <span className="font-mono text-ink-200">{h.year}</span>
            <span>{h.w}-{h.l}</span>
            <span className="text-ink-200">{h.finish ?? "—"}</span>
          </div>
        ))}
      </div>
      {team.retiredNumbers.length > 0 && (
        <div className="mt-4">
          <h3 className="font-head text-lg uppercase tracking-wider mb-2">Retired Numbers</h3>
          <div className="flex gap-2 flex-wrap">
            {team.retiredNumbers.map(n => (
              <div key={n} className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-dark text-ink-950 font-display text-2xl flex items-center justify-center">{n}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
