// src/combat-sports/boxing/Boxing.tsx
//
// Boxing â€” head-to-head strategic boxing match. Side-view canvas with
// two boxer sprites; action-picker UI underneath. Phases progress as:
//   setup â†’ intro â†’ decision â†’ resolving â†’ (knockdown) â†’ roundEnd
//        â†’ decision â†’ ... â†’ matchEnd
// Modes: vs-CPU (Easy/Normal/Hard) and 2P (same device, sequential
// pick reveal).

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { BOXERS, boxerById, type BoxerDef } from "./fighters";
import { STRIKE_META, DEFENSE_META, type StrikeId, type DefenseId, type TargetZone } from "./rps";
import {
  newMatch, applyDecision, advanceClock, cpuDecide,
  KD_COUNTDOWN_SECONDS, POWER_TARGET_CHARGE, KNOCKDOWN_TARGET_CHARGE,
  HP_MAX_HEAD, HP_MAX_BODY, ROUNDS,
  type MatchState, type PlayerDecision, type BoxerRuntime,
} from "./engine";
import { GAME_PLANS } from "../../sports/strategic/plans";
import type { PlanId } from "../../sports/strategic/types";
import {
  getBoxerSheet, getStateDef, onBoxingSpritesReady, preloadBoxingSprites,
  DEST_W, DEST_H, type BoxerStateId,
} from "./sprites";

type Mode = "cpu" | "2p";
type Difficulty = "easy" | "normal" | "hard";
type Screen =
  | { kind: "setup" }
  | { kind: "match"; state: MatchState };

interface SetupConfig {
  mode: Mode;
  difficulty: Difficulty;
  redId: string;
  blueId: string;
  redPlan: PlanId;
  bluePlan: PlanId;
}

const DEFAULT_SETUP: SetupConfig = {
  mode: "cpu", difficulty: "normal",
  redId: "tank", blueId: "iris",
  redPlan: "aggressive", bluePlan: "balanced",
};

