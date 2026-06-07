// Baseball Versus â€” pitch-by-pitch duel. Player A pitches when their
// team is on defense (top half = A's team batting, bottom half = B's
// team batting). Hidden simultaneous selection per pitch.

import { useEffect, useMemo, useState } from "react";
import { playSfx, unlockAudio } from "../../art";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import type {
  VersusPlayer, BaseballState, PitcherPick, BatterPick, PitchOutcome,
  PitchZone, PitchType, BatType, SwingChoice,
} from "../types";
import { getBaseballTeam } from "../teams";
import { resolvePitch } from "../engine";
import { Handoff } from "../components/Handoff";
import { PickTimer } from "../components/PickTimer";
import { useVersusStats } from "../store";
import { BASEBALL_RPS } from "../../sports/strategic";
import type { MatchStrategicState, GamePlan } from "../../sports/strategic";
import {
  GAME_PLANS, newStrategicMatch, batterToAction, pitcherToAction,
  cpuPickPitcher, cpuPickBatter, tickStrategic, postProcessPitch,
} from "../strategic";
import { PlanPickerScreen, StrategicBars, SignatureButton } from "../components/StrategicUI";

interface Setup {
  sport: "baseball";
  mode: "passplay" | "cpu";
  innings: number;
  pickTimerSec?: number;
  cpuDifficulty?: "easy" | "normal" | "hard";
  playerA: VersusPlayer;
  playerB: VersusPlayer;
}

type Phase =
  | "handoff_planA" | "plan_pickA"
  | "handoff_planB" | "plan_pickB"
  | "handoff_pitcher" | "pitcher_pick"
  | "handoff_batter"  | "batter_pick"
  | "reveal" | "between" | "done";

const PITCHES: { id: PitchType; emoji: string; label: string }[] = [
  { id: "fastball", emoji: "âš¡", label: "Fastball" },
  { id: "curve",    emoji: "ðŸŒ€", label: "Curve" },
  { id: "changeup", emoji: "ðŸ¢", label: "Changeup" },
  { id: "slider",   emoji: "â†—ï¸", label: "Slider" },
];

const ZONES: { id: PitchZone; label: string; row: number; col: number }[] = [
  { id: "high",   label: "HIGH",   row: 0, col: 1 },
  { id: "in",     label: "INSIDE", row: 1, col: 0 },
  { id: "middle", label: "MIDDLE", row: 1, col: 1 },
  { id: "out",    label: "OUTSIDE",row: 1, col: 2 },
  { id: "low",    label: "LOW",    row: 2, col: 1 },
];

const SWINGS: { id: SwingChoice; emoji: string; label: string; flavor: string }[] = [
  { id: "take",    emoji: "ðŸ§˜", label: "Take",    flavor: "Don't swing." },
  { id: "contact", emoji: "ðŸŽ¯", label: "Contact", flavor: "Make contact." },
  { id: "power",   emoji: "ðŸ’¥", label: "Power",   flavor: "Swing for the fence." },
];

const BATS: { id: BatType; label: string; flavor: string }[] = [
  { id: "contact",  label: "CONTACT", flavor: "Better zone read." },
  { id: "balanced", label: "BALANCED",flavor: "Neutral." },
  { id: "power",    label: "POWER",   flavor: "Bigger HRs, more whiffs." },
];

