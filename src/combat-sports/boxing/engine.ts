// src/combat-sports/boxing/engine.ts
//
// Boxing match state machine. Drives 3 rounds × ~6 decision points per
// round on top of the shared strategic core. Each decision is resolved
// via the BOXING_RPS matchup table + plan + stamina + power-shot
// signature; the resolve is then translated into boxing-native outcomes:
// damage to the target zone, stamina drain, knockdown-meter charge.

import {
  resolveDecision, applyMomentumStamina,
} from "../../sports/strategic/rps";
import { pushRecent, cpuPick } from "../../sports/strategic/cpu";
import { GAME_PLANS } from "../../sports/strategic/plans";
import { newSide } from "../../sports/strategic/match";
import type { PlanId, SideState } from "../../sports/strategic/types";

import { BOXING_RPS, STRIKE_META, type StrikeId, type DefenseId, type TargetZone } from "./rps";
import type { BoxerDef } from "./fighters";

export interface BoxerRuntime {
  def: BoxerDef;
  strategic: SideState;
  hpHead: number;
  hpBody: number;
  knockdownMeter: number;
  powerMeter: number;
  hitsLanded: number;
  powerShotsLanded: number;
  knockdownsSuffered: number;
}

export type MatchPhase =
  | "intro" | "decision" | "resolving"
  | "knockdown" | "roundEnd" | "matchEnd";

export interface MatchState {
  round: number;
  decisionInRound: number;
  phase: MatchPhase;
  activeIdx: 0 | 1;
  boxers: [BoxerRuntime, BoxerRuntime];
  lastResolve?: {
    strike: StrikeId;
    defense: DefenseId;
    target: TargetZone;
    damage: number;
    landed: boolean;
    powerShot: boolean;
    knockdown: boolean;
    text: string;
  };
  countdown?: number;
  winnerIdx?: 0 | 1 | -1;
  endMethod?: "ko" | "decision" | "draw";
}

export const ROUNDS = 3;
export const DECISIONS_PER_ROUND = 6;
export const KNOCKDOWN_TARGET_CHARGE = 100;
export const POWER_TARGET_CHARGE = 100;
export const KD_COUNTDOWN_SECONDS = 10;
export const HP_MAX_HEAD = 100;
export const HP_MAX_BODY = 100;

export function newBoxerRuntime(def: BoxerDef, planId: PlanId): BoxerRuntime {
  const plan = GAME_PLANS[planId];
  const strategic = newSide(plan);
  strategic.stamina.value = 100;
  return {
    def, strategic,
    hpHead: HP_MAX_HEAD, hpBody: HP_MAX_BODY,
    knockdownMeter: 0, powerMeter: 0,
    hitsLanded: 0, powerShotsLanded: 0, knockdownsSuffered: 0,
  };
}

export function newMatch(
  redDef: BoxerDef, redPlan: PlanId,
  blueDef: BoxerDef, bluePlan: PlanId,
): MatchState {
  return {
    round: 1, decisionInRound: 0,
    phase: "intro", activeIdx: 0,
    boxers: [newBoxerRuntime(redDef, redPlan), newBoxerRuntime(blueDef, bluePlan)],
  };
}

export interface PlayerDecision {
  strike?: StrikeId;
  defense?: DefenseId;
  target: TargetZone;
  spendPower?: boolean;
}

function damageFor(strike: StrikeId, quality: number, powerStat: number, isPowerShot: boolean): number {
  const base = STRIKE_META[strike].basePower;
  const powerScale = 0.7 + (powerStat / 10) * 0.6;
  const qualityScale = 0.35 + quality * 1.05;
  const powerBonus = isPowerShot ? 1.55 : 1.0;
  return Math.round(base * powerScale * qualityScale * powerBonus);
}

function strikeStaminaCost(strike: StrikeId, speedStat: number): number {
  const base = STRIKE_META[strike].staminaCost;
  const speedScale = 1.0 - (speedStat - 5) * 0.04;
  return Math.max(2, Math.round(base * speedScale));
}

