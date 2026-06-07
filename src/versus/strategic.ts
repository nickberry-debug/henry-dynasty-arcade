// src/versus/strategic.ts
//
// Bridge between the existing Pass-and-Play / vs-CPU UI pages and the
// sport-agnostic strategic layer. Maps each sport's UI picks into
// generic strategic actions and exposes helpers for CPU picks,
// momentum/stamina updates, post-processing outcomes, and signature
// firing.

import type {
  PitcherPick, BatterPick, PitchType,
  FootballPickOffense, FootballPickDefense,
  PitchOutcome, FootballOutcome,
} from "./types";
import type {
  GamePlan, MatchStrategicState, PlayAction, SideState,
  SportStrategyConfig, StrategicResolve,
} from "../sports/strategic";
import {
  BASEBALL_RPS, FOOTBALL_RPS,
  GAME_PLANS, newSide, resolveDecision, applyMomentumStamina,
  cpuPick, pushRecent,
} from "../sports/strategic";

// — Action mapping —————————————————————————————————

export function batterToAction(p: BatterPick): PlayAction {
  if (p.swing === "power")   return { id: "swing_power",   safe: false };
  if (p.swing === "contact") return { id: "swing_contact", safe: true };
  return                         { id: "swing_take",    safe: true };
}

export function pitcherToAction(p: PitcherPick): PlayAction {
  if (p.pitch === "fastball")           return { id: "pitch_fast",  safe: true };
  if (p.pitch === "curve" || p.pitch === "slider") return { id: "pitch_curve", safe: false };
  return                                    { id: "pitch_change", safe: true };
}

export function actionToPitcher(actionId: string, zone: PitcherPick["zone"] = "middle"): PitcherPick {
  const pitch: PitchType =
    actionId === "pitch_fast"   ? "fastball" :
    actionId === "pitch_curve"  ? "curve" :
    "changeup";
  return { pitch, zone, intentionalBall: false };
}

export function actionToBatter(actionId: string, guess: BatterPick["guess"] = "middle", bat: BatterPick["bat"] = "balanced"): BatterPick {
  if (actionId === "swing_power")   return { swing: "power",   guess, bat };
  if (actionId === "swing_contact") return { swing: "contact", guess, bat };
  return                                { swing: "take",    guess, bat };
}

export function offenseToAction(p: FootballPickOffense): PlayAction {
  if (p.play === "run_inside" || p.play === "run_outside") {
    return { id: "call_run", safe: p.play === "run_inside" };
  }
  if (p.play === "pass_short" || p.play === "pass_long") {
    return { id: "call_pass", safe: p.play === "pass_short" };
  }
  return { id: "call_trick", safe: false };
}

export function defenseToAction(p: FootballPickDefense): PlayAction {
  if (p.play === "blitz")       return { id: "def_blitz", safe: false };
  if (p.play === "run_stuff")   return { id: "def_blitz", safe: true };
  if (p.play === "zone_short" || p.play === "zone_deep") {
    return { id: "def_cover", safe: p.play === "zone_short" };
  }
  return { id: "def_balanced", safe: true };
}

export function actionToOffense(actionId: string, risky: boolean): FootballPickOffense {
  if (actionId === "call_run")   return { play: risky ? "run_outside" : "run_inside" };
  if (actionId === "call_pass")  return { play: risky ? "pass_long" : "pass_short" };
  return { play: risky ? "play_action" : "screen" };
}

export function actionToDefense(actionId: string, risky: boolean): FootballPickDefense {
  if (actionId === "def_blitz") return { play: risky ? "blitz" : "run_stuff" };
  if (actionId === "def_cover") return { play: risky ? "zone_deep" : "zone_short" };
  return { play: "balanced" };
}

// — Match state ——————————————————————————————————

export function newStrategicMatch(planA: GamePlan, planB: GamePlan): MatchStrategicState {
  return { attacker: newSide(planA), defender: newSide(planB) };
}

export function signatureReady(side: SideState): boolean {
  return side.momentum.value >= 100;
}

// — Outcome post-processing —————————————————————————————

export function postProcessPitch(outcome: PitchOutcome, resolved: StrategicResolve): PitchOutcome {
  if (resolved.attackerUsedSignature && resolved.tilt > 0.4) {
    if (outcome.kind === "single") return { kind: "double" };
    if (outcome.kind === "double") return { kind: "triple" };
    if (outcome.kind === "triple") return { kind: "homer" };
    if (outcome.kind === "foul")   return { kind: "single" };
  }
  if (resolved.defenderUsedSignature && resolved.tilt < -0.4) {
    if (outcome.kind === "foul")   return { kind: "strike-swinging" };
    if (outcome.kind === "single") return { kind: "out", flavor: "lineout" };
  }
  if (!resolved.attackerUsedSignature && !resolved.defenderUsedSignature) {
    if (resolved.tilt > 0.7 && outcome.kind === "foul")  return { kind: "single" };
    if (resolved.tilt < -0.7 && outcome.kind === "single") return { kind: "foul" };
  }
  return outcome;
}

