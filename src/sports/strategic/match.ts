// src/sports/strategic/match.ts
import type {
  GamePlan, MatchStrategicState, MatchResult,
  SideState, SportStrategyConfig, StrategicResolve,
} from "./types";
import { resolveDecision, applyMomentumStamina } from "./rps";
import { cpuPick, pushRecent } from "./cpu";

export function newSide(plan: GamePlan): SideState {
  return {
    plan,
    momentum: { value: 0, signatureReady: false },
    stamina: { value: 100 },
    recentPicks: [],
  };
}

export function newMatchState(planA: GamePlan, planB: GamePlan): MatchStrategicState {
  return { attacker: newSide(planA), defender: newSide(planB) };
}

export interface SimStrategy {
  pickAction(side: "attacker" | "defender", state: MatchStrategicState): { id: string; safe: boolean; useSignature: boolean };
}

export function simulateMatch(
  config: SportStrategyConfig,
  attackerStrategy: SimStrategy,
  defenderStrategy: SimStrategy,
  planA: GamePlan,
  planB: GamePlan,
  opts: { decisions?: number; rng?: () => number } = {},
): { result: MatchResult; final: MatchStrategicState } {
  const rng = opts.rng ?? Math.random;
  const decisions = opts.decisions ?? 24;
  const state = newMatchState(planA, planB);
  let aScore = 0;
  let dScore = 0;
  let sigA = 0;
  let sigD = 0;

  for (let i = 0; i < decisions; i++) {
    const aPick = attackerStrategy.pickAction("attacker", state);
    const dPick = defenderStrategy.pickAction("defender", state);
    const resolved: StrategicResolve = resolveDecision(
      config,
      { id: aPick.id, safe: aPick.safe },
      { id: dPick.id, safe: dPick.safe },
      state.attacker, state.defender,
      {
        attackerSignature: aPick.useSignature && state.attacker.momentum.signatureReady,
        defenderSignature: dPick.useSignature && state.defender.momentum.signatureReady,
        rng,
      },
    );
    if (resolved.attackerUsedSignature) sigA++;
    if (resolved.defenderUsedSignature) sigD++;
    if (resolved.tilt > 0) aScore += resolved.tilt * state.attacker.plan.rewardMultiplier;
    else if (resolved.tilt < 0) dScore += (-resolved.tilt) * state.defender.plan.rewardMultiplier;
    state.attacker.recentPicks = pushRecent(state.attacker.recentPicks, aPick.id);
    state.defender.recentPicks = pushRecent(state.defender.recentPicks, dPick.id);
    applyMomentumStamina(state.attacker, state.defender, resolved);
  }
  const total = aScore + dScore;
  const margin = total === 0 ? 0 : (aScore - dScore) / total;
  return {
    result: { margin, attackerScore: aScore, defenderScore: dScore, decisionsResolved: decisions, signaturesUsed: { attacker: sigA, defender: sigD } },
    final: state,
  };
}

export function randomStrategy(config: SportStrategyConfig, side: "attacker" | "defender", rng = Math.random): SimStrategy {
  const acts = side === "attacker" ? config.attackerActions : config.defenderActions;
  return {
    pickAction() {
      const id = acts[Math.floor(rng() * acts.length)];
      return { id, safe: rng() < 0.5, useSignature: rng() < 0.5 };
    },
  };
}

export function patternedStrategy(
  config: SportStrategyConfig,
  side: "attacker" | "defender",
  bias: { favourite: string; weight: number },
  rng = Math.random,
): SimStrategy {
  const acts = side === "attacker" ? config.attackerActions : config.defenderActions;
  const others = acts.filter(a => a !== bias.favourite);
  return {
    pickAction() {
      const r = rng();
      const id = r < bias.weight ? bias.favourite : others[Math.floor(rng() * others.length)];
      return { id, safe: rng() < 0.5, useSignature: rng() < 0.5 };
    },
  };
}

export function adaptiveStrategy(
  config: SportStrategyConfig,
  side: "attacker" | "defender",
  difficulty: "easy" | "normal" | "hard" = "normal",
  rng = Math.random,
): SimStrategy {
  return {
    pickAction(_s, state) {
      const me = side === "attacker" ? state.attacker : state.defender;
      const opp = side === "attacker" ? state.defender : state.attacker;
      const choice = cpuPick(config, {
        cpuSide: side,
        humanRecent: opp.recentPicks,
        difficulty,
        selfState: me,
        opponentState: opp,
        rng,
      });
      return { id: choice.action.id, safe: choice.action.safe, useSignature: choice.useSignature };
    },
  };
}