export default function Boxing() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>({ kind: "setup" });
  const [setup, setSetup] = useState<SetupConfig>(DEFAULT_SETUP);

  useEffect(() => { preloadBoxingSprites(); }, []);

  function start(cfg: SetupConfig) {
    const m = newMatch(
      boxerById(cfg.redId), cfg.redPlan,
      boxerById(cfg.blueId), cfg.bluePlan,
    );
    m.phase = "intro";
    setSetup(cfg);
    setScreen({ kind: "match", state: m });
  }
  function rematch() { start(setup); }
  function home() { navigate("/"); }

  return (
    <div className="min-h-screen pb-12" style={{
      background: "radial-gradient(900px 600px at 50% 0%, rgba(248,113,113,0.18), transparent 60%), linear-gradient(180deg, #0a0814 0%, #050308 100%)",
    }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto safe-top">
        <button onClick={home} aria-label="Back"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#f87171" }}>ðŸ¥Š COMBAT SPORTS</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fef3c7" }}>BOXING</h1>
        </div>
      </header>

      {screen.kind === "setup" && (
        <SetupScreen setup={setup} setSetup={setSetup} onStart={start} />
      )}
      {screen.kind === "match" && (
        <MatchScreen initial={screen.state} mode={setup.mode}
          difficulty={setup.difficulty} onRematch={rematch} onHome={home} />
      )}

      <div className="max-w-3xl mx-auto px-4 mt-3">
        <div className="rounded-lg p-2 text-[10px]" style={{
          background: "rgba(251,146,60,0.10)",
          border: "1px solid rgba(251,146,60,0.35)",
          color: "#fed7aa",
        }}>
          âš ï¸ Sprites are luizmelo Martial Hero (red/blue corner tinted) â€” no true CC0 boxing pack
          was available. Gloves overlay + dedicated boxer art queued for Phase 3 polish.
        </div>
      </div>
    </div>
  );
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SETUP
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SetupScreen({ setup, setSetup, onStart }: {
  setup: SetupConfig; setSetup: (s: SetupConfig) => void; onStart: (s: SetupConfig) => void;
}) {
  function set<K extends keyof SetupConfig>(k: K, v: SetupConfig[K]) {
    setSetup({ ...setup, [k]: v });
  }
  const red = boxerById(setup.redId);
  const blue = boxerById(setup.blueId);
  return (
    <main className="px-4 max-w-3xl mx-auto space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <ModeCard active={setup.mode === "cpu"} onClick={() => set("mode", "cpu")}
          label="VS CPU" sub="Adaptive AI" emoji="ðŸ¤–" />
        <ModeCard active={setup.mode === "2p"} onClick={() => set("mode", "2p")}
          label="2 PLAYER" sub="Same device" emoji="ðŸ‘¥" />
      </div>

      {setup.mode === "cpu" && (
        <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#fbbf24" }}>CPU DIFFICULTY</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(["easy", "normal", "hard"] as Difficulty[]).map(d => (
              <button key={d} onClick={() => set("difficulty", d)}
                className="px-2 py-2 rounded-lg text-[11px] font-display tracking-widest pressable touch-target"
                style={{
                  background: setup.difficulty === d ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${setup.difficulty === d ? "#fbbf24" : "rgba(255,255,255,0.10)"}`,
                  color: setup.difficulty === d ? "#fbbf24" : "#fef3c7",
                }}>
                {d.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      <FighterPicker title="RED CORNER" corner="red" selected={red}
        onSelect={(b) => set("redId", b.id)} disabledId={blue.id} />
      <PlanPicker title="RED CORNER PLAN" selected={setup.redPlan} onSelect={(p) => set("redPlan", p)} />

      <FighterPicker title={setup.mode === "2p" ? "BLUE CORNER (P2)" : "BLUE CORNER (CPU)"}
        corner="blue" selected={blue}
        onSelect={(b) => set("blueId", b.id)} disabledId={red.id} />
      <PlanPicker title="BLUE CORNER PLAN" selected={setup.bluePlan} onSelect={(p) => set("bluePlan", p)} />

      <button onClick={() => onStart(setup)}
        className="w-full py-3 rounded-xl font-display tracking-widest text-[13px] pressable touch-target"
        style={{ background: "linear-gradient(135deg, #f87171, #dc2626)", color: "#fef3c7" }}>
        RING THE BELL
      </button>
    </main>
  );
}

function ModeCard({ active, onClick, label, sub, emoji }: { active: boolean; onClick: () => void; label: string; sub: string; emoji: string; }) {
  return (
    <button onClick={onClick} className="rounded-2xl p-3 text-left pressable touch-target"
      style={{
        background: active ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.04)",
        border: `1.5px solid ${active ? "#f87171" : "rgba(255,255,255,0.10)"}`,
      }}>
      <div className="text-2xl">{emoji}</div>
      <div className="font-display tracking-widest text-[12px] mt-1" style={{ color: active ? "#f87171" : "#fef3c7" }}>{label}</div>
      <div className="text-[10px] opacity-70" style={{ color: "#fef3c7" }}>{sub}</div>
    </button>
  );
}

function FighterPicker({ title, corner, selected, onSelect, disabledId }: {
  title: string; corner: "red" | "blue"; selected: BoxerDef;
  onSelect: (b: BoxerDef) => void; disabledId?: string;
}) {
  return (
    <div className="rounded-2xl p-3" style={{
      background: corner === "red" ? "rgba(220,38,38,0.08)" : "rgba(37,99,235,0.08)",
      border: `1px solid ${corner === "red" ? "rgba(220,38,38,0.30)" : "rgba(37,99,235,0.30)"}`,
    }}>
      <div className="text-[10px] tracking-[0.3em] font-display mb-2"
        style={{ color: corner === "red" ? "#fca5a5" : "#93c5fd" }}>{title}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {BOXERS.map(b => {
          const isSel = b.id === selected.id;
          const isDisabled = b.id === disabledId;
          return (
            <button key={b.id} onClick={() => !isDisabled && onSelect(b)} disabled={isDisabled}
              className="rounded-lg p-2 text-left pressable touch-target"
              style={{
                background: isDisabled ? "rgba(255,255,255,0.02)"
                  : isSel ? `${b.color}22` : "rgba(255,255,255,0.04)",
                border: `1px solid ${isSel ? b.color : "rgba(255,255,255,0.10)"}`,
                opacity: isDisabled ? 0.3 : 1,
              }}>
              <div className="font-display text-[11px] truncate" style={{ color: "#fef3c7" }}>{b.name}</div>
              <div className="text-[9px] opacity-70 truncate" style={{ color: b.color }}>"{b.nickname}"</div>
              <div className="text-[8px] mt-1 font-mono opacity-80" style={{ color: "#fef3c7" }}>
                PWR {b.stats.power} Â· SPD {b.stats.speed} Â· CHIN {b.stats.chin}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlanPicker({ title, selected, onSelect }: { title: string; selected: PlanId; onSelect: (p: PlanId) => void; }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: "#a78bfa" }}>{title}</div>
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.values(GAME_PLANS)).map(p => (
          <button key={p.id} onClick={() => onSelect(p.id)}
            className="rounded-lg p-2 text-left pressable touch-target"
            style={{
              background: selected === p.id ? "rgba(167,139,250,0.20)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${selected === p.id ? "#a78bfa" : "rgba(255,255,255,0.10)"}`,
            }}>
            <div className="font-display tracking-widest text-[10px]" style={{ color: selected === p.id ? "#a78bfa" : "#fef3c7" }}>
              {p.label}
            </div>
            <div className="text-[9px] mt-0.5 opacity-80" style={{ color: "#fef3c7" }}>{p.tradeoff}</div>
          </button>
        ))}
      </div>
    </div>
  );
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MATCH SCREEN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MatchScreen({ initial, mode, difficulty, onRematch, onHome }: {
  initial: MatchState; mode: Mode; difficulty: Difficulty;
  onRematch: () => void; onHome: () => void;
}) {
  const [match, setMatch] = useState<MatchState>(initial);
  const stateRef = useRef(match);
  stateRef.current = match;

  const [pendingPick, setPendingPick] = useState<{ strike: StrikeId; target: TargetZone; spendPower: boolean } | null>(null);

  useEffect(() => {
    if (match.phase !== "intro") return;
    const t = setTimeout(() => setMatch(prev => ({ ...prev, phase: "decision" })), 800);
    return () => clearTimeout(t);
  }, [match.phase]);

  useEffect(() => {
    if (match.phase !== "knockdown" || match.countdown === undefined) return;
    if (match.countdown <= 0) {
      const next = structuredClone(match);
      advanceClock(next);
      setMatch(next);
      return;
    }
    const t = setTimeout(() => {
      setMatch(prev => ({ ...prev, countdown: Math.max(0, (prev.countdown ?? 0) - 1) }));
    }, 1000);
    return () => clearTimeout(t);
  }, [match.phase, match.countdown]);

  useEffect(() => {
    if (match.phase !== "roundEnd") return;
    const t = setTimeout(() => setMatch(prev => ({ ...prev, phase: "decision" })), 1200);
    return () => clearTimeout(t);
  }, [match.phase]);

  useEffect(() => {
    if (match.phase !== "resolving") return;
    const t = setTimeout(() => {
      const next = structuredClone(match);
      advanceClock(next);
      setMatch(next);
    }, 1400);
    return () => clearTimeout(t);
  }, [match.phase]);

  function commitDecision(decision: PlayerDecision) {
    const next = structuredClone(stateRef.current);
    applyDecision(next, decision);
    next.phase = "resolving";
    setMatch(next);
    setPendingPick(null);
  }

  function onActivePick(strike: StrikeId, target: TargetZone, spendPower: boolean) {
    if (match.phase !== "decision") return;
    if (mode === "cpu") {
      const cpuIdx = (1 - match.activeIdx) as 0 | 1;
      const cpu = cpuDecide(match, cpuIdx, difficulty);
      const defense = cpu.defense ?? "block";
      commitDecision({ strike, target, spendPower, defense });
    } else {
      setPendingPick({ strike, target, spendPower });
    }
  }
  function onPassivePick(defense: DefenseId) {
    if (!pendingPick) return;
    commitDecision({ ...pendingPick, defense });
  }

  useEffect(() => {
    if (mode !== "cpu") return;
    if (match.phase !== "decision") return;
    if (match.activeIdx !== 1) return;
    if (pendingPick) return;
    const t = setTimeout(() => {
      const cpu = cpuDecide(match, 1, difficulty);
      setPendingPick({ strike: cpu.strike!, target: cpu.target, spendPower: !!cpu.spendPower });
    }, 650);
    return () => clearTimeout(t);
  }, [match.phase, match.activeIdx, mode, difficulty, match.round, match.decisionInRound, pendingPick]);

  const cpuIsActive = mode === "cpu" && match.activeIdx === 1;
  const isMatchEnd = match.phase === "matchEnd";

  return (
    <main className="px-4 max-w-3xl mx-auto space-y-2">
      <Scoreboard match={match} />
      <RingCanvas match={match} />
      {match.lastResolve && <ResolveLine resolve={match.lastResolve} />}

      {!isMatchEnd && match.phase === "decision" && !pendingPick && !cpuIsActive && (
        <AttackPicker who={match.boxers[match.activeIdx]} onPick={onActivePick} />
      )}
      {!isMatchEnd && match.phase === "decision" && (pendingPick || cpuIsActive) && (
        <DefensePicker who={match.boxers[1 - match.activeIdx]}
          incoming={pendingPick ?? undefined} onPick={onPassivePick}
          waiting={cpuIsActive && !pendingPick} />
      )}
      {match.phase === "intro" && <Banner text={`ROUND ${match.round} â€” SECONDS OUT!`} color="#fde047" />}
      {match.phase === "roundEnd" && <Banner text={`END OF ROUND ${match.round - 1}`} color="#67e8f9" />}
      {match.phase === "knockdown" && (
        <Banner text={`COUNT: ${match.countdown ?? KD_COUNTDOWN_SECONDS}`} color="#f87171" />
      )}
      {isMatchEnd && <ResultCard match={match} onRematch={onRematch} onHome={onHome} />}
    </main>
  );
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Scoreboard + bars
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Scoreboard({ match }: { match: MatchState }) {
  const [red, blue] = match.boxers;
  return (
    <div className="rounded-2xl p-2" style={{ background: "rgba(0,0,0,0.50)", border: "1px solid rgba(255,255,255,0.10)" }}>
      <div className="flex items-center justify-between mb-1">
        <CornerName b={red} side="left" active={match.activeIdx === 0} />
        <div className="text-center">
          <div className="text-[9px] tracking-widest opacity-70 font-display" style={{ color: "#fef3c7" }}>ROUND</div>
          <div className="font-display text-lg" style={{ color: "#fde047" }}>{match.round} / {ROUNDS}</div>
        </div>
        <CornerName b={blue} side="right" active={match.activeIdx === 1} />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <BarStack b={red} side="left" />
        <BarStack b={blue} side="right" />
      </div>
    </div>
  );
}

function CornerName({ b, side, active }: { b: BoxerRuntime; side: "left" | "right"; active: boolean; }) {
  return (
    <div className={`flex-1 ${side === "right" ? "text-right" : "text-left"}`}>
      <div className="font-display text-[12px] truncate" style={{ color: b.def.color }}>
        {active ? "â–¶ " : ""}{b.def.name}
      </div>
      <div className="text-[9px] opacity-70 truncate" style={{ color: "#fef3c7" }}>"{b.def.nickname}"</div>
    </div>
  );
}

function BarStack({ b, side }: { b: BoxerRuntime; side: "left" | "right"; }) {
  const align = side === "right" ? "items-end" : "items-start";
  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      <Bar label="HEAD" value={b.hpHead} max={HP_MAX_HEAD} color="#f87171" side={side} />
      <Bar label="BODY" value={b.hpBody} max={HP_MAX_BODY} color="#fb923c" side={side} />
      <Bar label="GAS"  value={b.strategic.stamina.value} max={100} color="#86efac" side={side} />
      <Bar label="POW"  value={b.powerMeter} max={POWER_TARGET_CHARGE} color="#fde047" side={side}
        flash={b.powerMeter >= POWER_TARGET_CHARGE} />
      <Bar label="KD"   value={b.knockdownMeter} max={KNOCKDOWN_TARGET_CHARGE} color="#a78bfa" side={side} />
    </div>
  );
}

function Bar({ label, value, max, color, side, flash }: { label: string; value: number; max: number; color: string; side: "left" | "right"; flash?: boolean; }) {
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


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Canvas â€” two boxers facing
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RingCanvas({ match }: { match: MatchState }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    onBoxingSpritesReady(() => { tickRef.current += 1; });
  }, []);

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

      const g = cx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#1a0e08");
      g.addColorStop(0.6, "#3a1f10");
      g.addColorStop(1, "#0e0805");
      cx.fillStyle = g;
      cx.fillRect(0, 0, w, h);

      cx.strokeStyle = "rgba(255,200,80,0.4)";
      cx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const y = 18 + i * 16;
        cx.beginPath();
        cx.moveTo(0, y);
        cx.lineTo(w, y);
        cx.stroke();
      }
      cx.fillStyle = "rgba(0,0,0,0.55)";
      cx.fillRect(0, 0, w, 18);

      const [red, blue] = match.boxers;
      drawBoxer(cx, w, h, red, "red", match, "left");
      drawBoxer(cx, w, h, blue, "blue", match, "right");

      tickRef.current += 1;
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
      <canvas ref={canvasRef} width={360} height={DEST_H + 12}
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

