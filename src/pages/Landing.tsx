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
import { useFootball } from "../football/store";
import { useOlympus } from "../olympus/store";
import { useMogul, listMogulStudios } from "../mogul/store";
import { useCosmic } from "../cosmic/store";
import { useTemporal } from "../temporal/store";
import { useMemo } from "react";

// Version label rendered in the Landing footer. Bump this and
// package.json in lockstep when shipping a release.
const APP_VERSION = "1.9.1";

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
  const olympusHeroes = useMemo(() => allOlympusHeroes.filter(h => !h.archived), [allOlympusHeroes]);
  const olympusHydrated = useOlympus(s => s.hydrated);
  const loadOlympus = useOlympus(s => s.loadAll);
  const [baseballSaveCount, setBaseballSaveCount] = useState(0);
  const mogulStudio = useMogul(s => s.studio);
  const mogulHydrated = useMogul(s => s.hydrated);
  const loadMogul = useMogul(s => s.loadFromDb);
  const [mogulSaveCount, setMogulSaveCount] = useState(0);
  const cosmicSaves = useCosmic(s => s.saves);
  const loadCosmic = useCosmic(s => s.load);
  const temporalSaves = useTemporal(s => s.saves);
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

  const mogulStatus = mogulStudio
    ? `${mogulStudio.player.name} · ${mogulStudio.year} · $${mogulStudio.player.cash.toFixed(0)}M`
    : mogulSaveCount > 0
      ? `${mogulSaveCount} saved studio${mogulSaveCount === 1 ? "" : "s"}`
      : "Open a studio";

  const cosmicActive = cosmicSaves[0];
  const cosmicStatus = cosmicActive
    ? `"${cosmicActive.callsign}" · ${cosmicActive.completedMissions.length} missions flown`
    : cosmicSaves.length > 0
      ? `${cosmicSaves.length} saved pilot${cosmicSaves.length === 1 ? "" : "s"}`
      : "Forge your callsign";
  const temporalActive = temporalSaves[0];
  const temporalStatus = temporalActive
    ? `${temporalActive.agentName} · ${temporalActive.missionsCompleted.length} resolved · I ${temporalActive.integrity}`
    : temporalSaves.length > 0
      ? `${temporalSaves.length} saved agent${temporalSaves.length === 1 ? "" : "s"}`
      : "Recruit an agent";

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyStatus, setKeyStatus] = useState({ ant: hasAnthropicKey(), oai: hasOpenAIKey() });

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
            style={{ color: "#c9b6f0" }}
          >
            Welcome to
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
            Nine worlds, one playroom. Pick anything — they all save independently.
          </motion.p>
        </motion.header>

        <div id="games" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full" role="region" aria-label="Game library">
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
            delay={0.12}
          />
          <GameCard
            emoji="⚔️"
            name="Olympus"
            subtitle="Greek Mythology RPG"
            description="AI-driven text adventure with three-act story arcs. Voice in, voice out. Persistent heroes."
            status={olympusStatus}
            accent="#DAA520"
            bg="linear-gradient(135deg, rgba(15,27,45,0.95), rgba(5,10,18,0.85))"
            onClick={() => navigate("/olympus")}
            delay={0.19}
          />
          <GameCard
            emoji="🎬"
            name="Beckett Movie Studios"
            subtitle="Hollywood Tycoon"
            description="Run a movie studio. Buy scripts, sign stars, set budgets, beat box office records, win Golden Reels."
            status={mogulStatus}
            accent="#D4AF37"
            bg="linear-gradient(135deg, rgba(30,12,20,0.95), rgba(60,30,10,0.85))"
            onClick={() => navigate("/mogul")}
            delay={0.26}
          />
          <GameCard
            emoji="💬"
            name="Wordplay Hub"
            subtitle="13 mini-games"
            description="Mad Libs, jokes, quizzes, riddles, fortune cookies, improv scenes, word chains — one game arcade for words."
            status="13 games inside"
            accent="#C084FC"
            bg="linear-gradient(135deg, rgba(20,10,40,0.95), rgba(60,10,80,0.85))"
            onClick={() => navigate("/wordplay")}
            delay={0.33}
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
            delay={0.40}
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
            delay={0.47}
          />
          <GameCard
            emoji="⚔️"
            name="Beckett's Battle Forge"
            subtitle="Tactical Character Combat"
            description="Six fighters across five themed arenas. Auto-zoom camera follows the action. Cinematic AI duel — pick the matchup and watch it play out."
            status="Pick a matchup"
            accent="#fca5a5"
            bg="linear-gradient(135deg, rgba(60,8,8,0.95), rgba(20,5,5,0.85))"
            onClick={() => navigate("/battleforge")}
            delay={0.54}
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
            delay={0.61}
          />
        </div>

        {/* Resources / Beckett's Corner footer link */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="mt-6 flex justify-center"
        >
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
          className="mt-6 text-center text-[10px] uppercase tracking-[0.3em]"
          style={{ color: "#9aa6bf" }}
        >
          Berry Kid's Arcade · Made for Henry &amp; Beckett
          <div className="mt-2 text-[9px] tracking-[0.4em] opacity-70">
            v{APP_VERSION}
          </div>
        </motion.div>
      </div>

      {settingsOpen && <ArcadeSettings onClose={onSettingsClose} />}
    </div>
  );
}

function GameCard({ emoji, name, subtitle, description, status, accent, bg, onClick, delay }: {
  emoji: string;
  name: string;
  subtitle: string;
  description: string;
  status: string;
  accent: string;
  bg: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.22 } }}
      whileTap={{ scale: 0.985 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 22 }}
      onClick={onClick}
      aria-label={`Play ${name} — ${subtitle}. ${status}`}
      className="relative text-left rounded-2xl overflow-hidden p-5 sm:p-6 pressable touch-target group"
      style={{
        background: bg,
        border: `1px solid ${accent}55`,
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