export function postProcessPlay(outcome: FootballOutcome, resolved: StrategicResolve, ballOn: number): FootballOutcome {
  if (resolved.attackerUsedSignature && resolved.tilt > 0.4) {
    if (outcome.kind === "gain" && outcome.yards < 15) {
      const boost = 12 + Math.floor(Math.random() * 8);
      const yards = Math.min(35, outcome.yards + boost);
      if (ballOn + yards >= 100) return { kind: "touchdown" };
      return { kind: "gain", yards, firstDown: outcome.firstDown || yards >= 10 };
    }
    if (outcome.kind === "incomplete") return { kind: "gain", yards: 8, firstDown: false };
  }
  if (resolved.defenderUsedSignature && resolved.tilt < -0.4) {
    if (outcome.kind === "gain" && outcome.yards < 4) {
      return { kind: "loss", yards: -3 - Math.floor(Math.random() * 4) };
    }
  }
  return outcome;
}

// — CPU pickers ——————————————————————————————————

export function cpuPickPitcher(
  selfState: SideState,
  opponentState: SideState,
  difficulty: "easy" | "normal" | "hard" = "normal",
): { pick: PitcherPick; useSignature: boolean; actionId: string } {
  const choice = cpuPick(BASEBALL_RPS, {
    cpuSide: "defender",
    humanRecent: opponentState.recentPicks,
    difficulty,
    selfState, opponentState,
  });
  const zone: PitcherPick["zone"] =
    choice.action.id === "pitch_curve" ? (Math.random() < 0.5 ? "low" : "out") :
    choice.action.id === "pitch_fast"  ? (Math.random() < 0.5 ? "middle" : "in") :
    "out";
  return {
    pick: { pitch: choice.action.id === "pitch_fast" ? "fastball" : choice.action.id === "pitch_curve" ? "curve" : "changeup", zone, intentionalBall: false },
    useSignature: choice.useSignature,
    actionId: choice.action.id,
  };
}

export function cpuPickBatter(
  selfState: SideState,
  opponentState: SideState,
  difficulty: "easy" | "normal" | "hard" = "normal",
): { pick: BatterPick; useSignature: boolean; actionId: string } {
  const choice = cpuPick(BASEBALL_RPS, {
    cpuSide: "attacker",
    humanRecent: opponentState.recentPicks,
    difficulty,
    selfState, opponentState,
  });
  const swing: BatterPick["swing"] =
    choice.action.id === "swing_power"   ? "power" :
    choice.action.id === "swing_contact" ? "contact" : "take";
  const guess: BatterPick["guess"] = (["high","low","in","out","middle"][Math.floor(Math.random() * 5)] as BatterPick["guess"]);
  return { pick: { swing, guess, bat: "balanced" }, useSignature: choice.useSignature, actionId: choice.action.id };
}

export function cpuPickOffense(
  selfState: SideState,
  opponentState: SideState,
  difficulty: "easy" | "normal" | "hard" = "normal",
): { pick: FootballPickOffense; useSignature: boolean; actionId: string } {
  const choice = cpuPick(FOOTBALL_RPS, {
    cpuSide: "attacker",
    humanRecent: opponentState.recentPicks,
    difficulty,
    selfState, opponentState,
  });
  return {
    pick: actionToOffense(choice.action.id, !choice.action.safe),
    useSignature: choice.useSignature,
    actionId: choice.action.id,
  };
}

export function cpuPickDefense(
  selfState: SideState,
  opponentState: SideState,
  difficulty: "easy" | "normal" | "hard" = "normal",
): { pick: FootballPickDefense; useSignature: boolean; actionId: string } {
  const choice = cpuPick(FOOTBALL_RPS, {
    cpuSide: "defender",
    humanRecent: opponentState.recentPicks,
    difficulty,
    selfState, opponentState,
  });
  return {
    pick: actionToDefense(choice.action.id, !choice.action.safe),
    useSignature: choice.useSignature,
    actionId: choice.action.id,
  };
}

// — Resolve glue ——————————————————————————————————

export function tickStrategic(
  config: SportStrategyConfig,
  attackerAction: PlayAction,
  defenderAction: PlayAction,
  state: MatchStrategicState,
  opts: { attackerSignature?: boolean; defenderSignature?: boolean } = {},
): StrategicResolve {
  const resolved = resolveDecision(
    config,
    attackerAction, defenderAction,
    state.attacker, state.defender,
    {
      attackerSignature: opts.attackerSignature && signatureReady(state.attacker),
      defenderSignature: opts.defenderSignature && signatureReady(state.defender),
    },
  );
  state.attacker.recentPicks = pushRecent(state.attacker.recentPicks, attackerAction.id);
  state.defender.recentPicks = pushRecent(state.defender.recentPicks, defenderAction.id);
  applyMomentumStamina(state.attacker, state.defender, resolved);
  return resolved;
}

export { GAME_PLANS };
