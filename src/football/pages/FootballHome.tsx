// Football landing page — entry to football mode. If a league exists,
// shows the dashboard. Otherwise, prompts to create one.
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useFootball } from "../store";
import type { FootballLeague } from "../types";
import { simWeek } from "../sim";
import { startPlayoffs as startPlayoffsImpl, simPlayoffRound, simAllPlayoffs } from "../playoffs";
import { declareFreeAgents, cpuAutoSignFAs } from "../freeagency";
import { ageAndDevelop } from "../development";
import { unlockedAchievements, lockedAchievements, FOOTBALL_ACHIEVEMENTS } from "../achievements";
import { ArrowRight, Play, FastForward, Trophy, Users, Loader, Crown } from "lucide-react";

export default function FootballHome() {
  const lg = useFootball(s => s.league);
  const hydrated = useFootball(s => s.hydrated);
  const loadFromDb = useFootball(s => s.loadFromDb);
  const newLeague = useFootball(s => s.newLeague);
  const [creating, setCreating] = useState(false);
  const [numTeams, setNumTeams] = useState<8 | 16 | 24 | 32>(16);

  useEffect(() => { if (!hydrated) loadFromDb(); }, [hydrated]);

  if (!hydrated) return <div className="p-8 text-center text-ink-200">Loading…</div>;

  // CRITICAL: render the league-populated view as a separate component so
  // its hooks (useMemo×5, useState, etc.) live in a stable hook list — not
  // appended conditionally to this parent. Mixing conditional early returns
  // with later hook calls caused the dashboard to silently break in
  // production once a league was created (10 hooks → 16 hooks across
  // renders = undefined behavior in the React fiber slot table).
  if (lg) return <FootballLeagueView lg={lg} />;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-10">
        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-8">
          <div className="text-7xl mb-3">🏈</div>
          <div className="font-display tracking-[0.3em] text-3xl lg:text-5xl" style={{ color: "#FFB81C" }}>HENRY'S</div>
          <div className="font-display tracking-[0.4em] text-4xl lg:text-7xl">GRIDIRON</div>
          <div className="text-ink-200 text-sm tracking-widest uppercase mt-2">Football season • 17 weeks of chaos</div>
        </motion.div>
        <div className="glass rounded-2xl p-6 w-full max-w-md">
          <div className="font-display tracking-widest text-lg mb-2">NEW SEASON</div>
          <div className="text-xs text-ink-200 mb-4">8-32 teams across 8 divisions. Each plays 17 weeks then the bracket starts.</div>
          <label className="block text-xs text-ink-300 mb-1">Number of teams</label>
          <div className="flex gap-2 mb-4">
            {([8, 16, 24, 32] as const).map(n => (
              <button key={n} onClick={() => setNumTeams(n)} className={`px-3 py-2 rounded-lg text-sm pressable touch-target ${numTeams === n ? "bg-amber-400 text-ink-950" : "bg-white/5"}`}>{n}</button>
            ))}
          </div>
          <button
            disabled={creating}
            onClick={async () => {
              setCreating(true);
              await newLeague({ numTeams, season: new Date().getFullYear() });
              setCreating(false);
            }}
            className="w-full px-4 py-3 rounded-xl font-display tracking-wider text-sm pressable touch-target disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "#FFB81C", color: "#0a0d13" }}
          >
            {creating ? (
              <><Loader size={16} className="animate-spin" /> Building {numTeams}-team league…</>
            ) : "Kickoff →"}
          </button>
          {creating && numTeams >= 24 && (
            <div className="text-[10px] text-ink-300 text-center mt-2">
              Bigger leagues take a moment to generate — ~1,700 players to roster on a 32-team setup.
            </div>
          )}
          <Link to="/title" className="block text-center mt-3 text-xs text-ink-300">← Back to baseball</Link>
        </div>
      </div>
  );
}

/** Dashboard rendered ONLY when a league exists. Lives in its own
 *  component so its hooks (useMemo×5, useState, useNavigate, etc.) sit in
 *  a stable hook-list — never conditionally appended to the parent's. */
