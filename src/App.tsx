import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
// Core layout + identity shell â€” kept eager because they're on the boot
// path or used across every route. Everything else below is lazy-loaded
// so the initial paint only ships ~boot code (the bundle for one game
// arrives when the user actually navigates to it).
import { Layout } from "./components/Layout";
import { NonFranchiseLayout } from "./components/NonFranchiseLayout";
import { Splash } from "./pages/Splash";
import { Landing } from "./pages/Landing";
import CategoryHome from "./pages/CategoryHome";
import CategoryScreen from "./pages/CategoryScreen";
import { ProfilePicker } from "./profiles/ProfilePicker";
import { ProfileEdit } from "./profiles/ProfileEdit";
import { FamilyStats } from "./profiles/FamilyStats";
import { FamilyRoster } from "./profiles/FamilyRoster";
import { getActiveProfileId, pullProfilesFromCloud } from "./profiles/store";
import { ensureFamilyRoom } from "./sync/cloudBlob";
import { ConflictToast } from "./components/ConflictToast";

// â”€â”€ Lazy game routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Each lazy import becomes its own chunk in the Vite build. Vite's import
// graph chunks related modules together automatically, so e.g. lazy-loading
// MogulHub also splits the whole mogul/ engine into the mogul chunk.
//
// CHUNK-MISMATCH RECOVERY: after a deploy, an old service worker can keep
// serving the previous index.html which references chunk hashes that no
// longer exist on the server. The new fetch returns the SPA fallback
// (index.html, content-type text/html) and the browser refuses to execute
// HTML as JS â€” surfaces as "text/html is not a valid JavaScript MIME type."
//
// loadChunkWithRetry catches that family of errors and forces a one-shot
// hard reload (with a sessionStorage guard so we never loop). The reload
// fetches the new index.html and its current chunk hashes.

const CHUNK_RELOAD_KEY = "dd_chunk_reload_attempted";

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { message?: string; name?: string };
  const msg = String(e.message ?? "");
  const name = String(e.name ?? "");
  return (
    name === "ChunkLoadError" ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("is not a valid JavaScript MIME type") ||
    msg.includes("'text/html' is not a valid")
  );
}

async function loadChunkWithRetry<T>(loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (err) {
    if (!isChunkLoadError(err)) throw err;
    // First time we hit this, try once more â€” handles a flaky network.
    try {
      return await loader();
    } catch (err2) {
      if (!isChunkLoadError(err2)) throw err2;
      // Persistent chunk failure â†’ stale SW serving an out-of-date
      // chunk graph. Hard-reload exactly once (guard against loops).
      const already = (() => {
        try { return sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1"; }
        catch { return false; }
      })();
      if (!already) {
        try { sessionStorage.setItem(CHUNK_RELOAD_KEY, "1"); } catch { /* ignore */ }
        // Aggressive recovery: unregister any service worker + clear
        // caches, then reload. Same logic the ErrorBoundary uses.
        await (async () => {
          try {
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(r => r.unregister().catch(() => false)));
            }
          } catch { /* ignore */ }
          try {
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map(k => caches.delete(k)));
            }
          } catch { /* ignore */ }
        })();
        location.reload();
        // Throw a sentinel so React doesn't immediately retry the loader
        // (we're navigating away).
        throw new Error("chunk-reload");
      }
      // Already attempted a reload this session â€” surface the error so
      // the ErrorBoundary catches it with a friendly recovery prompt.
      throw err2;
    }
  }
}

const lz = <T extends React.ComponentType<any>>(loader: () => Promise<{ default: T }>) =>
  lazy(() => loadChunkWithRetry(loader));
// Named-export helper: returns a default-shaped object so React.lazy is happy.
const lzn = <K extends string, M extends Record<K, React.ComponentType<any>>>(loader: () => Promise<M>, key: K) =>
  lazy(() => loadChunkWithRetry(loader).then(m => ({ default: m[key] })));

// Baseball franchise
const Dashboard         = lz(() => import("./pages/Dashboard"));
const Teams             = lz(() => import("./pages/Teams"));
const TeamPage          = lz(() => import("./pages/TeamPage"));
const PlayerProfile     = lz(() => import("./pages/PlayerProfile"));
const Standings         = lz(() => import("./pages/Standings"));
const Schedule          = lz(() => import("./pages/Schedule"));
const Stats             = lz(() => import("./pages/Stats"));
const FreeAgency        = lz(() => import("./pages/FreeAgency"));
const Draft             = lz(() => import("./pages/Draft"));
const Playoffs          = lz(() => import("./pages/Playoffs"));
const History           = lz(() => import("./pages/History"));
const News              = lz(() => import("./pages/News"));
const Settings          = lz(() => import("./pages/Settings"));
const CoachsCorner      = lz(() => import("./pages/CoachsCorner"));
const AllStarEvent      = lz(() => import("./pages/AllStarEvent"));
const ScoreKeeper       = lz(() => import("./pages/ScoreKeeper"));
const TrainingCamp      = lz(() => import("./pages/TrainingCamp"));
const TrainingHit       = lz(() => import("./pages/TrainingHit"));
const TrainingPitch     = lz(() => import("./pages/TrainingPitch"));
const TrainingDrills    = lz(() => import("./pages/TrainingDrills"));
const TrainingArsenal   = lz(() => import("./pages/TrainingArsenal"));
const TrainingSchedule  = lz(() => import("./pages/TrainingSchedule"));
const TrainingAchievements = lz(() => import("./pages/TrainingAchievements"));
const LiveGame          = lz(() => import("./pages/LiveGame"));
const CreateHenry       = lz(() => import("./pages/CreateHenry"));
const TrainingProfile   = lz(() => import("./pages/TrainingProfile"));
const BaseballHub       = lz(() => import("./pages/BaseballHub"));
const LeagueHub         = lz(() => import("./pages/LeagueHub"));
const SaveExit          = lz(() => import("./pages/SaveExit"));
const FranchisePlay     = lz(() => import("./pages/FranchisePlay"));
const Welcome           = lzn(() => import("./pages/Welcome"), "Welcome");
const TitleScreen       = lzn(() => import("./pages/TitleScreen"), "TitleScreen");