export function applyDecision(state: MatchState, decision: PlayerDecision): void {
  const active = state.boxers[state.activeIdx];
  const passive = state.boxers[1 - state.activeIdx];

  const strike = decision.strike ?? "jab";
  const defense = decision.defense ?? "block";
  const target = decision.target;

  const usePower = !!decision.spendPower && active.powerMeter >= POWER_TARGET_CHARGE;
  const resolved = resolveDecision(
    BOXING_RPS,
    { id: strike, safe: false },
    { id: defense, safe: true },
    active.strategic, passive.strategic,
    { attackerSignature: usePower, defenderSignature: false },
  );

  const aCost = strikeStaminaCost(strike, active.def.stats.speed);
  active.strategic.stamina.value = Math.max(0, active.strategic.stamina.value - aCost);
  const dCost = STRIKE_META[strike] ? STRIKE_META[strike].staminaCost * 0.3 : 4;
  passive.strategic.stamina.value = Math.max(0, passive.strategic.stamina.value - dCost);

  active.strategic.recentPicks = pushRecent(active.strategic.recentPicks, strike);
  passive.strategic.recentPicks = pushRecent(passive.strategic.recentPicks, defense);

  applyMomentumStamina(active.strategic, passive.strategic, resolved);
  if (usePower) active.powerMeter = 0;

  const quality = Math.max(0, Math.min(1, (resolved.tilt + 1) / 2));
  const landed = resolved.tilt > -0.05;
  const damage = landed ? damageFor(strike, quality, active.def.stats.power, usePower) : 0;
  let knockdown = false;
  if (landed) {
    if (target === "body") {
      passive.hpBody = Math.max(0, passive.hpBody - damage);
      passive.strategic.stamina.value = Math.max(0, passive.strategic.stamina.value - damage * 0.3);
    } else {
      passive.hpHead = Math.max(0, passive.hpHead - damage);
      const chinScale = 1 - (passive.def.stats.chin - 5) * 0.08;
      const kdGain = damage * (usePower ? 1.6 : 1.0) * chinScale;
      passive.knockdownMeter = Math.min(KNOCKDOWN_TARGET_CHARGE, passive.knockdownMeter + kdGain);
      if (passive.knockdownMeter >= KNOCKDOWN_TARGET_CHARGE) {
        knockdown = true;
        passive.knockdownMeter = 0;
        passive.knockdownsSuffered += 1;
      }
    }
    active.hitsLanded += 1;
    if (usePower) active.powerShotsLanded += 1;
    const charge = (damage / 16) * (usePower ? 0 : 22);
    active.powerMeter = Math.min(POWER_TARGET_CHARGE, active.powerMeter + charge);
  } else {
    passive.powerMeter = Math.min(POWER_TARGET_CHARGE, passive.powerMeter + 8);
  }

  const strikeName = STRIKE_META[strike].label;
  const text = !landed
    ? defense === "dodge"  ? `${passive.def.name} slips the ${strikeName.toLowerCase()}`
    : defense === "block"  ? `${passive.def.name} blocks the ${strikeName.toLowerCase()}`
    :                        `${passive.def.name} ties up — ${strikeName.toLowerCase()} smothered`
    : knockdown ? `KNOCKDOWN — ${active.def.name} drops ${passive.def.name}!`
    : usePower  ? `POWER SHOT lands on the ${target} — ${damage} dmg`
    :             `${strikeName} to the ${target} lands — ${damage} dmg`;

  state.lastResolve = { strike, defense, target, damage, landed, powerShot: usePower, knockdown, text };

  if (resolved.tilt < -0.25) state.activeIdx = (1 - state.activeIdx) as 0 | 1;
}