export default function BaseballVersus() {
  const navigate = useNavigate();
  const { recordMatch } = useVersusStats();

  const setup = useMemo<Setup | null>(() => {
    try {
      const raw = sessionStorage.getItem("dd_versus_setup");
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.sport !== "baseball") return null;
      if (s.mode !== "passplay" && s.mode !== "cpu") return null;
      return s as Setup;
    } catch { return null; }
  }, []);

  const [state, setState] = useState<BaseballState>(() => ({
    inning: 0, topHalf: true, outs: 0, balls: 0, strikes: 0,
    bases: [false, false, false], score: [0, 0],
    innings: setup?.innings ?? 3,
  }));
  const [phase, setPhase] = useState<Phase>("handoff_planA");
  const [pitcherPick, setPitcherPick] = useState<PitcherPick | null>(null);
  const [batterPick, setBatterPick] = useState<BatterPick | null>(null);
  // Bats persist per half â€” picked once on each player's first AB.
  const [batA, setBatA] = useState<BatType>("balanced");
  const [batB, setBatB] = useState<BatType>("balanced");
  const [revealOutcome, setRevealOutcome] = useState<PitchOutcome | null>(null);

  // Pick accuracy tracking for stats (was the batter's guess close?).
  const [accuracy, setAccuracy] = useState({ hits: 0, total: 0 });
  const [homersA, setHomersA] = useState(0);
  const [homersB, setHomersB] = useState(0);
  const [recorded, setRecorded] = useState(false);

  // Strategic layer state. planA / planB are picked pre-match. strat
  // holds momentum/stamina/recent-picks. We bump a counter to re-render
  // when the mutable strat object changes in place.
  const [planA, setPlanASt] = useState<GamePlan | null>(null);
  const [planB, setPlanBSt] = useState<GamePlan | null>(null);
  const [strat, setStrat] = useState<MatchStrategicState | null>(null);
  const [, forceStratUpdate] = useState(0);
  const bumpStrat = () => forceStratUpdate(x => x + 1);
  const [aSigArmed, setASigArmed] = useState(false);
  const [bSigArmed, setBSigArmed] = useState(false);
  const isCpu = setup?.mode === "cpu";
  const cpuDifficulty: "easy" | "normal" | "hard" = (setup?.cpuDifficulty ?? "normal") as "easy" | "normal" | "hard";

  // Top-half = A is batting (so A is batter, B is pitcher).
  const isABatting = state.topHalf;
  const batter = isABatting ? setup?.playerA : setup?.playerB;
  const pitcher = isABatting ? setup?.playerB : setup?.playerA;
  const batterTeam = batter ? getBaseballTeam(batter.teamId) : undefined;
  const pitcherTeam = pitcher ? getBaseballTeam(pitcher.teamId) : undefined;

  // Record result once on done.
  useEffect(() => {
    if (phase !== "done" || recorded || !setup) return;
    setRecorded(true);
    const aScore = state.score[0], bScore = state.score[1];
    if (aScore === bScore) return; // ignore ties
    const aWon = aScore > bScore;
    recordMatch({
      sport: "baseball",
      youWon: aWon,
      opponentProfileId: setup.playerB.profileId,
      homersScored: homersA,
      pickAccuracy: accuracy,
    });
    recordMatch({
      sport: "baseball",
      youWon: !aWon,
      opponentProfileId: setup.playerA.profileId,
      homersScored: homersB,
      pickAccuracy: accuracy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recorded]);

  // CPU autopick: when current pick phase belongs to the CPU (player B
  // in cpu mode), wait briefly then auto-lock its pick. CPU = B:
  //   top half = A bats → B pitches → CPU is pitcher
  //   bottom half = B bats → A pitches → CPU is batter
  useEffect(() => {
    if (!isCpu || !setup || !strat) return;
    const cpuIsPitching = state.topHalf;
    const cpuIsBatting  = !state.topHalf;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (phase === "handoff_pitcher" && cpuIsPitching) {
      timer = setTimeout(() => setPhase("pitcher_pick"), 250);
    } else if (phase === "pitcher_pick" && cpuIsPitching) {
      timer = setTimeout(() => {
        const cpuSide = strat.defender;
        const humanSide = strat.attacker;
        const picked = cpuPickPitcher(cpuSide, humanSide, cpuDifficulty);
        if (picked.useSignature && cpuSide.momentum.value >= 100) setBSigArmed(true);
        lockPitcher(picked.pick);
      }, 700);
    } else if (phase === "handoff_batter" && cpuIsBatting) {
      timer = setTimeout(() => setPhase("batter_pick"), 250);
    } else if (phase === "batter_pick" && cpuIsBatting) {
      timer = setTimeout(() => {
        const cpuSide = strat.attacker;
        const humanSide = strat.defender;
        const picked = cpuPickBatter(cpuSide, humanSide, cpuDifficulty);
        if (picked.useSignature && cpuSide.momentum.value >= 100) setBSigArmed(true);
        lockBatter(picked.pick);
      }, 700);
    }
    return () => { if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isCpu, strat, state.topHalf, cpuDifficulty]);

  if (!setup || !batter || !pitcher || !batterTeam || !pitcherTeam) {
    return (
      <NoSetupFallback onBack={() => navigate("/versus")} />
    );
  }

  function lockPlanA(plan: GamePlan) {
    setPlanASt(plan);
    if (isCpu) {
      const cpuPlan = cpuDifficulty === "hard" ? GAME_PLANS.aggressive
                     : cpuDifficulty === "easy" ? GAME_PLANS.defensive
                     : GAME_PLANS.balanced;
      setPlanBSt(cpuPlan);
      setStrat(newStrategicMatch(plan, cpuPlan));
      setPhase("handoff_pitcher");
    } else {
      setPhase("handoff_planB");
    }
  }
  function lockPlanB(plan: GamePlan) {
    setPlanBSt(plan);
    if (planA) {
      setStrat(newStrategicMatch(planA, plan));
      setPhase("handoff_pitcher");
    }
  }

  function lockPitcher(pick: PitcherPick) {
    setPitcherPick(pick);
    setPhase("handoff_batter");
  }

  function lockBatter(pick: BatterPick) {
    setBatterPick(pick);
    const baseOutcome = resolvePitch(pitcherPick!, pick, pitcherTeam!, batterTeam!);

    // Strategic post-process: map picks → RPS actions, run resolver,
    // upgrade/downgrade outcome by the strategic tilt + signatures.
    let finalOutcome = baseOutcome;
    if (strat) {
      const aAction = batterToAction(pick);
      const dAction = pitcherToAction(pitcherPick!);
      const batterIsAOnThisPitch = state.topHalf;
      const aSig = batterIsAOnThisPitch ? aSigArmed : bSigArmed;
      const dSig = batterIsAOnThisPitch ? bSigArmed : aSigArmed;
      const resolved = tickStrategic(BASEBALL_RPS, aAction, dAction, strat, {
        attackerSignature: aSig,
        defenderSignature: dSig,
      });
      finalOutcome = postProcessPitch(baseOutcome, resolved);
      setASigArmed(false);
      setBSigArmed(false);
      bumpStrat();
    }

    setRevealOutcome(finalOutcome);
    if (pick.swing !== "take") {
      setAccuracy(a => ({
        hits: a.hits + (pick.guess === pitcherPick!.zone ? 1 : 0),
        total: a.total + 1,
      }));
    }
    setPhase("reveal");
    setTimeout(() => applyOutcome(finalOutcome), 1400);
  }

  function applyOutcome(o: PitchOutcome) {
    setState(prev => {
      let next: BaseballState = { ...prev, bases: [...prev.bases] as [boolean, boolean, boolean] };
      let halfEnded = false;
      const battingTeamIdx = next.topHalf ? 0 : 1;

      const advanceRunners = (bases: number) => {
        // bases = how many bases each runner advances; batter ends on (bases-1) base.
        let scored = 0;
        const newBases: [boolean, boolean, boolean] = [false, false, false];
        const current: Array<0 | 1 | 2 | 3> = [];
        for (let i = 0; i < 3; i++) if (next.bases[i]) current.push((i + 1) as 1 | 2 | 3);
        // Push existing runners.
        for (const startBase of current) {
          const target = startBase + bases;
          if (target >= 4) scored += 1;
          else newBases[target - 1] = true;
        }
        // Batter onto base = bases-1 zero-indexed.
        if (bases >= 1 && bases <= 3) newBases[bases - 1] = true;
        if (bases >= 4) scored += 1;
        return { newBases, scored };
      };

      const recordOut = () => {
        next.outs += 1;
        if (next.outs >= 3) halfEnded = true;
      };

      switch (o.kind) {
        case "ball":
          next.balls += 1;
          if (next.balls >= 4) {
            const { newBases, scored } = advanceRunners(1);
            next.bases = newBases;
            next.score[battingTeamIdx] += scored;
            next.balls = 0; next.strikes = 0;
            next.lastEvent = "Walk!";
          } else next.lastEvent = `Ball ${next.balls}`;
          break;
        case "strike-looking":
        case "strike-swinging":
          next.strikes += 1;
          if (next.strikes >= 3) {
            recordOut();
            next.balls = 0; next.strikes = 0;
            next.lastEvent = o.kind === "strike-looking" ? "Strikeout looking!" : "Strikeout swinging!";
            playSfx("whistle", { volume: 0.5 });
          } else next.lastEvent = o.kind === "strike-looking" ? "Called strike" : "Swing and miss";
          break;
        case "foul":
          if (next.strikes < 2) next.strikes += 1;
          next.lastEvent = "Foul ball";
          break;
        case "out":
          recordOut();
          next.balls = 0; next.strikes = 0;
          next.lastEvent = o.flavor === "fly" ? "Fly out" : o.flavor === "ground" ? "Ground out" : "Lineout";
          break;
        case "single":
        case "double":
        case "triple": {
          const n = o.kind === "single" ? 1 : o.kind === "double" ? 2 : 3;
          const { newBases, scored } = advanceRunners(n);
          next.bases = newBases;
          next.score[battingTeamIdx] += scored;
          next.balls = 0; next.strikes = 0;
          next.lastEvent = (o.kind[0].toUpperCase() + o.kind.slice(1)) + (scored ? ` â€” ${scored} run${scored > 1 ? "s" : ""}!` : "!");
          playSfx("impactHit", { volume: 0.7 });
          if (scored) playSfx("crowdCheer", { volume: 0.5 });
          break;
        }
        case "homer": {
          // All runners + batter score.
          let scored = 1;
          for (let i = 0; i < 3; i++) if (next.bases[i]) scored += 1;
          next.score[battingTeamIdx] += scored;
          next.bases = [false, false, false];
          next.balls = 0; next.strikes = 0;
          next.lastEvent = `ðŸš€ HOME RUN! ${scored} runs!`;
          playSfx("crowdCheer", { volume: 0.7 });
          playSfx("ding", { volume: 0.7, pitch: 1.6 });
          if (battingTeamIdx === 0) setHomersA(h => h + 1); else setHomersB(h => h + 1);
          break;
        }
        case "hbp": {
          const { newBases, scored } = advanceRunners(1);
          next.bases = newBases;
          next.score[battingTeamIdx] += scored;
          next.balls = 0; next.strikes = 0;
          next.lastEvent = "Hit by pitch!";
          break;
        }
      }

      if (halfEnded) {
        if (!next.topHalf) {
          // End of inning.
          next.inning += 1;
          next.topHalf = true;
        } else {
          next.topHalf = false;
        }
        next.outs = 0;
        next.balls = 0;
        next.strikes = 0;
        next.bases = [false, false, false];
      }
      return next;
    });

    // Clear picks for the next pitch.
    setPitcherPick(null);
    setBatterPick(null);
    setRevealOutcome(null);

    setTimeout(() => {
      setState(curState => {
        // Decide what's next based on the just-updated state.
        if (curState.inning >= curState.innings && !curState.topHalf && curState.outs === 0 && curState.balls === 0 && curState.strikes === 0) {
          setPhase("done");
        } else {
          setPhase("handoff_pitcher");
        }
        return curState;
      });
    }, 900);
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const headerSummary = `${batterTeam.abbr} ${state.score[0]}  Â·  ${pitcherTeam.abbr} ${state.score[1]}`;
  const batterIsA = isABatting;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          `radial-gradient(900px 600px at 50% 0%, ${batterTeam.primary}22, transparent 60%), ` +
          "linear-gradient(180deg, #0a0a14 0%, #050308 100%)",
      }}>
      {/* Stadium scene â€” tiled grass with vignette at the bottom */}
      <div aria-hidden="true" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, height: 220, zIndex: 0,
        pointerEvents: "none",
        backgroundImage: `url("/assets/kenney/sports-pack/Tilesheet/groundGrass_mown.png")`,
        backgroundRepeat: "repeat",
        backgroundSize: "64px 64px",
        imageRendering: "pixelated",
        opacity: 0.32,
        maskImage: "linear-gradient(to top, black 30%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to top, black 30%, transparent 100%)",
      }} />
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/versus")} aria-label="Quit match"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fbbf24" }}>BASEBALL VERSUS</div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>{headerSummary}</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-3">
        <Scoreboard state={state}
          aLabel={setup.playerA.profileName} aTeam={batterTeam.abbr}
          bLabel={setup.playerB.profileName} bTeam={pitcherTeam.abbr}
          batterIsA={batterIsA} />

        {/* Plan pick A */}
        {phase === "plan_pickA" && setup && (
          <PlanPickerScreen
            whoseName={setup.playerA.profileName}
            whoseColor={setup.playerA.profileColor}
            prompt="Your team's game plan for the match."
            onLock={lockPlanA}
          />
        )}
        {phase === "plan_pickB" && setup && !isCpu && (
          <PlanPickerScreen
            whoseName={setup.playerB.profileName}
            whoseColor={setup.playerB.profileColor}
            prompt="Your team's game plan."
            onLock={lockPlanB}
          />
        )}

        {/* Strategic bars during gameplay */}
        {strat && phase !== "plan_pickA" && phase !== "plan_pickB" && phase !== "handoff_planA" && phase !== "handoff_planB" && setup && (
          <StrategicBars
            aLabel={setup.playerA.profileName + (state.topHalf ? " BAT" : " PIT")}
            aColor={setup.playerA.profileColor}
            aMomentum={state.topHalf ? strat.attacker.momentum.value : strat.defender.momentum.value}
            aStamina={state.topHalf ? strat.attacker.stamina.value : strat.defender.stamina.value}
            bLabel={setup.playerB.profileName + (state.topHalf ? " PIT" : " BAT")}
            bColor={setup.playerB.profileColor}
            bMomentum={state.topHalf ? strat.defender.momentum.value : strat.attacker.momentum.value}
            bStamina={state.topHalf ? strat.defender.stamina.value : strat.attacker.stamina.value}
          />
        )}

        {/* Signature button — batter side, human players only */}
        {phase === "batter_pick" && strat && setup && (() => {
          const batterIsA = state.topHalf;
          const batterIsCpu = isCpu && !batterIsA;
          if (batterIsCpu) return null;
          const m = strat.attacker.momentum.value;
          if (m < 100) return null;
          const armed = batterIsA ? aSigArmed : bSigArmed;
          return (
            <SignatureButton
              ready={true}
              armed={armed}
              label="GRAND-SLAM SWING"
              flavor="Power swing with a tilt boost this pitch."
              color="#fde047"
              onToggle={() => batterIsA ? setASigArmed(v => !v) : setBSigArmed(v => !v)}
            />
          );
        })()}

        {/* Pitcher pick */}
        {phase === "pitcher_pick" && (
          <PitcherPickScreen
            pitcherName={pitcher.profileName}
            pitcherColor={pitcher.profileColor}
            onLock={lockPitcher}
            pickTimerSec={setup.pickTimerSec}
            resetKey={`p_${state.inning}_${state.topHalf}_${state.outs}_${state.balls}_${state.strikes}`}
          />
        )}

        {/* Batter pick */}
        {phase === "batter_pick" && (
          <BatterPickScreen
            batterName={batter.profileName}
            batterColor={batter.profileColor}
            currentBat={batterIsA ? batA : batB}
            onChangeBat={b => batterIsA ? setBatA(b) : setBatB(b)}
            onLock={lockBatter}
            pickTimerSec={setup.pickTimerSec}
            resetKey={`b_${state.inning}_${state.topHalf}_${state.outs}_${state.balls}_${state.strikes}`}
          />
        )}

        {/* Reveal */}
        {phase === "reveal" && pitcherPick && batterPick && revealOutcome && (
          <RevealCard
            pitcherPick={pitcherPick}
            batterPick={batterPick}
            outcome={revealOutcome}
          />
        )}

        {/* Done modal */}
        {phase === "done" && (
          <FinalCard state={state}
            aName={setup.playerA.profileName} aTeam={batterTeam.abbr}
            bName={setup.playerB.profileName} bTeam={pitcherTeam.abbr}
            onPlayAgain={() => {
              // Same setup, fresh match. Re-write sessionStorage so the
              // game page picks it up cleanly on remount.
              try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(setup)); } catch {}
              location.reload();
            }}
            onSwitchSides={() => {
              const swapped = { ...setup, playerA: setup.playerB, playerB: setup.playerA };
              try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(swapped)); } catch {}
              location.reload();
            }}
            onHome={() => navigate("/versus")}
          />
        )}
      </main>

      {/* Handoffs */}
      <AnimatePresence>
        {phase === "handoff_planA" && setup && (
          <Handoff
            toName={setup.playerA.profileName}
            toColor={setup.playerA.profileColor}
            prompt="Pick your team's game plan — pre-match strategy."
            onReady={() => setPhase("plan_pickA")}
          />
        )}
        {phase === "handoff_planB" && setup && !isCpu && (
          <Handoff
            toName={setup.playerB.profileName}
            toColor={setup.playerB.profileColor}
            prompt="Pick your team's game plan — pre-match strategy."
            onReady={() => setPhase("plan_pickB")}
          />
        )}
        {phase === "handoff_pitcher" && !(isCpu && state.topHalf) && (
          <Handoff
            toName={pitcher.profileName}
            toColor={pitcher.profileColor}
            prompt="Pick your pitch and where to throw it â€” keep it hidden!"
            onReady={() => setPhase("pitcher_pick")}
          />
        )}
        {phase === "handoff_batter" && !(isCpu && !state.topHalf) && (
          <Handoff
            toName={batter.profileName}
            toColor={batter.profileColor}
            prompt="Pick your swing and guess the zone â€” your call!"
            onReady={() => setPhase("batter_pick")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Scoreboard({ state, aLabel, aTeam, bLabel, bTeam, batterIsA }: {
  state: BaseballState; aLabel: string; aTeam: string; bLabel: string; bTeam: string; batterIsA: boolean;
}) {
  return (
    <section className="rounded-2xl p-3"
      style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div className="flex items-center justify-between gap-2">
        <ScoreCell label={aLabel} team={aTeam} score={state.score[0]} active={batterIsA} />
        <div className="text-center">
          <div className="text-[9px] tracking-[0.3em]" style={{ color: "#fbbf24" }}>
            INN {state.inning + 1}{state.topHalf ? " â–²" : " â–¼"} Â· {state.outs} OUT
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(229,231,235,0.85)" }}>
            {state.balls}-{state.strikes}
          </div>
          <BaseDiamond bases={state.bases} />
        </div>
        <ScoreCell label={bLabel} team={bTeam} score={state.score[1]} active={!batterIsA} />
      </div>
      {state.lastEvent && (
        <div className="text-[11px] text-center mt-2 italic" style={{ color: "#fde047" }}>
          {state.lastEvent}
        </div>
      )}
    </section>
  );
}

function ScoreCell({ label, team, score, active }: { label: string; team: string; score: number; active: boolean }) {
  return (
    <div className="text-center" style={{ opacity: active ? 1 : 0.7 }}>
      <div className="text-[9px] tracking-widest" style={{ color: active ? "#86efac" : "#9aa6bf" }}>
        {active ? "AT BAT" : "PITCHING"}
      </div>
      <div className="font-display text-base" style={{ color: "#fef3c7" }}>{label}</div>
      <div className="text-[10px] opacity-70">{team}</div>
      <div className="font-display text-3xl mt-1" style={{ color: "#fde047" }}>{score}</div>
    </div>
  );
}

function BaseDiamond({ bases }: { bases: [boolean, boolean, boolean] }) {
  // Visual: 2nd at top, 3rd left, 1st right, home at bottom.
  return (
    <svg width="48" height="48" viewBox="-24 -24 48 48" aria-hidden="true" className="mx-auto mt-1">
      <rect x="-6" y="-22" width="12" height="12" transform="rotate(45 0 -16)" fill={bases[1] ? "#fde047" : "rgba(255,255,255,0.15)"} stroke="#fef3c7" strokeWidth="1" />
      <rect x="-22" y="-6" width="12" height="12" transform="rotate(45 -16 0)" fill={bases[2] ? "#fde047" : "rgba(255,255,255,0.15)"} stroke="#fef3c7" strokeWidth="1" />
      <rect x="10" y="-6" width="12" height="12" transform="rotate(45 16 0)" fill={bases[0] ? "#fde047" : "rgba(255,255,255,0.15)"} stroke="#fef3c7" strokeWidth="1" />
      <rect x="-5" y="10" width="10" height="10" transform="rotate(45 0 15)" fill="#fef3c7" />
    </svg>
  );
}

function PitcherPickScreen({ pitcherName, pitcherColor, onLock, pickTimerSec, resetKey }: {
  pitcherName: string; pitcherColor: string; onLock: (p: PitcherPick) => void;
  pickTimerSec?: number;
  resetKey: string | number;
}) {
  const [pitch, setPitch] = useState<PitchType>("fastball");
  const [zone, setZone] = useState<PitchZone>("middle");
  const [intentional, setIntentional] = useState(false);
  // Reset selection state on each new pitch so the previous values
  // don't leak through.
  useEffect(() => { setPitch("fastball"); setZone("middle"); setIntentional(false); }, [resetKey]);
  return (
    <section className="rounded-2xl p-3"
      style={{
        background: `linear-gradient(135deg, ${pitcherColor}22, rgba(10,10,20,0.95))`,
        border: `1.5px solid ${pitcherColor}`,
      }}>
      {pickTimerSec && pickTimerSec > 0 && (
        <PickTimer durationSec={pickTimerSec} resetKey={resetKey}
          onExpire={() => onLock({ pitch, zone, intentionalBall: intentional })} />
      )}
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: pitcherColor }}>{pitcherName.toUpperCase()} Â· PITCHING</div>
      <div className="text-[10px] mb-1.5" style={{ color: "rgba(229,231,235,0.7)" }}>PITCH TYPE</div>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {PITCHES.map(p => (
          <button key={p.id} onClick={() => setPitch(p.id)}
            className="rounded-lg p-2 pressable touch-target"
            style={{
              background: pitch === p.id ? `${pitcherColor}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${pitch === p.id ? pitcherColor : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="text-xl">{p.emoji}</div>
            <div className="text-[9px] tracking-widest font-display mt-0.5" style={{ color: "#fef3c7" }}>{p.label}</div>
          </button>
        ))}
      </div>

      <div className="text-[10px] mb-1.5" style={{ color: "rgba(229,231,235,0.7)" }}>LOCATION</div>
      <div className="grid grid-cols-3 gap-1 mb-2 max-w-[200px] mx-auto" style={{ aspectRatio: "1/1" }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const row = Math.floor(i / 3), col = i % 3;
          const z = ZONES.find(zz => zz.row === row && zz.col === col);
          if (!z) return <div key={i} />;
          const sel = zone === z.id && !intentional;
          return (
            <button key={i} onClick={() => { setZone(z.id); setIntentional(false); }}
              className="rounded pressable touch-target"
              style={{
                background: sel ? pitcherColor : "rgba(255,255,255,0.06)",
                border: `1px solid ${sel ? pitcherColor : "rgba(255,255,255,0.18)"}`,
                color: sel ? "#0a0a14" : "#fef3c7",
                fontSize: 9,
                aspectRatio: "1/1",
              }}>{z.label}</button>
          );
        })}
      </div>
      <button onClick={() => setIntentional(v => !v)}
        className="w-full mt-1.5 px-3 py-2 rounded-full text-[10px] tracking-widest pressable touch-target"
        style={{
          background: intentional ? "#fbbf24" : "rgba(255,255,255,0.05)",
          color: intentional ? "#0a0a14" : "#fef3c7",
          border: `1px solid ${intentional ? "#fbbf24" : "rgba(255,255,255,0.12)"}`,
        }}>
        {intentional ? "ðŸš« INTENTIONAL BALL Â· ON" : "Pitch outside the zone? Tap for intentional ball"}
      </button>

      <button onClick={() => onLock({ pitch, zone, intentionalBall: intentional })}
        className="w-full mt-3 py-3 rounded-xl pressable touch-target font-display tracking-widest text-[13px]"
        style={{ background: pitcherColor, color: "#0a0a14", minHeight: 52 }}>
        ðŸ”’ LOCK PITCH
      </button>
    </section>
  );
}

function BatterPickScreen({ batterName, batterColor, currentBat, onChangeBat, onLock, pickTimerSec, resetKey }: {
  batterName: string; batterColor: string; currentBat: BatType;
  onChangeBat: (b: BatType) => void;
  onLock: (p: BatterPick) => void;
  pickTimerSec?: number;
  resetKey: string | number;
}) {
  const [swing, setSwing] = useState<SwingChoice>("contact");
  const [guess, setGuess] = useState<PitchZone>("middle");
  useEffect(() => { setSwing("contact"); setGuess("middle"); }, [resetKey]);
  return (
    <section className="rounded-2xl p-3"
      style={{
        background: `linear-gradient(135deg, ${batterColor}22, rgba(10,10,20,0.95))`,
        border: `1.5px solid ${batterColor}`,
      }}>
      {pickTimerSec && pickTimerSec > 0 && (
        <PickTimer durationSec={pickTimerSec} resetKey={resetKey}
          onExpire={() => onLock({ swing, guess, bat: currentBat })} />
      )}
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: batterColor }}>{batterName.toUpperCase()} Â· AT BAT</div>

      <div className="text-[10px] mb-1.5" style={{ color: "rgba(229,231,235,0.7)" }}>BAT</div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {BATS.map(b => (
          <button key={b.id} onClick={() => onChangeBat(b.id)}
            className="rounded-lg p-2 pressable touch-target text-center"
            style={{
              background: currentBat === b.id ? `${batterColor}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${currentBat === b.id ? batterColor : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="text-[10px] tracking-widest font-display" style={{ color: "#fef3c7" }}>{b.label}</div>
            <div className="text-[9px] mt-0.5 opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>{b.flavor}</div>
          </button>
        ))}
      </div>

      <div className="text-[10px] mb-1.5" style={{ color: "rgba(229,231,235,0.7)" }}>SWING</div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {SWINGS.map(s => (
          <button key={s.id} onClick={() => setSwing(s.id)}
            className="rounded-lg p-2 pressable touch-target"
            style={{
              background: swing === s.id ? `${batterColor}33` : "rgba(255,255,255,0.04)",
              border: `1px solid ${swing === s.id ? batterColor : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="text-xl">{s.emoji}</div>
            <div className="text-[10px] tracking-widest font-display mt-0.5" style={{ color: "#fef3c7" }}>{s.label}</div>
            <div className="text-[9px] mt-0.5 opacity-75" style={{ color: "rgba(229,231,235,0.7)" }}>{s.flavor}</div>
          </button>
        ))}
      </div>

      {swing !== "take" && (
        <>
          <div className="text-[10px] mb-1.5" style={{ color: "rgba(229,231,235,0.7)" }}>GUESS WHERE THE PITCH IS GOING</div>
          <div className="grid grid-cols-3 gap-1 mb-3 max-w-[200px] mx-auto" style={{ aspectRatio: "1/1" }}>
            {Array.from({ length: 9 }).map((_, i) => {
              const row = Math.floor(i / 3), col = i % 3;
              const z = ZONES.find(zz => zz.row === row && zz.col === col);
              if (!z) return <div key={i} />;
              const sel = guess === z.id;
              return (
                <button key={i} onClick={() => setGuess(z.id)}
                  className="rounded pressable touch-target"
                  style={{
                    background: sel ? batterColor : "rgba(255,255,255,0.06)",
                    border: `1px solid ${sel ? batterColor : "rgba(255,255,255,0.18)"}`,
                    color: sel ? "#0a0a14" : "#fef3c7",
                    fontSize: 9,
                    aspectRatio: "1/1",
                  }}>{z.label}</button>
              );
            })}
          </div>
        </>
      )}

      <button onClick={() => onLock({ swing, guess, bat: currentBat })}
        className="w-full mt-1 py-3 rounded-xl pressable touch-target font-display tracking-widest text-[13px]"
        style={{ background: batterColor, color: "#0a0a14", minHeight: 52 }}>
        ðŸ”’ LOCK SWING
      </button>
    </section>
  );
}

function RevealCard({ pitcherPick, batterPick, outcome }: {
  pitcherPick: PitcherPick; batterPick: BatterPick; outcome: PitchOutcome;
}) {
  const big = outcome.kind === "homer" || outcome.kind === "triple" || outcome.kind === "double";
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-4 text-center"
      style={{
        background: big
          ? "linear-gradient(135deg, rgba(253,224,71,0.18), rgba(10,10,20,0.95))"
          : "rgba(0,0,0,0.55)",
        border: `1.5px solid ${big ? "#fde047" : "rgba(255,255,255,0.15)"}`,
        boxShadow: big ? "0 0 30px rgba(253,224,71,0.4)" : undefined,
      }}>
      <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "#fde047" }}>REVEAL!</div>
      <div className="grid grid-cols-2 gap-3 text-[12px] mb-2">
        <div>
          <div className="text-[9px] tracking-widest" style={{ color: "#fca5a5" }}>PITCHER THREW</div>
          <div style={{ color: "#fef3c7" }}>
            {PITCHES.find(p => p.id === pitcherPick.pitch)?.emoji} {pitcherPick.pitch} Â·
            {pitcherPick.intentionalBall ? " ðŸš« outside" : ` ${pitcherPick.zone}`}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-widest" style={{ color: "#86efac" }}>BATTER PICKED</div>
          <div style={{ color: "#fef3c7" }}>
            {SWINGS.find(s => s.id === batterPick.swing)?.emoji} {batterPick.swing}
            {batterPick.swing !== "take" && ` Â· ${batterPick.guess}`}
          </div>
        </div>
      </div>
      <motion.div
        initial={{ scale: 0.7 }} animate={{ scale: 1 }}
        className="font-display text-2xl tracking-wider mt-2"
        style={{ color: big ? "#fde047" : "#fef3c7" }}>
        {outcomeLabel(outcome)}
      </motion.div>
    </motion.section>
  );
}

function outcomeLabel(o: PitchOutcome): string {
  switch (o.kind) {
    case "ball": return "BALL";
    case "strike-looking": return "STRIKE (looking)";
    case "strike-swinging": return "STRIKE (swinging!)";
    case "foul": return "FOUL";
    case "out": return o.flavor === "fly" ? "FLY OUT" : o.flavor === "ground" ? "GROUND OUT" : "LINEOUT";
    case "single": return "SINGLE!";
    case "double": return "DOUBLE!";
    case "triple": return "TRIPLE!";
    case "homer": return "ðŸš€ HOME RUN!";
    case "hbp": return "HIT BY PITCH";
  }
}

function FinalCard({ state, aName, aTeam, bName, bTeam, onPlayAgain, onSwitchSides, onHome }: {
  state: BaseballState; aName: string; aTeam: string; bName: string; bTeam: string;
  onPlayAgain: () => void; onSwitchSides: () => void; onHome: () => void;
}) {
  const tied = state.score[0] === state.score[1];
  const aWon = state.score[0] > state.score[1];
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 text-center"
      style={{
        background: "linear-gradient(135deg, rgba(253,224,71,0.18), rgba(10,10,20,0.95))",
        border: "2px solid #fde047",
      }}>
      <Trophy size={32} style={{ color: "#fde047", margin: "0 auto" }} />
      <div className="font-display text-2xl tracking-wider mt-2" style={{ color: "#fde047" }}>
        {tied ? "TIE GAME" : `${aWon ? aName : bName} WINS!`}
      </div>
      <div className="text-[14px] mt-1" style={{ color: "#fef3c7" }}>
        {aTeam} {state.score[0]} â€” {state.score[1]} {bTeam}
      </div>
      <div className="flex gap-2 justify-center mt-4 flex-wrap">
        <button onClick={onPlayAgain}
          className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "#fde047", color: "#0a0a14" }}>
          ðŸ” REMATCH
        </button>
        <button onClick={onSwitchSides}
          className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "rgba(167,139,250,0.30)", border: "1px solid #a78bfa", color: "#a78bfa" }}>
          ðŸ”„ SWITCH SIDES
        </button>
        <button onClick={onHome}
          className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
          HOME
        </button>
      </div>
    </motion.section>
  );
}

function NoSetupFallback({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center"
      style={{ background: "#050308", color: "#fef3c7" }}>
      <div>
        <div className="font-display text-lg mb-2" style={{ color: "#fde047" }}>No match set up.</div>
        <button onClick={onBack}
          className="px-4 py-2 rounded-full"
          style={{ background: "#fbbf24", color: "#0a0a14" }}>
          Pick teams & players
        </button>
      </div>
    </div>
  );
}
