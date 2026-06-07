// src/combat-sports/wrestling/engine.ts
//
// Pro Wrestling match state machine. Sits on top of the shared
// strategic core for plan/stamina/momentum but resolves the
// strike-vs-grapple-vs-reversal RPS plus the high-risk ROPE option
// and the hype-building TAUNT in this file.
//
// Match shape (kid-friendly cap):
//   intro → many decisions of (active attack, passive defense) →
//   when active hype is FULL: a FINISHER becomes pickable →
//   landing a finisher = pin attempt with 0.8s kick-out window →
//   no kick-out → match win.
//
// Alternate win paths:
//   - SUBMISSION LOCK: GRAPPLE with active hype >= 60 + opp stamina
//     < 30% triggers a tap window. If the opponent doesn't tap free
//     in time, it's a submission win.
//   - JUDGES' DECISION fallback if neither lands by the decision cap
//     (DECISIONS_CAP). Kept high so this rarely happens but the
//     match can't run forever.
//
// All damage flows into HP (0..100). Hitting zero HP also ends the
// match (TKO-style) — counts as a finisher win for stats.

import { newSide } from "../../sports/strategic/match";
import { applyMomentumStamina } from "../../sports/strategic/rps";
import { pushRecent, cpuPick } from "../../sports/strategic/cpu";
import { GAME_PLANS } from "../../sports/strategic/plans";
import type { PlanId, SideState, StrategicResolve } from "../../sports/strategic/types";

import { WRESTLING_RPS, ATTACK_META, type AttackId, type DefenseId } from "./rps";
import type { WrestlerDef } from "./wrestlers";

export const HYPE_MAX = 100;
export const HP_MAX = 100;
export const DECISIONS_CAP = 24;          // hard ceiling on match length
export const PIN_KICKOUT_WINDOW_MS = 800; // 0.8s mash window
export const SUBMISSION_ESCAPE_MS = 1500; // 1.5s escape window
export const HYPE_FOR_FINISHER = 100;
export const HYPE_FOR_SUBMISSION = 60;
export const STAMINA_LOW = 30;            // power-move debuff threshold

export interface WrestlerRuntime {
  def: WrestlerDef;
  strategic: SideState;
  hp: number;
  hype: number;
  hitsLanded: number;
  finishersLanded: number;
  taunts: number;
}

export type MatchPhase =
  | "intro" | "decision" | "resolving"
  | "finisher_intro" | "pin_attempt" | "submission_attempt"
  | "matchEnd";

export type EndMethod = "finisher" | "submission" | "tko" | "decision" | "draw";

export interface MatchState {
  decisionCount: number;
  phase: MatchPhase;
  activeIdx: 0 | 1;
  wrestlers: [WrestlerRuntime, WrestlerRuntime];
  /** Most recent resolve. Drives sprite + scoreboard during reveal. */
  lastResolve?: {
    attack: AttackId;
    defense: DefenseId | "tauntFreeStrike";
    damage: number;
    landed: boolean;
    /** True when ROPE failed against REVERSAL — backfires hard. */
    backfire: boolean;
    /** True when this resolve is the finisher cinematic. */
    finisher: boolean;
    text: string;
    /** Hype gained by active on this resolve. */
    hypeGain: number;
  };
  /** Wrestler currently being pinned (the LOSER of the finisher). */
  pinTargetIdx?: 0 | 1;
  /** Set when phase === "pin_attempt" — engine populates with start ms. */
  pinStartedAt?: number;
  /** Set when phase === "submission_attempt". */
  submissionStartedAt?: number;
  /** Match outcome (only valid when phase === "matchEnd"). */
  winnerIdx?: 0 | 1 | -1;
  endMethod?: EndMethod;
}

export interface PlayerDecision {
  attack?: AttackId;
  defense?: DefenseId;
  /** Active asked for a finisher — only honoured when hype is full. */
  attemptFinisher?: boolean;
}

export function newWrestlerRuntime(def: WrestlerDef, planId: PlanId): WrestlerRuntime {
  const plan = GAME_PLANS[planId];
  const strategic = newSide(plan);
  strategic.stamina.value = 100;
  return {
    def, strategic,
    hp: HP_MAX, hype: 0,
    hitsLanded: 0, finishersLanded: 0, taunts: 0,
  };
}

