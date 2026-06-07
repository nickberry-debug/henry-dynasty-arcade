// src/sports/strategic/cpu.ts
//
// Adaptive CPU: tracks the last N picks the human made and biases its
// own pick toward whatever beats their most-frequent pattern. Also
// state-aware: times signatures, picks safe variants when low on
// stamina, risky when momentum is built up.

import type { PlayAction, SideState, SportStrategyConfig } from "./types";

export function mostFrequent(recent: string[]): string | undefined {
  if (recent.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const id of recent) counts.set(id, (counts.get(id) ?? 0) + 1);
  let best: string | undefined;
  let bestCount = -1;
  for (let i = recent.length - 1; i >= 0; i--) {
    const id = recent[i];
    const c = counts.get(id)!;
    if (c > bestCount) { best = id; bestCount = c; }
  }
  return best;
}

export function bestDefenderCounter(config: SportStrategyConfig, attackerActionId: string): string {
  const aIdx = Math.max(0, config.attackerActions.indexOf(attackerActionId));
  let bestIdx = 0;
  let bestTilt = config.matchup[aIdx][0];
  for (let d = 1; d < config.defenderActions.length; d++) {
    const t = config.matchup[aIdx][d];
    if (t < bestTilt) { bestTilt = t; bestIdx = d; }
  }
  return config.defenderActions[bestIdx];
}

export function bestAttackerExploit(config: SportStrategyConfig, defenderActionId: string): string {
  const dIdx = Math.max(0, config.defenderActions.indexOf(defenderActionId));
  let bestIdx = 0;
  let bestTilt = config.matchup[0][dIdx];
  for (let a = 1; a < config.attackerActions.length; a++) {
    const t = config.matchup[a][dIdx];
    if (t > bestTilt) { bestTilt = t; bestIdx = a; }
  }
  return config.attackerActions[bestIdx];
}

export function neutralPick(options: string[], exclude: string | undefined, rng: () => number): string {
  const pool = exclude ? options.filter(o => o !== exclude) : options.slice();
  if (pool.length === 0) return options[0];
  return pool[Math.floor(rng() * pool.length)];
}

export interface CpuChoiceOpts {
  cpuSide: "attacker" | "defender";
  humanRecent: string[];
  difficulty?: "easy" | "normal" | "hard";
  selfState?: SideState;
  opponentState?: SideState;
  rng?: () => number;
}

export interface CpuChoice {
  action: PlayAction;
  useSignature: boolean;
  reason: "exploit_pattern" | "neutral" | "random" | "no_history";
}

export function cpuPick(config: SportStrategyConfig, opts: CpuChoiceOpts): CpuChoice {
  const rng = opts.rng ?? Math.random;
  const myActions = opts.cpuSide === "attacker" ? config.attackerActions : config.defenderActions;
  const difficulty = opts.difficulty ?? "normal";
  const weights = difficulty === "easy"
    ? { exploit: 0.30, neutral: 0.30, random: 0.40 }
    : difficulty === "hard"
    ? { exploit: 0.78, neutral: 0.15, random: 0.07 }
    : { exploit: 0.60, neutral: 0.25, random: 0.15 };

  const mostHuman = mostFrequent(opts.humanRecent);
  const roll = rng();
  let pickedId: string;
  let reason: CpuChoice["reason"];

  if (!mostHuman) {
    pickedId = myActions[Math.floor(rng() * myActions.length)];
    reason = "no_history";
  } else if (roll < weights.exploit) {
    pickedId = opts.cpuSide === "defender"
      ? bestDefenderCounter(config, mostHuman)
      : bestAttackerExploit(config, mostHuman);
    reason = "exploit_pattern";
  } else if (roll < weights.exploit + weights.neutral) {
    const counter = opts.cpuSide === "defender"
      ? bestDefenderCounter(config, mostHuman)
      : bestAttackerExploit(config, mostHuman);
    pickedId = neutralPick(myActions, counter, rng);
    reason = "neutral";
  } else {
    pickedId = myActions[Math.floor(rng() * myActions.length)];
    reason = "random";
  }

  let safe: boolean;
  const selfStamina = opts.selfState?.stamina.value ?? 100;
  const selfMomentum = opts.selfState?.momentum.value ?? 0;
  if (selfStamina < 30) safe = rng() < 0.80;
  else if (selfMomentum > 60) safe = rng() < 0.30;
  else safe = rng() < 0.50;
  if (difficulty === "easy") safe = rng() < 0.5;

  const sigReady = !!opts.selfState?.momentum.signatureReady;
  let useSig = false;
  if (sigReady) {
    const opponentStamina = opts.opponentState?.stamina.value ?? 100;
    const matchupGuess = mostHuman
      ? (opts.cpuSide === "defender"
          ? -lookupTilt(config, mostHuman, pickedId)
          :  lookupTilt(config, pickedId, mostHuman))
      : 0;
    const want = matchupGuess > 0 || opponentStamina < 35;
    const fireProb = difficulty === "hard" ? 0.95 : difficulty === "normal" ? 0.70 : 0.30;
    useSig = want && rng() < fireProb;
  }

  return { action: { id: pickedId, safe }, useSignature: useSig, reason };
}

function lookupTilt(config: SportStrategyConfig, attackerActionId: string, defenderActionId: string): number {
  const a = config.attackerActions.indexOf(attackerActionId);
  const d = config.defenderActions.indexOf(defenderActionId);
  if (a < 0 || d < 0) return 0;
  return config.matchup[a][d];
}

export function pushRecent(recent: string[], pickId: string, max = 8): string[] {
  const next = recent.concat(pickId);
  return next.length > max ? next.slice(next.length - max) : next;
}