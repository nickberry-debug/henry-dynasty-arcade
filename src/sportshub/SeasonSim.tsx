// Sports Hub — universal season-and-playoffs page. Same flow for
// Hockey, Basketball, College Football. Pick a team, sim the season
// week by week (or all at once), make the bracket, win the
// championship. Saves per-profile per-sport.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FastForward, Trophy, Award, ChevronRight, Repeat, GraduationCap } from "lucide-react";
import { Crest } from "../art/CrestGenerator";
import { TEAMS_BY_SPORT } from "./teams";
import {
  SPORT_CONFIGS, newSeason, simWeek, simRest, computeStandings,
  buildBracket, simBracketRound,
  type SeasonState, type SportId, type Result,
} from "./franchise";
import { athleteSpriteFor } from "./athleteSprite";
import { Sparkline } from "../components/Sparkline";
import { updateSportshubStorylines, pushWeeklyGameNews, recordSportshubSeasonResult } from "./storylines";
import { STORYLINE_EMOJI } from "../sports-engine";
import {
  initRecruitingClass, cpuRecruit, autoCompleteUserRecruiting, signRecruit,
  cpuPortalActivity, signFromPortal,
  updateCfbRankings, generateBowlGames, simAllBowls, buildCfbPlayoffBracket,
} from "./cfb";
import { getActiveProfileId, profileKey, recordGameSession } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";

function saveKey(sport: SportId): string { return profileKey(`dd_sports_${sport}_v1`); }
function blobKey(sport: SportId): string { return `sports_${sport}_v1`; }

function ordinal(n: number): string {
  const suf = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suf[(v - 20) % 10] || suf[v] || suf[0]);
}

function loadSave(sport: SportId): SeasonState | null {
  try {
    const raw = localStorage.getItem(saveKey(sport));
    return raw ? (JSON.parse(raw) as SeasonState) : null;
  } catch { return null; }
}
function persist(sport: SportId, s: SeasonState) {
  try { localStorage.setItem(saveKey(sport), JSON.stringify(s)); } catch { /* ignore */ }
  const pid = getActiveProfileId();
  if (pid) try { cloudSet(pid, blobKey(sport), s); } catch { /* ignore */ }
}

