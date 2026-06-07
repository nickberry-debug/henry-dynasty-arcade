// Wrestling Versus — pass-and-play wrestling match plugged into the
// same Sports Versus pre-match / handoff / pick / reveal loop that
// baseball / football / boxing use. Architecturally identical to
// BoxingVersus.tsx so the family experience is consistent.
//
// Phase ladder:
//   handoff_planA → plan_pickA → handoff_planB → plan_pickB →
//   handoff_attack → attack_pick → handoff_defend → defend_pick →
//   reveal → between → (next decision) → … → finisher_intro →
//   pin_attempt OR submission_attempt → done
//
// Active player picks STRIKE / GRAPPLE / ROPE / TAUNT (or the
// FINISHER button when hype is full). Passive picks
// COUNTER-STRIKE / COUNTER-GRAPPLE / REVERSAL. Engine resolves +
// damage / hype updates / kick-out window if a finisher lands.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import type { VersusPlayer } from "../types";
import { Handoff } from "../components/Handoff";
import { useVersusStats } from "../store";
import { PlanPickerScreen, StrategicBars } from "../components/StrategicUI";
import type { GamePlan, PlanId } from "../../sports/strategic";
import { GAME_PLANS } from "../../sports/strategic";

import {
  newMatch, applyDecision, advancePhase, resolvePin, resolveSubmission, cpuDecide,
  HP_MAX, HYPE_MAX, HYPE_FOR_FINISHER, PIN_KICKOUT_WINDOW_MS, SUBMISSION_ESCAPE_MS,
  type MatchState, type PlayerDecision,
} from "../../combat-sports/wrestling/engine";
import {
  ATTACK_META, DEFENSE_META,
  type AttackId, type DefenseId,
} from "../../combat-sports/wrestling/rps";
import { wrestlerById, WRESTLERS } from "../../combat-sports/wrestling/wrestlers";
import { drawProceduralWrestler, DEST_W, DEST_H } from "../../combat-sports/wrestling/proceduralWrestler";
import type { WrestlerStateId } from "../../combat-sports/wrestling/wrestlerState";
import { RosterSelectScreen } from "../components/RosterSelectScreen";
import {
  loadActiveCampaign, advanceCampaign, restartCurrent,
  flavorForCurrent, isFinalMatchOfCampaign,
} from "../campaign";

/** Phase 4 feature flag — wire RosterSelectScreen as the in-versus roster picker.
 *  Set to false to fall back to the hub-side PlayerPickerCard team-row pick. */
const USE_ROSTER_SELECT = true;

interface Setup {
  sport: "wrestling";
  mode: "passplay" | "cpu";
  pickTimerSec?: number;
  cpuDifficulty?: "easy" | "normal" | "hard";
  playerA: VersusPlayer;
  playerB: VersusPlayer;
}

type Phase =
  | "campaign_intro"
  | "handoff_rosterA" | "roster_pickA"
  | "handoff_rosterB" | "roster_pickB"
  | "handoff_planA" | "plan_pickA"
  | "handoff_planB" | "plan_pickB"
  | "handoff_attack" | "attack_pick"
  | "handoff_defend" | "defend_pick"
  | "reveal" | "finisher_intro" | "pin_attempt" | "submission_attempt" | "done";

const ATTACKS: AttackId[] = ["strike", "grapple", "rope", "taunt"];
const DEFENSES: DefenseId[] = ["counter_strike", "counter_grapple", "reversal"];