function FootballLeagueView({ lg }: { lg: FootballLeague }) {
  const mutate = useFootball(s => s.mutate);
  const setUserTeam = useFootball(s => s.setUserTeam);
  const navigate = useNavigate();

  const userTeam = useMemo(
    () => lg.teams.find(t => t.id === lg.userTeamId),
    [lg.teams, lg.userTeamId],
  );
  const standings = useMemo(
    () => [...lg.teams].sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)),
    [lg.teams],
  );
  const upcoming = useMemo(
    () => lg.schedule.filter(g => !g.played && g.week === lg.week).slice(0, 8),
    [lg.schedule, lg.week],
  );
  const recent = useMemo(
    () => lg.schedule.filter(g => g.played).slice(-6).reverse(),
    [lg.schedule],
  );
  const recentNews = useMemo(() => lg.newsLog.slice(0, 5), [lg.newsLog]);
  const [simming, setSimming] = useState(false);

  if (!userTeam) {
    const pickRandom = () => {
      const t = lg.teams[Math.floor(Math.random() * lg.teams.length)];
      if (t) setUserTeam(t.id);
    };
    return (
      <div className="space-y-4 pb-24">
        <header className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest" style={{ color: "#FFB81C" }}>Choose your franchise</div>
            <h1 className="font-display text-4xl">PICK A TEAM</h1>
            <div className="text-sm text-ink-200 mt-1">You'll manage them all season. Pick wisely (or recklessly).</div>
          </div>
          <button
            onClick={pickRandom}
            className="px-4 py-2.5 rounded-xl font-display tracking-wider text-sm pressable touch-target flex items-center gap-2"
            style={{ background: "rgba(255,184,28,0.15)", border: "1px solid rgba(255,184,28,0.4)", color: "#FFB81C" }}
          >
            🎲 Pick for me
          </button>
        </header>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lg.teams.map(t => (
            <button
              key={t.id}
              onClick={() => setUserTeam(t.id)}
              className="text-left p-4 rounded-2xl border border-white/10 hover:border-amber-400 bg-white/3 pressable touch-target"
              style={{ background: `linear-gradient(135deg, ${t.primary}22, transparent 60%)` }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center font-display text-xl" style={{ background: t.primary, color: t.accent }}>{t.abbr}</div>
                <div>
                  <div className="font-display tracking-wide">{t.city} {t.name}</div>
                  <div className="text-[10px] text-ink-300 uppercase tracking-widest">Division {t.divisionId + 1}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Your team's next/this-week game.
  const myGame = lg.schedule.find(g => !g.played && g.week === lg.week && (g.homeId === userTeam.id || g.awayId === userTeam.id));
  const myOpp = myGame ? lg.teams.find(t => t.id === (myGame.homeId === userTeam.id ? myGame.awayId : myGame.homeId)) : null;
  const userIsHome = myGame ? myGame.homeId === userTeam.id : false;

  // Your last 5 games — for the W/L tail strip.
  const recentMyGames = lg.schedule.filter(g => g.played && (g.homeId === userTeam.id || g.awayId === userTeam.id)).slice(-5).reverse();

  // News, bubbled — your team first, then everyone else.
  const myNewsList = (() => {
    const mine = lg.newsLog.filter(n => Array.isArray(n.teamIds) && n.teamIds!.includes(userTeam.id)).slice(0, 4);
    const others = lg.newsLog.filter(n => !mine.includes(n)).slice(0, Math.max(0, 5 - mine.length));
    return [...mine, ...others].slice(0, 5);
  })();

  // Division standing for the team-identity hero.
  const myDivision = lg.divisions.find(d => d.id === userTeam.divisionId);
  const inDiv = myDivision ? standings.filter(t => myDivision.teamIds.includes(t.id)) : standings;
  const myDivRank = inDiv.findIndex(t => t.id === userTeam.id) + 1;

  // Required tasks — anything the user really should look at.
  const tasks: { id: string; emoji: string; label: string; href?: string }[] = [];
  if (lg.phase === "freeagency") tasks.push({ id: "fa", emoji: "💼", label: "Free agency is open", href: "/football/freeagency" });
  if (lg.phase === "draft") tasks.push({ id: "draft", emoji: "📋", label: "Draft is open — make your picks" });
  if (lg.playoffsBracket && !lg.champion) tasks.push({ id: "po", emoji: "🏆", label: "Playoffs underway — sim the next round" });
  const injuredCount = lg.players.filter(p => p.teamId === userTeam.id && p.injury).length;
  if (injuredCount > 0) tasks.push({ id: "inj", emoji: "🤕", label: `${injuredCount} player${injuredCount > 1 ? "s" : ""} hurt — check roster`, href: `/football/team/${userTeam.id}` });

  const simThisGame = async () => {
    if (!myGame || simming) return;
    setSimming(true);
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
    try {
      // Sim the WEEK (engine doesn't expose single-game sim cleanly).
      // This advances the week the way the regular Sim Week button does.
      await mutate(lgs => { simWeek(lgs); });
    } finally { setSimming(false); }
  };

  return (
    <div className="space-y-5 pb-32">
      {/* ─── ACT 1 — TEAM IDENTITY HERO ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl relative overflow-hidden"
        style={{ border: `1px solid ${userTeam.primary}66` }}
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${userTeam.primary} 0%, ${userTeam.primary}cc 45%, rgba(8,12,16,0.95))` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(900px 380px at 88% -8%, ${userTeam.accent}55, transparent 55%)` }} />
        <div className="relative p-5 lg:p-7">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center font-display text-3xl lg:text-4xl shrink-0 shadow-xl"
              style={{ background: userTeam.primary, color: userTeam.accent, border: `2px solid ${userTeam.accent}` }}
            >
              {userTeam.abbr}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] tracking-[0.35em] font-display" style={{ color: userTeam.accent, opacity: 0.95 }}>YOUR FRANCHISE</div>
              <div className="font-display text-xl lg:text-2xl leading-tight" style={{ color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                {userTeam.city.toUpperCase()}
              </div>
              <div className="font-display text-3xl lg:text-5xl leading-none" style={{ color: userTeam.accent, textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>
                {userTeam.name.toUpperCase()}
              </div>
              <div className="text-white/90 text-sm mt-2 truncate">
                <span className="font-mono">{userTeam.wins}-{userTeam.losses}{userTeam.ties ? `-${userTeam.ties}` : ""}</span>
                {myDivRank > 0 && myDivision && (
                  <>
                    <span className="text-white/50 mx-1.5">·</span>
                    <span>{ordinal(myDivRank)} in {myDivision.name}</span>
                  </>
                )}
                <span className="text-white/50 mx-1.5">·</span>
                <span>{lg.season} season</span>
              </div>
            </div>
          </div>
          {/* Quick-jump chips into the team */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
            <ChipLink to={`/football/team/${userTeam.id}`} accent={userTeam.accent}>Roster</ChipLink>
            <ChipLink to="/football/schedule" accent={userTeam.accent}>Schedule</ChipLink>
            <ChipLink to="/football/standings" accent={userTeam.accent}>Standings</ChipLink>
            <ChipLink to="/football/league" accent={userTeam.accent}>League</ChipLink>
          </div>
        </div>
      </motion.div>

      {/* ─── ACT 2 — ACTIONS NEEDED ─────────────────────────── */}
      {tasks.length > 0 && (
        <div className="rounded-2xl p-4 card-elevated" style={{ background: "linear-gradient(135deg, rgba(255,184,28,0.22), rgba(255,140,0,0.08))", border: "1px solid rgba(255,184,28,0.55)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#FFB81C" }}>ACTIONS NEEDED · {tasks.length}</div>
          </div>
          <ul className="space-y-1">
            {tasks.map(t => t.href ? (
              <li key={t.id}>
                <Link to={t.href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 pressable touch-target">
                  <span className="text-base">{t.emoji}</span>
                  <span className="flex-1 text-sm text-white">{t.label}</span>
                  <ArrowRight size={12} className="text-amber-300" />
                </Link>
              </li>
            ) : (
              <li key={t.id} className="flex items-center gap-2.5 px-2 py-2 text-sm text-white/90">
                <span className="text-base">{t.emoji}</span>
                <span className="flex-1">{t.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── ACT 3 — THIS WEEK'S GAME ───────────────────────── */}
      {lg.week <= 17 && myGame && myOpp && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 card-elevated"
          style={{ background: "rgba(15,20,28,0.7)", border: "1px solid rgba(255,255,255,0.10)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#FFB81C" }}>WEEK {lg.week}</div>
            <div className="text-[10px] text-ink-300">{userIsHome ? "HOME" : "AWAY"}</div>
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-xl mx-auto" style={{ background: userTeam.primary, color: userTeam.accent }}>{userTeam.abbr}</div>
              <div className="font-mono text-[11px] text-ink-200 mt-1">{userTeam.wins}-{userTeam.losses}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-ink-300">{userIsHome ? "VS" : "@"}</div>
              <div className="font-display text-2xl text-ink-200">·</div>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display text-xl mx-auto" style={{ background: myOpp.primary, color: myOpp.accent }}>{myOpp.abbr}</div>
              <div className="font-mono text-[11px] text-ink-200 mt-1">{myOpp.wins}-{myOpp.losses}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate(`/football/game/${myGame.id}`)}
              className="rounded-2xl px-5 py-4 font-display tracking-widest text-base pressable touch-target flex items-center justify-center gap-2 shadow-lg min-h-[60px]"
              style={{ background: "linear-gradient(135deg, #FFB81C, #c89414)", color: "#0a0d13", touchAction: "manipulation" }}
            >
              <Play size={18} /> PLAY
            </button>
            <button
              disabled={simming}
              onClick={simThisGame}
              className="rounded-2xl px-5 py-4 font-display tracking-widest text-base pressable touch-target flex items-center justify-center gap-2 disabled:opacity-50 min-h-[60px]"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", touchAction: "manipulation" }}
            >
              {simming ? <Loader size={16} className="animate-spin" /> : <FastForward size={16} />} SIMULATE
            </button>
          </div>
        </motion.div>
      )}

      {/* End-of-season cards — playoffs → free agency → next season */}
      {lg.week > 17 && (
        <EndOfSeasonFlow lg={lg} mutate={mutate} navigate={navigate} />
      )}

      {/* SIM FORWARD — only during regular season */}
      {lg.week <= 17 && (
        <div className="rounded-2xl p-4 card-elevated" style={{ background: "rgba(15,20,28,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display text-ink-200 mb-3">SIM FORWARD</div>
          <div className="grid grid-cols-3 gap-2">
            <SimButton
              label="Next Week" sub="+1 wk" disabled={simming}
              icon={<FastForward size={14} />}
              onClick={async () => {
                if (simming) return;
                setSimming(true);
                await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
                try { await mutate(lgs => { simWeek(lgs); }); } finally { setSimming(false); }
              }}
            />
            <SimButton
              label="4 Weeks" sub={`+${Math.min(4, 18 - lg.week)} wk`} disabled={simming || lg.week >= 18}
              icon={<FastForward size={14} />}
              onClick={async () => {
                if (simming) return;
                setSimming(true);
                await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
                try {
                  await mutate(lgs => {
                    for (let i = 0; i < 4 && lgs.week <= 17; i++) simWeek(lgs);
                  });
                } finally { setSimming(false); }
              }}
            />
            <SimButton
              label="End of Season" sub={`+${18 - lg.week} wk`} disabled={simming || lg.week >= 18} danger
              icon={<FastForward size={14} />}
              onClick={async () => {
                if (simming) return;
                if (!confirm(`Sim the rest of the regular season (${18 - lg.week} weeks)? Results lock in permanently.`)) return;
                setSimming(true);
                await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
                try {
                  await mutate(lgs => { while (lgs.week <= 17) simWeek(lgs); });
                } finally { setSimming(false); }
              }}
            />
          </div>
          <div className="text-[10px] text-ink-300 mt-2 italic">Results lock in permanently — no redo.</div>
        </div>
      )}

      {/* ─── ACT 4 — LATEST NEWS (your team first) ───────── */}
      <div className="rounded-2xl p-4 card-elevated" style={{ background: "rgba(15,20,28,0.55)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#FFB81C" }}>LATEST NEWS</div>
          <Link to="/football/league" className="text-[11px] inline-flex items-center gap-1 pressable touch-target" style={{ color: "#FFB81C" }}>
            League <ArrowRight size={11} />
          </Link>
        </div>
        {myNewsList.length === 0 && <div className="text-[12px] text-ink-300 italic">Quiet so far — sim a week.</div>}
        <div className="space-y-1">
          {myNewsList.map(n => {
            const isMine = Array.isArray(n.teamIds) && n.teamIds!.includes(userTeam.id);
            return (
              <div
                key={n.id}
                className="px-2 py-1.5 rounded-lg"
                style={{ borderLeft: isMine ? `2px solid ${userTeam.accent}` : "2px solid transparent" }}
              >
                <div className="text-[9px] uppercase tracking-widest text-ink-300">{n.category}</div>
                <div className={`text-[13px] leading-snug ${n.important ? "font-semibold" : ""} ${isMine ? "text-white" : "text-ink-100"}`}>
                  <span className="mr-1.5">{n.emoji ?? "📰"}</span>{n.headline}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tail: your last 5 games — W/L pills */}
      {recentMyGames.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(15,20,28,0.45)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] font-display text-ink-200">YOUR LAST {recentMyGames.length} GAMES</div>
            <Link to="/football/schedule" className="text-[11px] inline-flex items-center gap-1 pressable touch-target" style={{ color: "#FFB81C" }}>
              Full schedule <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {recentMyGames.map(g => {
              const opp = lg.teams.find(t => t.id === (g.homeId === userTeam.id ? g.awayId : g.homeId))!;
              const myScore = g.homeId === userTeam.id ? g.score!.home : g.score!.away;
              const oppScore = g.homeId === userTeam.id ? g.score!.away : g.score!.home;
              const won = myScore > oppScore;
              return (
                <button
                  key={g.id}
                  onClick={() => navigate(`/football/game/${g.id}`)}
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

      {/* Achievements — kept, but tucked at the bottom under your team's run */}
      <AchievementsPanel lg={lg} />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function ChipLink({ to, children, accent }: { to: string; children: React.ReactNode; accent: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl px-2 py-2 text-center pressable touch-target text-[11px] font-display tracking-widest min-h-[44px] flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.25)",
        border: `1px solid ${accent}55`,
        color: "#fff",
        touchAction: "manipulation",
      }}
    >
      {children}
    </Link>
  );
}

function ordinal(n: number): string {
  const suf = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suf[(v - 20) % 10] || suf[v] || suf[0]);
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
        <span style={{ color: danger ? "#ef4444" : "#FFB81C" }}>{icon}</span>
        <span className="font-display tracking-widest text-xs" style={{ color: danger ? "#ef4444" : "#fff" }}>{label}</span>
      </div>
      <div className="text-[10px] text-ink-300 mt-1">{sub}</div>
    </button>
  );
}

function AchievementsPanel({ lg }: { lg: any }) {
  const [showAll, setShowAll] = useState(false);
  const unlocked = unlockedAchievements(lg);
  const locked = lockedAchievements(lg);
  const total = FOOTBALL_ACHIEVEMENTS.length;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-[10px] uppercase tracking-widest font-display" style={{ color: "#FFB81C" }}>
          Achievements · {unlocked.length} / {total}
        </div>
        <button
          onClick={() => setShowAll(s => !s)}
          className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded bg-white/5"
        >{showAll ? "Hide locked" : "Show all"}</button>
      </div>
      {unlocked.length === 0 && !showAll && (
        <div className="text-xs italic text-ink-300">No unlocks yet — sim a few games.</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {unlocked.map(a => (
          <div key={a.id} className="px-2.5 py-2 rounded-lg flex items-start gap-2" style={{ background: "rgba(255,184,28,0.12)", border: "1px solid rgba(255,184,28,0.3)" }}>
            <span className="text-xl shrink-0">{a.emoji}</span>
            <div className="min-w-0">
              <div className="text-xs font-display tracking-wide truncate" style={{ color: "#FFB81C" }}>{a.title}</div>
              <div className="text-[10px] text-ink-200 leading-tight">{a.desc}</div>
            </div>
          </div>
        ))}
        {showAll && locked.map(a => (
          <div key={a.id} className="px-2.5 py-2 rounded-lg flex items-start gap-2 opacity-50" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-xl shrink-0 grayscale">{a.emoji}</span>
            <div className="min-w-0">
              <div className="text-xs font-display tracking-wide truncate text-ink-200">{a.title}</div>
              <div className="text-[10px] text-ink-300 leading-tight">{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── End-of-season flow ────────────────────────────────────────────────
function EndOfSeasonFlow({ lg, mutate, navigate }: { lg: any; mutate: (fn: (lgs: any) => void) => Promise<void>; navigate: (path: string) => void }) {
  const [busy, setBusy] = useState(false);
  const playoffs = lg.playoffsBracket;
  const champion = playoffs?.championId ? lg.teams.find((t: any) => t.id === playoffs.championId) : null;

  // 1) Regular season just ended — show "Start Playoffs" button.
  if (!playoffs) {
    return (
      <div className="rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap" style={{ background: "linear-gradient(135deg, rgba(255,184,28,0.15), rgba(11,61,46,0.4))", border: "1px solid rgba(255,184,28,0.35)" }}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] font-display" style={{ color: "#FFB81C" }}>Regular Season Complete</div>
          <div className="text-sm mt-0.5">Time for the postseason. Top 4 per conference qualify.</div>
        </div>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
            try { await mutate(lgs => { lgs.playoffsBracket = startPlayoffsImpl(lgs); }); }
            finally { setBusy(false); }
          }}
          className="px-5 py-3 rounded-xl font-display tracking-wider text-sm pressable touch-target flex items-center gap-2 disabled:opacity-50"
          style={{ background: "#FFB81C", color: "#0a0d13" }}
        >
          {busy ? <><Loader size={16} className="animate-spin" /> Setting bracket…</> : <><Trophy size={16} /> Start Playoffs</>}
        </button>
      </div>
    );
  }

  // 2) Playoffs in progress
  if (!champion) {
    return <PlayoffsBracketCard lg={lg} mutate={mutate} busy={busy} setBusy={setBusy} navigate={navigate} />;
  }

  // 3) Champion crowned — offer offseason rollover
  return (
    <div className="rounded-2xl p-5 flex items-start gap-4 flex-wrap" style={{ background: "linear-gradient(135deg, rgba(255,184,28,0.2), rgba(11,61,46,0.4))", border: "1px solid rgba(255,184,28,0.5)" }}>
      <div className="text-5xl shrink-0">🏆</div>
      <div className="flex-1 min-w-[200px]">
        <div className="text-[10px] uppercase tracking-[0.3em] font-display" style={{ color: "#FFB81C" }}>Champions of Season {lg.season}</div>
        <div className="font-display text-2xl mt-0.5" style={{ color: "#FFB81C" }}>{champion.city} {champion.name}</div>
        <div className="text-xs text-ink-200 mt-1">A new season awaits. Offseason rolls the calendar: declare free agents, age the league, draft rookies, regenerate the schedule.</div>
      </div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
          try {
            await mutate(lgs => {
              // 1. Declare free agents
              declareFreeAgents(lgs);
            });
            // 2. Let user visit Free Agency page if they want — but for now,
            //    keep the flow inline: just go straight to development.
            await mutate(lgs => {
              // 3. Age + retire + breakouts + busts + rookie draft
              ageAndDevelop(lgs);
              // 4. CPU teams auto-sign remaining FAs
              cpuAutoSignFAs(lgs);
              // 5. Reset for next season
              lgs.season += 1;
              lgs.week = 1;
              lgs.phase = "regular";
              lgs.champion = null;
              lgs.playoffsBracket = null;
              for (const t of lgs.teams) {
                t.wins = 0; t.losses = 0; t.ties = 0;
                t.pointsFor = 0; t.pointsAgainst = 0;
              }
              // Fresh schedule
              const { teams, schedule } = lgs;
              schedule.length = 0;
              for (let w = 1; w <= 17; w++) {
                const ids = teams.map((t: any) => t.id);
                const shuffled = [...ids].sort(() => Math.random() - 0.5);
                for (let i = 0; i + 1 < shuffled.length; i += 2) {
                  const homeId = w % 2 === 0 ? shuffled[i] : shuffled[i + 1];
                  const awayId = homeId === shuffled[i] ? shuffled[i + 1] : shuffled[i];
                  schedule.push({
                    id: `fg-${Date.now()}-${w}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                    week: w, homeId, awayId, played: false,
                  });
                }
              }
            });
          } finally { setBusy(false); }
        }}
        className="px-5 py-3 rounded-xl font-display tracking-wider text-sm pressable touch-target flex items-center gap-2 disabled:opacity-50"
        style={{ background: "#FFB81C", color: "#0a0d13" }}
      >
        {busy ? <><Loader size={16} className="animate-spin" /> Working…</> : "Begin Offseason →"}
      </button>
    </div>
  );
}

function PlayoffsBracketCard({ lg, mutate, busy, setBusy, navigate }: any) {
  const playoffs = lg.playoffsBracket;
  const currentRoundSeries = playoffs.bracket.filter((s: any) => s.round === playoffs.currentRound);
  const allCurrentPlayed = currentRoundSeries.every((s: any) => s.game.played);
  const roundLabels: Record<string, string> = {
    wildcard: "Wild Card Round",
    divisional: "Divisional Round",
    conference: "Conference Championship",
    superbowl: "SUPER BOWL",
  };

  return (
    <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(255,184,28,0.12), rgba(11,61,46,0.4))", border: "1px solid rgba(255,184,28,0.35)" }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] font-display" style={{ color: "#FFB81C" }}>Playoffs</div>
          <div className="font-display text-xl mt-0.5">{roundLabels[playoffs.currentRound]}</div>
        </div>
        <div className="flex gap-2">
          <button
            disabled={busy || allCurrentPlayed}
            onClick={async () => {
              setBusy(true);
              await new Promise((r: any) => requestAnimationFrame(() => setTimeout(r, 0)));
              try { await mutate((lgs: any) => { simPlayoffRound(lgs); }); }
              finally { setBusy(false); }
            }}
            className="px-4 py-2 rounded-lg font-display tracking-wider text-xs pressable touch-target flex items-center gap-1.5 disabled:opacity-50"
            style={{ background: "#FFB81C", color: "#0a0d13" }}
          >
            {busy ? <Loader size={12} className="animate-spin" /> : <FastForward size={12} />} Sim Round
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await new Promise((r: any) => requestAnimationFrame(() => setTimeout(r, 0)));
              try { await mutate((lgs: any) => { simAllPlayoffs(lgs); }); }
              finally { setBusy(false); }
            }}
            className="px-4 py-2 rounded-lg text-xs font-display tracking-wider bg-white/5 border border-white/10 pressable touch-target flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy ? <Loader size={12} className="animate-spin" /> : "Sim to Champ"}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {currentRoundSeries.map((s: any) => {
          const home = lg.teams.find((t: any) => t.id === s.homeId);
          const away = lg.teams.find((t: any) => t.id === s.awayId);
          if (!home || !away) return null;
          const homeWon = s.winnerId === home.id;
          const isMine = home.id === lg.userTeamId || away.id === lg.userTeamId;
          return (
            <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isMine ? "border border-amber-400" : "border border-white/10"}`} style={{ background: isMine ? "rgba(255,184,28,0.12)" : "rgba(255,255,255,0.04)" }}>
              <div className={`flex-1 flex items-center gap-2 ${s.game.played && !homeWon ? "text-emerald-300" : "text-ink-100"}`}>
                <span className="text-[10px] text-ink-300 font-mono w-6">#{s.seedAway}</span>
                <span className="text-xs font-display w-10 text-center" style={{ background: away.primary, color: away.accent, borderRadius: 4, padding: "2px 4px" }}>{away.abbr}</span>
                {s.game.played && <span className="text-sm font-mono ml-auto">{s.game.awayScore}</span>}
              </div>
              <span className="text-ink-400 text-xs">@</span>
              <div className={`flex-1 flex items-center gap-2 ${s.game.played && homeWon ? "text-emerald-300" : "text-ink-100"}`}>
                <span className="text-[10px] text-ink-300 font-mono w-6">#{s.seedHome}</span>
                <span className="text-xs font-display w-10 text-center" style={{ background: home.primary, color: home.accent, borderRadius: 4, padding: "2px 4px" }}>{home.abbr}</span>
                {s.game.played && <span className="text-sm font-mono ml-auto">{s.game.homeScore}</span>}
              </div>
              {s.game.played && (
                <span className="text-[9px] uppercase tracking-widest font-display px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">FINAL</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