export default function SeasonSim() {
  const navigate = useNavigate();
  const params = useParams<{ sport?: string }>();
  const sport = (params.sport ?? "hockey") as SportId;
  const cfg = SPORT_CONFIGS[sport];
  const [state, setState] = useState<SeasonState | null>(() => loadSave(sport));
  const [pickingTeam, setPickingTeam] = useState(!state);
  const [openResult, setOpenResult] = useState<Result | null>(null);

  // Cloud sync — pull remote on activate
  useEffect(() => {
    const pid = getActiveProfileId();
    if (!pid) return;
    return cloudSubscribe<SeasonState>(pid, blobKey(sport), remote => {
      if (!remote || typeof remote !== "object") return;
      setState(remote);
      setPickingTeam(false);
      try { localStorage.setItem(saveKey(sport), JSON.stringify(remote)); } catch { /* ignore */ }
    });
  }, [sport]);

  function startSeason(teamId: string) {
    const s = newSeason(sport, teamId, state ?? null);
    setState(s); persist(sport, s); setPickingTeam(false);
  }

  function doWeek() {
    if (!state) return;
    const next = simWeek(state);
    // Push this week's game news + refresh shared-engine storylines.
    try { pushWeeklyGameNews(next, next.currentWeek - 1); } catch { /* non-critical */ }
    try { updateSportshubStorylines(next); } catch { /* non-critical */ }
    // CFB-only: refresh weekly rankings + generate bowls when reg season ends.
    if (next.sport === "cfb") {
      try { updateCfbRankings(next); } catch { /* non-critical */ }
    }
    setState(next); persist(sport, next);
    // After last week, build the bracket
    const lastWeek = Math.max(0, ...next.schedule.map(g => g.week));
    if (next.currentWeek > lastWeek && !next.bracket) {
      // CFB seeds by ranking, not standings; other sports use the generic seeder.
      const bracket = next.sport === "cfb" ? buildCfbPlayoffBracket(next) : buildBracket(next);
      const withBracket = { ...next, bracket };
      // CFB: also generate bowls for non-playoff teams + sim them.
      if (next.sport === "cfb") {
        try { generateBowlGames(withBracket); simAllBowls(withBracket); } catch { /* non-critical */ }
      }
      setState(withBracket); persist(sport, withBracket);
    }
  }

  function doRest() {
    if (!state) return;
    let next = simRest(state);
    // Storylines run after each simWeek inside simRest's loop already
    // happens via the simWeek call above — but simRest bypasses doWeek's
    // hooks, so refresh once at the end.
    try { updateSportshubStorylines(next); } catch { /* non-critical */ }
    if (next.sport === "cfb") {
      try { updateCfbRankings(next); } catch { /* non-critical */ }
    }
    const bracket = next.sport === "cfb" ? buildCfbPlayoffBracket(next) : buildBracket(next);
    next = { ...next, bracket };
    if (next.sport === "cfb") {
      try { generateBowlGames(next); simAllBowls(next); } catch { /* non-critical */ }
    }
    setState(next); persist(sport, next);
  }

  function doPlayoffs() {
    if (!state || !state.bracket) return;
    let next = state;
    while (next.bracket && !next.champion) {
      next = simBracketRound(next);
    }
    // Tally career
    const winsThisYear = next.results.filter(r => {
      if (r.away === next.playerTeamId) return r.awayScore > r.homeScore;
      if (r.home === next.playerTeamId) return r.homeScore > r.awayScore;
      return false;
    }).length;
    const championThisYear = next.champion === next.playerTeamId;
    next = {
      ...next,
      careerWins: (state.careerWins ?? 0) + winsThisYear,
      careerChampionships: (state.careerChampionships ?? 0) + (championThisYear ? 1 : 0),
    };
    // Record season result — MVP / scoring leader / champion stamping +
    // history row + Award news. Uses shared-engine storyline logic
    // internally for award detection.
    try { recordSportshubSeasonResult(next); } catch { /* non-critical */ }
    // CFB-only offseason kick-off: open the recruiting board + populate
    // the transfer portal via CPU activity so the user has something to
    // engage with before clicking "Next Season".
    if (next.sport === "cfb") {
      try { initRecruitingClass(next); } catch { /* non-critical */ }
      try { cpuRecruit(next, { perTeam: 10 }); } catch { /* non-critical */ }
      try { cpuPortalActivity(next); } catch { /* non-critical */ }
    }
    setState(next); persist(sport, next);
    const pid = getActiveProfileId();
    if (pid) recordGameSession(pid, `sports_${sport}`, {
      sessions: 1,
      wins: championThisYear ? 1 : 0,
      losses: championThisYear ? 0 : 1,
      level: next.year,
    });
  }

  function newYear() {
    if (!state) return;
    const s = newSeason(sport, state.playerTeamId, state);
    setState(s); persist(sport, s);
  }

  function abandonAndPick() {
    setState(null); setPickingTeam(true);
    try { localStorage.removeItem(saveKey(sport)); } catch { /* ignore */ }
  }

  // ── Team picker ─────────────────────────────────────────────────────
  if (pickingTeam) {
    const teams = TEAMS_BY_SPORT[sport];
    return (
      <div className="min-h-screen" style={{
        background: `radial-gradient(900px 500px at 50% 0%, ${cfg.accent}22, transparent), #0a0814`,
      }}>
        <header className="px-4 py-4 flex items-center gap-3 max-w-4xl mx-auto safe-top">
          <button onClick={() => navigate("/sports")} aria-label="Back"
            className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: cfg.accent }}>{cfg.emoji} {cfg.name.toUpperCase()}</div>
            <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fef3c7" }}>PICK YOUR TEAM</h1>
          </div>
        </header>
        <main className="px-4 max-w-4xl mx-auto pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {teams.map(t => {
              // Athlete sprite — palette bucketed from the team's primary crest
              // color, variant chosen deterministically by team id. Same helper
              // the RosterScreen uses so the picker and roster stay consistent.
              const athleteUrl = athleteSpriteFor(t.id, t.crest.primary).url;
              return (
                <button key={t.id} onClick={() => startSeason(t.id)}
                  className="rounded-2xl p-3 text-center pressable touch-target"
                  style={{
                    background: `linear-gradient(135deg, ${t.crest.primary}33, rgba(8,8,14,0.95))`,
                    border: `1.5px solid ${t.crest.secondary}66`,
                  }}>
                  <div className="flex justify-center items-end gap-1.5">
                    <Crest spec={t.crest} size={56} />
                    {/* Athlete silhouette — Kenney sports-pack, tinted via opacity */}
                    <img src={athleteUrl} alt=""
                      aria-hidden="true"
                      style={{ height: 64, width: "auto", filter: `drop-shadow(0 2px 4px ${t.crest.primary})` }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div className="font-display text-[11px] mt-2 tracking-widest" style={{ color: t.crest.secondary }}>
                    {t.city}
                  </div>
                  <div className="font-display text-[13px]" style={{ color: "#fef3c7" }}>
                    {t.nickname}
                  </div>
                  <div className="text-[10px] opacity-70 mt-1" style={{ color: "rgba(229,231,235,0.7)" }}>
                    RTG {t.rating} · {t.star.pos} {t.star.name.split(" ")[1] ?? t.star.name}
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (!state) return null;
  const playerTeam = state.teams.find(t => t.id === state.playerTeamId)!;
  const standings = computeStandings(state);
  const lastWeek = Math.max(0, ...state.schedule.map(g => g.week));
  const seasonOver = state.currentWeek > lastWeek;
  const playoffsDone = state.bracket && state.bracket.rounds[state.bracket.rounds.length - 1].every(g => g.winner);
  const championTeam = state.champion ? state.teams.find(t => t.id === state.champion) : null;

  // Player-team record + division standing — used by the hero panel.
  const playerRec = standings.find(s => s.teamId === playerTeam.id);
  const playerInConf = standings.filter(s => state.teams.find(t => t.id === s.teamId)?.conf === playerTeam.conf);
  const confRank = playerInConf.findIndex(s => s.teamId === playerTeam.id) + 1;

  // Player team's next + last games.
  const upcomingForPlayer = state.schedule
    .filter(g => g.week >= state.currentWeek && (g.away === playerTeam.id || g.home === playerTeam.id))
    .sort((a, b) => a.week - b.week)[0];
  const lastFivePlayer = state.results
    .filter(r => r.away === playerTeam.id || r.home === playerTeam.id)
    .slice(-5);

  // L10 win/loss vector for a team (used in standings sparkline).
  const results = state.results;
  function last10For(teamId: string): number[] {
    const recent = results.filter(r => r.away === teamId || r.home === teamId).slice(-10);
    return recent.map(r => {
      const wonAway = r.away === teamId && r.awayScore > r.homeScore;
      const wonHome = r.home === teamId && r.homeScore > r.awayScore;
      return wonAway || wonHome ? 1 : -1;
    });
  }

  // ── Main view ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-12" style={{
      background: `radial-gradient(800px 500px at 50% 0%, ${cfg.accent}1a, transparent), linear-gradient(180deg, #0a0814 0%, #050308 100%)`,
    }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-5xl mx-auto safe-top">
        <button onClick={() => navigate("/sports")} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <Crest spec={playerTeam.crest} size={48} />
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: cfg.accent }}>
            {cfg.emoji} {cfg.name.toUpperCase()} · YEAR {state.year}
          </div>
          <h1 className="font-display text-xl tracking-wider" style={{ color: "#fef3c7" }}>
            {playerTeam.city} {playerTeam.nickname}
          </h1>
          <button onClick={() => navigate(`/sports/${sport}/team/${playerTeam.id}`)}
            className="mt-1 px-2 py-0.5 rounded text-[9px] font-display tracking-widest pressable"
            style={{ background: `${cfg.accent}22`, color: cfg.accent, border: `1px solid ${cfg.accent}66` }}>
            VIEW ROSTER →
          </button>
        </div>
        <div className="text-right">
          <div className="text-[9px] tracking-widest opacity-70" style={{ color: "#fef3c7" }}>CAREER</div>
          <div className="font-mono text-[13px]" style={{ color: cfg.accent }}>
            {state.careerWins}W · {state.careerChampionships}🏆
          </div>
        </div>
      </header>

      <main className="px-4 max-w-5xl mx-auto space-y-4">
        {/* ─── ACT 1 — Team Identity Hero ─────────────────────────────── */}
        <section className="rounded-3xl relative overflow-hidden"
          style={{ border: `1px solid ${playerTeam.crest.primary}66` }}>
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, ${playerTeam.crest.primary} 0%, ${playerTeam.crest.primary}cc 45%, rgba(8,12,20,0.95))`,
          }} />
          <div className="absolute inset-0" style={{
            background: `radial-gradient(900px 380px at 88% -8%, ${playerTeam.crest.secondary}55, transparent 55%)`,
          }} />
          <div className="relative p-5 lg:p-7">
            <div className="flex items-center gap-4">
              <Crest spec={playerTeam.crest} size={96} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.35em] font-display" style={{ color: playerTeam.crest.secondary }}>
                  YOUR FRANCHISE
                </div>
                <div className="font-display text-2xl lg:text-3xl leading-tight"
                  style={{ color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
                  {playerTeam.city.toUpperCase()}
                </div>
                <div className="font-display text-3xl lg:text-5xl leading-none"
                  style={{ color: playerTeam.crest.secondary, textShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>
                  {playerTeam.nickname.toUpperCase()}
                </div>
                <div className="text-white/90 text-sm mt-2 truncate">
                  <span className="font-mono">{playerRec?.wins ?? 0}-{playerRec?.losses ?? 0}{playerRec?.ties ? `-${playerRec.ties}` : ""}</span>
                  <span className="text-white/50 mx-1.5">·</span>
                  <span>{confRank > 0 ? `${ordinal(confRank)} in ${playerTeam.conf.toUpperCase()}` : `Year ${state.year}`}</span>
                  <span className="text-white/50 mx-1.5">·</span>
                  <span>Year {state.year}</span>
                </div>
              </div>
              {/* Sports-pack athlete silhouette as a flavor element on the right.
               *  Variant keyed off the team id so each team has a stable mascot. */}
              <img
                src={athleteSpriteFor(playerTeam.id, playerTeam.crest.primary).url}
                alt=""
                aria-hidden="true"
                className="hidden sm:block"
                style={{
                  height: 88, width: "auto", objectFit: "contain",
                  filter: `drop-shadow(0 3px 8px ${playerTeam.crest.primary})`,
                }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button onClick={() => navigate(`/sports/${sport}/team/${playerTeam.id}`)}
                className="rounded-xl px-2 py-2 text-center pressable touch-target text-[11px] font-display tracking-widest min-h-[44px]"
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: `1px solid ${playerTeam.crest.secondary}55`,
                  color: "#fff", touchAction: "manipulation",
                }}>ROSTER</button>
              <button onClick={() => navigate(`/sports/${sport}/schedule`)}
                className="rounded-xl px-2 py-2 text-center pressable touch-target text-[11px] font-display tracking-widest min-h-[44px]"
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: `1px solid ${playerTeam.crest.secondary}55`,
                  color: "#fff", touchAction: "manipulation",
                }}>SCHEDULE</button>
              <div className="rounded-xl px-2 py-2 text-center text-[11px] font-display tracking-widest min-h-[44px] flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${playerTeam.crest.secondary}33`, color: "rgba(255,255,255,0.85)" }}>
                CAREER {state.careerWins}W · {state.careerChampionships}🏆
              </div>
            </div>
          </div>
        </section>

        {/* ─── ACT 2 — Next matchup for the user's team ───────────────── */}
        {!seasonOver && upcomingForPlayer && (() => {
          const isHome = upcomingForPlayer.home === playerTeam.id;
          const oppId = isHome ? upcomingForPlayer.away : upcomingForPlayer.home;
          const opp = state.teams.find(t => t.id === oppId);
          if (!opp) return null;
          const oppRec = standings.find(s => s.teamId === opp.id);
          return (
            <section className="rounded-2xl p-5"
              style={{ background: "rgba(15,25,45,0.7)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#ffd54a" }}>
                  WEEK {upcomingForPlayer.week} {upcomingForPlayer.week === state.currentWeek ? "· UP NEXT" : ""}
                </div>
                <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.65)" }}>
                  Week {state.currentWeek} of {lastWeek}
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="text-center">
                  <Crest spec={playerTeam.crest} size={56} />
                  <div className="font-mono text-[11px] text-ink-200 mt-1" style={{ color: "rgba(229,231,235,0.85)" }}>
                    {playerRec?.wins ?? 0}-{playerRec?.losses ?? 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.55)" }}>{isHome ? "VS" : "@"}</div>
                  <div className="font-display text-2xl" style={{ color: "rgba(229,231,235,0.55)" }}>·</div>
                </div>
                <div className="text-center">
                  <Crest spec={opp.crest} size={56} />
                  <div className="font-mono text-[11px] mt-1" style={{ color: "rgba(229,231,235,0.85)" }}>
                    {oppRec?.wins ?? 0}-{oppRec?.losses ?? 0}
                  </div>
                </div>
              </div>
              <button onClick={doWeek}
                className="w-full rounded-2xl px-5 py-4 font-display tracking-widest text-base pressable touch-target flex items-center justify-center gap-2 shadow-lg min-h-[60px]"
                style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}cc)`, color: "#0a0d13", touchAction: "manipulation" }}>
                <ChevronRight size={18} /> SIM WEEK {upcomingForPlayer.week}
              </button>
            </section>
          );
        })()}

        {/* Action row */}
        <section className="rounded-2xl p-3 flex flex-wrap gap-2 items-center"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          {!seasonOver ? (
            <>
              <div className="flex-1">
                <div className="text-[10px] tracking-widest font-display" style={{ color: cfg.accent }}>
                  WEEK {state.currentWeek} / {lastWeek}
                </div>
                <div className="text-[11px] opacity-70" style={{ color: "#fef3c7" }}>
                  {state.schedule.filter(g => g.week === state.currentWeek).length} games this week
                </div>
              </div>
              <button onClick={doWeek}
                className="px-4 py-2 rounded-xl font-display tracking-widest text-[11px] pressable touch-target"
                style={{ background: cfg.accent, color: "#0a0a14" }}>
                <ChevronRight size={14} className="inline mr-1" />SIM WEEK
              </button>
              <button onClick={doRest}
                className="px-4 py-2 rounded-xl font-display tracking-widest text-[11px] pressable touch-target"
                style={{ background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
                <FastForward size={14} className="inline mr-1" />SIM REST
              </button>
            </>
          ) : !playoffsDone ? (
            <>
              <div className="flex-1">
                <div className="text-[10px] tracking-widest font-display" style={{ color: cfg.accent }}>
                  {sport === "cfb" ? "BOWL PLAYOFFS" : "PLAYOFFS"}
                </div>
                <div className="text-[11px] opacity-70" style={{ color: "#fef3c7" }}>
                  {state.bracket?.rounds.length ?? 1} round{(state.bracket?.rounds.length ?? 1) > 1 ? "s" : ""} · {cfg.playoffTeams} teams
                </div>
              </div>
              <button onClick={doPlayoffs}
                className="px-4 py-2 rounded-xl font-display tracking-widest text-[11px] pressable touch-target"
                style={{ background: "linear-gradient(135deg, #fde047, #f59e0b)", color: "#1a0505" }}>
                <Trophy size={14} className="inline mr-1" />SIM PLAYOFFS
              </button>
            </>
          ) : (
            <>
              <div className="flex-1">
                <div className="text-[10px] tracking-widest font-display" style={{ color: cfg.accent }}>SEASON COMPLETE</div>
                {championTeam && (
                  <div className="text-[11px]" style={{ color: "#fde047" }}>
                    {championTeam.city} {championTeam.nickname} won the championship.
                  </div>
                )}
              </div>
              <button onClick={newYear}
                className="px-4 py-2 rounded-xl font-display tracking-widest text-[11px] pressable touch-target"
                style={{ background: cfg.accent, color: "#0a0a14" }}>
                <Repeat size={14} className="inline mr-1" />NEXT SEASON
              </button>
              <button onClick={abandonAndPick}
                className="px-3 py-2 rounded-xl font-display tracking-widest text-[10px] pressable touch-target"
                style={{ background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5" }}>
                NEW TEAM
              </button>
            </>
          )}
        </section>

        {/* Championship banner */}
        {championTeam && (
          <section className="rounded-2xl p-4 text-center"
            style={{
              background: `linear-gradient(135deg, ${championTeam.crest.primary}55, ${championTeam.crest.secondary}33)`,
              border: `1.5px solid ${championTeam.crest.secondary}`,
            }}>
            <div className="inline-flex items-center gap-2 text-[10px] tracking-widest font-display"
              style={{ color: "#fde047" }}>
              <Trophy size={12} /> CHAMPIONS
            </div>
            <div className="flex items-center justify-center gap-3 mt-2">
              <Crest spec={championTeam.crest} size={72} />
              <div>
                <div className="font-display text-2xl" style={{ color: "#fef3c7" }}>
                  {championTeam.city} {championTeam.nickname}
                </div>
                <div className="text-[11px] opacity-80" style={{ color: "rgba(229,231,235,0.85)" }}>
                  Star: {championTeam.star.pos} {championTeam.star.name}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Player's last 5 games — colored W/L tiles ────────────── */}
        {lastFivePlayer.length > 0 && (
          <section className="rounded-2xl p-4"
            style={{ background: "rgba(15,25,45,0.45)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: cfg.accent }}>
              YOUR LAST {lastFivePlayer.length} GAMES
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {lastFivePlayer.map((r, i) => {
                const isHome = r.home === playerTeam.id;
                const myScore = isHome ? r.homeScore : r.awayScore;
                const oppScore = isHome ? r.awayScore : r.homeScore;
                const won = myScore > oppScore;
                const opp = state.teams.find(t => t.id === (isHome ? r.away : r.home));
                return (
                  <div key={i} className="rounded-lg px-2 py-2 text-center"
                    style={{
                      background: won ? "rgba(52,211,153,0.10)" : "rgba(239,68,68,0.10)",
                      border: `1px solid ${won ? "rgba(52,211,153,0.30)" : "rgba(239,68,68,0.30)"}`,
                    }}>
                    <div className={`font-display text-sm ${won ? "text-emerald-300" : "text-red-300"}`}>
                      {won ? "W" : "L"}
                    </div>
                    <div className="font-mono text-[10px]" style={{ color: "rgba(229,231,235,0.85)" }}>{myScore}-{oppScore}</div>
                    <div className="text-[9px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>
                      {isHome ? "vs" : "@"} {opp?.abbr ?? "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Enhanced standings — PCT / GB / DIFF / L10 ──────────── */}
        <section className="rounded-2xl p-3 overflow-x-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: cfg.accent }}>STANDINGS</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {(["east", "west"] as const).map(c => {
              const confRows = standings.filter(s => state.teams.find(t => t.id === s.teamId)?.conf === c);
              const leader = confRows[0];
              return (
                <div key={c} className="overflow-x-auto">
                  <div className="text-[9px] tracking-widest opacity-70 mb-1.5 px-1" style={{ color: "#fef3c7" }}>{c.toUpperCase()} CONFERENCE</div>
                  <table className="w-full text-[11px]">
                    <thead style={{ color: "rgba(229,231,235,0.6)" }}>
                      <tr className="text-[9px] uppercase tracking-widest">
                        <th className="text-left pl-1 pr-1 pb-1.5">Team</th>
                        <th className="text-center px-1 pb-1.5">W</th>
                        <th className="text-center px-1 pb-1.5">L</th>
                        <th className="text-center px-1 pb-1.5">PCT</th>
                        <th className="text-center px-1 pb-1.5">GB</th>
                        <th className="text-center px-1 pb-1.5">DIFF</th>
                        <th className="text-center px-1 pb-1.5">L10</th>
                      </tr>
                    </thead>
                    <tbody>
                      {confRows.map((s, i) => {
                        const t = state.teams.find(tt => tt.id === s.teamId)!;
                        const isPlayer = t.id === state.playerTeamId;
                        const games = s.wins + s.losses + s.ties;
                        const pct = games > 0 ? s.wins / games : 0;
                        const gb = leader ? ((leader.wins - s.wins) + (s.losses - leader.losses)) / 2 : 0;
                        const diff = s.pf - s.pa;
                        const inPlayoff = i < Math.ceil(cfg.playoffTeams / 2);
                        return (
                          <tr key={s.teamId}
                            onClick={() => navigate(`/sports/${sport}/team/${t.id}`)}
                            className="cursor-pointer pressable touch-target"
                            style={{
                              background: isPlayer ? `${cfg.accent}1f` : inPlayoff ? "rgba(52,211,153,0.05)" : "transparent",
                              borderTop: "1px solid rgba(255,255,255,0.05)",
                            }}>
                            <td className="pl-1 pr-1 py-1.5">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-mono w-3.5 text-right" style={{ color: "rgba(229,231,235,0.55)" }}>{i + 1}</span>
                                <Crest spec={t.crest} size={18} />
                                <span className="font-display" style={{ color: isPlayer ? cfg.accent : "#fef3c7" }}>{t.abbr}</span>
                                {isPlayer && <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: `${cfg.accent}33`, color: cfg.accent }}>YOU</span>}
                              </span>
                            </td>
                            <td className="text-center font-mono px-1" style={{ color: "#fef3c7" }}>{s.wins}</td>
                            <td className="text-center font-mono px-1" style={{ color: "#fef3c7" }}>{s.losses}</td>
                            <td className="text-center font-mono px-1" style={{ color: "#fef3c7" }}>{pct.toFixed(3).slice(1)}</td>
                            <td className="text-center font-mono px-1" style={{ color: "rgba(229,231,235,0.7)" }}>{gb === 0 ? "—" : gb.toFixed(1)}</td>
                            <td className="text-center font-mono font-bold px-1"
                              style={{ color: diff > 0 ? "#34d399" : diff < 0 ? "#f87171" : "rgba(229,231,235,0.7)" }}>
                              {diff > 0 ? "+" : ""}{diff}
                            </td>
                            <td className="text-center px-1">
                              <Sparkline values={last10For(t.id)} width={48} height={16} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
          <div className="text-[9px] mt-2 px-1" style={{ color: "rgba(229,231,235,0.5)" }}>
            Green rows = currently in playoff position
          </div>
        </section>

        {/* Bracket */}
        {state.bracket && (
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2 flex items-center gap-1" style={{ color: cfg.accent }}>
              <Award size={10} /> PLAYOFF BRACKET
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {state.bracket.rounds.map((round, ri) => (
                <div key={ri} className="flex flex-col gap-2" style={{ minWidth: 130 }}>
                  <div className="text-[9px] tracking-widest opacity-70 text-center" style={{ color: "#fef3c7" }}>
                    {round.length === 1 ? (sport === "cfb" ? "TITLE GAME" : "FINAL")
                      : round.length === 2 ? (sport === "cfb" ? "SEMIFINAL" : "CONF FINAL")
                      : round.length === 4 ? "QUARTER"
                      : "FIRST ROUND"}
                  </div>
                  {round.map((g, gi) => {
                    const a = g.teamA ? state.teams.find(t => t.id === g.teamA) : null;
                    const b = g.teamB ? state.teams.find(t => t.id === g.teamB) : null;
                    return (
                      <div key={gi} className="rounded-lg p-1.5 space-y-1"
                        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {[a, b].map((t, ti) => {
                          if (!t) return <div key={ti} className="h-6 opacity-50 text-[10px]" style={{ color: "rgba(229,231,235,0.5)" }}>TBD</div>;
                          const score = g.result ? (ti === 0 ? g.result.awayScore : g.result.homeScore) : null;
                          const won = g.winner === t.id;
                          return (
                            <div key={ti} className="flex items-center gap-1.5 text-[10px]"
                              style={{ opacity: g.winner && !won ? 0.5 : 1 }}>
                              <Crest spec={t.crest} size={16} />
                              <span className="flex-1 truncate font-display" style={{ color: won ? cfg.accent : "#fef3c7" }}>
                                {t.abbr}
                              </span>
                              {score !== null && (
                                <span className="font-mono" style={{ color: won ? cfg.accent : "rgba(229,231,235,0.6)" }}>
                                  {score}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active storylines — shared sports-engine. Same rendering pattern
         *  Baseball + Football use, just sourced from state.storylines.active. */}
        {state.storylines && state.storylines.active.length > 0 && (
          <section className="rounded-2xl p-3"
            style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.10), rgba(8,12,20,0.85))", border: "1px solid rgba(167,139,250,0.35)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2 flex items-center gap-1.5" style={{ color: "#c4b5fd" }}>
              ✨ STORYLINES · {state.storylines.active.length} ACTIVE
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {state.storylines.active
                .slice()
                .sort((a, b) => b.intensity - a.intensity)
                .slice(0, 6)
                .map(s => (
                <div key={s.id} className="flex items-start gap-2 rounded-lg p-2"
                  style={{ background: "rgba(0,0,0,0.30)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-lg shrink-0">{s.emoji ?? STORYLINE_EMOJI[s.kind]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-display tracking-wide truncate" style={{ color: "#fef3c7" }}>{s.label}</div>
                    {s.intensity > 1 && (
                      <div className="text-[9px] mt-0.5" style={{ color: "#fde047" }}>
                        {"★".repeat(Math.min(3, s.intensity - 1))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Latest news — sim results + drama. Sourced from state.newsLog. */}
        {state.newsLog && state.newsLog.length > 0 && (
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: cfg.accent }}>
              LATEST NEWS
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {state.newsLog.slice(0, 6).map(n => (
                <div key={n.id} className="flex items-start gap-2 px-2 py-1.5 rounded text-[11px]"
                  style={{
                    background: n.important ? `${cfg.accent}11` : "rgba(0,0,0,0.20)",
                    border: n.important ? `1px solid ${cfg.accent}55` : "1px solid rgba(255,255,255,0.06)",
                  }}>
                  <span className="text-base leading-none shrink-0">{n.emoji ?? "📰"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(229,231,235,0.55)" }}>{n.category}</div>
                    <div style={{ color: "#fef3c7" }}>{n.headline}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent results — tap any row to view game details */}
        {state.results.length > 0 && (
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: cfg.accent }}>
                LATEST RESULTS · WEEK {state.results[state.results.length - 1]?.week ?? "—"}
              </div>
              <button onClick={() => navigate(`/sports/${sport}/schedule`)}
                className="text-[10px] font-display tracking-widest pressable"
                style={{ color: cfg.accent }}>
                VIEW ALL →
              </button>
            </div>
            <div className="space-y-1 max-h-44 overflow-auto">
              {state.results.slice(-8).reverse().map((r, i) => {
                const away = state.teams.find(t => t.id === r.away)!;
                const home = state.teams.find(t => t.id === r.home)!;
                const playerInvolved = r.away === state.playerTeamId || r.home === state.playerTeamId;
                return (
                  <button key={i}
                    onClick={() => setOpenResult(r)}
                    className="w-full text-[10px] flex items-center gap-2 rounded px-1.5 py-1.5 pressable touch-target text-left"
                    style={{
                      background: playerInvolved ? `${cfg.accent}11` : "rgba(0,0,0,0.2)",
                      border: playerInvolved ? `1px solid ${cfg.accent}40` : "1px solid rgba(255,255,255,0.06)",
                    }}>
                    <span className="font-mono opacity-60 w-8" style={{ color: "#fef3c7" }}>W{r.week}</span>
                    <Crest spec={away.crest} size={14} />
                    <span className="font-display w-9" style={{ color: r.awayScore > r.homeScore ? cfg.accent : "rgba(229,231,235,0.7)" }}>{away.abbr}</span>
                    <span className="font-mono" style={{ color: r.awayScore > r.homeScore ? cfg.accent : "#fef3c7" }}>{r.awayScore}</span>
                    <span className="opacity-50 text-[9px]" style={{ color: "#fef3c7" }}>at</span>
                    <Crest spec={home.crest} size={14} />
                    <span className="font-display w-9" style={{ color: r.homeScore > r.awayScore ? cfg.accent : "rgba(229,231,235,0.7)" }}>{home.abbr}</span>
                    <span className="font-mono" style={{ color: r.homeScore > r.awayScore ? cfg.accent : "#fef3c7" }}>{r.homeScore}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* CFB — National Rankings (top 16) */}
        {sport === "cfb" && state.cfb?.rankings && state.cfb.rankings.length > 0 && (
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(253,224,71,0.06)", border: "1px solid rgba(253,224,71,0.30)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fde047" }}>
              🏆 NATIONAL RANKINGS · WEEK {state.currentWeek - 1}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {state.cfb.rankings.slice(0, 16).map(r => {
                const t = state.teams.find(x => x.id === r.teamId);
                if (!t) return null;
                const isUser = t.id === state.playerTeamId;
                const arrow = r.prevRank ? (r.prevRank > r.rank ? "▲" : r.prevRank < r.rank ? "▼" : "—") : "";
                const arrowColor = r.prevRank ? (r.prevRank > r.rank ? "#86efac" : r.prevRank < r.rank ? "#f87171" : "rgba(255,255,255,0.4)") : "rgba(255,255,255,0.4)";
                return (
                  <div key={r.teamId} className="flex items-center gap-1.5 rounded px-1.5 py-1"
                    style={{
                      background: isUser ? "rgba(253,224,71,0.18)" : "rgba(0,0,0,0.3)",
                      border: `1px solid ${isUser ? "rgba(253,224,71,0.6)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    <span className="font-mono text-[10px] w-5 text-right" style={{ color: "#fde047" }}>#{r.rank}</span>
                    <span className="font-display text-[10px] flex-1 truncate" style={{ color: isUser ? "#fde047" : "#fef3c7" }}>{t.abbr}</span>
                    <span className="text-[10px]" style={{ color: arrowColor }}>{arrow}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CFB — Bowl Games (after regular season ends, before playoffs sim) */}
        {sport === "cfb" && state.cfb?.bowls && state.cfb.bowls.length > 0 && (
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.30)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#c4b5fd" }}>
              🎟️ BOWL GAMES · {state.cfb.bowls.length} matchups
            </div>
            <div className="space-y-1">
              {state.cfb.bowls.map(b => {
                const a = state.teams.find(t => t.id === b.teamA);
                const h = state.teams.find(t => t.id === b.teamB);
                if (!a || !h) return null;
                const aWon = b.result && b.result.aScore > b.result.bScore;
                return (
                  <div key={b.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="font-display text-[10px] w-20 truncate" style={{ color: "#c4b5fd" }}>{b.name}</span>
                    <span className="font-display" style={{ color: aWon ? "#fde047" : "rgba(229,231,235,0.7)" }}>{a.abbr}</span>
                    <span className="font-mono w-6 text-right" style={{ color: aWon ? "#fde047" : "rgba(229,231,235,0.7)" }}>{b.result?.aScore ?? "—"}</span>
                    <span className="text-[9px] opacity-50">vs</span>
                    <span className="font-mono w-6 text-right" style={{ color: !aWon && b.played ? "#fde047" : "rgba(229,231,235,0.7)" }}>{b.result?.bScore ?? "—"}</span>
                    <span className="font-display" style={{ color: !aWon && b.played ? "#fde047" : "rgba(229,231,235,0.7)" }}>{h.abbr}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CFB — Recruiting board (offseason only) */}
        {sport === "cfb" && state.cfb?.recruitingClass && (
          <RecruitingBoard
            state={state}
            playerTeamId={state.playerTeamId}
            onSign={async (prospectId) => {
              const next = JSON.parse(JSON.stringify(state)) as SeasonState;
              if (signRecruit(next, prospectId, next.playerTeamId)) {
                setState(next); persist(sport, next);
              }
            }}
            onAutoFill={async () => {
              const next = JSON.parse(JSON.stringify(state)) as SeasonState;
              autoCompleteUserRecruiting(next, 10);
              setState(next); persist(sport, next);
            }}
          />
        )}

        {/* CFB — Transfer Portal (offseason) */}
        {sport === "cfb" && state.cfb?.transferPortal && state.cfb.transferPortal.length > 0 && (
          <TransferPortalBoard
            state={state}
            playerTeamId={state.playerTeamId}
            onSign={async (playerId) => {
              const next = JSON.parse(JSON.stringify(state)) as SeasonState;
              if (signFromPortal(next, playerId, next.playerTeamId)) {
                setState(next); persist(sport, next);
              }
            }}
          />
        )}

        {/* CFB — multi-year movement summary */}
        {sport === "cfb" && state.cfb?.yearSummaries && state.cfb.yearSummaries.length > 0 && (
          <section className="rounded-2xl p-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: cfg.accent }}>
              📜 PROGRAM HISTORY
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
              {state.cfb.yearSummaries.slice(0, 6).map(y => (
                <div key={y.season} className="rounded p-2"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="font-display tracking-widest text-[10px]" style={{ color: "#fde047" }}>{y.season}</div>
                  <div style={{ color: "#fef3c7" }}>🎓 {y.graduated} grad · ✍️ {y.recruited} rec</div>
                  <div style={{ color: "rgba(229,231,235,0.65)" }}>🔄 {y.transferIn} in · 🚪 {y.transferOut} out</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {openResult && (
        <GameDetailModal
          result={openResult}
          state={state}
          cfg={cfg}
          onClose={() => setOpenResult(null)}
          onPickTeam={tid => { setOpenResult(null); navigate(`/sports/${sport}/team/${tid}`); }}
        />
      )}
    </div>
  );
}

// ── Game Detail Modal — shared with ScheduleScreen ──────────────────

// ── CFB Recruiting Board ───────────────────────────────────────────

function RecruitingBoard({ state, playerTeamId, onSign, onAutoFill }: {
  state: SeasonState;
  playerTeamId: string;
  onSign: (prospectId: string) => void;
  onAutoFill: () => void;
}) {
  const recruits = state.cfb?.recruitingClass ?? [];
  const userSignedCount = recruits.filter(r => r.signedTeamId === playerTeamId).length;
  const top = recruits
    .filter(r => !r.signedTeamId)
    .slice(0, 24);
  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.30)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fb923c" }}>
          🎓 RECRUITING BOARD · {recruits.filter(r => !r.signedTeamId).length} available · you signed {userSignedCount}
        </div>
        <button onClick={onAutoFill}
          className="px-2 py-1 rounded text-[10px] font-display tracking-widest pressable touch-target"
          style={{ background: "rgba(251,146,60,0.18)", border: "1px solid rgba(251,146,60,0.45)", color: "#fb923c" }}>
          AUTO-FILL ME
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
        {top.map(r => (
          <button key={r.id} onClick={() => onSign(r.id)}
            className="text-left flex items-center gap-2 rounded-lg px-2 py-1.5 pressable touch-target text-[11px]"
            style={{ background: "rgba(0,0,0,0.30)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="font-mono w-9 text-center" style={{ color: "#fde047" }}>{"⭐".repeat(r.starRating)}</span>
            <span className="font-display flex-1 truncate" style={{ color: "#fef3c7" }}>{r.name}</span>
            <span className="text-[10px] opacity-70" style={{ color: "#fef3c7" }}>{r.position}</span>
            <span className="text-[9px] opacity-60" style={{ color: "rgba(229,231,235,0.7)" }}>{r.hometown}</span>
            <span className="font-mono text-[10px]" style={{ color: "rgba(229,231,235,0.85)" }}>{r.ratingFloor}→{r.ceiling}</span>
          </button>
        ))}
        {top.length === 0 && (
          <div className="col-span-2 text-center py-4 text-[10px]" style={{ color: "rgba(229,231,235,0.65)" }}>
            All prospects signed. Move on to the new season.
          </div>
        )}
      </div>
    </section>
  );
}

// ── CFB Transfer Portal ────────────────────────────────────────────

function TransferPortalBoard({ state, playerTeamId, onSign }: {
  state: SeasonState;
  playerTeamId: string;
  onSign: (playerId: string) => void;
}) {
  const portal = state.cfb?.transferPortal ?? [];
  const available = portal.filter(p => !(p as any)._signedTeam);
  if (available.length === 0) return null;
  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.30)" }}>
      <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#60a5fa" }}>
        🔄 TRANSFER PORTAL · {available.length} available
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
        {available.slice(0, 16).map(p => (
          <button key={p.id} onClick={() => onSign(p.id)}
            className="text-left flex items-center gap-2 rounded-lg px-2 py-1.5 pressable touch-target text-[11px]"
            style={{ background: "rgba(0,0,0,0.30)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="font-display flex-1 truncate" style={{ color: "#fef3c7" }}>{p.name}</span>
            <span className="text-[10px] opacity-70" style={{ color: "#fef3c7" }}>{p.position}</span>
            <span className="text-[10px] opacity-60" style={{ color: "rgba(229,231,235,0.7)" }}>{["FR", "SO", "JR", "SR"][p.years - 1]}</span>
            <span className="font-mono font-bold text-[10px] w-7 text-right" style={{ color: "#86efac" }}>{p.rating}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function GameDetailModal({ result, state, cfg, onClose, onPickTeam }: {
  result: Result;
  state: SeasonState;
  cfg: { accent: string };
  onClose: () => void;
  onPickTeam: (teamId: string) => void;
}) {
  const away = state.teams.find(t => t.id === result.away)!;
  const home = state.teams.find(t => t.id === result.home)!;
  const awayWon = result.awayScore > result.homeScore;
  const homeWon = result.homeScore > result.awayScore;

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
            WEEK {result.week} · FINAL
          </div>
          <button onClick={onClose}
            className="px-3 py-1 rounded text-[10px] font-display tracking-widest pressable"
            style={{ background: "rgba(255,255,255,0.08)", color: "#fef3c7" }}>CLOSE</button>
        </div>

        <div className="grid grid-cols-3 items-center gap-3">
          <button onClick={() => onPickTeam(away.id)} className="flex flex-col items-center gap-1 pressable">
            <Crest spec={away.crest} size={56} />
            <div className="text-[11px] font-display" style={{ color: "#fef3c7" }}>{away.abbr}</div>
            <div className="font-mono text-2xl" style={{ color: awayWon ? cfg.accent : "rgba(229,231,235,0.55)" }}>
              {result.awayScore}
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
              {result.homeScore}
            </div>
          </button>
        </div>

        <div className="text-center text-[10px] mt-3" style={{ color: "rgba(229,231,235,0.6)" }}>
          Tap either team to view its roster.
        </div>
      </div>
    </div>
  );
}