export default function WrestlingVersus() {
  const navigate = useNavigate();
  const { recordMatch } = useVersusStats();

  const setup = useMemo<Setup | null>(() => {
    try {
      const raw = sessionStorage.getItem("dd_versus_setup");
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.sport !== "wrestling") return null;
      if (s.mode !== "passplay" && s.mode !== "cpu") return null;
      return s as Setup;
    } catch { return null; }
  }, []);

  // Active campaign (championship / story) if any.
  const campaign = useMemo(() => loadActiveCampaign("wrestling"), []);

  const [fighterIdA, setFighterIdA] = useState<string>(setup?.playerA.teamId ?? WRESTLERS[0].id);
  const [fighterIdB, setFighterIdB] = useState<string>(
    (campaign && campaign.sport === "wrestling")
      ? (campaign.opponents[campaign.currentIdx] ?? setup?.playerB.teamId ?? WRESTLERS[1].id)
      : (setup?.playerB.teamId ?? WRESTLERS[1].id)
  );
  const wrestlerA = wrestlerById(fighterIdA);
  const wrestlerB = wrestlerById(fighterIdB);

  const initialPhase: Phase =
    campaign && campaign.sport === "wrestling" ? "campaign_intro"
    : USE_ROSTER_SELECT ? "handoff_rosterA"
    : "handoff_planA";

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [planA, setPlanA] = useState<GamePlan | null>(null);
  const [planB, setPlanB] = useState<GamePlan | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [pendingAttack, setPendingAttack] = useState<{ attack: AttackId; attemptFinisher: boolean } | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [finishersA, setFinishersA] = useState(0);
  const [finishersB, setFinishersB] = useState(0);
  // Mash-tap count for kick-out window.
  const [kickoutTaps, setKickoutTaps] = useState(0);
  // Tap count for submission escape.
  const [escapeTaps, setEscapeTaps] = useState(0);

  const isCpu = setup?.mode === "cpu";
  const cpuDifficulty: "easy" | "normal" | "hard" = (setup?.cpuDifficulty ?? "normal") as "easy" | "normal" | "hard";

  // ── Roster lock-ins ────────────────────────────────────────────────
  function pickRandomCpuWrestler(excludeId: string): string {
    const pool = WRESTLERS.filter(w => w.id !== excludeId);
    return pool[Math.floor(Math.random() * pool.length)].id;
  }
  function lockRosterA(fighterId: string) {
    setFighterIdA(fighterId);
    if (isCpu) {
      if (campaign && campaign.sport === "wrestling") {
        setPhase("handoff_planA");
      } else {
        setFighterIdB(pickRandomCpuWrestler(fighterId));
        setPhase("handoff_planA");
      }
    } else {
      setPhase("handoff_rosterB");
    }
  }
  function lockRosterB(fighterId: string) {
    setFighterIdB(fighterId);
    setPhase("handoff_planA");
  }

  // ── Plan lock-ins → start match ────────────────────────────────────
  function lockPlanA(plan: GamePlan) {
    setPlanA(plan);
    if (isCpu) {
      const cpuPlanId: PlanId = cpuDifficulty === "hard" ? "aggressive"
        : cpuDifficulty === "easy" ? "defensive" : "balanced";
      setPlanB(GAME_PLANS[cpuPlanId]);
      startMatch(plan.id, cpuPlanId);
    } else {
      setPhase("handoff_planB");
    }
  }
  function lockPlanB(plan: GamePlan) {
    setPlanB(plan);
    if (planA) startMatch(planA.id, plan.id);
  }
  function startMatch(redPlan: PlanId, bluePlan: PlanId) {
    if (!wrestlerA || !wrestlerB) return;
    const m = newMatch(wrestlerA, redPlan, wrestlerB, bluePlan);
    m.phase = "decision";
    setMatch(m);
    setPhase("handoff_attack");
  }

  // ── Campaign intro auto-advance ────────────────────────────────────
  useEffect(() => {
    if (phase !== "campaign_intro" || !campaign) return;
    const isFirst = campaign.currentIdx === 0 && !campaign.playerFighterId;
    const t = setTimeout(() => {
      if (isFirst) setPhase(USE_ROSTER_SELECT ? "handoff_rosterA" : "handoff_planA");
      else {
        if (campaign.playerFighterId) setFighterIdA(campaign.playerFighterId);
        setPhase("handoff_planA");
      }
    }, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, campaign]);

  // ── CPU autopick (CPU = B = blue corner) ───────────────────────────
  useEffect(() => {
    if (!isCpu || !match) return;
    if (match.phase === "matchEnd") return;
    const cpuIsActive = match.activeIdx === 1;
    const cpuIsPassive = match.activeIdx === 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (cpuIsActive && phase === "handoff_attack") {
      t = setTimeout(() => setPhase("attack_pick"), 300);
    } else if (cpuIsActive && phase === "attack_pick") {
      t = setTimeout(() => {
        const dec = cpuDecide(match, 1, cpuDifficulty);
        if (dec.attemptFinisher) commitActive("strike", true);
        else if (dec.attack === "taunt") commitTauntDirect();
        else commitActive(dec.attack ?? "strike", false);
      }, 700);
    } else if (cpuIsPassive && phase === "handoff_defend") {
      t = setTimeout(() => setPhase("defend_pick"), 300);
    } else if (cpuIsPassive && phase === "defend_pick" && pendingAttack) {
      t = setTimeout(() => {
        const dec = cpuDecide(match, 1, cpuDifficulty);
        commitDecision({ ...pendingAttack, defense: dec.defense ?? "counter_strike" });
      }, 700);
    } else if (cpuIsPassive && phase === "pin_attempt") {
      // CPU has a chance to kick out, weighted by difficulty.
      const odds = cpuDifficulty === "hard" ? 0.55 : cpuDifficulty === "normal" ? 0.35 : 0.18;
      const cpuKicksOut = Math.random() < odds;
      t = setTimeout(() => finalizePin(cpuKicksOut), PIN_KICKOUT_WINDOW_MS - 100);
    } else if (cpuIsPassive && phase === "submission_attempt") {
      const odds = cpuDifficulty === "hard" ? 0.50 : cpuDifficulty === "normal" ? 0.30 : 0.15;
      const cpuEscapes = Math.random() < odds;
      t = setTimeout(() => finalizeSubmission(cpuEscapes), SUBMISSION_ESCAPE_MS - 100);
    }
    return () => { if (t) clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isCpu, match, pendingAttack, cpuDifficulty]);

  // ── Pin / submission auto-finalize on window expiry ────────────────
  useEffect(() => {
    if (!match) return;
    if (phase !== "pin_attempt" && phase !== "submission_attempt") return;
    // For human-side waiting OR active-CPU side waiting, we rely on
    // explicit tap or the CPU-side timer above. Here we add a safety
    // timeout so the game never softlocks if no one taps.
    const windowMs = phase === "pin_attempt" ? PIN_KICKOUT_WINDOW_MS : SUBMISSION_ESCAPE_MS;
    const t = setTimeout(() => {
      if (phase === "pin_attempt") finalizePin(false);
      else finalizeSubmission(false);
    }, windowMs + 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Active player attack lock-in ───────────────────────────────────
  function commitActive(attack: AttackId, attemptFinisher: boolean) {
    setPendingAttack({ attack, attemptFinisher });
    setPhase("handoff_defend");
  }
  function commitTauntDirect() {
    // Taunt skips the defender pick — engine handles the free strike.
    if (!match) return;
    const next = structuredClone(match);
    applyDecision(next, { attack: "taunt" });
    setMatch(next);
    setPendingAttack(null);
    setPhase("reveal");
    setTimeout(() => {
      const after = structuredClone(next);
      advancePhase(after);
      setMatch(after);
      if (after.phase === "matchEnd") setPhase("done");
      else setPhase("handoff_attack");
    }, 1400);
  }

  // ── Passive player defense lock-in → resolve ───────────────────────
  function commitDecision(decision: PlayerDecision) {
    if (!match) return;
    const next = structuredClone(match);
    applyDecision(next, decision);
    setMatch(next);
    setPendingAttack(null);
    setPhase("reveal");

    // Stat counters.
    if (next.lastResolve?.finisher) {
      if (next.activeIdx === 0) setFinishersA(k => k + 1);
      else setFinishersB(k => k + 1);
    }

    setTimeout(() => {
      const after = structuredClone(next);
      // Engine sets phase="finisher_intro" on a landed finisher and
      // phase="submission_attempt" on a triggered submission. Otherwise
      // advancePhase reverts to "decision".
      if (after.phase === "matchEnd") {
        setMatch(after);
        setPhase("done");
        return;
      }
      if (after.phase === "finisher_intro") {
        setMatch(after);
        setPhase("finisher_intro");
        // Short pause for cinematic, then the kick-out window opens.
        setTimeout(() => {
          const next2 = structuredClone(after);
          advancePhase(next2);
          setMatch(next2);
          setKickoutTaps(0);
          setPhase("pin_attempt");
        }, 1100);
        return;
      }
      if (after.phase === "submission_attempt") {
        setMatch(after);
        setEscapeTaps(0);
        setPhase("submission_attempt");
        return;
      }
      advancePhase(after);
      setMatch(after);
      // advancePhase mutates after.phase; cast to break the stale TS
      // narrowing from the earlier === checks (which returned).
      if ((after.phase as string) === "matchEnd") setPhase("done");
      else setPhase("handoff_attack");
    }, 1400);
  }

  // ── Pin / submission resolution ────────────────────────────────────
  function finalizePin(kickedOut: boolean) {
    if (!match) return;
    const next = structuredClone(match);
    resolvePin(next, kickedOut);
    setMatch(next);
    if (next.phase === "matchEnd") setPhase("done");
    else setPhase("handoff_attack");
  }
  function finalizeSubmission(escaped: boolean) {
    if (!match) return;
    const next = structuredClone(match);
    resolveSubmission(next, escaped);
    setMatch(next);
    if (next.phase === "matchEnd") setPhase("done");
    else setPhase("handoff_attack");
  }

  // ── Stats record on done ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== "done" || recorded || !setup || !match) return;
    setRecorded(true);
    const winnerIdx = match.winnerIdx;
    if (winnerIdx === -1 || winnerIdx === undefined) return;
    const aWon = winnerIdx === 0;
    recordMatch({
      sport: "wrestling", youWon: aWon,
      opponentProfileId: setup.playerB.profileId,
      finishersScored: finishersA,
    });
    recordMatch({
      sport: "wrestling", youWon: !aWon,
      opponentProfileId: setup.playerA.profileId,
      finishersScored: finishersB,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recorded]);

  // ── Campaign progression on match end ──────────────────────────────
  function onCampaignContinue() {
    if (!campaign || !setup) return;
    if (!campaign.playerFighterId) campaign.playerFighterId = fighterIdA;
    const playerWon = match?.winnerIdx === 0;
    if (playerWon) {
      const next = advanceCampaign(campaign);
      if (!next) {
        navigate("/versus");
        return;
      }
      const nextSetup: Setup = {
        ...setup,
        playerB: {
          ...setup.playerB,
          teamId: next.opponents[next.currentIdx],
        },
      };
      try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(nextSetup)); } catch { /* ignore */ }
      location.reload();
    } else {
      if (campaign.type === "story") {
        restartCurrent(campaign);
        try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(setup)); } catch { /* ignore */ }
        location.reload();
      } else {
        navigate("/versus");
      }
    }
  }

  if (!setup || !wrestlerA || !wrestlerB) {
    return <NoSetupFallback onBack={() => navigate("/versus")} />;
  }

  // Roster / campaign full-bleed screens render early.
  if (phase === "roster_pickA") {
    return (
      <RosterSelectScreen
        sport="wrestling"
        initialId={fighterIdA}
        onCancel={() => navigate("/versus")}
        onConfirm={lockRosterA}
      />
    );
  }
  if (phase === "roster_pickB" && !isCpu) {
    return (
      <RosterSelectScreen
        sport="wrestling"
        initialId={fighterIdB}
        onCancel={() => setPhase("handoff_rosterA")}
        onConfirm={lockRosterB}
      />
    );
  }
  if (phase === "campaign_intro" && campaign) {
    return <CampaignIntroScreen campaign={campaign} onSkip={() => {
      const isFirst = campaign.currentIdx === 0 && !campaign.playerFighterId;
      if (isFirst) setPhase(USE_ROSTER_SELECT ? "handoff_rosterA" : "handoff_planA");
      else {
        if (campaign.playerFighterId) setFighterIdA(campaign.playerFighterId);
        setPhase("handoff_planA");
      }
    }} />;
  }

  const activeWrestler = match ? match.wrestlers[match.activeIdx] : null;
  const passiveWrestler = match ? match.wrestlers[1 - match.activeIdx] : null;
  const activeName = match?.activeIdx === 0 ? setup.playerA.profileName : setup.playerB.profileName;
  const activeColor = match?.activeIdx === 0 ? setup.playerA.profileColor : setup.playerB.profileColor;
  const passiveName = match?.activeIdx === 0 ? setup.playerB.profileName : setup.playerA.profileName;
  const passiveColor = match?.activeIdx === 0 ? setup.playerB.profileColor : setup.playerA.profileColor;
  const headerSummary = match
    ? `RED ${match.wrestlers[0].def.name.split(" ").slice(-1)[0]} · BLUE ${match.wrestlers[1].def.name.split(" ").slice(-1)[0]} · D${match.decisionCount}`
    : "READY THE CORNERS";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          `radial-gradient(900px 600px at 50% 0%, rgba(167,139,250,0.20), transparent 60%), ` +
          "linear-gradient(180deg, #08081a 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/versus")} aria-label="Quit match"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#a78bfa" }}>🤼 PRO WRESTLING · VERSUS</div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>{headerSummary}</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-3">
        <div className="rounded-lg p-2 text-[10px]" style={{
          background: "rgba(251,146,60,0.10)",
          border: "1px solid rgba(251,146,60,0.35)",
          color: "#fed7aa",
        }}>
          Sprites: procedural placeholder pending wrestler art pack — drop CC0 wrestler sprites in
          {" "}<code style={{ color: "#fde047" }}>/public/assets/wrestling/</code> to upgrade.
        </div>

        {match && (
          <>
            <Scoreboard match={match}
              aLabel={setup.playerA.profileName}
              bLabel={setup.playerB.profileName} />
            <ArenaCanvas match={match} />
            {match.lastResolve && (phase === "reveal" || phase === "finisher_intro") && (
              <ResolveLine resolve={match.lastResolve} />
            )}
            <StrategicBars
              aLabel={setup.playerA.profileName + " (RED)"}
              aColor={setup.playerA.profileColor}
              aMomentum={match.wrestlers[0].strategic.momentum.value}
              aStamina={match.wrestlers[0].strategic.stamina.value}
              bLabel={setup.playerB.profileName + " (BLUE)"}
              bColor={setup.playerB.profileColor}
              bMomentum={match.wrestlers[1].strategic.momentum.value}
              bStamina={match.wrestlers[1].strategic.stamina.value}
            />
          </>
        )}

        {/* Plan picks */}
        {phase === "plan_pickA" && (
          <PlanPickerScreen
            whoseName={setup.playerA.profileName}
            whoseColor={setup.playerA.profileColor}
            prompt="Pick your corner's match plan — sets your aggression dial for the bout."
            onLock={lockPlanA}
          />
        )}
        {phase === "plan_pickB" && !isCpu && (
          <PlanPickerScreen
            whoseName={setup.playerB.profileName}
            whoseColor={setup.playerB.profileColor}
            prompt="Pick your corner's match plan."
            onLock={lockPlanB}
          />
        )}

        {/* Active picker */}
        {phase === "attack_pick" && match && activeWrestler && !(isCpu && match.activeIdx === 1) && (
          <AttackPicker
            who={activeWrestler}
            activeName={activeName}
            activeColor={activeColor}
            onPick={commitActive}
            onTaunt={commitTauntDirect}
          />
        )}
        {phase === "attack_pick" && isCpu && match && match.activeIdx === 1 && (
          <WaitingCard text="CPU is loading up a move…" color="#fbbf24" />
        )}

        {/* Passive picker */}
        {phase === "defend_pick" && match && passiveWrestler && pendingAttack && !(isCpu && match.activeIdx === 0) && (
          <DefensePicker
            who={passiveWrestler}
            passiveName={passiveName}
            passiveColor={passiveColor}
            onPick={(d) => commitDecision({ ...pendingAttack, defense: d })}
          />
        )}
        {phase === "defend_pick" && isCpu && match && match.activeIdx === 0 && (
          <WaitingCard text="CPU is reading your hold…" color="#60a5fa" />
        )}

        {/* Finisher cinematic */}
        {phase === "finisher_intro" && match && activeWrestler && (
          <FinisherBanner wrestler={activeWrestler.def} color={activeColor} />
        )}

        {/* Pin attempt (mash to kick out) */}
        {phase === "pin_attempt" && match && (
          <PinPanel
            pinnerName={activeName}
            pinnedName={passiveName}
            color={passiveColor}
            isPlayerSide={!(isCpu && match.activeIdx === 0)}
            taps={kickoutTaps}
            onTap={() => {
              const nextTaps = kickoutTaps + 1;
              setKickoutTaps(nextTaps);
              if (nextTaps >= 6) finalizePin(true);
            }}
          />
        )}

        {/* Submission attempt (tap to escape) */}
        {phase === "submission_attempt" && match && (
          <SubmissionPanel
            lockerName={activeName}
            lockedName={passiveName}
            color={passiveColor}
            isPlayerSide={!(isCpu && match.activeIdx === 0)}
            taps={escapeTaps}
            onTap={() => {
              const nextTaps = escapeTaps + 1;
              setEscapeTaps(nextTaps);
              if (nextTaps >= 10) finalizeSubmission(true);
            }}
          />
        )}

        {/* Done */}
        {phase === "done" && match && (
          <ResultCard match={match}
            aName={setup.playerA.profileName} bName={setup.playerB.profileName}
            campaign={campaign}
            onPlayAgain={() => {
              try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(setup)); } catch {}
              location.reload();
            }}
            onSwitchSides={() => {
              const swapped = { ...setup, playerA: setup.playerB, playerB: setup.playerA };
              try { sessionStorage.setItem("dd_versus_setup", JSON.stringify(swapped)); } catch {}
              location.reload();
            }}
            onHome={() => navigate("/versus")}
            onCampaignContinue={onCampaignContinue}
          />
        )}
      </main>

      {/* Handoffs */}
      <AnimatePresence>
        {phase === "handoff_rosterA" && (
          <Handoff
            toName={setup.playerA.profileName}
            toColor={setup.playerA.profileColor}
            prompt="Pick your wrestler — full roster view. Don't peek at the other player's pick."
            onReady={() => setPhase("roster_pickA")}
          />
        )}
        {phase === "handoff_rosterB" && !isCpu && (
          <Handoff
            toName={setup.playerB.profileName}
            toColor={setup.playerB.profileColor}
            prompt="Pick your wrestler — full roster view."
            onReady={() => setPhase("roster_pickB")}
          />
        )}
        {phase === "handoff_planA" && (
          <Handoff
            toName={setup.playerA.profileName}
            toColor={setup.playerA.profileColor}
            prompt="Pick your corner's match plan — pre-match strategy."
            onReady={() => setPhase("plan_pickA")}
          />
        )}
        {phase === "handoff_planB" && !isCpu && (
          <Handoff
            toName={setup.playerB.profileName}
            toColor={setup.playerB.profileColor}
            prompt="Pick your corner's match plan."
            onReady={() => setPhase("plan_pickB")}
          />
        )}
        {phase === "handoff_attack" && match && !(isCpu && match.activeIdx === 1) && (
          <Handoff
            toName={activeName}
            toColor={activeColor}
            prompt="Your move — pick STRIKE / GRAPPLE / ROPE / TAUNT. Keep it hidden!"
            onReady={() => setPhase("attack_pick")}
          />
        )}
        {phase === "handoff_defend" && match && !(isCpu && match.activeIdx === 0) && (
          <Handoff
            toName={passiveName}
            toColor={passiveColor}
            prompt="Incoming! Pick COUNTER-STRIKE / COUNTER-GRAPPLE / REVERSAL."
            onReady={() => setPhase("defend_pick")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function Scoreboard({ match, aLabel, bLabel }: { match: MatchState; aLabel: string; bLabel: string; }) {
  const [red, blue] = match.wrestlers;
  return (
    <div className="rounded-2xl p-2.5" style={{ background: "rgba(0,0,0,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div className="flex items-center justify-between mb-1">
        <CornerCell name={aLabel} fighter={red.def.name} side="left" active={match.activeIdx === 0} color="#f87171" />
        <div className="text-center">
          <div className="text-[9px] tracking-widest opacity-70 font-display" style={{ color: "#fef3c7" }}>DECISIONS</div>
          <div className="font-display text-lg" style={{ color: "#fde047" }}>{match.decisionCount}</div>
        </div>
        <CornerCell name={bLabel} fighter={blue.def.name} side="right" active={match.activeIdx === 1} color="#60a5fa" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <BarStack w={red} side="left" />
        <BarStack w={blue} side="right" />
      </div>
    </div>
  );
}

function CornerCell({ name, fighter, side, active, color }: { name: string; fighter: string; side: "left" | "right"; active: boolean; color: string }) {
  return (
    <div className={`flex-1 ${side === "right" ? "text-right" : "text-left"}`} style={{ opacity: active ? 1 : 0.7 }}>
      <div className="text-[9px] tracking-widest" style={{ color: active ? color : "#9aa6bf" }}>
        {active ? "▶ ON THE ATTACK" : "DEFENDING"}
      </div>
      <div className="font-display text-[13px]" style={{ color: "#fef3c7" }}>{name}</div>
      <div className="text-[9px] opacity-70 truncate" style={{ color }}>{fighter}</div>
    </div>
  );
}

function BarStack({ w, side }: { w: MatchState["wrestlers"][number]; side: "left" | "right" }) {
  const align = side === "right" ? "items-end" : "items-start";
  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      <Bar label="HP"   value={w.hp}   max={HP_MAX} color="#f87171" side={side} />
      <Bar label="HYPE" value={w.hype} max={HYPE_MAX} color="#fde047" side={side} flash={w.hype >= HYPE_FOR_FINISHER} />
    </div>
  );
}

function Bar({ label, value, max, color, side, flash }: { label: string; value: number; max: number; color: string; side: "left" | "right"; flash?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const rowClass = side === "right" ? "flex-row-reverse" : "flex-row";
  return (
    <div className={`flex items-center gap-1 w-full ${rowClass}`}>
      <div className="text-[8px] font-mono opacity-70 w-9" style={{ color: "#fef3c7" }}>{label}</div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className={flash ? "animate-pulse" : ""}
          style={{
            width: `${pct}%`, height: "100%", background: color,
            transition: "width 200ms ease-out",
            float: side === "right" ? "right" : "left",
          }} />
      </div>
    </div>
  );
}

function ArenaCanvas({ match }: { match: MatchState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function paint() {
      const c = canvas!;
      const cx = ctx!;
      const w = c.width;
      const h = c.height;
      cx.clearRect(0, 0, w, h);

      // Arena backdrop — purple/blue gradient, mat below.
      const g = cx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#1c1230");
      g.addColorStop(0.5, "#2a1840");
      g.addColorStop(0.7, "#3a1f50");
      g.addColorStop(1, "#0e0822");
      cx.fillStyle = g;
      cx.fillRect(0, 0, w, h);

      // Crowd silhouette suggestion (dots at top).
      cx.fillStyle = "rgba(255,255,255,0.10)";
      for (let i = 0; i < 36; i++) {
        cx.beginPath();
        cx.arc(8 + i * 10, 8 + (i % 3) * 3, 3, 0, Math.PI * 2);
        cx.fill();
      }

      // Ring posts.
      cx.strokeStyle = "rgba(253,224,71,0.40)";
      cx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const y = 26 + i * 14;
        cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke();
      }
      // Top apron.
      cx.fillStyle = "rgba(0,0,0,0.55)";
      cx.fillRect(0, 0, w, 26);

      // Mat texture.
      cx.fillStyle = "rgba(255,255,255,0.03)";
      for (let x = 0; x < w; x += 36) cx.fillRect(x, h - 28, 16, 4);

      const tickMs = performance.now();
      const red = match.wrestlers[0];
      const blue = match.wrestlers[1];
      const stateRed = stateForWrestler(0, match);
      const stateBlue = stateForWrestler(1, match);

      const flashRed = match.phase === "resolving" && match.lastResolve?.landed && match.activeIdx === 1;
      const flashBlue = match.phase === "resolving" && match.lastResolve?.landed && match.activeIdx === 0;

      const baseY = h - DEST_H + 4;
      const glowRed = red.hype >= HYPE_FOR_FINISHER || (match.phase === "finisher_intro" && match.activeIdx === 0);
      const glowBlue = blue.hype >= HYPE_FOR_FINISHER || (match.phase === "finisher_intro" && match.activeIdx === 1);
      drawProceduralWrestler(cx, 14, baseY, stateRed, red.def.color, "right", tickMs, flashRed, glowRed);
      drawProceduralWrestler(cx, w - DEST_W - 14, baseY, stateBlue, blue.def.color, "left", tickMs, flashBlue, glowBlue);

      // Finisher / pin / submission overlay text.
      if (match.phase === "finisher_intro" && match.lastResolve?.finisher) {
        cx.font = "bold 16px monospace";
        cx.fillStyle = "#fde047";
        cx.textAlign = "center";
        cx.fillText("FINISHER!", w / 2, h / 2);
        cx.textAlign = "start";
      }
      if (match.phase === "pin_attempt") {
        cx.font = "bold 16px monospace";
        cx.fillStyle = "#fca5a5";
        cx.textAlign = "center";
        cx.fillText("1 — 2 — ?", w / 2, h / 2);
        cx.textAlign = "start";
      }

      animRef.current = requestAnimationFrame(paint);
    }
    paint();
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [match]);

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid rgba(167,139,250,0.40)" }}>
      <canvas ref={canvasRef} width={360} height={DEST_H + 26}
        style={{ display: "block", width: "100%", height: "auto", imageRendering: "pixelated" }} />
    </div>
  );
}

function stateForWrestler(idx: 0 | 1, match: MatchState): WrestlerStateId {
  const isActive = match.activeIdx === idx;
  if (match.phase === "matchEnd") {
    if (match.winnerIdx === idx) return "victory";
    return "down";
  }
  if (match.phase === "finisher_intro") {
    return isActive ? "finisher" : "down";
  }
  if (match.phase === "pin_attempt") {
    return isActive ? "victory" : "pinned";
  }
  if (match.phase === "submission_attempt") {
    return isActive ? "submission" : "down";
  }
  if (match.phase === "resolving" && match.lastResolve) {
    const r = match.lastResolve;
    if (isActive) {
      if (r.attack === "taunt") return "taunt";
      if (r.attack === "rope") return "rope";
      if (r.attack === "grapple") return "grapple";
      if (r.attack === "strike") return "strike";
      return "idle";
    }
    if (r.landed) return "hit";
    if (r.defense === "reversal") return "reversal";
    if (r.defense === "counter_grapple") return "grapple";
    return "strike";
  }
  return "idle";
}

function ResolveLine({ resolve }: { resolve: NonNullable<MatchState["lastResolve"]> }) {
  const color = resolve.finisher ? "#fde047" : resolve.backfire ? "#fca5a5" : resolve.landed ? "#86efac" : "#9aa6bf";
  return (
    <div className="rounded-lg p-2 text-[11px] text-center font-mono"
      style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}55`, color }}>
      {resolve.text}
    </div>
  );
}

function WaitingCard({ text, color }: { text: string; color: string }) {
  return (
    <div className="rounded-xl p-4 text-center text-[12px]"
      style={{ background: `${color}14`, border: `1px solid ${color}55`, color: "#fef3c7" }}>
      {text}
    </div>
  );
}

function AttackPicker({ who, activeName, activeColor, onPick, onTaunt }: {
  who: MatchState["wrestlers"][number];
  activeName: string;
  activeColor: string;
  onPick: (attack: AttackId, attemptFinisher: boolean) => void;
  onTaunt: () => void;
}) {
  const finisherReady = who.hype >= HYPE_FOR_FINISHER;
  return (
    <section className="rounded-2xl p-3" style={{
      background: `linear-gradient(135deg, ${activeColor}22, rgba(10,10,20,0.95))`,
      border: `1.5px solid ${activeColor}`,
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: activeColor }}>
          ▶ {activeName.toUpperCase()} — MAKE YOUR MOVE
        </div>
      </div>

      {/* FINISHER button — only when hype is full. */}
      <button onClick={() => finisherReady && onPick("strike", true)} disabled={!finisherReady}
        className="w-full mb-2 py-3 rounded-xl text-[12px] font-display tracking-widest pressable touch-target"
        style={{
          background: finisherReady
            ? `linear-gradient(135deg, ${who.def.color}, #fde047)`
            : "rgba(255,255,255,0.04)",
          border: `1.5px solid ${finisherReady ? "#fde047" : "rgba(255,255,255,0.10)"}`,
          color: finisherReady ? "#0a0a14" : "#9aa6bf",
          opacity: finisherReady ? 1 : 0.6,
          minHeight: 56,
          boxShadow: finisherReady ? `0 0 24px ${who.def.color}88` : "none",
        }}>
        {who.def.finisher.emoji} {finisherReady ? `${who.def.finisher.name.toUpperCase()} READY — FINISH IT!` : "BUILD HYPE TO UNLOCK FINISHER"}
      </button>

      <div className="grid grid-cols-2 gap-1.5">
        {ATTACKS.map(a => {
          const meta = ATTACK_META[a];
          const cost = meta.staminaCost;
          const tooTired = who.strategic.stamina.value < cost;
          const isTaunt = a === "taunt";
          return (
            <button key={a} onClick={() => {
              if (tooTired) return;
              if (isTaunt) onTaunt();
              else onPick(a, false);
            }} disabled={tooTired}
              className="rounded-lg p-2 text-left pressable touch-target"
              style={{
                background: tooTired ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.30)",
                border: `1px solid ${tooTired ? "rgba(255,255,255,0.10)" : `${activeColor}80`}`,
                opacity: tooTired ? 0.4 : 1,
                minHeight: 64,
              }}>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{meta.emoji}</span>
                <span className="text-[9px] font-mono opacity-70" style={{ color: "#fef3c7" }}>
                  {cost > 0 ? `−${cost} GAS` : "FREE"}
                </span>
              </div>
              <div className="font-display tracking-widest text-[11px] mt-1" style={{ color: "#fef3c7" }}>{meta.label}</div>
              <div className="text-[9px] mt-0.5 opacity-70" style={{ color: "#fef3c7" }}>{meta.desc}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DefensePicker({ who, passiveName, passiveColor, onPick }: {
  who: MatchState["wrestlers"][number];
  passiveName: string;
  passiveColor: string;
  onPick: (d: DefenseId) => void;
}) {
  return (
    <section className="rounded-2xl p-3" style={{
      background: `linear-gradient(135deg, ${passiveColor}22, rgba(10,10,20,0.95))`,
      border: `1.5px solid ${passiveColor}`,
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: passiveColor }}>
          ▶ {passiveName.toUpperCase()} — RESPOND
        </div>
        <div className="text-[9px] font-mono opacity-90" style={{ color: "#fde047" }}>
          {who.def.archetype.toUpperCase()}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {DEFENSES.map(d => {
          const meta = DEFENSE_META[d];
          const cost = meta.staminaCost;
          const tooTired = who.strategic.stamina.value < cost;
          return (
            <button key={d} onClick={() => !tooTired && onPick(d)} disabled={tooTired}
              className="rounded-lg p-2 text-center pressable touch-target"
              style={{
                background: tooTired ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.30)",
                border: `1px solid ${tooTired ? "rgba(255,255,255,0.10)" : `${passiveColor}80`}`,
                opacity: tooTired ? 0.4 : 1,
                minHeight: 80,
              }}>
              <div className="text-2xl">{meta.emoji}</div>
              <div className="font-display tracking-widest text-[10px] mt-1" style={{ color: "#fef3c7" }}>{meta.short}</div>
              <div className="text-[8px] font-mono opacity-70 mt-0.5" style={{ color: "#fef3c7" }}>−{cost} GAS</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FinisherBanner({ wrestler, color }: { wrestler: { name: string; finisher: { name: string; flavour: string; emoji: string } }; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-4 text-center"
      style={{
        background: `linear-gradient(135deg, ${color}33, rgba(10,10,20,0.95))`,
        border: `2px solid ${color}`,
        boxShadow: `0 20px 60px -20px ${color}cc`,
      }}>
      <div className="text-4xl mb-1">{wrestler.finisher.emoji}</div>
      <div className="font-display tracking-[0.3em] text-[10px]" style={{ color }}>
        SIGNATURE FINISHER
      </div>
      <div className="font-display text-xl mt-1" style={{ color: "#fde047" }}>
        {wrestler.finisher.name.toUpperCase()}
      </div>
      <div className="text-[11px] mt-1 italic" style={{ color: "rgba(229,231,235,0.78)" }}>
        {wrestler.finisher.flavour}
      </div>
    </motion.div>
  );
}

function PinPanel({ pinnerName, pinnedName, color, isPlayerSide, taps, onTap }: {
  pinnerName: string; pinnedName: string; color: string;
  isPlayerSide: boolean; taps: number; onTap: () => void;
}) {
  return (
    <section className="rounded-2xl p-4 text-center"
      style={{
        background: `linear-gradient(135deg, ${color}22, rgba(10,10,20,0.95))`,
        border: `2px solid ${color}`,
      }}>
      <div className="font-display tracking-[0.3em] text-[10px]" style={{ color }}>
        {pinnerName.toUpperCase()} PINS {pinnedName.toUpperCase()}
      </div>
      <div className="font-display text-2xl mt-1" style={{ color: "#fef3c7" }}>1 — 2 — ?!</div>
      {isPlayerSide ? (
        <>
          <button onClick={onTap}
            className="mt-3 w-full py-5 rounded-xl pressable touch-target font-display tracking-widest text-[14px]"
            style={{
              background: `linear-gradient(135deg, #fde047, #f59e0b)`,
              color: "#0a0a14",
              minHeight: 64,
            }}>
            💥 MASH TO KICK OUT! ({taps}/6)
          </button>
          <div className="text-[10px] mt-2 opacity-80" style={{ color: "#fef3c7" }}>
            Tap as fast as you can — 6 taps in {PIN_KICKOUT_WINDOW_MS}ms to escape!
          </div>
        </>
      ) : (
        <div className="mt-3 text-[12px]" style={{ color: "#fef3c7" }}>
          (CPU attempting kick-out…)
        </div>
      )}
    </section>
  );
}

function SubmissionPanel({ lockerName, lockedName, color, isPlayerSide, taps, onTap }: {
  lockerName: string; lockedName: string; color: string;
  isPlayerSide: boolean; taps: number; onTap: () => void;
}) {
  return (
    <section className="rounded-2xl p-4 text-center"
      style={{
        background: `linear-gradient(135deg, ${color}22, rgba(10,10,20,0.95))`,
        border: `2px solid ${color}`,
      }}>
      <div className="font-display tracking-[0.3em] text-[10px]" style={{ color }}>
        {lockerName.toUpperCase()} LOCKS UP {lockedName.toUpperCase()}
      </div>
      <div className="font-display text-2xl mt-1" style={{ color: "#fca5a5" }}>SUBMISSION HOLD!</div>
      {isPlayerSide ? (
        <>
          <button onClick={onTap}
            className="mt-3 w-full py-5 rounded-xl pressable touch-target font-display tracking-widest text-[14px]"
            style={{
              background: `linear-gradient(135deg, #86efac, #16a34a)`,
              color: "#0a0a14",
              minHeight: 64,
            }}>
            🔥 TAP TO ESCAPE! ({taps}/10)
          </button>
          <div className="text-[10px] mt-2 opacity-80" style={{ color: "#fef3c7" }}>
            10 taps in {SUBMISSION_ESCAPE_MS}ms to break the hold!
          </div>
        </>
      ) : (
        <div className="mt-3 text-[12px]" style={{ color: "#fef3c7" }}>
          (CPU attempting to escape…)
        </div>
      )}
    </section>
  );
}

function ResultCard({ match, aName, bName, campaign, onPlayAgain, onSwitchSides, onHome, onCampaignContinue }: {
  match: MatchState; aName: string; bName: string;
  campaign: ReturnType<typeof loadActiveCampaign>;
  onPlayAgain: () => void; onSwitchSides: () => void; onHome: () => void;
  onCampaignContinue: () => void;
}) {
  const winnerIdx = match.winnerIdx;
  const hasWinner = winnerIdx === 0 || winnerIdx === 1;
  const winnerName = hasWinner ? (winnerIdx === 0 ? aName : bName) : "DRAW";
  const winnerColor = hasWinner ? (winnerIdx === 0 ? "#f87171" : "#60a5fa") : "#fde047";
  const method = match.endMethod ?? "decision";
  const headline = !hasWinner
    ? "DRAW — JUDGES SPLIT"
    : method === "finisher"
    ? `${winnerName.toUpperCase()} WINS WITH THE FINISHER!`
    : method === "submission"
    ? `${winnerName.toUpperCase()} WINS BY SUBMISSION!`
    : method === "tko"
    ? `${winnerName.toUpperCase()} WINS BY TKO!`
    : `${winnerName.toUpperCase()} WINS BY DECISION`;
  const winner = hasWinner ? match.wrestlers[winnerIdx as 0 | 1] : undefined;
  const loser = hasWinner ? match.wrestlers[(1 - (winnerIdx as 0 | 1)) as 0 | 1] : undefined;

  const inCampaign = !!campaign;
  const playerWon = winnerIdx === 0;
  const isFinal = campaign ? isFinalMatchOfCampaign(campaign) : false;
  const campaignContinueLabel = !inCampaign ? ""
    : !playerWon
    ? (campaign.type === "story" ? "TRY AGAIN" : "END RUN")
    : isFinal
    ? (campaign.type === "story" ? "📖 STORY COMPLETE — HOME" : "🏆 CHAMPION — HOME")
    : "▶ NEXT MATCH";

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 text-center"
      style={{
        background: `linear-gradient(135deg, ${winnerColor}18, rgba(10,10,20,0.95))`,
        border: `2px solid ${winnerColor}`,
      }}>
      <Trophy size={32} style={{ color: winnerColor, margin: "0 auto" }} />
      <div className="font-display text-xl mt-2 tracking-wider" style={{ color: winnerColor }}>{headline}</div>
      {winner && loser && (
        <div className="text-[12px] mt-2 opacity-90" style={{ color: "#fef3c7" }}>
          {method === "finisher"
            ? `${winner.def.name} hit the ${winner.def.finisher.name} on ${loser.def.name}.`
            : method === "submission"
            ? `${winner.def.name} locked in the ${winner.def.finisher.name} on ${loser.def.name}.`
            : method === "tko"
            ? `${winner.def.name} grinds out a TKO — ${loser.def.name} couldn't answer the bell.`
            : `Judges: ${winner.def.name} ${winner.hitsLanded} hits / ${winner.finishersLanded} finishers — vs ${loser.def.name} ${loser.hitsLanded} / ${loser.finishersLanded}.`}
        </div>
      )}
      {inCampaign && (
        <div className="text-[11px] mt-2 font-mono opacity-85"
          style={{ color: campaign.type === "story" ? "#67e8f9" : "#fde047" }}>
          {campaign.type === "story" ? "STORY MODE" : "CHAMPIONSHIP"} · Bout {campaign.currentIdx + 1} / {campaign.opponents.length}
        </div>
      )}
      <div className="flex gap-2 justify-center mt-4 flex-wrap">
        {inCampaign ? (
          <button onClick={onCampaignContinue}
            className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
            style={{ background: winnerColor, color: "#0a0a14" }}>
            {campaignContinueLabel}
          </button>
        ) : (
          <>
            <button onClick={onPlayAgain}
              className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
              style={{ background: winnerColor, color: "#0a0a14" }}>
              🔁 REMATCH
            </button>
            <button onClick={onSwitchSides}
              className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
              style={{ background: "rgba(167,139,250,0.30)", border: "1px solid #a78bfa", color: "#a78bfa" }}>
              🔄 SWITCH CORNERS
            </button>
          </>
        )}
        <button onClick={onHome}
          className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
          HUB
        </button>
      </div>
    </motion.section>
  );
}

/** Pre-match cinematic for story / championship — flavor text intro. */
function CampaignIntroScreen({ campaign, onSkip }: {
  campaign: NonNullable<ReturnType<typeof loadActiveCampaign>>;
  onSkip: () => void;
}) {
  const f = flavorForCurrent(campaign);
  const accent = campaign.type === "story" ? "#67e8f9" : "#fde047";
  const label = campaign.type === "story" ? "STORY MODE" : "CHAMPIONSHIP";
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          `radial-gradient(900px 600px at 50% 0%, ${accent}25, transparent 60%), ` +
          "linear-gradient(180deg, #08081a 0%, #050308 100%)",
      }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-sm"
      >
        <div className="text-[10px] tracking-[0.3em] mb-2 font-mono" style={{ color: accent }}>
          {label} · BOUT {campaign.currentIdx + 1} / {campaign.opponents.length}
        </div>
        <div className="font-display text-3xl tracking-wider mb-2" style={{ color: "#fde047" }}>
          {f.title}
        </div>
        {f.subtitle && (
          <div className="text-[11px] mb-3" style={{ color: "#fef3c7" }}>{f.subtitle}</div>
        )}
        {f.flavor && (
          <p className="text-[13px] leading-snug opacity-85 mb-4" style={{ color: "#fef3c7" }}>
            "{f.flavor}"
          </p>
        )}
        <button onClick={onSkip}
          className="mt-2 px-6 py-3 rounded-full pressable touch-target font-display tracking-widest text-[12px]"
          style={{ background: accent, color: "#0a0a14" }}>
          MAKE THE WALK
        </button>
      </motion.div>
    </div>
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
          style={{ background: "#a78bfa", color: "#0a0a14" }}>
          Pick wrestlers
        </button>
      </div>
    </div>
  );
}