export function newMatch(
  redDef: WrestlerDef, redPlan: PlanId,
  blueDef: WrestlerDef, bluePlan: PlanId,
): MatchState {
  return {
    decisionCount: 0,
    phase: "intro", activeIdx: 0,
    wrestlers: [newWrestlerRuntime(redDef, redPlan), newWrestlerRuntime(blueDef, bluePlan)],
  };
}

/** Tilt → matchup matrix lookup with all the strategic modifiers
 *  applied (plan / stamina / signature). Kept local so wrestling can
 *  customise without touching shared rps.ts. */
function customResolve(
  attackerPick: AttackId, defenderPick: DefenseId,
  attacker: SideState, defender: SideState,
  attackerSignature: boolean,
): StrategicResolve {
  const aIdx = WRESTLING_RPS.attackerActions.indexOf(attackerPick);
  const dIdx = WRESTLING_RPS.defenderActions.indexOf(defenderPick);
  let tilt = WRESTLING_RPS.matchup[aIdx]?.[dIdx] ?? 0;

  // Plan bias.
  tilt += attacker.plan.riskBias * 0.18;
  tilt -= defender.plan.riskBias * 0.18;

  // Stamina debuff. Below STAMINA_LOW, power moves do half damage and
  // reversals fail more — modelled here by tilt swings.
  if (attacker.stamina.value < STAMINA_LOW) tilt -= 0.12;
  if (defender.stamina.value < STAMINA_LOW && defenderPick === "reversal") tilt += 0.12;

  // Signature (finisher) — caller only sets this for explicit finisher
  // attempts; massive tilt swing.
  if (attackerSignature) tilt += 0.45;

  // Small RNG jitter so identical picks don't replay identically.
  tilt += (Math.random() - 0.5) * 0.10;

  // Clamp.
  if (tilt > 1) tilt = 1;
  if (tilt < -1) tilt = -1;

  return {
    matchup: tilt > 0.18 ? "attacker_wins" : tilt < -0.18 ? "defender_wins" : "neutral",
    tilt,
    attackerRisky: attackerPick === "rope",
    defenderRisky: defenderPick === "reversal",
    attackerUsedSignature: attackerSignature,
    defenderUsedSignature: false,
  };
}

function damageFor(attack: AttackId, quality: number, powerStat: number, lowStamina: boolean): number {
  const meta = ATTACK_META[attack];
  const base = meta.basePower;
  const powerScale = 0.7 + (powerStat / 10) * 0.6;
  const qualityScale = 0.4 + quality * 1.0;
  const stamDebuff = lowStamina ? 0.5 : 1.0;
  return Math.max(1, Math.round(base * powerScale * qualityScale * stamDebuff));
}

function staminaCost(attack: AttackId, speedStat: number): number {
  const base = ATTACK_META[attack].staminaCost;
  if (base === 0) return 0;
  const speedScale = 1.0 - (speedStat - 5) * 0.04;
  return Math.max(1, Math.round(base * speedScale));
}

