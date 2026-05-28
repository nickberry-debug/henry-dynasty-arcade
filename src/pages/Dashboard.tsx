// THIS WEEK — the franchise's primary landing. Tight three-act flow:
//   1) Team identity (HUGE — Henry has to know it's his team)
//   2) Today's matchup OR phase callout (the next action)
//   3) Required tasks + News + Sim Forward (the daily stack)
//
// Leaderboards, full standings, recent league results — those used to
// live here but now belong to /league. This page stays focused.
import { useStore } from "../store";
import { useMemo, useState } from "react";
import { TeamLogo } from "../components/TeamLogo";
import { EmptyState } from "../components/EmptyState";
import { GameWatch } from "./GameWatch";
import { Pregame, type GameMode } from "../components/Pregame";
import { leagueStandings } from "../engine/season";
import { simDay, simNDays, isRegularComplete } from "../engine/season";
import { simulateGame, applyGameResult } from "../engine/sim";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Play, FastForward, SkipForward, AlertTriangle, ArrowRight,
  Users, Trophy, Newspaper as NewspaperIcon,
} from "lucide-react";
import { useBusyAction } from "../hooks/useBusyAction";

export default function Dashboard() {
  const league = useStore(s => s.league);
  const mutate = useStore(s => s.mutate);
  const navigate = useNavigate();
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [pregameId, setPregameId] = useState<string | null>(null);
  const [busy, run] = useBusyAction();

  if (!league) {
    return (
      <EmptyState
        emoji="⚾"
        title="No League Loaded"
        body="Pick a mode to get started."
        cta={{ label: "Open Title Screen", onClick: () => navigate("/title") }}
      />
    );
  }

  const standings = useMemo(() => leagueStandings(league), [league.teams, league.schedule]);
  const userTeam = useMemo(() => league.teams.find(t => t.id === league.userTeamId), [league.teams, league.userTeamId]);
  const myGame = useMemo(() => userTeam
    ? league.schedule.find(g => !g.played && g.day === league.day && (g.homeId === userTeam.id || g.awayId === userTeam.id))
    : null, [league.schedule, league.day, userTeam?.id]);

  const recentMyGames = useMemo(() => userTeam
    ? league.schedule.filter(g => g.played && (g.homeId === userTeam.id || g.awayId === userTeam.id)).slice(-5).reverse()
    : [], [league.schedule, userTeam?.id]);

  const myNews = useMemo(() => {
    if (!userTeam) return league.newsLog.slice(0, 5);
    // Bubble headlines about THIS team to the top, then fill with league news.
    const mine = league.newsLog.filter(n => Array.isArray(n.teamIds) && n.teamIds!.includes(userTeam.id)).slice(0, 4);
    const others = league.newsLog.filter(n => !mine.includes(n)).slice(0, Math.max(0, 5 - mine.length));
    return [...mine, ...others].slice(0, 5);
  }, [league.newsLog, userTeam?.id]);

  const played = useMemo(() => league.schedule.filter(g => g.played).length, [league.schedule]);
  const total = league.schedule.length;
  const pct = total > 0 ? (played / total) * 100 : 0;
  const totalWeeks = Math.ceil(league.settings.gameplay.scheduleLength / 7);
  const currentWeek = Math.floor(league.day / 7) + 1;
  const regularDone = useMemo(() => isRegularComplete(league), [league.schedule, league.teams, league.phase]);
  const daysLeftInSeason = useMemo(() => Math.max(0, league.settings.gameplay.scheduleLength - league.day), [league.day, league.settings.gameplay.scheduleLength]);

  const divisionStanding = useMemo(() => {
    if (!userTeam || !league.divisions) return null;
    const div = league.divisions.find(d => d.id === userTeam.divisionId);
    if (!div) return null;
    const inDiv = standings.filter(s => div.teamIds.includes(s.team.id));
    const idx = inDiv.findIndex(s => s.team.id === userTeam.id);
    return idx >= 0 ? { rank: idx + 1, total: inDiv.length, name: div.name } : null;
  }, [standings, userTeam?.id, league.divisions]);

  // Required tasks — anything the user MUST act on. Surface a count.
  const tasks = useMemo(() => buildRequiredTasks(league, userTeam), [league, userTeam?.id]);
  const showOwnerSetup = !league.tutorial.hasSeenWelcome;

  const home = myGame ? league.teams.find(t => t.id === myGame.homeId)! : null;
  const away = myGame ? league.teams.find(t => t.id === myGame.awayId)! : null;
  const userIsHome = myGame && userTeam ? myGame.homeId === userTeam.id : false;
  const opponent = myGame && userTeam ? (userIsHome ? away! : home!) : null;

  const simToday = () => run(async () => { await mutate(lg => { simDay(lg); }); });
  const simNDaysAction = (n: number) => run(async () => { await mutate(lg => { simNDays(lg, n); }); });
  const playToday = () => { if (myGame) setPregameId(myGame.id); };

  const handleMode = (mode: GameMode) => {
    const gameId = pregameId;
    if (!gameId) return;
    if (mode === "play") { setPregameId(null); navigate(`/play/${gameId}`); return; }
    if (mode === "watch") { setPregameId(null); setOpenGameId(gameId); return; }
    run(async () => {
      await mutate(lg => {
        const g = lg.schedule.find(x => x.id === gameId);
        if (!g || g.played) return;
        const result = simulateGame(lg, g, { recordPlays: true, universalDH: lg.settings.gameplay.universalDH });
        applyGameResult(lg, g, result);
      });
      setPregameId(null);
      setOpenGameId(gameId);
    });
  };

  return (
    <div className="space-y-5">
      {/* ─── ACT 1 — TEAM IDENTITY HERO ─────────────────────── */}
      {userTeam ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl relative overflow-hidden card-elevated"
          style={{ border: `1px solid ${userTeam.primary}66` }}
        >
          {/* Solid team-color floor */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${userTeam.primary} 0%, ${userTeam.primary}cc 45%, rgba(8,12,20,0.95))` }} />
          {/* Halo */}
          <div className="absolute inset-0" style={{ background: `radial-gradient(900px 380px at 88% -8%, ${userTeam.accent}55, transparent 55%)` }} />
          <div className="relative p-5 lg:p-7">
            <div className="flex items-center gap-4">
              <TeamLogo team={userTeam} size={92} glow />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.35em] font-display" style={{ color: userTeam.accent, opacity: 0.95 }}>YOUR FRANCHISE</div>
                <div className="font-display text-2xl lg:text-3xl leading-tight" style={{ color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                  {userTeam.city.toUpperCase()}
                </div>
                <div className="font-display text-3xl lg:text-5xl leading-none" style={{ color: userTeam.accent, textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>
                  {userTeam.name.toUpperCase()}
                </div>
                <div className="text-white/90 text-sm mt-2 truncate">
                  <span className="font-mono">{userTeam.wins}-{userTeam.losses}</span>
                  {divisionStanding && (
                    <>
                      <span className="text-white/50 mx-1.5">·</span>
                      <span>{ordinal(divisionStanding.rank)} in {divisionStanding.name}</span>
                    </>
                  )}
                  <span className="text-white/50 mx-1.5">·</span>
                  <span>{league.year} season</span>
                </div>
              </div>
            </div>
            {/* Quick-jump chips into the team */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
              <ChipLink to={`/team/${userTeam.id}`} accent={userTeam.accent} primary={userTeam.primary}>Roster</ChipLink>
              <ChipLink to={`/team/${userTeam.id}#lineup`} accent={userTeam.accent} primary={userTeam.primary}>Lineup</ChipLink>
              <ChipLink to="/schedule" accent={userTeam.accent} primary={userTeam.primary}>Schedule</ChipLink>
              <ChipLink to="/coach" accent={userTeam.accent} primary={userTeam.primary}>Coach</ChipLink>
            </div>
          </div>
        </motion.div>
      ) : (
        // No user team yet — soft prompt.
        <div className="rounded-2xl p-5 card-elevated text-center" style={{ background: "rgba(15,25,45,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="font-display text-xl">Pick a team to manage</div>
          <div className="text-sm text-ink-200 mt-1">Head to Settings → New League, or pick from the team list.</div>
          <Link to="/teams" className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm pressable touch-target" style={{ background: "#ffb302", color: "#0a0d13" }}>
            Browse Teams <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ─── ACT 2 — ACTIONS NEEDED TODAY ─────────────────── */}
      {showOwnerSetup && (
        <div className="rounded-2xl p-4 flex items-center gap-4 card-elevated" style={{ background: "linear-gradient(135deg, rgba(255,179,2,0.18), rgba(20,40,70,0.6))", border: "1px solid rgba(255,179,2,0.45)" }}>
          <div className="text-3xl shrink-0">⚾</div>
          <div className="flex-1 min-w-0">
            <div className="font-display tracking-wider text-sm" style={{ color: "#ffd54a" }}>SET UP YOUR OWNER</div>
            <div className="text-[12px] text-ink-200 mt-0.5">Pick your name, colors, and favourite team.</div>
          </div>
          <button onClick={() => navigate("/welcome")} className="px-4 py-2.5 rounded-xl font-display tracking-wider text-xs pressable touch-target shrink-0" style={{ background: "#ffb302", color: "#0a0d13" }}>
            Set Up
          </button>
        </div>
      )}
      {tasks.length > 0 && <TasksBanner tasks={tasks} />}

      {/* ─── ACT 3 — TODAY'S GAME ────────────────────────── */}
      {league.phase === "regular" && myGame && userTeam && opponent && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 card-elevated"
          style={{ background: "rgba(15,25,45,0.7)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#ffd54a" }}>TODAY · DAY {league.day}</div>
            <div className="text-[10px] text-ink-300">Week {currentWeek} of {totalWeeks}</div>
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <TeamLogo team={userTeam} size={56} glow />
              <div className="font-mono text-[11px] text-ink-200 mt-1">{userTeam.wins}-{userTeam.losses}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-ink-300">{userIsHome ? "VS" : "@"}</div>
              <div className="font-display text-2xl text-ink-200">·</div>
            </div>
            <div className="text-center">
              <TeamLogo team={opponent} size={56} />
              <div className="font-mono text-[11px] text-ink-200 mt-1">{opponent.wins}-{opponent.losses}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={playToday}
              className="rounded-2xl px-5 py-4 font-display tracking-widest text-base pressable touch-target flex items-center justify-center gap-2 shadow-lg min-h-[60px]"
              style={{ background: "linear-gradient(135deg, #ffb302, #ff9000)", color: "#0a0d13", touchAction: "manipulation" }}
            >
              <Play size={18} /> PLAY
            </button>
            <button
              disabled={busy}
              onClick={simToday}
              className="rounded-2xl px-5 py-4 font-display tracking-widest text-base pressable touch-target flex items-center justify-center gap-2 disabled:opacity-50 min-h-[60px]"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", touchAction: "manipulation" }}
            >
              <FastForward size={16} /> SIMULATE
            </button>
          </div>
        </motion.div>
      )}

      {league.phase === "regular" && !myGame && userTeam && (
        <div className="rounded-2xl p-5 card-elevated text-center" style={{ background: "rgba(15,25,45,0.65)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-1">TODAY · DAY {league.day}</div>
          <div className="font-display text-xl">Off-day for your team</div>
          <button
            disabled={busy}
            onClick={simToday}
            className="mt-3 rounded-xl px-4 py-2.5 font-display tracking-widest pressable touch-target inline-flex items-center gap-2 disabled:opacity-50 text-sm"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", touchAction: "manipulation" }}
          >
            <FastForward size={16} /> SIM TO TOMORROW
          </button>
        </div>
      )}

      {league.phase !== "regular" && <PhaseCallout league={league} />}

      {/* ─── ACT 4 — NEWS (your team first) ───────────────── */}
      <div className="rounded-2xl p-4 card-elevated" style={{ background: "rgba(15,25,45,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <NewspaperIcon size={14} className="text-amber-300" />
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-100">LATEST NEWS</div>
          </div>
          <Link to="/news" className="text-[11px] inline-flex items-center gap-1 text-accent pressable touch-target">
            All news <ArrowRight size={11} />
          </Link>
        </div>
        {myNews.length === 0 && <div className="text-[12px] text-ink-300 italic">Quiet day around the league.</div>}
        <div className="space-y-1">
          {myNews.map(n => {
            const isMine = userTeam && Array.isArray(n.teamIds) && n.teamIds!.includes(userTeam.id);
            return (
              <Link
                key={n.id}
                to="/news"
                className="block px-2 py-1.5 rounded-lg hover:bg-white/4 pressable touch-target"
                style={{ borderLeft: isMine ? `2px solid ${userTeam!.accent}` : "2px solid transparent" }}
              >
                <div className="text-[9px] uppercase tracking-widest text-ink-300">{n.category}</div>
                <div className={`text-[13px] leading-snug ${n.important ? "font-semibold" : ""} ${isMine ? "text-white" : "text-ink-100"}`}>
                  {n.headline}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── ACT 5 — SIM FORWARD ────────────────────────── */}
      {league.phase === "regular" && !regularDone && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(15,25,45,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-3">SIM FORWARD</div>
          <div className="grid grid-cols-3 gap-2">
            <SimButton label="Next Week" sub="+7 days" disabled={busy} onClick={() => simNDaysAction(7)} icon={<SkipForward size={14} />} />
            <SimButton label="4 Weeks" sub="+28 days" disabled={busy} onClick={() => simNDaysAction(28)} icon={<FastForward size={14} />} />
            <SimButton
              label="End of Season"
              sub={`+${daysLeftInSeason} days`}
              disabled={busy || daysLeftInSeason === 0}
              onClick={() => {
                if (confirm(`Sim the rest of the regular season (${daysLeftInSeason} days)?\nResults lock in permanently.`)) simNDaysAction(daysLeftInSeason);
              }}
              icon={<FastForward size={14} />}
              danger
            />
          </div>
          <div className="text-[10px] text-ink-300 mt-2 italic">Results lock in permanently — no redo.</div>
        </div>
      )}

      {/* Tail: your last 5 games — compact, single row, only your team. */}
      {recentMyGames.length > 0 && userTeam && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(15,25,45,0.45)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">YOUR LAST {recentMyGames.length} GAMES</div>
            <Link to={`/team/${userTeam.id}`} className="text-[11px] inline-flex items-center gap-1 text-accent pressable touch-target">
              Full schedule <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {recentMyGames.map(g => {
              const opp = league.teams.find(t => t.id === (g.homeId === userTeam.id ? g.awayId : g.homeId))!;
              const myScore = g.homeId === userTeam.id ? g.score!.home : g.score!.away;
              const oppScore = g.homeId === userTeam.id ? g.score!.away : g.score!.home;
              const won = myScore > oppScore;
              return (
                <button
                  key={g.id}
                  onClick={() => setOpenGameId(g.id)}
                  className="rounded-lg px-2 py-2 text-center pressable touch-target"
                  style={{
                    background: won ? "rgba(52,211,153,0.10)" : "rgba(239,68,68,0.10)",
                    border: `1px solid ${won ? "rgba(52,211,153,0.30)" : "rgba(239,68,68,0.30)"}`,
                  }}
                >
                  <div className={`font-display text-sm ${won ? "text-emerald-300" : "text-red-300"}`}>{won ? "W" : "L"}</div>
                  <div className="font-mono text-[10px] text-ink-200">{myScore}-{oppScore}</div>
                  <div className="text-[9px] text-ink-300 mt-0.5">vs {opp.abbr}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {pregameId && (() => {
        const g = league.schedule.find(x => x.id === pregameId);
        if (!g) return null;
        return <Pregame league={league} game={g} onClose={() => setPregameId(null)} onChooseMode={handleMode} />;
      })()}
      {openGameId && <GameWatch gameId={openGameId} onClose={() => setOpenGameId(null)} />}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function ChipLink({ to, children, accent, primary }: { to: string; children: React.ReactNode; accent: string; primary: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl px-2 py-2 text-center pressable touch-target text-[11px] font-display tracking-widest min-h-[44px] flex items-center justify-center"
      style={{
        background: `rgba(0,0,0,0.25)`,
        border: `1px solid ${accent}55`,
        color: "#fff",
        touchAction: "manipulation",
      }}
    >
      {children}
    </Link>
  );
}

function SimButton({ label, sub, onClick, disabled, icon, danger }: {
  label: string; sub: string; onClick: () => void; disabled?: boolean;
  icon: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl px-3 py-3 pressable touch-target text-center min-h-[64px] disabled:opacity-40"
      style={{
        background: danger ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${danger ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.12)"}`,
        touchAction: "manipulation",
      }}
    >
      <div className="flex items-center justify-center gap-1.5">
        <span style={{ color: danger ? "#ef4444" : "#ffd54a" }}>{icon}</span>
        <span className="font-display tracking-widest text-xs" style={{ color: danger ? "#ef4444" : "#fff" }}>{label}</span>
      </div>
      <div className="text-[10px] text-ink-300 mt-1">{sub}</div>
    </button>
  );
}

interface RequiredTask { id: string; emoji: string; label: string; href?: string; }

function buildRequiredTasks(league: any, userTeam: any): RequiredTask[] {
  const t: RequiredTask[] = [];
  if (league.phase === "draft") t.push({ id: "draft", emoji: "📋", label: "The Draft is open — make your picks", href: "/draft" });
  if (league.phase === "freeagency") t.push({ id: "fa", emoji: "💼", label: "Free agency is live — sign players", href: "/freeagency" });
  if (league.phase === "allStarBreak") t.push({ id: "all", emoji: "⭐", label: "All-Star Break — vote and watch", href: "/allstar" });
  if (league.pendingTransition && !league.pendingTransition.ack) {
    t.push({ id: "trans", emoji: "🎬", label: `${String(league.pendingTransition.type).replace(/([A-Z])/g, " $1").trim()} — review and continue` });
  }
  if (userTeam) {
    const injured = league.players.filter((p: any) => p.teamId === userTeam.id && p.injury);
    if (injured.length > 0) t.push({ id: "inj", emoji: "🤕", label: `${injured.length} player${injured.length > 1 ? "s" : ""} on IL — review roster`, href: `/team/${userTeam.id}` });
  }
  return t;
}

function TasksBanner({ tasks }: { tasks: RequiredTask[] }) {
  return (
    <div className="rounded-2xl p-4 card-elevated" style={{ background: "linear-gradient(135deg, rgba(255,179,2,0.20), rgba(255,140,0,0.08))", border: "1px solid rgba(255,179,2,0.55)" }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <AlertTriangle size={13} style={{ color: "#ffd54a" }} />
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#ffd54a" }}>ACTIONS NEEDED · {tasks.length}</div>
      </div>
      <ul className="space-y-1">
        {tasks.map(task => task.href ? (
          <li key={task.id}>
            <Link to={task.href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 pressable touch-target">
              <span className="text-base">{task.emoji}</span>
              <span className="flex-1 text-sm text-white">{task.label}</span>
              <ArrowRight size={12} className="text-amber-300" />
            </Link>
          </li>
        ) : (
          <li key={task.id} className="flex items-center gap-2.5 px-2 py-2 text-sm text-white/90">
            <span className="text-base">{task.emoji}</span>
            <span className="flex-1">{task.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhaseCallout({ league }: { league: any }) {
  const map: Record<string, { title: string; body: string; cta?: { label: string; to: string } }> = {
    preseason:    { title: "Preseason", body: "Spring training is on. Tap Sim to begin the season.", cta: { label: "View Schedule", to: "/schedule" } },
    playoffs:     { title: "Playoffs", body: "The bracket is set. Sim each round from here.", cta: { label: "Open Playoffs", to: "/playoffs" } },
    offseason:    { title: "Offseason", body: "Awards, drafts, and free agency loom.", cta: { label: "View News", to: "/news" } },
    freeagency:   { title: "Free Agency", body: "Sign players to fill out your 45-man roster.", cta: { label: "Browse FAs", to: "/freeagency" } },
    draft:        { title: "Draft Day", body: "Pick the future of the franchise.", cta: { label: "Open Draft", to: "/draft" } },
    allStarBreak: { title: "All-Star Break", body: "Mid-season pause. Vote, watch, and enjoy.", cta: { label: "All-Star Event", to: "/allstar" } },
  };
  const meta = map[league.phase as string];
  if (!meta) return null;
  return (
    <div className="rounded-3xl p-5 text-center card-elevated" style={{ background: "linear-gradient(135deg, rgba(60,80,140,0.3), rgba(15,25,45,0.85))", border: "1px solid rgba(120,160,220,0.3)" }}>
      <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-1">PHASE</div>
      <div className="font-display text-xl mb-1">{meta.title}</div>
      <div className="text-sm text-ink-200 mb-3">{meta.body}</div>
      {meta.cta && (
        <Link to={meta.cta.to} className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 font-display tracking-widest pressable touch-target text-sm" style={{ background: "#ffb302", color: "#0a0d13", touchAction: "manipulation" }}>
          {meta.cta.label} <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const suf = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (suf[(v - 20) % 10] || suf[v] || suf[0]);
}