// Football
const FootballHome      = lz(() => import("./football/pages/FootballHome"));
const FootballStandings = lz(() => import("./football/pages/FootballStandings"));
const FootballTeams     = lzn(() => import("./football/pages/FootballTeams"), "FootballTeams");
const FootballTeamPage  = lzn(() => import("./football/pages/FootballTeams"), "FootballTeamPage");
const FootballSchedule  = lz(() => import("./football/pages/FootballSchedule"));
const FootballFreeAgency= lz(() => import("./football/pages/FootballFreeAgency"));
const FootballDraftClass= lz(() => import("./football/pages/FootballDraftClass"));
const FootballPlayerProfile = lz(() => import("./football/pages/FootballPlayerProfile"));
const FootballStats         = lz(() => import("./football/pages/FootballStats"));
const FootballNews          = lz(() => import("./football/pages/FootballNews"));
const FootballHistory       = lz(() => import("./football/pages/FootballHistory"));
const FootballDraft         = lz(() => import("./football/pages/FootballDraft"));
const FootballGameWatch = lz(() => import("./football/pages/FootballGameWatch"));
const FootballHub       = lz(() => import("./football/pages/FootballHub"));
const FootballLeagueHub = lz(() => import("./football/pages/FootballLeagueHub"));
const FootballSaveExit  = lz(() => import("./football/pages/FootballSaveExit"));
const FootballShell     = lzn(() => import("./football/components/FootballShell"), "FootballShell");

// Olympus
const OlympusShell      = lzn(() => import("./olympus/components/OlympusShell"), "OlympusShell");
const OlympusHome       = lz(() => import("./olympus/pages/OlympusHome"));
const HeroCreate        = lz(() => import("./olympus/pages/HeroCreate"));
const HeroProfile       = lz(() => import("./olympus/pages/HeroProfile"));
const AdventureNew      = lzn(() => import("./olympus/pages/Adventure"), "AdventureNew");
const AdventurePlay     = lzn(() => import("./olympus/pages/Adventure"), "AdventurePlay");
const OlympusSettings   = lz(() => import("./olympus/pages/OlympusSettings"));
const OlympusShops      = lz(() => import("./olympus/pages/Shops"));

// Mogul
const MogulHub          = lz(() => import("./mogul/pages/MogulHub"));
const MogulShell        = lzn(() => import("./mogul/components/MogulShell"), "MogulShell");
const ThisMonth         = lz(() => import("./mogul/pages/ThisMonth"));
const StudioManage      = lz(() => import("./mogul/pages/StudioManage"));
const Industry          = lz(() => import("./mogul/pages/Industry"));
const GlobalChart       = lz(() => import("./mogul/pages/GlobalChart"));
const Awards            = lz(() => import("./mogul/pages/Awards"));
const MogulSaveExit     = lz(() => import("./mogul/pages/MogulSaveExit"));
const MogulSettings     = lz(() => import("./mogul/pages/MogulSettings"));

// Temporal
const TemporalHub       = lz(() => import("./temporal/pages/TemporalHub"));
const Bureau            = lz(() => import("./temporal/pages/Bureau"));
const TemporalMissionBriefing = lz(() => import("./temporal/pages/MissionBriefing"));
const EraScene          = lz(() => import("./temporal/pages/EraScene"));
const Resolution        = lz(() => import("./temporal/pages/Resolution"));

// Cosmic
const CosmicHub         = lz(() => import("./cosmic/pages/CosmicHub"));
const MissionHub        = lz(() => import("./cosmic/pages/MissionHub"));
const MissionBriefing   = lz(() => import("./cosmic/pages/MissionBriefing"));
const Combat            = lz(() => import("./cosmic/pages/Combat"));