export function applyDecision(state: MatchState, decision: PlayerDecision): void {
  const active = state.wrestlers[state.activeIdx];
  const passive = state.wrestlers[1 - state.activeIdx];

  // FINISHER short-circuit — only if hype full and player asked.
  if (decision.attemptFinisher && active.hype >= HYPE_FOR_FINISHER) {
    landFinisher(state, active, passive);
    return;
  }

  const attack: AttackId = decision.attack ?? "strike";
  const defense: DefenseId = decision.defense ?? "counter_strike";

  // TAUNT short-circuit — own hype bumps, opponent gets a free strike.
  if (attack === "taunt") {
    active.hype = Math.min(HYPE_MAX, active.hype + ATTACK_META.taunt.hypeOnLand);
    active.taunts += 1;
    // Opponent free strike — small damage.
    const counterDmg = damageFor("strike", 0.7, passive.def.stats.power, false);
    active.hp = Math.max(0, active.hp - counterDmg);
    passive.hitsLanded += 1;
    state.lastResolve = {
      attack: "taunt", defense: "tauntFreeStrike",
      damage: counterDmg, landed: true, backfire: false, finisher: false,
      hypeGain: ATTACK_META.taunt.hypeOnLand,
      text: `${active.def.name} hypes the crowd — ${passive.def.name} answers with a free shot (${counterDmg} dmg)!`,
    };
    advanceAfterResolve(state, false, attack, false);
    return;
  }

  const resolved = customResolve(attack, defense, active.strategic, passive.strategic, false);

  // Stamina drain.
  active.strategic.stamina.value = Math.max(0, active.strategic.stamina.value
    - staminaCost(attack, active.def.stats.speed));
  passive.strategic.stamina.value = Math.max(0, passive.strategic.stamina.value
    - Math.round(ATTACK_META[attack].staminaCost * 0.35));

  // Pattern tracking for adaptive CPU.
  active.strategic.recentPicks = pushRecent(active.strategic.recentPicks, attack);
  passive.strategic.recentPicks = pushRecent(passive.strategic.recentPicks, defense);

  // Shared strategic momentum/stamina bookkeeping.
  applyMomentumStamina(active.strategic, passive.strategic, resolved);

  const quality = Math.max(0, Math.min(1, (resolved.tilt + 1) / 2));
  const landed = resolved.tilt > -0.05;
  const lowStam = active.strategic.stamina.value < STAMINA_LOW;
  const damage = landed ? damageFor(attack, quality, active.def.stats.power, lowStam) : 0;

  // ROPE vs REVERSAL = backfire (attacker takes the damage).
  const backfire = attack === "rope" && defense === "reversal" && resolved.tilt < -0.20;

  if (landed) {
    passive.hp = Math.max(0, passive.hp - damage);
    active.hitsLanded += 1;
    const hypeMeta = ATTACK_META[attack].hypeOnLand;
    const charismaBonus = 1 + (active.def.stats.charisma - 5) * 0.08;
    const hypeGain = Math.round(hypeMeta * charismaBonus);
    active.hype = Math.min(HYPE_MAX, active.hype + hypeGain);
    state.lastResolve = {
      attack, defense, damage, landed: true, backfire: false, finisher: false,
      hypeGain,
      text: phraseForLand(active, passive, attack, defense, damage),
    };
  } else if (backfire) {
    // Attacker crashes off the ropes — eats reversal damage.
    const counterDmg = damageFor("strike", 0.9, passive.def.stats.power, false) + 4;
    active.hp = Math.max(0, active.hp - counterDmg);
    passive.hype = Math.min(HYPE_MAX, passive.hype + 8);
    state.lastResolve = {
      attack, defense, damage: counterDmg, landed: false, backfire: true, finisher: false,
      hypeGain: 0,
      text: `BACKFIRE! ${passive.def.name} REVERSES the rope rush — ${active.def.name} crashes for ${counterDmg} dmg!`,
    };
  } else {
    state.lastResolve = {
      attack, defense, damage: 0, landed: false, backfire: false, finisher: false,
      hypeGain: 0,
      text: phraseForBlock(active, passive, attack, defense),
    };
    // Defender gets small hype for clean defense.
    passive.hype = Math.min(HYPE_MAX, passive.hype + 4);
  }

  // SUBMISSION trigger: GRAPPLE landed with hype >= threshold + low opp
  // stamina → engine queues a submission attempt instead of a normal
  // resolve.
  if (landed && attack === "grapple"
      && active.hype >= HYPE_FOR_SUBMISSION
      && passive.strategic.stamina.value < STAMINA_LOW) {
    state.phase = "submission_attempt";
    state.pinTargetIdx = (1 - state.activeIdx) as 0 | 1;
    state.submissionStartedAt = Date.now();
    return;
  }

  // KO / TKO check — hp at zero ends the match outright.
  if (passive.hp <= 0) {
    state.phase = "matchEnd";
    state.winnerIdx = state.activeIdx;
    state.endMethod = "tko";
    return;
  }
  if (active.hp <= 0) {
    state.phase = "matchEnd";
    state.winnerIdx = (1 - state.activeIdx) as 0 | 1;
    state.endMethod = "tko";
    return;
  }

  advanceAfterResolve(state, false, attack, backfire);
}

