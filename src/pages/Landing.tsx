// Game-picker landing page. The first thing the user sees after the
// splash. Three big cards, one job: pick a game. Each card shows a
// live status line from that game's store.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Settings as SettingsIcon } from "lucide-react";
import { ArcadeSettings } from "../arcade/ArcadeSettings";
import { hasAnthropicKey, hasOpenAIKey } from "../arcade/keys";
import { useStore, listSavedLeagues } from "../store";
import { ProfileBadge } from "../profiles/ProfileBadge";
import { useActiveProfile } from "../profiles/store";
import { SyncIndicator } from "../components/SyncIndicator";
import { LiveActivityFeed } from "../components/LiveActivityFeed";
import { useLiveBattleSummary } from "../sync/liveBattle";
import { useFamilyLiveSessions } from "../sync/liveSession";

/** Locally inlined so this file doesn't statically import from the lazy
 *  WhatsNew chunk. Mirror the LATEST version constant kept in WhatsNew. */
function unseenLatest(): boolean {
  try { return localStorage.getItem("dd_whats_new_seen") !== "1.10.71"; } catch { return false; }
}
import { useFootball } from "../football/store";
import { useOlympus } from "../olympus/store";
import { useMogul, listMogulStudios } from "../mogul/store";
import { useCosmic } from "../cosmic/store";
import { useTemporal } from "../temporal/store";
import { useMemo } from "react";
import { ImageParallax } from "../art";

// Version + build datetime sourced from /src/build-info — package.json
// version + ISO timestamp injected at build time via vite.config.ts.
import { BUILD_VERSION as APP_VERSION, formatBuildDate } from "../build-info";