// Wordplay (heaviest chunk by file count â€” 25 sub-apps)
const WordplayHub       = lz(() => import("./wordplay/pages/WordplayHub"));
const MadLibs           = lz(() => import("./wordplay/pages/MadLibs"));
const Jokes             = lz(() => import("./wordplay/pages/Jokes"));
const QuizShow          = lz(() => import("./wordplay/pages/QuizShow"));
const StoryStarter      = lz(() => import("./wordplay/pages/StoryStarter"));
const FortuneCookie     = lz(() => import("./wordplay/pages/FortuneCookie"));
const MagicEightBall    = lz(() => import("./wordplay/pages/MagicEightBall"));
const TwentyQuestions   = lz(() => import("./wordplay/pages/TwentyQuestions"));
const WouldYouRather    = lz(() => import("./wordplay/pages/WouldYouRather"));
const WhatAmI           = lz(() => import("./wordplay/pages/WhatAmI"));
const ImprovScenes      = lz(() => import("./wordplay/pages/ImprovScenes"));
const ConversationStarters = lz(() => import("./wordplay/pages/ConversationStarters"));
const WordChain         = lz(() => import("./wordplay/pages/WordChain"));
const PersonalityQuiz   = lz(() => import("./wordplay/pages/PersonalityQuiz"));
const Storyteller       = lz(() => import("./wordplay/pages/Storyteller"));
const ChooseAdventure   = lz(() => import("./wordplay/pages/ChooseAdventure"));
const MysteryBox        = lz(() => import("./wordplay/pages/MysteryBox"));
const RapBattle         = lz(() => import("./wordplay/pages/RapBattle"));
const HeroMaker         = lz(() => import("./wordplay/pages/HeroMaker"));
const LiarLiar          = lz(() => import("./wordplay/pages/LiarLiar"));
const LyricLab          = lz(() => import("./wordplay/pages/LyricLab"));
const ArgumentSettler   = lz(() => import("./wordplay/pages/ArgumentSettler"));
const WPCharades        = lz(() => import("./wordplay/pages/Charades"));
const QuietGame         = lz(() => import("./wordplay/pages/QuietGame"));

// Resources / Beckett's Corner
const ResourcesHub      = lz(() => import("./resources/pages/ResourcesHub"));
const BeckettsCorner    = lz(() => import("./resources/pages/BeckettsCorner"));
const AshCareGuide      = lz(() => import("./resources/pages/AshCareGuide"));
const BeckettsTodo      = lz(() => import("./resources/pages/BeckettsTodo"));
// Beckett's Battle Forge â€” Codex's Three.js renderer (3D combat
// with POV camera, particle VFX, procedural characters).
const BattleForge       = lz(() => import("./battleforge/BattleForge"));
const SpectateLive      = lz(() => import("./battleforge/SpectateLive"));
const MechHub           = lz(() => import("./mech/pages/MechHub"));
const MechBuilder       = lz(() => import("./mech/pages/MechBuilder"));
const MechBattle        = lz(() => import("./mech/pages/MechBattle"));
const MechReplays       = lz(() => import("./mech/pages/MechReplays"));
const MechShop          = lz(() => import("./mech/pages/MechShop"));
const Dungeon3DHub      = lz(() => import("./dungeon3d/pages/Dungeon3DHub"));
const Dungeon3DRun      = lz(() => import("./dungeon3d/pages/Dungeon3DRun"));
const MonsterForgeHub      = lz(() => import("./monster-forge/pages/MonsterForgeHub"));
const MonsterForgeBuilder  = lz(() => import("./monster-forge/pages/MonsterForgeBuilder"));
const HardballHub          = lz(() => import("./hardball/pages/HardballHub"));
const HardballMatch        = lz(() => import("./hardball/pages/HardballMatch"));
const StrikeRescueHub      = lz(() => import("./strike-rescue/pages/StrikeRescueHub"));
const StrikeRescueMatch    = lz(() => import("./strike-rescue/pages/StrikeRescueMatch"));
const HardballDerby        = lz(() => import("./hardball/pages/HardballDerby"));
const HardballBracket      = lz(() => import("./hardball/pages/HardballBracket"));
const CreatureHub       = lz(() => import("./creature/pages/CreatureHub"));
const CreatureWild      = lz(() => import("./creature/pages/CreatureWild"));
const CreatureBattle    = lz(() => import("./creature/pages/CreatureBattle"));
const CreatureShop      = lz(() => import("./creature/pages/CreatureShop"));
const CreatureHabitats  = lz(() => import("./creature/pages/CreatureHabitats"));
const CreatureBreed     = lz(() => import("./creature/pages/CreatureBreed"));
const CreatureTraining  = lz(() => import("./creature/pages/CreatureTraining"));
const SurvivorHub       = lz(() => import("./survivor/pages/SurvivorHub"));
const SurvivorRun       = lz(() => import("./survivor/pages/SurvivorRun"));
const WhatsNew          = lz(() => import("./pages/WhatsNew"));
const OlympusParty      = lz(() => import("./olympus/pages/OlympusParty"));
const OlympusDuel       = lz(() => import("./olympus/pages/OlympusDuel"));
const VersusHub         = lz(() => import("./versus/pages/VersusHub"));
const BaseballVersus    = lz(() => import("./versus/pages/BaseballVersus"));
const FootballVersus    = lz(() => import("./versus/pages/FootballVersus"));
const BoxingVersus      = lz(() => import("./versus/pages/BoxingVersus"));
const WrestlingVersus   = lz(() => import("./versus/pages/WrestlingVersus"));
const VersusOnlineLobby = lz(() => import("./versus/pages/VersusOnlineLobby"));
const BaseballVersusOnline = lz(() => import("./versus/pages/BaseballVersusOnline"));
const FootballVersusOnline = lz(() => import("./versus/pages/FootballVersusOnline"));
const CrewLobby            = lz(() => import("./crewtraitor/pages/CrewLobby"));
const CrewGame             = lz(() => import("./crewtraitor/pages/CrewGame"));
const CrewSolo             = lz(() => import("./crewtraitor/solo/CrewSolo"));
const OddLobby             = lz(() => import("./oddoneout/pages/OddLobby"));
const OddGame              = lz(() => import("./oddoneout/pages/OddGame"));
const GirderClimb          = lz(() => import("./classics/girder/GirderClimb"));
const StrikeForce          = lz(() => import("./classics/strikeforce/StrikeForce"));
const MazeMuncher          = lz(() => import("./classics/mazemuncher/MazeMuncher"));
// Phase 5 cutover: the SVG StyleStudioDressup has been replaced by the 3D
// Glam Studio. The `StyleStudio` lazy name is kept as an alias pointing at
// the new GlamStudioBuilder so `/classics/style` continues to resolve.
const StyleStudio          = lz(() => import("./glam-studio/pages/GlamStudioBuilder"));
const StyleStudioSketch    = lz(() => import("./classics/stylestudio/StyleStudio"));
const GlamStudioHub        = lz(() => import("./glam-studio/pages/GlamStudioHub"));
const GlamStudioBuilder    = lz(() => import("./glam-studio/pages/GlamStudioBuilder"));
const SilentDepths         = lz(() => import("./classics/silentdepths/SilentDepthsSim"));
const SilentDepthsArcade   = lz(() => import("./classics/silentdepths/SilentDepths"));
const TankDuel             = lz(() => import("./tankduel/TankDuel"));
const MathBlaster          = lz(() => import("./mathblaster/MathBlaster"));
const SportsHub            = lz(() => import("./sportshub/SportsHub"));
const SeasonSim            = lz(() => import("./sportshub/SeasonSim"));
const RosterScreen         = lz(() => import("./sportshub/RosterScreen"));
const ScheduleScreen       = lz(() => import("./sportshub/ScheduleScreen"));
const MainEvent            = lz(() => import("./mainevent/MainEvent"));
const CardClash            = lz(() => import("./cardclash/CardClash"));
const VideoGameHelper   = lz(() => import("./wordplay/pages/VideoGameHelper"));
const StoryChain        = lz(() => import("./wordplay/pages/StoryChain"));
const OneWordAtATime    = lz(() => import("./wordplay/pages/OneWordAtATime"));
const CompanionPet      = lz(() => import("./wordplay/pages/CompanionPet"));
const GameShow          = lz(() => import("./wordplay/pages/GameShow"));
const DetectiveMystery  = lz(() => import("./wordplay/pages/DetectiveMystery"));
const ExplainIt         = lz(() => import("./wordplay/pages/ExplainIt"));
const SocialCoach       = lz(() => import("./wordplay/pages/SocialCoach"));
const WhatHappensIf     = lz(() => import("./wordplay/pages/WhatHappensIf"));
const CuriosityCamera   = lz(() => import("./wordplay/pages/CuriosityCamera"));

