import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import TeamPage from "./pages/TeamPage";
import PlayerProfile from "./pages/PlayerProfile";
import Standings from "./pages/Standings";
import Schedule from "./pages/Schedule";
import Stats from "./pages/Stats";
import FreeAgency from "./pages/FreeAgency";
import Draft from "./pages/Draft";
import Playoffs from "./pages/Playoffs";
import History from "./pages/History";
import News from "./pages/News";
import Settings from "./pages/Settings";
import CoachsCorner from "./pages/CoachsCorner";
import AllStarEvent from "./pages/AllStarEvent";
import ScoreKeeper from "./pages/ScoreKeeper";
import TrainingCamp from "./pages/TrainingCamp";
import TrainingHit from "./pages/TrainingHit";
import TrainingPitch from "./pages/TrainingPitch";
import TrainingDrills from "./pages/TrainingDrills";
import TrainingArsenal from "./pages/TrainingArsenal";
import TrainingSchedule from "./pages/TrainingSchedule";
import TrainingAchievements from "./pages/TrainingAchievements";
import LiveGame from "./pages/LiveGame";
import CreateHenry from "./pages/CreateHenry";
import TrainingProfile from "./pages/TrainingProfile";
import BaseballHub from "./pages/BaseballHub";
import LeagueHub from "./pages/LeagueHub";
import SaveExit from "./pages/SaveExit";
import FranchisePlay from "./pages/FranchisePlay";
import { NonFranchiseLayout } from "./components/NonFranchiseLayout";
import { Welcome } from "./pages/Welcome";
import { TitleScreen } from "./pages/TitleScreen";
import { Splash } from "./pages/Splash";
import { Landing } from "./pages/Landing";
import FootballHome from "./football/pages/FootballHome";
import FootballStandings from "./football/pages/FootballStandings";
import { FootballTeams, FootballTeamPage } from "./football/pages/FootballTeams";
import FootballSchedule from "./football/pages/FootballSchedule";
import FootballFreeAgency from "./football/pages/FootballFreeAgency";
import FootballGameWatch from "./football/pages/FootballGameWatch";
import FootballHub from "./football/pages/FootballHub";
import FootballLeagueHub from "./football/pages/FootballLeagueHub";
import FootballSaveExit from "./football/pages/FootballSaveExit";
import { FootballShell } from "./football/components/FootballShell";
import { OlympusShell } from "./olympus/components/OlympusShell";
import OlympusHome from "./olympus/pages/OlympusHome";
import HeroCreate from "./olympus/pages/HeroCreate";
import HeroProfile from "./olympus/pages/HeroProfile";
import { AdventureNew, AdventurePlay } from "./olympus/pages/Adventure";
import OlympusSettings from "./olympus/pages/OlympusSettings";
import OlympusShops from "./olympus/pages/Shops";
import MogulHub from "./mogul/pages/MogulHub";
import { MogulShell } from "./mogul/components/MogulShell";
import ThisMonth from "./mogul/pages/ThisMonth";
import StudioManage from "./mogul/pages/StudioManage";
import Industry from "./mogul/pages/Industry";
import Awards from "./mogul/pages/Awards";
import MogulSaveExit from "./mogul/pages/MogulSaveExit";
import MogulSettings from "./mogul/pages/MogulSettings";
import TemporalHub from "./temporal/pages/TemporalHub";
import Bureau from "./temporal/pages/Bureau";
import TemporalMissionBriefing from "./temporal/pages/MissionBriefing";
import EraScene from "./temporal/pages/EraScene";
import Resolution from "./temporal/pages/Resolution";
import CosmicHub from "./cosmic/pages/CosmicHub";
import MissionHub from "./cosmic/pages/MissionHub";
import MissionBriefing from "./cosmic/pages/MissionBriefing";
import Combat from "./cosmic/pages/Combat";
import WordplayHub from "./wordplay/pages/WordplayHub";
import MadLibs from "./wordplay/pages/MadLibs";
import Jokes from "./wordplay/pages/Jokes";
import QuizShow from "./wordplay/pages/QuizShow";
import StoryStarter from "./wordplay/pages/StoryStarter";
import FortuneCookie from "./wordplay/pages/FortuneCookie";
import MagicEightBall from "./wordplay/pages/MagicEightBall";
import TwentyQuestions from "./wordplay/pages/TwentyQuestions";
import WouldYouRather from "./wordplay/pages/WouldYouRather";
import WhatAmI from "./wordplay/pages/WhatAmI";
import ImprovScenes from "./wordplay/pages/ImprovScenes";
import ConversationStarters from "./wordplay/pages/ConversationStarters";
import WordChain from "./wordplay/pages/WordChain";
import PersonalityQuiz from "./wordplay/pages/PersonalityQuiz";
// Wordplay V2 — 10 new sub-apps.
import Storyteller from "./wordplay/pages/Storyteller";
import ChooseAdventure from "./wordplay/pages/ChooseAdventure";
import MysteryBox from "./wordplay/pages/MysteryBox";
import RapBattle from "./wordplay/pages/RapBattle";
import HeroMaker from "./wordplay/pages/HeroMaker";
import LiarLiar from "./wordplay/pages/LiarLiar";
import LyricLab from "./wordplay/pages/LyricLab";
import ArgumentSettler from "./wordplay/pages/ArgumentSettler";
import WPCharades from "./wordplay/pages/Charades";
import QuietGame from "./wordplay/pages/QuietGame";
// Resources (Beckett's Corner)
import ResourcesHub from "./resources/pages/ResourcesHub";
import BeckettsCorner from "./resources/pages/BeckettsCorner";
import AshCareGuide from "./resources/pages/AshCareGuide";
import BeckettsTodo from "./resources/pages/BeckettsTodo";
// Beckett's Battle Forge — Codex's Three.js renderer (3D combat
// with POV camera, particle VFX, procedural characters).
import BattleForge from "./battleforge/BattleForge";
// Additional sub-apps adopted from Codex's branch.
import OlympusParty from "./olympus/pages/OlympusParty";
import VideoGameHelper from "./wordplay/pages/VideoGameHelper";
import StoryChain from "./wordplay/pages/StoryChain";
import OneWordAtATime from "./wordplay/pages/OneWordAtATime";
import CompanionPet from "./wordplay/pages/CompanionPet";
import GameShow from "./wordplay/pages/GameShow";
import DetectiveMystery from "./wordplay/pages/DetectiveMystery";
import ExplainIt from "./wordplay/pages/ExplainIt";
import SocialCoach from "./wordplay/pages/SocialCoach";
import WhatHappensIf from "./wordplay/pages/WhatHappensIf";
import CuriosityCamera from "./wordplay/pages/CuriosityCamera";
import ScienceSidekick from "./wordplay/pages/ScienceSidekick";
import AskMeAnything from "./wordplay/pages/AskMeAnything";
import JustWantTalk from "./wordplay/pages/JustWantTalk";
import FitCoach from "./resources/pages/FitCoach";
import BaseballNotes from "./resources/pages/BaseballNotes";
import BaseballTraining from "./resources/pages/BaseballTraining";
import BaseballTrainingHit from "./resources/pages/BaseballTrainingHit";
import BaseballTrainingPitch from "./resources/pages/BaseballTrainingPitch";
import Journal from "./resources/pages/Journal";
// Potion Lab — 9th game.
import PotionLabHub from "./potionlab/pages/PotionLabHub";
import PotionLabCauldron from "./potionlab/pages/Cauldron";
import PotionLabGrimoire from "./potionlab/pages/Grimoire";
import PotionLabShelf from "./potionlab/pages/PotionShelf";
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

  useEffect(() => { loadFromDb(); }, []);

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

  if (showSplash || !hydrated) return (
    <ErrorBoundary>
      <Splash onDone={() => setShowSplash(false)} />
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      {/* MotionConfig with reducedMotion="user" makes every
       *  framer-motion animation in the app honor the OS
       *  prefers-reduced-motion setting — covers ~70 files in one line. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <Router />
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
    <Routes>
        {/* Landing is the ALWAYS-entry. `/` and `/play` both render it.
            Henry picks a game from here — never auto-routed into baseball. */}
        <Route path="/" element={<R><Landing /></R>} />
        <Route path="/play" element={<R><Landing /></R>} />
        <Route path="/title" element={<R><TitleScreen /></R>} />
        <Route path="/welcome" element={<R><Welcome /></R>} />
        {/* Football arcade hub — Henry lands here when he picks football
            from the arcade. Picks Franchise / Live / Quick Tournament. */}
        <Route path="/football/hub" element={<R><FootballHub /></R>} />
        {/* Football FRANCHISE — separate routing tree wrapped by
            FootballShell (4-tab nav, persistent header, news ticker). */}
        <Route path="/football" element={<R><FootballShell /></R>}>
          <Route index element={<FootballHome />} />
          <Route path="standings" element={<FootballStandings />} />
          <Route path="teams" element={<FootballTeams />} />
          <Route path="team/:id" element={<FootballTeamPage />} />
          <Route path="schedule" element={<FootballSchedule />} />
          <Route path="freeagency" element={<FootballFreeAgency />} />
          <Route path="league" element={<FootballLeagueHub />} />
          <Route path="save" element={<FootballSaveExit />} />
        </Route>
        <Route path="/football/game/:id" element={<R><FootballGameWatch /></R>} />
        {/* Baseball arcade hub — the entry point when Henry picks
            baseball. Lists the 4 mode cards (Franchise / Live /
            Training / Score Keeper). */}
        <Route path="/baseball" element={<R><BaseballHub /></R>} />
        {/* Non-franchise baseball modes — slim chrome, no franchise
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
        {/* Movie Mogul — fourth game. Hub picks save slot or starts a
            new studio; everything else lives under /mogul/studio/* */}
        <Route path="/mogul" element={<R><MogulHub /></R>} />
        <Route path="/mogul/studio" element={<R><MogulShell /></R>}>
          <Route index element={<ThisMonth />} />
          <Route path="manage" element={<StudioManage />} />
          <Route path="industry" element={<Industry />} />
          <Route path="awards" element={<Awards />} />
          <Route path="save" element={<MogulSaveExit />} />
          <Route path="settings" element={<MogulSettings />} />
        </Route>
        {/* Temporal Order — 7th game. Time-travel investigation with
            AI-driven mission variation, NPC dialogue, ripple effects. */}
        <Route path="/temporal" element={<R><TemporalHub /></R>} />
        <Route path="/temporal/play/:slotId" element={<R><Bureau /></R>} />
        <Route path="/temporal/play/:slotId/mission/:missionId/brief" element={<R><TemporalMissionBriefing /></R>} />
        <Route path="/temporal/play/:slotId/era/:eraId" element={<R><EraScene /></R>} />
        <Route path="/temporal/play/:slotId/mission/:missionId/resolve" element={<R><Resolution /></R>} />
        {/* Cosmic Squad — 6th game. Hub picks a save slot, mission hub
            picks a mission, combat is the playable screen. */}
        <Route path="/cosmic" element={<R><CosmicHub /></R>} />
        <Route path="/cosmic/play/:slotId" element={<R><MissionHub /></R>} />
        <Route path="/cosmic/play/:slotId/mission/:missionId" element={<R><MissionBriefing /></R>} />
        <Route path="/cosmic/play/:slotId/mission/:missionId/combat" element={<R><Combat /></R>} />
        {/* Wordplay Hub — 5th game. One app with 13 sub-game routes. */}
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
        {/* Wordplay V2 — 10 new sub-apps. */}
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
        {/* Resources / Beckett's Corner */}
        <Route path="/resources" element={<R><ResourcesHub /></R>} />
        <Route path="/resources/becketts-corner" element={<R><BeckettsCorner /></R>} />
        <Route path="/resources/becketts-corner/ash-care" element={<R><AshCareGuide /></R>} />
        <Route path="/resources/becketts-corner/todo" element={<R><BeckettsTodo /></R>} />
        {/* Beckett's Battle Forge — Three.js 3D combat (Codex renderer) */}
        <Route path="/battleforge" element={<R><BattleForge /></R>} />
        {/* Codex's additions — 13 more wordplay sub-apps + 6 resources + Olympus party */}
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
        {/* Potion Lab — 9th game */}
        <Route path="/potion-lab" element={<R><PotionLabHub /></R>} />
        <Route path="/potion-lab/cauldron" element={<R><PotionLabCauldron /></R>} />
        <Route path="/potion-lab/grimoire" element={<R><PotionLabGrimoire /></R>} />
        <Route path="/potion-lab/shelf" element={<R><PotionLabShelf /></R>} />
        <Route path="/olympus/party" element={<R><OlympusParty /></R>} />
        {/* Olympus mode — separate routing tree, own theme + chrome */}
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
        {/* Baseball FRANCHISE routes — pathless layout route so children
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function LayoutWithBars() {
  // Owner-profile setup is no longer forced on first entry — players land
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