export function Landing() {
  const navigate = useNavigate();
  const league = useStore(s => s.league);
  const footballLg = useFootball(s => s.league);
  const footballHydrated = useFootball(s => s.hydrated);
  const loadFootball = useFootball(s => s.loadFromDb);
  // CRITICAL: never .filter()/.map()/.sort() inside a Zustand selector —
  // each call returns a new reference, useSyncExternalStore sees the
  // snapshot change every render, and React infinite-loops. Read the raw
  // state, transform downstream with useMemo.
  const allOlympusHeroes = useOlympus(s => s.heroes);
  // CRITICAL DEFENSE: a remote cloud snapshot or a corrupted persisted
  // state can produce non-array values here. Guard before .filter() or
  // the whole Landing crashes into the error boundary.
  const olympusHeroes = useMemo(
    () => (Array.isArray(allOlympusHeroes) ? allOlympusHeroes : []).filter(h => h && !h.archived),
    [allOlympusHeroes]
  );
  const olympusHydrated = useOlympus(s => s.hydrated);
  const loadOlympus = useOlympus(s => s.loadAll);
  const [baseballSaveCount, setBaseballSaveCount] = useState(0);
  const mogulStudio = useMogul(s => s.studio);
  const mogulHydrated = useMogul(s => s.hydrated);
  const loadMogul = useMogul(s => s.loadFromDb);
  const [mogulSaveCount, setMogulSaveCount] = useState(0);
  const cosmicSavesRaw = useCosmic(s => s.saves);
  const cosmicSaves = Array.isArray(cosmicSavesRaw) ? cosmicSavesRaw : [];
  const loadCosmic = useCosmic(s => s.load);
  const temporalSavesRaw = useTemporal(s => s.saves);
  const temporalSaves = Array.isArray(temporalSavesRaw) ? temporalSavesRaw : [];
  const loadTemporal = useTemporal(s => s.load);

  useEffect(() => {
    // Hydrate every game's store so the cards show real status. Each
    // call in its own try/catch so a Dexie failure on one game can't
    // cascade into a blank Landing page.
    try { if (!footballHydrated) loadFootball(); } catch (e) { console.warn("[Landing] football load failed", e); }
    try { if (!olympusHydrated) loadOlympus(); } catch (e) { console.warn("[Landing] olympus load failed", e); }
    try { if (!mogulHydrated) loadMogul(); } catch (e) { console.warn("[Landing] mogul load failed", e); }
    try { loadCosmic(); } catch (e) { console.warn("[Landing] cosmic load failed", e); }
    try { loadTemporal(); } catch (e) { console.warn("[Landing] temporal load failed", e); }
    try {
      listSavedLeagues()
        .then(saves => setBaseballSaveCount(saves.length))
        .catch(e => console.warn("[Landing] saved-leagues load failed", e));
    } catch (e) { console.warn("[Landing] saved-leagues sync error", e); }
    try {
      listMogulStudios()
        .then(saves => setMogulSaveCount(saves.length))
        .catch(e => console.warn("[Landing] mogul saves load failed", e));
    } catch (e) { console.warn("[Landing] mogul sync error", e); }
  }, []);

  const baseballStatus = league
    ? `${league.name} · ${league.year} · Day ${league.day}`
    : baseballSaveCount > 0
      ? `${baseballSaveCount} saved league${baseballSaveCount === 1 ? "" : "s"}`
      : "Start a new dynasty";

  const footballStatus = footballLg
    ? footballLg.week > 17
      ? `${footballLg.name} · Regular season complete`
      : `${footballLg.name} · Week ${footballLg.week} of 17`
    : "Kick off a new season";

  const olympusActiveHero = olympusHeroes[0];
  const olympusStatus = olympusActiveHero
    ? `${olympusActiveHero.name} · L${olympusActiveHero.level} ${olympusActiveHero.className}`
    : olympusHeroes.length > 0
      ? `${olympusHeroes.length} hero${olympusHeroes.length === 1 ? "" : "es"}`
      : "Forge your first hero";

  // Defensive: legacy saves may be missing fields after schema changes.
  // Never let a status-line read crash the entire Landing render.
  const mogulStatus = mogulStudio?.player
    ? `${mogulStudio.player.name ?? "Studio"} · ${mogulStudio.year ?? "—"} · $${(mogulStudio.player.cash ?? 0).toFixed(0)}M`
    : mogulSaveCount > 0
      ? `${mogulSaveCount} saved studio${mogulSaveCount === 1 ? "" : "s"}`
      : "Open a studio";

  const cosmicActive = cosmicSaves[0];
  const cosmicStatus = cosmicActive
    ? `"${cosmicActive.callsign ?? "Pilot"}" · ${(cosmicActive.completedMissions?.length ?? 0)} missions flown`
    : cosmicSaves.length > 0
      ? `${cosmicSaves.length} saved pilot${cosmicSaves.length === 1 ? "" : "s"}`
      : "Forge your callsign";
  const temporalActive = temporalSaves[0];
  const temporalStatus = temporalActive
    ? `${temporalActive.agentName ?? "Agent"} · ${(temporalActive.missionsCompleted?.length ?? 0)} resolved · I ${temporalActive.integrity ?? 0}`
    : temporalSaves.length > 0
      ? `${temporalSaves.length} saved agent${temporalSaves.length === 1 ? "" : "s"}`
      : "Recruit an agent";

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyStatus, setKeyStatus] = useState({ ant: hasAnthropicKey(), oai: hasOpenAIKey() });
  const profile = useActiveProfile();
  const liveBattle = useLiveBattleSummary();
  const liveSessions = useFamilyLiveSessions(profile?.id);

  // Refresh status when settings modal closes (user may have changed keys).
  const onSettingsClose = () => {
    setSettingsOpen(false);
    setKeyStatus({ ant: hasAnthropicKey(), oai: hasOpenAIKey() });
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          "radial-gradient(900px 700px at 15% 0%, rgba(192,132,252,0.18), transparent 60%), " +
          "radial-gradient(900px 700px at 85% 100%, rgba(255,183,28,0.14), transparent 60%), " +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}
    >
      {/* Parallax intentionally NOT on the Landing — it fought the
       *  existing gradient + starfield + logo styling. Saved for use
       *  inside game routes where a themed backdrop makes sense
       *  (Battle Forge arenas, Survivor biomes, Cosmic Squad space). */}
      {/* Subtle starfield dots — pure CSS, no asset. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, #fff, transparent), " +
            "radial-gradient(1px 1px at 32% 64%, #fff, transparent), " +
            "radial-gradient(1px 1px at 68% 22%, #fff, transparent), " +
            "radial-gradient(1px 1px at 84% 78%, #fff, transparent), " +
            "radial-gradient(1.4px 1.4px at 48% 38%, #ffd54a, transparent), " +
            "radial-gradient(1.4px 1.4px at 22% 88%, #c084fc, transparent)",
        }}
      />
      {/* Skip link — visible only when focused via keyboard. */}
      <a href="#games" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded focus:bg-amber-400 focus:text-black focus:font-display">
        Skip to games
      </a>
      {/* Visible version badge — pinned to the top so you can confirm the
       *  latest deploy landed at a glance. */}
      <div
        aria-label={`Arcade version ${APP_VERSION}`}
        className="absolute z-10 font-display tracking-[0.3em] text-[10px] px-2.5 py-1 rounded-full"
        style={{
          top: "max(env(safe-area-inset-top, 12px), 12px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,215,0,0.12)",
          border: "1px solid rgba(255,215,0,0.45)",
          color: "#fde047",
          backdropFilter: "blur(6px)",
        }}
      >
        v{APP_VERSION} <span style={{ opacity: 0.7, fontSize: "0.8em" }}>· {formatBuildDate()}</span>
      </div>
      {/* Top-right Settings gear — opens one modal for all API keys. */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="absolute top-4 right-4 z-10 w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
        aria-label="Arcade settings"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: keyStatus.ant ? "#c9b6f0" : "#9aa6bf",
          minWidth: 44, minHeight: 44, touchAction: "manipulation",
          top: "max(env(safe-area-inset-top, 16px), 16px)",
        }}
        title={keyStatus.ant ? "API keys configured" : "Add API keys"}
      >
        <SettingsIcon size={18} />
        {!keyStatus.ant && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400" />
        )}
      </button>

      <div
        className="flex-1 flex flex-col items-center justify-center px-4 max-w-5xl mx-auto w-full"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 24px)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
        }}
      >
        {/* Active profile badge — tap to switch player. */}
        {profile && (
          <div className="absolute top-4 left-4 z-10" style={{ top: "max(env(safe-area-inset-top, 16px), 16px)" }}>
            <ProfileBadge />
          </div>
        )}

        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-8 sm:mb-10"
        >
          <motion.div
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.4em" }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="text-[10px] sm:text-[11px] uppercase tracking-[0.4em] font-display"
            style={{ color: profile?.color ?? "#c9b6f0" }}
          >
            {profile ? `Welcome back, ${profile.handle}` : "Welcome to"}
          </motion.div>
          {/* Solid-color title so it can't go invisible if a browser
              doesn't honour background-clip:text. Two-line wrap on mobile. */}
          <h1
            className="font-display text-5xl sm:text-7xl tracking-[0.15em] mt-2"
            style={{
              color: "#ffd54a",
              textShadow: "0 0 24px rgba(255,213,74,0.35), 0 4px 18px rgba(0,0,0,0.6)",
              lineHeight: 1.05,
            }}
          >
            BERRY KID'S<br className="sm:hidden" /> <span style={{ color: "#ffb302" }}>ARCADE</span>
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-sm sm:text-base mt-4 max-w-lg mx-auto leading-relaxed"
            style={{ color: "#b5c0d4" }}
          >
            Twelve games, five worlds, one playroom. Pick anything — they all save independently.
          </motion.p>
        </motion.header>

        {/* Generic live-session strip — anyone in the family running a
            Mech fight, Creature battle, Survivor run, etc. surfaces here. */}
        {liveSessions.length > 0 && (
          <div className="w-full max-w-2xl mx-auto mb-3 space-y-1.5">
            {liveSessions.slice(0, 3).map(s => (
              <div key={s.profileId}
                className="rounded-xl px-3 py-2 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, ${s.profileColor}26, rgba(10,10,20,0.85))`,
                  border: `1px solid ${s.profileColor}66`,
                }}>
                <span aria-hidden="true" className="inline-flex w-2 h-2 rounded-full"
                  style={{ background: "#86efac", boxShadow: "0 0 6px #86efac", animation: "pulse 1.4s infinite" }} />
                <span aria-hidden="true" className="text-lg">{s.emoji ?? "🎮"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.3em]" style={{ color: s.profileColor }}>
                    LIVE · {s.profileName.toUpperCase()}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: "#fef3c7" }}>
                    {s.label}{s.detail ? ` · ${s.detail}` : ""}
                  </div>
                </div>
                {s.spectateHref && (
                  <button onClick={() => navigate(s.spectateHref!)}
                    className="text-[9px] tracking-widest px-2 py-1 rounded-full"
                    style={{ background: s.profileColor, color: "#0a0a14" }}>WATCH</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Live battle banner — only when another family device is in
            an active Battle Forge fight. Tap to spectate live. Hide
            during result phase so it doesn't linger. */}
        {liveBattle && liveBattle.phase === "battle" && (
          <button
            onClick={() => navigate("/battleforge/spectate")}
            className="w-full max-w-2xl mx-auto mb-4 rounded-2xl px-4 py-3 flex items-center gap-3 pressable touch-target"
            style={{
              background: `linear-gradient(135deg, ${liveBattle.color}33, rgba(20,5,5,0.92))`,
              border: `1.5px solid ${liveBattle.color}`,
              boxShadow: `0 0 20px -4px ${liveBattle.color}88`,
              minHeight: 60,
            }}
            aria-label={`Watch ${liveBattle.hostName}'s live battle`}
          >
            <span aria-hidden="true" className="inline-flex w-2.5 h-2.5 rounded-full"
              style={{ background: "#fca5a5", boxShadow: "0 0 8px #fca5a5", animation: "pulse 1.4s infinite" }} />
            <div className="flex-1 text-left">
              <div className="text-[9px] uppercase tracking-[0.3em]" style={{ color: liveBattle.color }}>LIVE NOW · {liveBattle.mapName}</div>
              <div className="font-display tracking-wide text-sm" style={{ color: "#fef3c7" }}>
                {liveBattle.hostName} is battling — tap to watch
              </div>
            </div>
            <span className="font-display tracking-widest text-[11px] px-3 py-1 rounded-full"
              style={{ background: liveBattle.color, color: "#0a0a14" }}>WATCH</span>
          </button>
        )}

        <div id="games" className="w-full space-y-6" role="region" aria-label="Game library">
          {/* ── 🏟️ SPORTS ─────────────────────────────────────────── */}
          <Shelf id="sports" emoji="🏟️" title="SPORTS" accent="#fbbf24"
            subtitle="Franchise sims · play and manage">
            <GameCard
              emoji="🏆"
              name="Sports Hub"
              subtitle="Five sports, one home"
              description="Hub for Baseball, Football, Hockey, Basketball, College Football, and Versus. Original teams + generated crests."
              status="All sports"
              accent="#fbbf24"
              bg="linear-gradient(135deg, rgba(40,30,8,0.95), rgba(15,10,3,0.85))"
              onClick={() => navigate("/sports")}
              delay={0.02}
              isFavorite={profile?.favoriteGame === "sportshub"}
            />
            <GameCard
              emoji="🏒"
              name="Hockey"
              subtitle="Season + 8-team bracket"
              description="12 original teams (Glacier Bay, Steel Harbor, Aurora Falls...), 28-game season, playoffs with OT, multi-year career."
              status="New"
              accent="#67e8f9"
              bg="linear-gradient(135deg, rgba(8,30,40,0.95), rgba(2,10,20,0.85))"
              onClick={() => navigate("/sports/hockey")}
              delay={0.04}
              isFavorite={profile?.favoriteGame === "hockey"}
            />
            <GameCard
              emoji="🏀"
              name="Basketball"
              subtitle="Season + 8-team bracket"
              description="12 original teams (Metro Voltage, Sunridge Suns...), 30-game season, playoffs, OT decides ties, career arc."
              status="New"
              accent="#fb923c"
              bg="linear-gradient(135deg, rgba(40,18,5,0.95), rgba(15,8,2,0.85))"
              onClick={() => navigate("/sports/basketball")}
              delay={0.045}
              isFavorite={profile?.favoriteGame === "basketball"}
            />
            <GameCard
              emoji="🎓"
              name="College Football"
              subtitle="Recruiting · 4-team CFP"
              description="16 original schools, 12-game regular season, 4-team bowl playoff. Class years roll over — seniors graduate, new recruits take over."
              status="New"
              accent="#fde047"
              bg="linear-gradient(135deg, rgba(30,25,8,0.95), rgba(12,10,3,0.85))"
              onClick={() => navigate("/sports/cfb")}
              delay={0.05}
              isFavorite={profile?.favoriteGame === "cfb"}
            />
            <GameCard
              emoji="⚾"
              name="Baseball"
              subtitle="Diamond Dynasty"
              description="Full management sim. Draft, trade, sim seasons, plus hit and pitch in Training Camp."
              status={baseballStatus}
              accent="#fbbf24"
              bg="linear-gradient(135deg, rgba(11,25,41,0.95), rgba(20,40,70,0.85))"
              onClick={() => navigate("/baseball")}
              delay={0.05}
              isFavorite={profile?.favoriteGame === "baseball"}
            />
            <GameCard
              emoji="🏈"
              name="Football"
              subtitle="Gridiron League"
              description="17-week season, drive-by-drive sim, ESPN-style StatCast field view, weekly drama events."
              status={footballStatus}
              accent="#FFB81C"
              bg="linear-gradient(135deg, rgba(26,37,38,0.95), rgba(11,61,46,0.85))"
              onClick={() => navigate("/football/hub")}
              delay={0.10}
              isFavorite={profile?.favoriteGame === "football"}
            />
            <GameCard
              emoji="🥊"
              name="Sports Versus"
              subtitle="Head-to-head · 2 player"
              description="Tecmo-style guess-vs-guess duels. Baseball pitch-and-swing or Football play-calling. Hidden picks → both reveal → resolve. Pass-and-play OR cross-device online."
              status="Pass & Play + Online live"
              accent="#fb923c"
              bg="linear-gradient(135deg, rgba(60,30,5,0.95), rgba(20,8,5,0.85))"
              onClick={() => navigate("/versus")}
              delay={0.15}
              isFavorite={profile?.favoriteGame === "versus"}
            />
          </Shelf>

          {/* ── ⚔️ ADVENTURE & RPG ────────────────────────────────── */}
          <Shelf id="adventure" emoji="⚔️" title="ADVENTURE & RPG" accent="#DAA520"
            subtitle="Story-driven worlds — talk, fight, explore">
            <GameCard
              emoji="⚔️"
              name="Olympus"
              subtitle="Greek Mythology RPG"
              description="AI-driven text adventure with three-act story arcs. Voice in, voice out. Persistent heroes."
              status={olympusStatus}
              accent="#DAA520"
              bg="linear-gradient(135deg, rgba(15,27,45,0.95), rgba(5,10,18,0.85))"
              onClick={() => navigate("/olympus")}
              delay={0.05}
              isFavorite={profile?.favoriteGame === "olympus"}
            />
            <GameCard
              emoji="🕰️"
              name="Temporal Order"
              subtitle="Time-Travel Investigation"
              description="Save history from temporal anomalies. AI generates a fresh mystery every time — different culprit, clues, ripples. Talk to Socrates, Da Vinci, Franklin in their own words."
              status={temporalStatus}
              accent="#f5c518"
              bg="linear-gradient(135deg, rgba(40,28,8,0.95), rgba(20,12,5,0.85))"
              onClick={() => navigate("/temporal")}
              delay={0.10}
              isFavorite={profile?.favoriteGame === "temporal"}
            />
            <GameCard
              emoji="🚀"
              name="Cosmic Squad"
              subtitle="Space Fleet Combat"
              description="Turn-based starfighter combat. 20 ships across 10 sci-fi eras, 6 missile types, permadeath wingmen, rank up to Fleet Admiral."
              status={cosmicStatus}
              accent="#9be3ff"
              bg="linear-gradient(135deg, rgba(8,18,40,0.95), rgba(20,40,80,0.85))"
              onClick={() => navigate("/cosmic")}
              delay={0.15}
              isFavorite={profile?.favoriteGame === "cosmic"}
            />
            <GameCard
              emoji="⚔️"
              name="Battle Forge"
              subtitle="Tactical Character Combat"
              description="Six fighters across five themed arenas. Auto-zoom camera follows the action. Cinematic AI duel — pick the matchup and watch it play out."
              status="Pick a matchup"
              accent="#fca5a5"
              bg="linear-gradient(135deg, rgba(60,8,8,0.95), rgba(20,5,5,0.85))"
              onClick={() => navigate("/battleforge")}
              delay={0.20}
              isFavorite={profile?.favoriteGame === "battleforge"}
            />
            <GameCard
              emoji="🛰️"
              name="Crew Traitor"
              subtitle="Online social deduction · 3-10 players"
              description="Original Among Us–style game. Crew complete tasks; secret traitors sabotage and tag out crewmates. Emergency meetings, voting, win-or-lose. Each player on their own device."
              status="Online cross-device"
              accent="#9be3ff"
              bg="linear-gradient(135deg, rgba(8,18,40,0.95), rgba(2,8,20,0.85))"
              onClick={() => navigate("/crew")}
              delay={0.25}
              isFavorite={profile?.favoriteGame === "crew"}
            />
            <GameCard
              emoji="🕵️"
              name="Odd One Out"
              subtitle="Social deduction · 3-8 players"
              description="Everyone gets the same secret word — except one. Take turns giving one-word clues. Vague enough to hide, specific enough to prove you're not the impostor. Vote to expose the Odd One."
              status="Local pass-and-play"
              accent="#fbbf24"
              bg="linear-gradient(135deg, rgba(40,20,4,0.95), rgba(20,10,2,0.85))"
              onClick={() => navigate("/odd")}
              delay={0.30}
              isFavorite={profile?.favoriteGame === "odd"}
            />
          </Shelf>

          {/* ── 🏗️ TYCOON & SIM ──────────────────────────────────── */}
          <Shelf id="tycoon" emoji="🏗️" title="TYCOON & SIM" accent="#D4AF37"
            subtitle="Build it, run it, raise it">
            <GameCard
              emoji="🤼"
              name="Main Event"
              subtitle="Wrestling booking sim"
              description="Book 4 TV episodes + 1 PPV every month. Rate every segment on charisma + in-ring + story momentum. Build feuds, win titles, grow from local indie to global empire."
              status="New"
              accent="#f87171"
              bg="linear-gradient(135deg, rgba(40,8,12,0.95), rgba(15,3,5,0.85))"
              onClick={() => navigate("/mainevent")}
              delay={0.02}
              isFavorite={profile?.favoriteGame === "mainevent"}
            />
            <GameCard
              emoji="🃏"
              name="Card Clash"
              subtitle="Snap-style card battler"
              description="3 locations, 6 turns, simultaneous reveal — win 2 of 3. 40 original cards with arrival / aura / last stand / echo keywords. 20 locations with effects. Call GO BOLD to double the stakes."
              status="New"
              accent="#a78bfa"
              bg="linear-gradient(135deg, rgba(25,15,40,0.95), rgba(8,4,18,0.85))"
              onClick={() => navigate("/cardclash")}
              delay={0.035}
              isFavorite={profile?.favoriteGame === "cardclash"}
            />
            <GameCard
              emoji="🎬"
              name="Movie Studios"
              subtitle="Hollywood Tycoon"
              description="Run a movie studio. Buy scripts, sign stars, set budgets, beat box office records, win Golden Reels."
              status={mogulStatus}
              accent="#D4AF37"
              bg="linear-gradient(135deg, rgba(30,12,20,0.95), rgba(60,30,10,0.85))"
              onClick={() => navigate("/mogul")}
              delay={0.05}
              isFavorite={profile?.favoriteGame === "mogul"}
            />
            <GameCard
              emoji="🤖"
              name="Scrapyard Kings"
              subtitle="Mech Combat — bot builder"
              description="Build a bot from 24 swappable parts + 18 weapons across 4 tiers. Unlock bigger guns as you climb. Bigger purses too."
              status="Builder + combat playable"
              accent="#fb923c"
              bg="linear-gradient(135deg, rgba(50,15,10,0.95), rgba(20,8,5,0.85))"
              onClick={() => navigate("/mech")}
              delay={0.10}
              isFavorite={profile?.favoriteGame === "mech"}
            />
            <GameCard
              emoji="🥚"
              name="Creature Keeper"
              subtitle="Raise · care · evolve"
              description="14 original species across 3 evolution stages. 8 elemental types. Care for them, fight wild battles, shop berries, customize habitats."
              status="Battles playable · 6 habitats · 9 items"
              accent="#86efac"
              bg="linear-gradient(135deg, rgba(10,40,20,0.95), rgba(5,12,8,0.85))"
              onClick={() => navigate("/creature")}
              delay={0.15}
              isFavorite={profile?.favoriteGame === "creature"}
            />
          </Shelf>

          {/* ── ⚡ ARCADE ──────────────────────────────────────────── */}
          <Shelf id="arcade" emoji="⚡" title="ARCADE" accent="#fde047"
            subtitle="Pick up, play in 60 seconds">
            <GameCard
              emoji="⚡"
              name="Survivor"
              subtitle="One thumb. Swarms. Level up."
              description="Pick a hero, move, your weapons auto-fire, and choose 1 of 3 upgrades every level. Last 10 minutes to win."
              status="Playable end-to-end"
              accent="#fde047"
              bg="linear-gradient(135deg, rgba(30,12,5,0.95), rgba(10,5,2,0.85))"
              onClick={() => navigate("/survivor")}
              delay={0.05}
              isFavorite={profile?.favoriteGame === "survivor"}
            />
            <GameCard
              emoji="🏗️"
              name="Girder Climb"
              subtitle="Classic — barrels & ladders"
              description="Dodge rolling girders, climb ladders, reach the rescue beacon at the top. Three lives, one runaway crane."
              status="Original homage"
              accent="#dc2626"
              bg="linear-gradient(135deg, rgba(40,8,8,0.95), rgba(10,5,5,0.85))"
              onClick={() => navigate("/classics/girder")}
              delay={0.08}
              isFavorite={profile?.favoriteGame === "girder"}
            />
            <GameCard
              emoji="🚀"
              name="Strike Force"
              subtitle="Vertical-scroll shooter"
              description="Pilot a fighter, dodge waves of enemy ships, blast bosses every 30 seconds. Auto-fire — just steer and survive."
              status="Original homage"
              accent="#67e8f9"
              bg="linear-gradient(135deg, rgba(8,18,40,0.95), rgba(2,8,20,0.85))"
              onClick={() => navigate("/classics/strikeforce")}
              delay={0.11}
              isFavorite={profile?.favoriteGame === "strikeforce"}
            />
            <GameCard
              emoji="👻"
              name="Maze Muncher"
              subtitle="Pellet chase classic"
              description="Eat every pellet in the maze. Four ghosts. Power pellets turn them blue — chomp 'em for bonus points."
              status="Original homage"
              accent="#fde047"
              bg="linear-gradient(135deg, rgba(10,8,40,0.95), rgba(2,1,10,0.85))"
              onClick={() => navigate("/classics/maze")}
              delay={0.14}
              isFavorite={profile?.favoriteGame === "mazemuncher"}
            />
            <GameCard
              emoji="🎨"
              name="Style Studio"
              subtitle="Draw, save, share"
              description="Brushes, colors, eraser, undo. Save your art to a gallery that syncs across the family. Export PNGs."
              status="Creative tool"
              accent="#f9a8d4"
              bg="linear-gradient(135deg, rgba(40,10,30,0.95), rgba(15,5,20,0.85))"
              onClick={() => navigate("/classics/style")}
              delay={0.17}
              isFavorite={profile?.favoriteGame === "stylestudio"}
            />
            <GameCard
              emoji="🌊"
              name="Silent Depths"
              subtitle="Submarine survival"
              description="Pilot a sub. Dodge mines and depth charges. Torpedo cargo ships at the surface and enemy subs below."
              status="Original homage"
              accent="#67e8f9"
              bg="linear-gradient(135deg, rgba(2,8,30,0.95), rgba(1,3,10,0.85))"
              onClick={() => navigate("/classics/depths")}
              delay={0.20}
              isFavorite={profile?.favoriteGame === "silentdepths"}
            />
            <GameCard
              emoji="💣"
              name="Tank Duel"
              subtitle="Turn-based artillery"
              description="Aim, set power, fire. Wind matters, terrain breaks. 2-player same-device or vs bot. Six weapons + aim-assist toggle."
              status="Best-of formats"
              accent="#fb923c"
              bg="linear-gradient(135deg, rgba(40,15,4,0.95), rgba(15,5,2,0.85))"
              onClick={() => navigate("/tankduel")}
              delay={0.23}
              isFavorite={profile?.favoriteGame === "tankduel"}
            />
            <GameCard
              emoji="🚀"
              name="Math Blaster"
              subtitle="Educational arcade"
              description="Tap the asteroid carrying the right answer. Scales from counting to fractions based on your profile. Combos reward streaks; hints kick in when stuck."
              status="Age-scaled"
              accent="#a78bfa"
              bg="linear-gradient(135deg, rgba(20,10,40,0.95), rgba(8,4,20,0.85))"
              onClick={() => navigate("/mathblaster")}
              delay={0.26}
              isFavorite={profile?.favoriteGame === "mathblaster"}
            />
          </Shelf>

          {/* ── 🧠 WORDPLAY & BRAIN ───────────────────────────────── */}
          <Shelf id="wordplay" emoji="🧠" title="WORDPLAY & BRAIN" accent="#C084FC"
            subtitle="Word games, riddles, and clever mixes">
            <GameCard
              emoji="💬"
              name="Wordplay Hub"
              subtitle="13 mini-games"
              description="Mad Libs, jokes, quizzes, riddles, fortune cookies, improv scenes, word chains — one game arcade for words."
              status="13 games inside"
              accent="#C084FC"
              bg="linear-gradient(135deg, rgba(20,10,40,0.95), rgba(60,10,80,0.85))"
              onClick={() => navigate("/wordplay")}
              delay={0.05}
              isFavorite={profile?.favoriteGame === "wordplay"}
            />
            <GameCard
              emoji="🧪"
              name="Potion Lab"
              subtitle="Brew, Discover, Bottle"
              description="Mix 2–5 ingredients in the cauldron. Discover 28+ recipes including secret combos and easter eggs. The AI Brewmaster narrates every brew."
              status="Apprentice — start brewing"
              accent="#a78bfa"
              bg="linear-gradient(135deg, rgba(45,18,80,0.95), rgba(10,6,18,0.85))"
              onClick={() => navigate("/potion-lab")}
              delay={0.10}
              isFavorite={profile?.favoriteGame === "potionlab"}
            />
          </Shelf>
        </div>

        {/* Footer links — Family Stats + Resources */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="mt-6 flex justify-center gap-2 flex-wrap"
        >
          <button
            onClick={() => navigate("/family")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full pressable touch-target"
            style={{
              background: "rgba(192,132,252,0.08)",
              border: "1px solid rgba(192,132,252,0.35)",
              color: "#c4b5fd",
              minHeight: 44,
            }}
            aria-label="Open Family Stats"
          >
            <span aria-hidden="true">🏆</span>
            <span className="font-display tracking-widest text-[11px]">FAMILY STATS</span>
          </button>
          <button
            onClick={() => navigate("/family/roster")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full pressable touch-target"
            style={{
              background: "rgba(155,227,255,0.08)",
              border: "1px solid rgba(155,227,255,0.35)",
              color: "#9be3ff",
              minHeight: 44,
            }}
            aria-label="Open Family Roster"
          >
            <span aria-hidden="true">⚔️</span>
            <span className="font-display tracking-widest text-[11px]">FAMILY ROSTER</span>
          </button>
          <button
            onClick={() => navigate("/whats-new")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full pressable touch-target relative"
            style={{
              background: "rgba(253,224,71,0.10)",
              border: "1px solid rgba(253,224,71,0.4)",
              color: "#fde047",
              minHeight: 44,
            }}
            aria-label="See what's new in the arcade"
          >
            <span aria-hidden="true">✨</span>
            <span className="font-display tracking-widest text-[11px]">WHAT'S NEW</span>
            {unseenLatest() && (
              <span aria-label="New updates"
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{ background: "#fde047", boxShadow: "0 0 6px rgba(253,224,71,0.8)" }} />
            )}
          </button>
          <button
            onClick={() => navigate("/resources")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full pressable touch-target"
            style={{
              background: "rgba(134,239,172,0.08)",
              border: "1px solid rgba(134,239,172,0.35)",
              color: "#bbf7d0",
              minHeight: 44,
            }}
            aria-label="Open Resources and Beckett's Corner"
          >
            <span aria-hidden="true">📚</span>
            <span className="font-display tracking-widest text-[11px]">RESOURCES &amp; BECKETT'S CORNER</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-6 flex flex-col items-center gap-3 text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "#9aa6bf" }}
        >
          <SyncIndicator />
          <LiveActivityFeed className="w-full max-w-md mt-2" max={5} />
          <div className="text-center">
            Berry Kid's Arcade · Made for Henry &amp; Beckett
            <div className="mt-2 text-[9px] tracking-[0.4em] opacity-70">
              v{APP_VERSION} · Updated {formatBuildDate()}
            </div>
          </div>
        </motion.div>
      </div>

      {settingsOpen && <ArcadeSettings onClose={onSettingsClose} />}
    </div>
  );
}

function GameCard({ emoji, name, subtitle, description, status, accent, bg, onClick, delay, isFavorite }: {
  emoji: string;
  name: string;
  subtitle: string;
  description: string;
  status: string;
  accent: string;
  bg: string;
  onClick: () => void;
  delay: number;
  isFavorite?: boolean;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.22 } }}
      whileTap={{ scale: 0.985 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 22 }}
      onClick={onClick}
      aria-label={`Play ${name} — ${subtitle}. ${status}${isFavorite ? " (your favorite)" : ""}`}
      className="relative text-left rounded-2xl overflow-hidden p-5 sm:p-6 pressable touch-target group"
      style={{
        background: bg,
        border: `${isFavorite ? "2px" : "1px"} solid ${isFavorite ? "#FFD700" : accent + "55"}`,
        minHeight: 230,
        boxShadow: `0 6px 22px -10px ${accent}30, 0 0 0 1px ${accent}1A inset`,
      }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none transition-opacity group-hover:opacity-50"
        style={{ background: `radial-gradient(520px 220px at 80% -10%, ${accent}, transparent 60%)` }}
      />
      {/* hairline ring on hover */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ boxShadow: `inset 0 0 0 1px ${accent}` }}
        aria-hidden="true"
      />
      {isFavorite && (
        <span aria-hidden="true"
          className="absolute top-2 left-2 text-[9px] uppercase tracking-[0.2em] font-display px-2 py-0.5 rounded-full"
          style={{ color: "#1a1208", background: "#FFD700", boxShadow: "0 2px 8px rgba(255,215,0,0.45)" }}>
          ★ FAVORITE
        </span>
      )}
      <div className="relative flex flex-col h-full">
        <div className="flex items-start justify-between">
          <span className="text-5xl drop-shadow-lg" aria-hidden="true">{emoji}</span>
          <span
            className="text-[9px] uppercase tracking-[0.3em] font-display px-2 py-0.5 rounded-full"
            style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}44` }}
          >
            Play →
          </span>
        </div>
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-[0.3em] font-display" style={{ color: accent }}>{subtitle}</div>
          <div className="font-display text-2xl sm:text-[1.65rem] tracking-wide mt-1 leading-tight">{name}</div>
        </div>
        <p className="text-[12px] sm:text-xs text-ink-200 leading-relaxed mt-2">{description}</p>
        <div className="flex-1" />
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
          <span className="truncate" style={{ color: accent }}>{status}</span>
          <ArrowRight size={14} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </motion.button>
  );
}

/** Section header + card grid wrapper. Groups related games into a
 *  labeled shelf so the landing reads as folders, not a flat dump. */
function Shelf({ id, emoji, title, subtitle, accent, children }: {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`shelf-${id}`}>
      <div className="flex items-baseline gap-2 mb-2 px-1">
        <span aria-hidden="true" className="text-lg leading-none">{emoji}</span>
        <h2 id={`shelf-${id}`}
          className="font-display tracking-[0.3em] text-[12px] sm:text-[13px]"
          style={{ color: accent }}>
          {title}
        </h2>
        <span className="text-[10px] sm:text-[11px] opacity-60 truncate"
          style={{ color: "rgba(229,231,235,0.65)" }}>
          · {subtitle}
        </span>
      </div>
      <div className="rounded-2xl p-2 sm:p-3"
        style={{
          background: `linear-gradient(180deg, ${accent}0a 0%, rgba(10,10,20,0.0) 70%)`,
          border: `1px solid ${accent}22`,
        }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {children}
        </div>
      </div>
    </section>
  );
}