// Turbo Racers (top-down racing -- /racing hub + /racing/play match)
const RacingHub          = lz(() => import("./racing/pages/RacingHub"));
const RacingMatch        = lz(() => import("./racing/pages/RacingMatch"));
const ScienceSidekick   = lz(() => import("./wordplay/pages/ScienceSidekick"));
const AskMeAnything     = lz(() => import("./wordplay/pages/AskMeAnything"));
const JustWantTalk      = lz(() => import("./wordplay/pages/JustWantTalk"));
const FitCoach          = lz(() => import("./resources/pages/FitCoach"));
const BaseballNotes     = lz(() => import("./resources/pages/BaseballNotes"));
const BaseballTraining  = lz(() => import("./resources/pages/BaseballTraining"));
const BaseballTrainingHit = lz(() => import("./resources/pages/BaseballTrainingHit"));
const BaseballTrainingPitch = lz(() => import("./resources/pages/BaseballTrainingPitch"));
const Journal           = lz(() => import("./resources/pages/Journal"));
const PotionLabHub      = lz(() => import("./potionlab/pages/PotionLabHub"));
const PotionLabCauldron = lz(() => import("./potionlab/pages/Cauldron"));
const PotionLabGrimoire = lz(() => import("./potionlab/pages/Grimoire"));
const PotionLabShelf    = lz(() => import("./potionlab/pages/PotionShelf"));
import { useStore } from "./store";
import { CommandBar } from "./components/CommandBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PhaseTransition } from "./components/PhaseTransition";
import { ChampionshipCelebration } from "./components/ChampionshipCelebration";