function landFinisher(state: MatchState, active: WrestlerRuntime, passive: WrestlerRuntime): void {
  const dmg = 45 + Math.round(active.def.stats.power * 1.5);
  passive.hp = Math.max(0, passive.hp - dmg);
  active.hype = 0;
  active.finishersLanded += 1;
  state.lastResolve = {
    attack: "rope", defense: "tauntFreeStrike",
    damage: dmg, landed: true, backfire: false, finisher: true,
    hypeGain: 0,
    text: `${active.def.finisher.emoji} ${active.def.finisher.name.toUpperCase()}! ${active.def.name} hits the finisher on ${passive.def.name} (${dmg} dmg)!`,
  };
  state.phase = "finisher_intro";
  state.pinTargetIdx = (1 - state.activeIdx) as 0 | 1;
}

function advanceAfterResolve(
  state: MatchState, _finisher: boolean, attack: AttackId, backfire: boolean,
): void {
  state.decisionCount += 1;
  state.phase = "resolving";

  // Decision cap → judges' decision.
  if (state.decisionCount >= DECISIONS_CAP) {
    state.phase = "matchEnd";
    state.endMethod = "decision";
    state.winnerIdx = scoreMatch(state);
    return;
  }

  // Swap active on big tilt-against (defender broke them down).
  if (state.lastResolve && (state.lastResolve.damage === 0 || backfire)) {
    state.activeIdx = (1 - state.activeIdx) as 0 | 1;
  }
  // Otherwise active keeps momentum (boxing-style stay-on).
  void attack;
}

/** Called by the UI when the reveal animation finishes. Moves the
 *  state from "resolving" back to a clean "decision" phase ready for
 *  the next pick. */
export function advancePhase(state: MatchState): void {
  if (state.phase === "matchEnd") return;
  if (state.phase === "finisher_intro") {
    state.phase = "pin_attempt";
    state.pinStartedAt = Date.now();
    return;
  }
  if (state.phase === "submission_attempt") {
    // UI hits this via resolveSubmission()
    return;
  }
  if (state.phase === "pin_attempt") {
    // UI hits this via resolvePin()
    return;
  }
  state.phase = "decision";
}

/** Called by the UI when the pin window expires (or kick-out registers).
 *  If kickedOut, the pinned wrestler escapes; otherwise it's a win. */
export function resolvePin(state: MatchState, kickedOut: boolean): void {
  const winnerIdx = state.activeIdx;
  const loserIdx = state.pinTargetIdx ?? ((1 - winnerIdx) as 0 | 1);
  if (kickedOut) {
    // Kick-out — pinned wrestler recovers a sliver, match continues.
    const pinned = state.wrestlers[loserIdx];
    pinned.hp = Math.min(HP_MAX, pinned.hp + 12);
    pinned.strategic.stamina.value = Math.min(100, pinned.strategic.stamina.value + 15);
    pinned.hype = Math.min(HYPE_MAX, pinned.hype + 25);
    state.pinTargetIdx = undefined;
    state.pinStartedAt = undefined;
    state.phase = "decision";
    // Pinned wrestler gets activeIdx — adrenaline shift.
    state.activeIdx = loserIdx;
    return;
  }
  state.phase = "matchEnd";
  state.winnerIdx = winnerIdx;
  state.endMethod = "finisher";
}

/** Called by the UI when the submission window resolves. */
export function resolveSubmission(state: MatchState, escaped: boolean): void {
  const winnerIdx = state.activeIdx;
  const loserIdx = state.pinTargetIdx ?? ((1 - winnerIdx) as 0 | 1);
  if (escaped) {
    const escapeWrestler = state.wrestlers[loserIdx];
    escapeWrestler.strategic.stamina.value = Math.min(100, escapeWrestler.strategic.stamina.value + 18);
    escapeWrestler.hype = Math.min(HYPE_MAX, escapeWrestler.hype + 15);
    state.pinTargetIdx = undefined;
    state.submissionStartedAt = undefined;
    state.phase = "decision";
    state.activeIdx = loserIdx;
    return;
  }
  state.phase = "matchEnd";
  state.winnerIdx = winnerIdx;
  state.endMethod = "submission";
}