function drawBoxer(
  ctx: CanvasRenderingContext2D,
  canvasW: number, canvasH: number,
  rt: BoxerRuntime, corner: "red" | "blue",
  match: MatchState, side: "left" | "right",
) {
  const idx = (corner === "red" ? 0 : 1) as 0 | 1;
  const stateId = stateForBoxer(idx, match);
  const sheet = getBoxerSheet(corner, rt.def.color);
  const def = getStateDef(stateId);
  const frames = sheet.frames[stateId];

  const baseY = canvasH - DEST_H + 4;
  const baseX = side === "left" ? 14 : canvasW - DEST_W - 14;

  if (!sheet.ready) {
    ctx.fillStyle = rt.def.color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(baseX + 30, baseY + 30, 60, 100);
    ctx.globalAlpha = 1;
    return;
  }

  const fps = def.fps;
  const frameIdx = Math.floor((performance.now() / 1000) * fps) % frames.length;
  const frame = frames[frameIdx];

  try {
    ctx.drawImage(frame, baseX, baseY);
  } catch {
    /* ignore */
  }

  if (stateId === "knockdown" || stateId === "ko") {
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#fde047";
    ctx.fillText("âœ¦ â˜… âœ¦", baseX + 30, baseY + 28);
  }
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Action pickers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AttackPicker({ who, onPick }: {
  who: BoxerRuntime; onPick: (strike: StrikeId, target: TargetZone, spendPower: boolean) => void;
}) {
  const [target, setTarget] = useState<TargetZone>("head");
  const [spendPower, setSpendPower] = useState<boolean>(false);
  const powerReady = who.powerMeter >= POWER_TARGET_CHARGE;
  return (
    <div className="rounded-2xl p-3" style={{
      background: "rgba(220,38,38,0.10)", border: `1.5px solid ${who.def.color}`,
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: who.def.color }}>
          â–¶ {who.def.name.toUpperCase()} ATTACKS
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
        âš¡ POWER SHOT {spendPower ? "(LOADED)" : powerReady ? "READY â€” TAP TO LOAD" : "BUILD UP METER"}
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        {(["jab", "cross", "hook", "uppercut"] as StrikeId[]).map(s => {
          const meta = STRIKE_META[s];
          const cost = meta.staminaCost;
          const tooTired = who.strategic.stamina.value < cost;
          return (
            <button key={s} onClick={() => !tooTired && onPick(s, target, spendPower)} disabled={tooTired}
              className="rounded-lg p-2 text-left pressable touch-target"
              style={{
                background: tooTired ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.30)",
                border: `1px solid ${tooTired ? "rgba(255,255,255,0.10)" : "rgba(248,113,113,0.40)"}`,
                opacity: tooTired ? 0.4 : 1,
              }}>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{meta.emoji}</span>
                <span className="text-[9px] font-mono opacity-70" style={{ color: "#fef3c7" }}>âˆ’{cost} GAS</span>
              </div>
              <div className="font-display tracking-widest text-[11px] mt-1" style={{ color: "#fef3c7" }}>{meta.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DefensePicker({ who, incoming, onPick, waiting }: {
  who: BoxerRuntime;
  incoming?: { strike: StrikeId; target: TargetZone; spendPower: boolean };
  onPick: (defense: DefenseId) => void;
  waiting?: boolean;
}) {
  return (
    <div className="rounded-2xl p-3" style={{
      background: "rgba(37,99,235,0.10)", border: `1.5px solid ${who.def.color}`,
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: who.def.color }}>
          â–¶ {who.def.name.toUpperCase()} DEFENDS
        </div>
        {incoming && (
          <div className="text-[9px] font-mono opacity-90" style={{ color: "#fde047" }}>
            INCOMING: {STRIKE_META[incoming.strike].label} â†’ {incoming.target.toUpperCase()} {incoming.spendPower ? "âš¡" : ""}
          </div>
        )}
      </div>
      {waiting ? (
        <div className="text-center text-[11px] py-3 opacity-80" style={{ color: "#fef3c7" }}>
          CPU is reading youâ€¦
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {(["block", "dodge", "clinch"] as DefenseId[]).map(d => {
            const meta = DEFENSE_META[d];
            const cost = meta.staminaCost;
            const tooTired = who.strategic.stamina.value < cost;
            return (
              <button key={d} onClick={() => !tooTired && onPick(d)} disabled={tooTired}
                className="rounded-lg p-2 text-center pressable touch-target"
                style={{
                  background: tooTired ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.30)",
                  border: `1px solid ${tooTired ? "rgba(255,255,255,0.10)" : "rgba(37,99,235,0.50)"}`,
                  opacity: tooTired ? 0.4 : 1,
                }}>
                <div className="text-2xl">{meta.emoji}</div>
                <div className="font-display tracking-widest text-[11px] mt-1" style={{ color: "#fef3c7" }}>{meta.label}</div>
                <div className="text-[9px] font-mono opacity-70 mt-0.5" style={{ color: "#fef3c7" }}>âˆ’{cost} GAS</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Result card
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ResultCard({ match, onRematch, onHome }: {
  match: MatchState; onRematch: () => void; onHome: () => void;
}) {
  const winnerIdx = match.winnerIdx;
  const hasWinner = winnerIdx === 0 || winnerIdx === 1;
  const winner = hasWinner ? match.boxers[winnerIdx as 0 | 1] : undefined;
  const loserIdx: 0 | 1 | undefined = winnerIdx === 0 ? 1 : winnerIdx === 1 ? 0 : undefined;
  const loser = loserIdx !== undefined ? match.boxers[loserIdx] : undefined;
  const method = match.endMethod ?? "decision";
  const headline = !winner
    ? "DRAW â€” SPLIT DECISION"
    : method === "ko"
    ? `${winner.def.name.toUpperCase()} WINS BY KO!`
    : `${winner.def.name.toUpperCase()} WINS BY DECISION`;
  return (
    <div className="rounded-2xl p-4 text-center"
      style={{
        background: winner ? `${winner.def.color}18` : "rgba(255,255,255,0.06)",
        border: `2px solid ${winner ? winner.def.color : "rgba(255,255,255,0.20)"}`,
      }}>
      <div className="text-[10px] tracking-[0.3em] font-display opacity-80" style={{ color: "#fde047" }}>FIGHT'S OVER</div>
      <div className="font-display text-xl mt-1" style={{ color: winner ? winner.def.color : "#fef3c7" }}>
        {headline}
      </div>
      {winner && loser && (
        <div className="text-[11px] mt-2 opacity-90" style={{ color: "#fef3c7" }}>
          {method === "ko"
            ? `${winner.def.name} dropped ${loser.def.name} for the count in round ${match.round}.`
            : `Judges: ${winner.def.name} ${winner.hitsLanded} hits / ${winner.powerShotsLanded} power shots vs ${loser.def.name} ${loser.hitsLanded} / ${loser.powerShotsLanded}.`}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={onRematch}
          className="flex-1 py-2.5 rounded-xl font-display tracking-widest text-[11px] pressable touch-target"
          style={{ background: "linear-gradient(135deg, #f87171, #dc2626)", color: "#fef3c7" }}>
          REMATCH
        </button>
        <button onClick={onHome}
          className="flex-1 py-2.5 rounded-xl font-display tracking-widest text-[11px] pressable touch-target"
          style={{ background: "rgba(255,255,255,0.06)", color: "#fef3c7", border: "1px solid rgba(255,255,255,0.15)" }}>
          ARCADE
        </button>
      </div>
    </div>
  );
}