export default function App() {
  const hydrated = useStore(s => s.hydrated);
  const loadFromDb = useStore(s => s.loadFromDb);
  const league = useStore(s => s.league);
  const [showSplash, setShowSplash] = useState(true);
  // Profile gating â€” after splash, show the picker if no profile is
  // active. Listens for the switch event so tapping the corner badge
  // takes the player straight back to the picker.
  const [activeProfile, setActiveProfile] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setActiveProfile(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);

  useEffect(() => { loadFromDb(); }, []);

  // Cloud sync bootstrap â€” ensure the family room code exists and pull the
  // latest profile list so a fresh device on the family account sees the
  // same profiles other devices already created. Fire and forget; offline
  // failures degrade silently to local-only.
  useEffect(() => {
    // The app booted past the entry chunk â€” clear any chunk-reload guard
    // so future deploys can trigger their own one-shot recovery.
    try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch { /* ignore */ }
    try { ensureFamilyRoom(); } catch (e) { console.warn("[app] room init", e); }
    pullProfilesFromCloud().catch(e => console.warn("[app] pull profiles", e));
  }, []);

  // Apply theme on initial load (defensive: old saves might lack
  // settings.visual; the migrate function fills it in, but guard against
  // a partial load just in case).
  useEffect(() => {
    if (!league) return;
    const t = league.settings?.visual?.theme;
    if (!t) return;
    const html = document.documentElement;
    html.classList.remove("theme-light");
    if (t === "light") html.classList.add("theme-light");
  }, [league?.settings?.visual?.theme]);

  // CRITICAL: keep <BrowserRouter> mounted across ALL render branches so
  // child components are free to call useNavigate() in any app state. If
  // the picker/splash render OUTSIDE the router, useNavigate() throws a
  // production-minified invariant that the user sees as an empty-message
  // Error in the ErrorBoundary â€” the original cause of the v1.10.2x
  // "Something Broke" loop on devices with no active profile.
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          {showSplash || !hydrated ? (
            <Splash onDone={() => setShowSplash(false)} />
          ) : !activeProfile ? (
            <ProfilePicker onPicked={() => setActiveProfile(getActiveProfileId())} />
          ) : (
            <>
              <Router />
              {/* Global sync-conflict toasts â€” overlay any route. */}
              <ConflictToast />
            </>
          )}
        </BrowserRouter>
      </MotionConfig>
    </ErrorBoundary>
  );
}

/** Tiny wrapper that gives each top-level route its own error boundary
 *  so a crash in one sub-game (football, olympus) can't take down the
 *  others. The user can navigate to a healthy route via the boundary's
 *  "Go to arcade" link. */