function phraseForLand(active: WrestlerRuntime, passive: WrestlerRuntime, attack: AttackId, defense: DefenseId, dmg: number): string {
  if (attack === "rope") return `Off the ropes! ${active.def.name} crashes ${passive.def.name} for ${dmg} dmg!`;
  if (attack === "grapple") return `${active.def.name} locks up and slams ${passive.def.name} (${dmg} dmg).`;
  if (attack === "strike") {
    if (defense === "counter_grapple") return `${active.def.name}'s strike beats the lockup — ${dmg} dmg!`;
    return `${active.def.name} lands the strike clean — ${dmg} dmg.`;
  }
  return `${active.def.name} lands — ${dmg} dmg.`;
}

function phraseForBlock(active: WrestlerRuntime, passive: WrestlerRuntime, attack: AttackId, defense: DefenseId): string {
  if (defense === "reversal" && attack === "strike") return `${passive.def.name} REVERSES the strike!`;
  if (defense === "counter_strike" && attack === "grapple") return `${passive.def.name} stiff-arms the grapple with a counter strike.`;
  if (defense === "counter_grapple" && attack === "grapple") return `${active.def.name} and ${passive.def.name} clinch up — stalemate.`;
  return `${passive.def.name} reads it — ${active.def.name} misses.`;
}

/** Tally hype + damage dealt for a judges' decision. */
export function scoreMatch(state: MatchState): 0 | 1 | -1 {
  const [r, b] = state.wrestlers;
  const rScore = r.hitsLanded * 1.0 + r.finishersLanded * 10
    + (HP_MAX - b.hp) * 0.15 + r.hype * 0.05;
  const bScore = b.hitsLanded * 1.0 + b.finishersLanded * 10
    + (HP_MAX - r.hp) * 0.15 + b.hype * 0.05;
  if (Math.abs(rScore - bScore) < 2) return -1;
  return rScore > bScore ? 0 : 1;
}

/** CPU autopick — uses the shared strategic-core cpuPick for the
 *  matchup-aware action, then layers wrestling decisions on top
 *  (finisher when ready, taunt occasionally to build hype, etc). */
export function cpuDecide(
  state: MatchState, cpuIdx: 0 | 1, difficulty: "easy" | "normal" | "hard",
): PlayerDecision {
  const isActive = cpuIdx === state.activeIdx;
  const cpuSide = isActive ? "attacker" : "defender";
  const me = state.wrestlers[cpuIdx];
  const opp = state.wrestlers[1 - cpuIdx];

  // Mirror hype → signatureReady so the shared CPU knows when to spend.
  me.strategic.momentum.signatureReady = me.hype >= HYPE_FOR_FINISHER;

  // Active-side finisher trigger.
  if (isActive && me.hype >= HYPE_FOR_FINISHER && difficulty !== "easy" && Math.random() < 0.85) {
    return { attemptFinisher: true };
  }
  // Easy CPU sometimes whiffs the finisher window for kid play balance.
  if (isActive && me.hype >= HYPE_FOR_FINISHER && Math.random() < 0.45) {
    return { attemptFinisher: true };
  }

  const choice = cpuPick(WRESTLING_RPS, {
    cpuSide,
    humanRecent: opp.strategic.recentPicks,
    difficulty,
    selfState: me.strategic,
    opponentState: opp.strategic,
  });

  if (isActive) {
    let id = choice.action.id as AttackId;
    // Sprinkle in taunts on Normal/Hard when hype is mid-range and stam is OK.
    if (difficulty !== "easy"
        && me.hype < 60
        && me.strategic.stamina.value > 60
        && Math.random() < 0.12) {
      id = "taunt";
    }
    // Hard CPU favours rope when opp stamina is mid-low (creates kick-out pressure).
    if (difficulty === "hard"
        && opp.strategic.stamina.value < 50
        && me.strategic.stamina.value > 30
        && Math.random() < 0.30) {
      id = "rope";
    }
    return { attack: id };
  }
  return { defense: choice.action.id as DefenseId };
}