export function advanceClock(state: MatchState): void {
  const passive = state.boxers[1 - state.activeIdx];
  if (passive.hpHead <= 0 && state.phase !== "knockdown" && state.phase !== "matchEnd") {
    state.phase = "knockdown";
    state.countdown = KD_COUNTDOWN_SECONDS;
    state.lastResolve = state.lastResolve
      ? { ...state.lastResolve, knockdown: true, text: `KNOCKOUT — ${passive.def.name} cannot continue!` }
      : undefined;
    return;
  }

  if (state.phase === "knockdown") {
    if (passive.hpHead <= 0 || passive.knockdownsSuffered >= 3) {
      state.phase = "matchEnd";
      state.winnerIdx = state.activeIdx;
      state.endMethod = "ko";
      return;
    }
    passive.hpHead = Math.min(HP_MAX_HEAD, passive.hpHead + 12);
    passive.strategic.stamina.value = Math.min(100, passive.strategic.stamina.value + 8);
    state.phase = "decision";
    state.countdown = undefined;
    return;
  }

  state.decisionInRound += 1;
  if (state.decisionInRound >= DECISIONS_PER_ROUND) {
    state.decisionInRound = 0;
    if (state.round >= ROUNDS) {
      state.phase = "matchEnd";
      state.endMethod = "decision";
      state.winnerIdx = scoreMatch(state);
      return;
    }
    state.round += 1;
    state.phase = "roundEnd";
    for (const b of state.boxers) {
      b.strategic.stamina.value = Math.min(100, b.strategic.stamina.value + 30);
      b.hpHead = Math.min(HP_MAX_HEAD, b.hpHead + 18);
      b.hpBody = Math.min(HP_MAX_BODY, b.hpBody + 12);
    }
    return;
  }
  state.phase = "decision";
}

export function scoreMatch(state: MatchState): 0 | 1 | -1 {
  const [r, b] = state.boxers;
  function judge(weight: { hit: number; power: number; kd: number; hp: number }): 0 | 1 | -1 {
    const rs = r.hitsLanded * weight.hit + r.powerShotsLanded * weight.power
             + b.knockdownsSuffered * weight.kd + (HP_MAX_HEAD - b.hpHead) * weight.hp;
    const bs = b.hitsLanded * weight.hit + b.powerShotsLanded * weight.power
             + r.knockdownsSuffered * weight.kd + (HP_MAX_HEAD - r.hpHead) * weight.hp;
    if (Math.abs(rs - bs) < 2) return -1;
    return rs > bs ? 0 : 1;
  }
  const j1 = judge({ hit: 1.0, power: 2.5, kd: 10, hp: 0.15 });
  const j2 = judge({ hit: 1.2, power: 2.0, kd: 9,  hp: 0.20 });
  const j3 = judge({ hit: 0.8, power: 3.0, kd: 12, hp: 0.10 });
  let rWins = 0; let bWins = 0;
  for (const j of [j1, j2, j3]) {
    if (j === 0) rWins += 1;
    else if (j === 1) bWins += 1;
  }
  if (rWins > bWins) return 0;
  if (bWins > rWins) return 1;
  return -1;
}

export function cpuDecide(
  state: MatchState, cpuIdx: 0 | 1, difficulty: "easy" | "normal" | "hard",
): PlayerDecision {
  const cpuSide = cpuIdx === state.activeIdx ? "attacker" : "defender";
  const me = state.boxers[cpuIdx];
  const opp = state.boxers[1 - cpuIdx];
  // The shared strategic core reads signatureReady off selfState.momentum.signatureReady;
  // mirror our boxing-side power meter into that flag so the adaptive CPU knows when
  // to spend a Power Shot. We keep our authoritative powerMeter on the runtime; this
  // is just a one-way mirror into the strategic-side state for the picker.
  me.strategic.momentum.signatureReady = me.powerMeter >= POWER_TARGET_CHARGE;
  const choice = cpuPick(BOXING_RPS, {
    cpuSide,
    humanRecent: opp.strategic.recentPicks,
    difficulty,
    selfState: me.strategic,
    opponentState: opp.strategic,
  });
  if (cpuSide === "attacker") {
    return {
      strike: choice.action.id as StrikeId,
      target: Math.random() < 0.55 ? "head" : "body",
      spendPower: choice.useSignature,
    };
  }
  return { defense: choice.action.id as DefenseId, target: "head" };
}