function R({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function Router() {
  const league = useStore(s => s.league);
  return (
    <Suspense fallback={<RouteLoading />}>
    <Routes>
        {/* Landing is the ALWAYS-entry. `/` and `/play` both render it.
            Henry picks a game from here â€” never auto-routed into baseball. */}
        <Route path="/" element={<R><CategoryHome /></R>} />
        <Route path="/home/:category" element={<R><CategoryScreen /></R>} />
        {/* Legacy flat-grid view kept for bookmarks + fallback */}
        <Route path="/play" element={<R><Landing /></R>} />
        <Route path="/all" element={<R><Landing /></R>} />
        <Route path="/title" element={<R><TitleScreen /></R>} />
        <Route path="/welcome" element={<R><Welcome /></R>} />
        <Route path="/family" element={<R><FamilyStats /></R>} />
        <Route path="/family/roster" element={<R><FamilyRoster /></R>} />
        <Route path="/profile/edit/:id" element={<R><ProfileEdit /></R>} />
        {/* Football arcade hub â€” Henry lands here when he picks football
            from the arcade. Picks Franchise / Live / Quick Tournament. */}
        <Route path="/football/hub" element={<R><FootballHub /></R>} />
        {/* Football FRANCHISE â€” separate routing tree wrapped by
            FootballShell (4-tab nav, persistent header, news ticker). */}
        <Route path="/football" element={<R><FootballShell /></R>}>
          <Route index element={<FootballHome />} />
          <Route path="standings" element={<FootballStandings />} />
          <Route path="teams" element={<FootballTeams />} />
          <Route path="team/:id" element={<FootballTeamPage />} />
          <Route path="schedule" element={<FootballSchedule />} />
          <Route path="freeagency" element={<FootballFreeAgency />} />
          <Route path="draft-class" element={<FootballDraftClass />} />
          <Route path="player/:id" element={<FootballPlayerProfile />} />
          <Route path="stats" element={<FootballStats />} />
          <Route path="news" element={<FootballNews />} />
          <Route path="history" element={<FootballHistory />} />
          <Route path="draft" element={<FootballDraft />} />
          <Route path="league" element={<FootballLeagueHub />} />
          <Route path="save" element={<FootballSaveExit />} />
        </Route>
        <Route path="/football/game/:id" element={<R><FootballGameWatch /></R>} />
        {/* Baseball arcade hub â€” the entry point when Henry picks
            baseball. Lists the 4 mode cards (Franchise / Live /
            Training / Score Keeper). */}
        <Route path="/baseball" element={<R><BaseballHub /></R>} />
        {/* Non-franchise baseball modes â€” slim chrome, no franchise
            sidenav, no news ticker. */}
        <Route element={<R><NonFranchiseLayout /></R>}>
          <Route path="/score" element={<ScoreKeeper />} />
          <Route path="/training" element={<TrainingCamp />} />
          <Route path="/training/hit" element={<TrainingHit />} />
          <Route path="/training/pitch" element={<TrainingPitch />} />
          <Route path="/training/drills" element={<TrainingDrills />} />
          <Route path="/training/arsenal" element={<TrainingArsenal />} />
          <Route path="/training/schedule" element={<TrainingSchedule />} />
          <Route path="/training/achievements" element={<TrainingAchievements />} />
          <Route path="/training/create-henry" element={<CreateHenry />} />
          <Route path="/training/profile" element={<TrainingProfile />} />
          <Route path="/training/live" element={<LiveGame />} />
          <Route path="/live" element={<LiveGame />} />
        </Route>
        {/* Movie Mogul â€” fourth game. Hub picks save slot or starts a
            new studio; everything else lives under /mogul/studio/* */}
        <Route path="/mogul" element={<R><MogulHub /></R>} />
        <Route path="/mogul/studio" element={<R><MogulShell /></R>}>
          <Route index element={<ThisMonth />} />
          <Route path="manage" element={<StudioManage />} />
          <Route path="industry" element={<Industry />} />
          <Route path="chart" element={<GlobalChart />} />
          <Route path="awards" element={<Awards />} />
          <Route path="save" element={<MogulSaveExit />} />
          <Route path="settings" element={<MogulSettings />} />
        </Route>
        {/* Temporal Order â€” 7th game. Time-travel investigation with
            AI-driven mission variation, NPC dialogue, ripple effects. */}
        <Route path="/temporal" element={<R><TemporalHub /></R>} />
        <Route path="/temporal/play/:slotId" element={<R><Bureau /></R>} />
        <Route path="/temporal/play/:slotId/mission/:missionId/brief" element={<R><TemporalMissionBriefing /></R>} />
        <Route path="/temporal/play/:slotId/era/:eraId" element={<R><EraScene /></R>} />
        <Route path="/temporal/play/:slotId/mission/:missionId/resolve" element={<R><Resolution /></R>} />
        {/* Cosmic Squad â€” 6th game. Hub picks a save slot, mission hub
            picks a mission, combat is the playable screen. */}
        <Route path="/cosmic" element={<R><CosmicHub /></R>} />
        <Route path="/cosmic/play/:slotId" element={<R><MissionHub /></R>} />
        <Route path="/cosmic/play/:slotId/mission/:missionId" element={<R><MissionBriefing /></R>} />
        <Route path="/cosmic/play/:slotId/mission/:missionId/combat" element={<R><Combat /></R>} />
        {/* Wordplay Hub â€” 5th game. One app with 13 sub-game routes. */}
        <Route path="/wordplay" element={<R><WordplayHub /></R>} />
        <Route path="/wordplay/madlibs" element={<R><MadLibs /></R>} />
        <Route path="/wordplay/jokes" element={<R><Jokes /></R>} />
        <Route path="/wordplay/quiz" element={<R><QuizShow /></R>} />
        <Route path="/wordplay/stories" element={<R><StoryStarter /></R>} />
        <Route path="/wordplay/fortune" element={<R><FortuneCookie /></R>} />
        <Route path="/wordplay/magic8" element={<R><MagicEightBall /></R>} />
        <Route path="/wordplay/twenty-questions" element={<R><TwentyQuestions /></R>} />
        <Route path="/wordplay/would-you-rather" element={<R><WouldYouRather /></R>} />
        <Route path="/wordplay/what-am-i" element={<R><WhatAmI /></R>} />
        <Route path="/wordplay/improv" element={<R><ImprovScenes /></R>} />
        <Route path="/wordplay/conversation" element={<R><ConversationStarters /></R>} />
        <Route path="/wordplay/word-chain" element={<R><WordChain /></R>} />
        <Route path="/wordplay/personality" element={<R><PersonalityQuiz /></R>} />
        {/* Wordplay V2 â€” 10 new sub-apps. */}
        <Route path="/wordplay/storyteller" element={<R><Storyteller /></R>} />
        <Route path="/wordplay/adventure" element={<R><ChooseAdventure /></R>} />
        <Route path="/wordplay/mystery-box" element={<R><MysteryBox /></R>} />
        <Route path="/wordplay/rap-battle" element={<R><RapBattle /></R>} />
        <Route path="/wordplay/hero-maker" element={<R><HeroMaker /></R>} />
        <Route path="/wordplay/liar-liar" element={<R><LiarLiar /></R>} />
        <Route path="/wordplay/lyric-lab" element={<R><LyricLab /></R>} />
        <Route path="/wordplay/settler" element={<R><ArgumentSettler /></R>} />
        <Route path="/wordplay/charades" element={<R><WPCharades /></R>} />
        <Route path="/wordplay/quiet-game" element={<R><QuietGame /></R>} />
        {/* /wordplay/spell removed v1.10.75 â€” Spell Game retired per
            request. Files src/wordplay/pages/SpellGame.tsx and
            src/wordplay/data/spellWords.ts deleted. */}
        {/* Resources / Beckett's Corner */}
        <Route path="/resources" element={<R><ResourcesHub /></R>} />
        <Route path="/resources/becketts-corner" element={<R><BeckettsCorner /></R>} />
        <Route path="/resources/becketts-corner/ash-care" element={<R><AshCareGuide /></R>} />
        <Route path="/resources/becketts-corner/todo" element={<R><BeckettsTodo /></R>} />
        {/* Beckett's Battle Forge â€” Three.js 3D combat (Codex renderer) */}
        <Route path="/battleforge" element={<R><BattleForge /></R>} />
        <Route path="/battleforge/spectate" element={<R><SpectateLive /></R>} />
        <Route path="/mech" element={<R><MechHub /></R>} />
        <Route path="/mech/builder" element={<R><MechBuilder /></R>} />
        <Route path="/mech/battle" element={<R><MechBattle /></R>} />
        <Route path="/mech/replays" element={<R><MechReplays /></R>} />
        <Route path="/mech/shop" element={<R><MechShop /></R>} />
        <Route path="/dungeon3d" element={<R><Dungeon3DHub /></R>} />
        <Route path="/dungeon3d/run" element={<R><Dungeon3DRun /></R>} />
        <Route path="/monster-forge" element={<R><MonsterForgeHub /></R>} />
        <Route path="/monster-forge/build" element={<R><MonsterForgeBuilder /></R>} />
        <Route path="/hardball" element={<R><HardballHub /></R>} />
        <Route path="/hardball/play" element={<R><HardballMatch /></R>} />
        <Route path="/hardball/derby" element={<R><HardballDerby /></R>} />
        <Route path="/hardball/bracket" element={<R><HardballBracket /></R>} />
        <Route path="/strike-rescue" element={<R><StrikeRescueHub /></R>} />
        <Route path="/strike-rescue/play" element={<R><StrikeRescueMatch /></R>} />
        <Route path="/creature" element={<R><CreatureHub /></R>} />
        <Route path="/creature/wild" element={<R><CreatureWild /></R>} />
        <Route path="/creature/battle" element={<R><CreatureBattle /></R>} />
        <Route path="/creature/shop" element={<R><CreatureShop /></R>} />
        <Route path="/creature/habitats" element={<R><CreatureHabitats /></R>} />
        <Route path="/creature/breed" element={<R><CreatureBreed /></R>} />
        <Route path="/creature/training" element={<R><CreatureTraining /></R>} />
        <Route path="/survivor" element={<R><SurvivorHub /></R>} />
        <Route path="/survivor/run" element={<R><SurvivorRun /></R>} />
        <Route path="/whats-new" element={<R><WhatsNew /></R>} />
        {/* Codex's additions â€” 13 more wordplay sub-apps + 6 resources + Olympus party */}
        <Route path="/wordplay/game-helper" element={<R><VideoGameHelper /></R>} />
        <Route path="/wordplay/story-chain" element={<R><StoryChain /></R>} />
        <Route path="/wordplay/one-word" element={<R><OneWordAtATime /></R>} />
        <Route path="/wordplay/companion" element={<R><CompanionPet /></R>} />
        <Route path="/wordplay/game-show" element={<R><GameShow /></R>} />
        <Route path="/wordplay/detective" element={<R><DetectiveMystery /></R>} />
        <Route path="/wordplay/explain-it" element={<R><ExplainIt /></R>} />
        <Route path="/wordplay/social-coach" element={<R><SocialCoach /></R>} />
        <Route path="/wordplay/what-if" element={<R><WhatHappensIf /></R>} />
        <Route path="/wordplay/curiosity-cam" element={<R><CuriosityCamera /></R>} />
        <Route path="/wordplay/science-sidekick" element={<R><ScienceSidekick /></R>} />
        <Route path="/wordplay/ask-anything" element={<R><AskMeAnything /></R>} />
        <Route path="/wordplay/just-talk" element={<R><JustWantTalk /></R>} />
        <Route path="/resources/fit-coach" element={<R><FitCoach /></R>} />
        <Route path="/resources/baseball-notes" element={<R><BaseballNotes /></R>} />
        <Route path="/resources/baseball-training" element={<R><BaseballTraining /></R>} />
        <Route path="/resources/baseball-training/hit" element={<R><BaseballTrainingHit /></R>} />
        <Route path="/resources/baseball-training/pitch" element={<R><BaseballTrainingPitch /></R>} />
        <Route path="/resources/journal" element={<R><Journal /></R>} />
        {/* Potion Lab â€” 9th game */}
        <Route path="/potion-lab" element={<R><PotionLabHub /></R>} />
        <Route path="/potion-lab/cauldron" element={<R><PotionLabCauldron /></R>} />
        <Route path="/potion-lab/grimoire" element={<R><PotionLabGrimoire /></R>} />
        <Route path="/potion-lab/shelf" element={<R><PotionLabShelf /></R>} />
        <Route path="/olympus/party" element={<R><OlympusParty /></R>} />
        <Route path="/olympus/duel" element={<R><OlympusDuel /></R>} />
        <Route path="/versus" element={<R><VersusHub /></R>} />
        <Route path="/versus/baseball" element={<R><BaseballVersus /></R>} />
        <Route path="/versus/football" element={<R><FootballVersus /></R>} />
        <Route path="/versus/boxing" element={<R><BoxingVersus /></R>} />
        <Route path="/versus/wrestling" element={<R><WrestlingVersus /></R>} />
        <Route path="/versus/online" element={<R><VersusOnlineLobby /></R>} />
        <Route path="/versus/online/baseball" element={<R><BaseballVersusOnline /></R>} />
        <Route path="/versus/online/football" element={<R><FootballVersusOnline /></R>} />
        <Route path="/crew" element={<R><CrewLobby /></R>} />
        <Route path="/crew/game" element={<R><CrewGame /></R>} />
        <Route path="/crew/solo" element={<R><CrewSolo /></R>} />
        <Route path="/odd" element={<R><OddLobby /></R>} />
        <Route path="/odd/game" element={<R><OddGame /></R>} />
        <Route path="/classics/girder"      element={<R><GirderClimb /></R>} />
        <Route path="/classics/strikeforce" element={<R><StrikeForce /></R>} />
        <Route path="/classics/maze"        element={<R><MazeMuncher /></R>} />
        <Route path="/classics/style"       element={<R><StyleStudio /></R>} />
        <Route path="/classics/sketch"      element={<R><StyleStudioSketch /></R>} />
        {/* Glam Studio - 3D fashion-doll stylist. `/classics/style` is the
            backward-compatible slot, `/glam-studio` is the primary entry. */}
        <Route path="/glam-studio"          element={<R><GlamStudioHub /></R>} />
        <Route path="/glam-studio/build"    element={<R><GlamStudioBuilder /></R>} />
        <Route path="/classics/depths"      element={<R><SilentDepths /></R>} />
        <Route path="/classics/depths-arcade" element={<R><SilentDepthsArcade /></R>} />
        <Route path="/tankduel"             element={<R><TankDuel /></R>} />
        <Route path="/mathblaster"          element={<R><MathBlaster /></R>} />
        <Route path="/sports"               element={<R><SportsHub /></R>} />
        <Route path="/sports/:sport"        element={<R><SeasonSim /></R>} />
        <Route path="/sports/:sport/team/:teamId" element={<R><RosterScreen /></R>} />
        <Route path="/sports/:sport/schedule" element={<R><ScheduleScreen /></R>} />
        <Route path="/mainevent"            element={<R><MainEvent /></R>} />
        {/* /boxing standalone route retired â€” boxing is now a sport inside
            Sports Versus 2P (see /versus/boxing). Old links redirect to
            the versus hub so the user picks the new flow. */}
        <Route path="/boxing"               element={<Navigate to="/versus" replace />} />
        <Route path="/cardclash"            element={<R><CardClash /></R>} />
        {/* Olympus mode â€” separate routing tree, own theme + chrome */}
        <Route path="/olympus" element={<R><OlympusShell /></R>}>
          <Route index element={<OlympusHome />} />
          <Route path="roster" element={<OlympusHome />} />
          <Route path="create" element={<HeroCreate />} />
          <Route path="hero/:id" element={<HeroProfile />} />
          <Route path="adventure/new" element={<AdventureNew />} />
          <Route path="adventure" element={<AdventurePlay />} />
          <Route path="settings" element={<OlympusSettings />} />
          <Route path="shops" element={<OlympusShops />} />
        </Route>
        {/* Baseball FRANCHISE routes â€” pathless layout route so children
            use absolute paths but share the LayoutWithBars chrome
            (4-tab nav, persistent franchise header, news ticker). If
            no league exists, any franchise URL kicks back to the
            Baseball Hub. */}
        <Route element={league ? <R><LayoutWithBars /></R> : <Navigate to="/baseball" replace />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="league" element={<LeagueHub />} />
          <Route path="save" element={<SaveExit />} />
          <Route path="play/:gameId" element={<FranchisePlay />} />
          <Route path="teams" element={<Teams />} />
          <Route path="team/:id" element={<TeamPage />} />
          <Route path="player/:id" element={<PlayerProfile />} />
          <Route path="standings" element={<Standings />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="stats" element={<Stats />} />
          <Route path="freeagency" element={<FreeAgency />} />
          <Route path="draft" element={<Draft />} />
          <Route path="playoffs" element={<Playoffs />} />
          <Route path="history" element={<History />} />
          <Route path="news" element={<News />} />
          <Route path="settings" element={<Settings />} />
          <Route path="coach" element={<CoachsCorner />} />
          <Route path="allstar" element={<AllStarEvent />} />
        </Route>
        {/* Turbo Racers -- top-down racing */}
        <Route path="/racing" element={<R><RacingHub /></R>} />
        <Route path="/racing/play" element={<R><RacingMatch /></R>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/** Suspense fallback shown while a lazy game chunk loads. Includes a
 *  subtle spinner so the user sees motion on slow networks instead of
 *  wondering whether the tap registered. */
function RouteLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "linear-gradient(180deg, #0a0a14 0%, #050308 100%)" }}>
      <div className="w-10 h-10 rounded-full" aria-hidden="true" style={{
        border: "3px solid rgba(201, 182, 240, 0.18)",
        borderTopColor: "#c9b6f0",
        animation: "routeLoadingSpin 0.9s linear infinite",
      }} />
      <div className="text-[10px] tracking-[0.4em] font-display uppercase" style={{ color: "#c9b6f0" }}>
        Loadingâ€¦
      </div>
      <style>{`@keyframes routeLoadingSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LayoutWithBars() {
  // Owner-profile setup is no longer forced on first entry â€” players land
  // straight on the dashboard, with a "Set Up Your Owner" banner there
  // they can dismiss or accept on their own time. (/welcome is still
  // reachable from Settings and from that banner, just not auto-forced.)
  return (
    <>
      <PhaseTransition />
      <ChampionshipCelebration />
      <CommandBar />
      <Layout />
    </>
  );
}
