// Boxing Versus — pass-and-play boxing match plugged into the same
// Sports Versus pre-match / handoff / pick / reveal loop that baseball
// and football use. Replaces the standalone /boxing route (which was
// architecturally wrong — boxing is a 2-player sport like the others).
//
// Phase ladder:
//   handoff_planA → plan_pickA → handoff_planB → plan_pickB →
//   handoff_attack → attack_pick → handoff_defend → defend_pick →
//   reveal → between → (next decision) … → done
//
// Active player picks strike + target + (optional) Power Shot.
// Passive player then picks defense (block / dodge / clinch).
// Engine resolves via BOXING_RPS + plan + stamina + signature; KO
// or judges' decision ends the match.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";
import type { VersusPlayer } from "../types";
import { Handoff } from "../components/Handoff";
import { useVersusStats } from "../store";
import { getBoxingFighter } from "../boxers";
import { PlanPickerScreen, StrategicBars } from "../components/StrategicUI";
import type { GamePlan, PlanId } from "../../sports/strategic";
import { GAME_PLANS } from "../../sports/strategic";

import {
  newMatch, applyDecision, advanceClock, cpuDecide,
  HP_MAX_HEAD, HP_MAX_BODY, POWER_TARGET_CHARGE, KNOCKDOWN_TARGET_CHARGE,
  KD_COUNTDOWN_SECONDS, ROUNDS,
  type MatchState, type PlayerDecision,
} from "../../combat-sports/boxing/engine";
import {
  STRIKE_META, DEFENSE_META,
  type StrikeId, type DefenseId, type TargetZone,
} from "../../combat-sports/boxing/rps";
import { boxerById } from "../../combat-sports/boxing/fighters";
import { drawProceduralBoxer, DEST_W, DEST_H } from "../../combat-sports/boxing/proceduralBoxer";
import type { BoxerStateId } from "../../combat-sports/boxing/boxerState";

interface Setup {
  sport: "boxing";
  mode: "passplay" | "cpu";
  pickTimerSec?: number;
  cpuDifficulty?: "easy" | "normal" | "hard";
  playerA: VersusPlayer;
  playerB: VersusPlayer;
}

type Phase =
  | "handoff_planA" | "plan_pickA"
  | "handoff_planB" | "plan_pickB"
  | "handoff_attack" | "attack_pick"
  | "handoff_defend" | "defend_pick"
  | "reveal" | "knockdown_wait" | "round_break" | "done";

const STRIKES: StrikeId[] = ["jab", "cross", "hook", "uppercut"];
const DEFENSES: DefenseId[] = ["block", "dodge", "clinch"];

export default function BoxingVersus() {
  const navigate = useNavigate();
  const { recordMatch } = useVersusStats();

  const setup = useMemo<Setup | null>(() => {
    try {
      const raw = sessionStorage.getItem("dd_versus_setup");
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.sport !== "boxing") return null;
      if (s.mode !== "passplay" && s.mode !== "cpu") return null;
      return s as Setup;
    } catch { return null; }
  }, []);

  // Map VersusPlayer → boxer def. Red corner = A, Blue corner = B.
  const boxerA = setup ? boxerById(setup.playerA.teamId) : null;
  const boxerB = setup ? boxerById(setup.playerB.teamId) : null;

  const [phase, setPhase] = useState<Phase>("handoff_planA");
  const [planA, setPlanA] = useState<GamePlan | null>(null);
  const [planB, setPlanB] = useState<GamePlan | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);

  const [pendingPick, setPendingPick] = useState<{ strike: StrikeId; target: TargetZone; spendPower: boolean } | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [kosA, setKosA] = useState(0);
  const [kosB, setKosB] = useState(0);

  const isCpu = setup?.mode === "cpu";
  const cpuDifficulty: "easy" | "normal" | "hard" = (setup?.cpuDifficulty ?? "normal") as "easy" | "normal" | "hard";

  // ── Plan lock-ins → start match ───────────────────────────────────
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
    if (!boxerA || !boxerB) return;
    const m = newMatch(boxerA, redPlan, boxerB, bluePlan);
    m.phase = "decision";
    setMatch(m);
    setPhase("handoff_attack");
  }

  // ── CPU autopick (CPU = B = blue corner) ──────────────────────────
  useEffect(() => {
    if (!isCpu || !match) return;
    if (match.phase !== "decision") return;
    const cpuIsActive = match.activeIdx === 1;
    const cpuIsPassive = match.activeIdx === 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (cpuIsActive && phase === "handoff_attack") {
      t = setTimeout(() => setPhase("attack_pick"), 300);
    } else if (cpuIsActive && phase === "attack_pick") {
      t = setTimeout(() => {
        const dec = cpuDecide(match, 1, cpuDifficulty);
        commitActive(dec.strike!, dec.target, !!dec.spendPower);
      }, 700);
    } else if (cpuIsPassive && phase === "handoff_defend") {
      t = setTimeout(() => setPhase("defend_pick"), 300);
    } else if (cpuIsPassive && phase === "defend_pick" && pendingPick) {
      t = setTimeout(() => {
        const dec = cpuDecide(match, 1, cpuDifficulty);
        commitDecision({ ...pendingPick, defense: dec.defense ?? "block" });
      }, 700);
    }
    return () => { if (t) clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isCpu, match, pendingPick, cpuDifficulty]);

  // ── Active player lock-in ─────────────────────────────────────────
  function commitActive(strike: StrikeId, target: TargetZone, spendPower: boolean) {
    setPendingPick({ strike, target, spendPower });
    setPhase("handoff_defend");
  }

  // ── Passive player lock-in → resolve ──────────────────────────────
  function commitDecision(decision: PlayerDecision) {
    if (!match) return;
    const next = structuredClone(match);
    applyDecision(next, decision);
    next.phase = "resolving";
    setMatch(next);
    setPendingPick(null);
    setPhase("reveal");

    // KO counter for stats.
    if (next.lastResolve?.knockdown) {
      if (next.activeIdx === 0) setKosA(k => k + 1);
      else setKosB(k => k + 1);
    }

    // 1.4s reveal → advance clock → either next decision, knockdown
    // countdown, round break, or match end.
    setTimeout(() => {
      const after = structuredClone(next);
      advanceClock(after);
      setMatch(after);
      if (after.phase === "knockdown") setPhase("knockdown_wait");
      else if (after.phase === "matchEnd") setPhase("done");
      else if (after.phase === "roundEnd") setPhase("round_break");
      else setPhase("handoff_attack");
    }, 1400);
  }

  // ── Knockdown countdown tick ──────────────────────────────────────
  useEffect(() => {
    if (!match || phase !== "knockdown_wait") return;
    if (match.countdown === undefined) return;
    if (match.countdown <= 0) {
      const after = structuredClone(match);
      advanceClock(after);
      setMatch(after);
      if (after.phase === "matchEnd") setPhase("done");
      else setPhase("handoff_attack");
      return;
    }
    const t = setTimeout(() => {
      setMatch(prev => prev ? { ...prev, countdown: Math.max(0, (prev.countdown ?? 0) - 1) } : prev);
    }, 1000);
    return () => clearTimeout(t);
  }, [phase, match]);

  // ── Round break interstitial ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "round_break") return;
    const t = setTimeout(() => setPhase("handoff_attack"), 1400);
    return () => clearTimeout(t);
  }, [phase]);

  // ── Stats record on done ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "done" || recorded || !setup || !match) return;
    setRecorded(true);
    const winnerIdx = match.winnerIdx;
    if (winnerIdx === -1 || winnerIdx === undefined) return;
    const aWon = winnerIdx === 0;
    recordMatch({
      sport: "boxing", youWon: aWon,
      opponentProfileId: setup.playerB.profileId,
      kosScored: kosA,
    });
    recordMatch({
      sport: "boxing", youWon: !aWon,
      opponentProfileId: setup.playerA.profileId,
      kosScored: kosB,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recorded]);

  if (!setup || !boxerA || !boxerB) {
    return <NoSetupFallback onBack={() => navigate("/versus")} />;
  }

  const activeBoxer = match ? match.boxers[match.activeIdx] : null;
  const passiveBoxer = match ? match.boxers[1 - match.activeIdx] : null;
  const activeName = match?.activeIdx === 0 ? setup.playerA.profileName : setup.playerB.profileName;
  const activeColor = match?.activeIdx === 0 ? setup.playerA.profileColor : setup.playerB.profileColor;
  const passiveName = match?.activeIdx === 0 ? setup.playerB.profileName : setup.playerA.profileName;
  const passiveColor = match?.activeIdx === 0 ? setup.playerB.profileColor : setup.playerA.profileColor;
  const headerSummary = match
    ? `RED ${match.boxers[0].def.name.split(" ")[0]} · BLUE ${match.boxers[1].def.name.split(" ")[0]} · R${match.round}/${ROUNDS}`
    : "READY THE CORNERS";

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background:
          `radial-gradient(900px 600px at 50% 0%, rgba(248,113,113,0.18), transparent 60%), ` +
          "linear-gradient(180deg, #0a0814 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/versus")} aria-label="Quit match"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#f87171" }}>🥊 BOXING · VERSUS</div>
          <h1 className="font-display text-base tracking-wider" style={{ color: "#fde047" }}>{headerSummary}</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-3">
        {/* Sprite-replacement banner — honest placeholder note. */}
        <div className="rounded-lg p-2 text-[10px]" style={{
          background: "rgba(251,146,60,0.10)",
          border: "1px solid rgba(251,146,60,0.35)",
          color: "#fed7aa",
        }}>
          Sprites: procedural placeholder pending boxer art pack — drop CC0 boxer sprites in
          {" "}<code style={{ color: "#fde047" }}>/public/assets/boxing/</code> to upgrade.
        </div>

        {match && (
          <>
            <Scoreboard match={match}
              aLabel={setup.playerA.profileName}
              bLabel={setup.playerB.profileName} />
            <RingCanvas match={match} />
            {match.lastResolve && phase === "reveal" && (
              <ResolveLine resolve={match.lastResolve} />
            )}
            <StrategicBars
              aLabel={setup.playerA.profileName + " (RED)"}
              aColor={setup.playerA.profileColor}
              aMomentum={match.boxers[0].strategic.momentum.value}
              aStamina={match.boxers[0].strategic.stamina.value}
              bLabel={setup.playerB.profileName + " (BLUE)"}
              bColor={setup.playerB.profileColor}
              bMomentum={match.boxers[1].strategic.momentum.value}
              bStamina={match.boxers[1].strategic.stamina.value}
            />
          </>
        )}

        {/* Plan picks */}
        {phase === "plan_pickA" && (
          <PlanPickerScreen
            whoseName={setup.playerA.profileName}
            whoseColor={setup.playerA.profileColor}
            prompt="Pick your corner's game plan — sets your aggression dial for the bout."
            onLock={lockPlanA}
          />
        )}
        {phase === "plan_pickB" && !isCpu && (
          <PlanPickerScreen
            whoseName={setup.playerB.profileName}
            whoseColor={setup.playerB.profileColor}
            prompt="Pick your corner's game plan."
            onLock={lockPlanB}
          />
        )}

        {/* Active picker */}
        {phase === "attack_pick" && match && activeBoxer && !(isCpu && match.activeIdx === 1) && (
          <AttackPicker
            who={activeBoxer}
            activeName={activeName}
            activeColor={activeColor}
            onPick={commitActive}
          />
        )}
        {phase === "attack_pick" && isCpu && match && match.activeIdx === 1 && (
          <WaitingCard text="CPU is loading up a shot…" color="#fbbf24" />
        )}

        {/* Passive picker */}
        {phase === "defend_pick" && match && passiveBoxer && pendingPick && !(isCpu && match.activeIdx === 0) && (
          <DefensePicker
            who={passiveBoxer}
            passiveName={passiveName}
            passiveColor={passiveColor}
            incomingMaskedTarget={pendingPick.target /* passive does see the target since defenses choose head/body intuitively */}
            onPick={(d) => commitDecision({ ...pendingPick, defense: d })}
          />
        )}
        {phase === "defend_pick" && isCpu && match && match.activeIdx === 0 && (
          <WaitingCard text="CPU is reading your stance…" color="#60a5fa" />
        )}

        {/* Knockdown countdown */}
        {phase === "knockdown_wait" && match && (
          <Banner text={`COUNT: ${match.countdown ?? KD_COUNTDOWN_SECONDS}`} color="#f87171" />
        )}

        {/* Round break */}
        {phase === "round_break" && match && (
          <Banner text={`END OF ROUND ${match.round - 1} — SECONDS OUT!`} color="#67e8f9" />
        )}

        {/* Done */}
        {phase === "done" && match && (
          <ResultCard match={match}
            aName={setup.playerA.profileName} bName={setup.playerB.profileName}
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
          />
        )}
      </main>

      {/* Handoffs */}
      <AnimatePresence>
        {phase === "handoff_planA" && (
          <Handoff
            toName={setup.playerA.profileName}
            toColor={setup.playerA.profileColor}
            prompt="Pick your corner's game plan — pre-match strategy."
            onReady={() => setPhase("plan_pickA")}
          />
        )}
        {phase === "handoff_planB" && !isCpu && (
          <Handoff
            toName={setup.playerB.profileName}
            toColor={setup.playerB.profileColor}
            prompt="Pick your corner's game plan."
            onReady={() => setPhase("plan_pickB")}
          />
        )}
        {phase === "handoff_attack" && match && !(isCpu && match.activeIdx === 1) && (
          <Handoff
            toName={activeName}
            toColor={activeColor}
            prompt="Your turn to throw — pick a strike and target. Keep it hidden!"
            onReady={() => setPhase("attack_pick")}
          />
        )}
        {phase === "handoff_defend" && match && !(isCpu && match.activeIdx === 0) && (
          <Handoff
            toName={passiveName}
            toColor={passiveColor}
            prompt="Incoming shot! Pick block / dodge / clinch — don't peek at how it lands."
            onReady={() => setPhase("defend_pick")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function Scoreboard({ match, aLabel, bLabel }: { match: MatchState; aLabel: string; bLabel: string; }) {
  const [red, blue] = match.boxers;
  return (
    <div className="rounded-2xl p-2.5" style={{ background: "rgba(0,0,0,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div className="flex items-center justify-between mb-1">
        <CornerCell name={aLabel} fighter={red.def.name} side="left" active={match.activeIdx === 0} color="#f87171" />
        <div className="text-center">
          <div className="text-[9px] tracking-widest opacity-70 font-display" style={{ color: "#fef3c7" }}>ROUND</div>
          <div className="font-display text-lg" style={{ color: "#fde047" }}>{match.round} / {ROUNDS}</div>
        </div>
        <CornerCell name={bLabel} fighter={blue.def.name} side="right" active={match.activeIdx === 1} color="#60a5fa" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <BarStack b={red} side="left" />
        <BarStack b={blue} side="right" />
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

function BarStack({ b, side }: { b: MatchState["boxers"][number]; side: "left" | "right" }) {
  const align = side === "right" ? "items-end" : "items-start";
  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      <Bar label="HEAD" value={b.hpHead} max={HP_MAX_HEAD} color="#f87171" side={side} />
      <Bar label="BODY" value={b.hpBody} max={HP_MAX_BODY} color="#fb923c" side={side} />
      <Bar label="POW"  value={b.powerMeter} max={POWER_TARGET_CHARGE} color="#fde047" side={side}
        flash={b.powerMeter >= POWER_TARGET_CHARGE} />
      <Bar label="KD"   value={b.knockdownMeter} max={KNOCKDOWN_TARGET_CHARGE} color="#a78bfa" side={side} />
    </div>
  );
}

function Bar({ label, value, max, color, side, flash }: { label: string; value: number; max: number; color: string; side: "left" | "right"; flash?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const rowClass = side === "right" ? "flex-row-reverse" : "flex-row";
  return (
    <div className={`flex items-center gap-1 w-full ${rowClass}`}>
      <div className="text-[8px] font-mono opacity-60 w-7" style={{ color: "#fef3c7" }}>{label}</div>
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

function RingCanvas({ match }: { match: MatchState }) {
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

      // Canvas/ring backdrop.
      const g = cx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#1a0e08");
      g.addColorStop(0.6, "#3a1f10");
      g.addColorStop(1, "#0e0805");
      cx.fillStyle = g;
      cx.fillRect(0, 0, w, h);

      // Top ropes.
      cx.strokeStyle = "rgba(255,200,80,0.45)";
      cx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const y = 18 + i * 14;
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(w, y);
        cx.stroke();
      }
      cx.fillStyle = "rgba(0,0,0,0.55)";
      cx.fillRect(0, 0, w, 18);

      // Ring canvas pattern hint.
      cx.fillStyle = "rgba(255,255,255,0.03)";
      for (let x = 0; x < w; x += 40) cx.fillRect(x, h - 28, 18, 4);

      const tickMs = performance.now();
      const red = match.boxers[0];
      const blue = match.boxers[1];
      const stateRed = stateForBoxer(0, match);
      const stateBlue = stateForBoxer(1, match);

      const flashRedHead = match.phase === "resolving" && match.lastResolve?.landed && match.activeIdx === 1 && match.lastResolve.target === "head";
      const flashRedBody = match.phase === "resolving" && match.lastResolve?.landed && match.activeIdx === 1 && match.lastResolve.target === "body";
      const flashBlueHead = match.phase === "resolving" && match.lastResolve?.landed && match.activeIdx === 0 && match.lastResolve.target === "head";
      const flashBlueBody = match.phase === "resolving" && match.lastResolve?.landed && match.activeIdx === 0 && match.lastResolve.target === "body";

      const baseY = h - DEST_H + 4;
      drawProceduralBoxer(cx, 14, baseY, stateRed, red.def.color, "right", tickMs, flashRedHead, flashRedBody);
      drawProceduralBoxer(cx, w - DEST_W - 14, baseY, stateBlue, blue.def.color, "left", tickMs, flashBlueHead, flashBlueBody);

      // Center "POW!" pop on landed power shot.
      if (match.phase === "resolving" && match.lastResolve?.landed && match.lastResolve.powerShot) {
        cx.font = "bold 18px monospace";
        cx.fillStyle = "#fde047";
        cx.textAlign = "center";
        cx.fillText("POW!", w / 2, h / 2);
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
      style={{ border: "1.5px solid rgba(255,200,80,0.40)" }}>
      <canvas ref={canvasRef} width={360} height={DEST_H + 16}
        style={{ display: "block", width: "100%", height: "auto", imageRendering: "pixelated" }} />
    </div>
  );
}

function stateForBoxer(idx: 0 | 1, match: MatchState): BoxerStateId {
  const isActive = match.activeIdx === idx;
  if (match.phase === "matchEnd") {
    if (match.winnerIdx === idx) return "idle";
    if (match.winnerIdx === ((1 - idx) as 0 | 1)) return "ko";
    return "idle";
  }
  if (match.phase === "knockdown") {
    return isActive ? "idle" : "knockdown";
  }
  if (match.phase === "resolving" && match.lastResolve) {
    const r = match.lastResolve;
    if (isActive) {
      if (r.strike === "jab" || r.strike === "cross") return "jab";
      return "power";
    }
    if (r.landed) return "hit";
    if (r.defense === "dodge") return "dodge";
    return "block";
  }
  if (match.phase === "decision") {
    return isActive ? "idle" : "block";
  }
  return "idle";
}

function ResolveLine({ resolve }: { resolve: NonNullable<MatchState["lastResolve"]> }) {
  const color = resolve.knockdown ? "#fde047" : resolve.landed ? "#86efac" : "#9aa6bf";
  return (
    <div className="rounded-lg p-2 text-[11px] text-center font-mono"
      style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${color}55`, color }}>
      {resolve.text}
    </div>
  );
}

function Banner({ text, color }: { text: string; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center font-display tracking-widest text-[12px]"
      style={{
        background: `${color}14`, border: `1.5px solid ${color}`,
        color, textShadow: `0 0 12px ${color}55`,
      }}>
      {text}
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

function AttackPicker({ who, activeName, activeColor, onPick }: {
  who: MatchState["boxers"][number];
  activeName: string;
  activeColor: string;
  onPick: (strike: StrikeId, target: TargetZone, spendPower: boolean) => void;
}) {
  const [target, setTarget] = useState<TargetZone>("head");
  const [spendPower, setSpendPower] = useState(false);
  const powerReady = who.powerMeter >= POWER_TARGET_CHARGE;
  return (
    <section className="rounded-2xl p-3" style={{
      background: `linear-gradient(135deg, ${activeColor}22, rgba(10,10,20,0.95))`,
      border: `1.5px solid ${activeColor}`,
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: activeColor }}>
          ▶ {activeName.toUpperCase()} — THROW
        </div>
        <div className="flex gap-1">
          <button onClick={() => setTarget("head")}
            className="px-2 py-1 rounded text-[10px] font-display tracking-widest pressable touch-target"
            style={{
              background: target === "head" ? "rgba(248,113,113,0.30)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${target === "head" ? "#f87171" : "rgba(255,255,255,0.10)"}`,
              color: target === "head" ? "#f87171" : "#fef3c7",
            }}>HEAD</button>
          <button onClick={() => setTarget("body")}
            className="px-2 py-1 rounded text-[10px] font-display tracking-widest pressable touch-target"
            style={{
              background: target === "body" ? "rgba(251,146,60,0.30)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${target === "body" ? "#fb923c" : "rgba(255,255,255,0.10)"}`,
              color: target === "body" ? "#fb923c" : "#fef3c7",
            }}>BODY</button>
        </div>
      </div>
      <button onClick={() => powerReady && setSpendPower(s => !s)} disabled={!powerReady}
        className="w-full mb-2 py-1.5 rounded-lg text-[10px] font-display tracking-widest pressable touch-target"
        style={{
          background: spendPower ? "rgba(253,224,71,0.30)" : powerReady ? "rgba(253,224,71,0.10)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${powerReady ? "#fde047" : "rgba(255,255,255,0.10)"}`,
          color: powerReady ? "#fde047" : "#9aa6bf",
          opacity: powerReady ? 1 : 0.5,
        }}>
        ⚡ POWER SHOT {spendPower ? "(LOADED)" : powerReady ? "READY — TAP TO LOAD" : "BUILD UP METER"}
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        {STRIKES.map(s => {
          const meta = STRIKE_META[s];
          const cost = meta.staminaCost;
          const tooTired = who.strategic.stamina.value < cost;
          return (
            <button key={s} onClick={() => !tooTired && onPick(s, target, spendPower)} disabled={tooTired}
              className="rounded-lg p-2 text-left pressable touch-target"
              style={{
                background: tooTired ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.30)",
                border: `1px solid ${tooTired ? "rgba(255,255,255,0.10)" : `${activeColor}80`}`,
                opacity: tooTired ? 0.4 : 1,
                minHeight: 56,
              }}>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{meta.emoji}</span>
                <span className="text-[9px] font-mono opacity-70" style={{ color: "#fef3c7" }}>−{cost} GAS</span>
              </div>
              <div className="font-display tracking-widest text-[11px] mt-1" style={{ color: "#fef3c7" }}>{meta.label}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DefensePicker({ who, passiveName, passiveColor, incomingMaskedTarget, onPick }: {
  who: MatchState["boxers"][number];
  passiveName: string;
  passiveColor: string;
  /** We intentionally do NOT reveal the strike type — only target zone (head/body) since that's a physical tell. */
  incomingMaskedTarget?: TargetZone;
  onPick: (d: DefenseId) => void;
}) {
  return (
    <section className="rounded-2xl p-3" style={{
      background: `linear-gradient(135deg, ${passiveColor}22, rgba(10,10,20,0.95))`,
      border: `1.5px solid ${passiveColor}`,
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: passiveColor }}>
          ▶ {passiveName.toUpperCase()} — DEFEND
        </div>
        {incomingMaskedTarget && (
          <div className="text-[9px] font-mono opacity-90" style={{ color: "#fde047" }}>
            AIMED AT {incomingMaskedTarget.toUpperCase()}
          </div>
        )}
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
                minHeight: 64,
              }}>
              <div className="text-2xl">{meta.emoji}</div>
              <div className="font-display tracking-widest text-[11px] mt-1" style={{ color: "#fef3c7" }}>{meta.label}</div>
              <div className="text-[9px] font-mono opacity-70 mt-0.5" style={{ color: "#fef3c7" }}>−{cost} GAS</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ResultCard({ match, aName, bName, onPlayAgain, onSwitchSides, onHome }: {
  match: MatchState; aName: string; bName: string;
  onPlayAgain: () => void; onSwitchSides: () => void; onHome: () => void;
}) {
  const winnerIdx = match.winnerIdx;
  const hasWinner = winnerIdx === 0 || winnerIdx === 1;
  const winnerName = hasWinner ? (winnerIdx === 0 ? aName : bName) : "DRAW";
  const winnerColor = hasWinner ? (winnerIdx === 0 ? "#f87171" : "#60a5fa") : "#fde047";
  const method = match.endMethod ?? "decision";
  const headline = !hasWinner
    ? "DRAW — SPLIT DECISION"
    : method === "ko"
    ? `${winnerName.toUpperCase()} WINS BY KO!`
    : `${winnerName.toUpperCase()} WINS BY DECISION`;
  const winner = hasWinner ? match.boxers[winnerIdx as 0 | 1] : undefined;
  const loser = hasWinner ? match.boxers[(1 - (winnerIdx as 0 | 1)) as 0 | 1] : undefined;
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
          {method === "ko"
            ? `${winner.def.name} dropped ${loser.def.name} for the count in round ${match.round}.`
            : `Judges: ${winner.def.name} ${winner.hitsLanded} hits / ${winner.powerShotsLanded} power shots — vs ${loser.def.name} ${loser.hitsLanded} / ${loser.powerShotsLanded}.`}
        </div>
      )}
      <div className="flex gap-2 justify-center mt-4 flex-wrap">
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
        <button onClick={onHome}
          className="px-4 py-3 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#fef3c7" }}>
          HUB
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
          style={{ background: "#f87171", color: "#0a0a14" }}>
          Pick fighters
        </button>
      </div>
    </div>
  );
}
