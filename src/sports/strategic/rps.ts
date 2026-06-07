// src/sports/strategic/rps.ts
//
// Generic RPS resolver. Returns a StrategicResolve given two PlayActions
// and each side's full SideState. Engines map the resolve to native
// outcomes (yards/bases/points). Pure modulo Math.random().

import type {
  PlayAction, SideState, SportStrategyConfig,
  StrategicResolve, MatchupResult,
} from "./types";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function matchupTilt(
  config: SportStrategyConfig,
  attacker: PlayAction,
  defender: PlayAction,
): number {
  const aIdx = config.attackerActions.indexOf(attacker.id);
  const dIdx = config.defenderActions.indexOf(defender.id);
  if (aIdx < 0 || dIdx < 0) return 0;
  return config.matchup[aIdx][dIdx];
}

function tiltToMatchup(tilt: number): MatchupResult {
  if (tilt > 0.18) return "attacker_wins";
  if (tilt < -0.18) return "defender_wins";
  return "neutral";
}

function staminaEffect(stamina: number): number {
  if (stamina >= 60) return 0;
  if (stamina >= 30) return -0.05;
  if (stamina >= 10) return -0.15;
  return -0.28;
}

export function resolveDecision(
  config: SportStrategyConfig,
  attackerPick: PlayAction,
  defenderPick: PlayAction,
  attacker: SideState,
  defender: SideState,
  opts: { attackerSignature?: boolean; defenderSignature?: boolean; rng?: () => number } = {},
): StrategicResolve {
  const rng = opts.rng ?? Math.random;
  const aSig = !!opts.attackerSignature;
  const dSig = !!opts.defenderSignature;
  let tilt = matchupTilt(config, attackerPick, defenderPick);
  if (!attackerPick.safe) tilt += 0.10 * (tilt >= 0 ? +1 : +0.6);
  else                     tilt -= 0.05;
  if (!defenderPick.safe) tilt -= 0.10 * (tilt <= 0 ? +1 : +0.6);
  else                     tilt += 0.05;
  tilt += attacker.plan.riskBias * 0.18;
  tilt -= defender.plan.riskBias * 0.18;
  tilt += staminaEffect(attacker.stamina.value);
  tilt -= staminaEffect(defender.stamina.value);
  if (aSig) tilt += 0.25 + config.signatureTilt;
  if (dSig) tilt -= 0.25 + config.signatureTilt;
  tilt += (rng() - 0.5) * 0.12;
  tilt = clamp(tilt, -1, 1);
  return {
    matchup: tiltToMatchup(tilt),
    tilt,
    attackerRisky: !attackerPick.safe,
    defenderRisky: !defenderPick.safe,
    attackerUsedSignature: aSig,
    defenderUsedSignature: dSig,
  };
}

export function applyMomentumStamina(
  attacker: SideState,
  defender: SideState,
  resolved: StrategicResolve,
): void {
  const baseDrain = 4;
  const aDrain = baseDrain * attacker.plan.staminaDrain * (resolved.attackerRisky ? 1.3 : 0.85);
  const dDrain = baseDrain * defender.plan.staminaDrain * (resolved.defenderRisky ? 1.3 : 0.85);
  attacker.stamina.value = clamp(attacker.stamina.value - aDrain, 0, 100);
  defender.stamina.value = clamp(defender.stamina.value - dDrain, 0, 100);
  const tiltAbs = Math.min(1, Math.abs(resolved.tilt));
  if (resolved.matchup === "attacker_wins") {
    attacker.momentum.value = clamp(attacker.momentum.value + 18 * tiltAbs * attacker.plan.momentumGain, 0, 100);
    defender.momentum.value = clamp(defender.momentum.value - 6 * tiltAbs, 0, 100);
  } else if (resolved.matchup === "defender_wins") {
    defender.momentum.value = clamp(defender.momentum.value + 18 * tiltAbs * defender.plan.momentumGain, 0, 100);
    attacker.momentum.value = clamp(attacker.momentum.value - 6 * tiltAbs, 0, 100);
  } else {
    attacker.momentum.value = clamp(attacker.momentum.value + 2, 0, 100);
    defender.momentum.value = clamp(defender.momentum.value + 2, 0, 100);
  }
  if (resolved.attackerUsedSignature) attacker.momentum.value = clamp(attacker.momentum.value - 50, 0, 100);
  if (resolved.defenderUsedSignature) defender.momentum.value = clamp(defender.momentum.value - 50, 0, 100);
  attacker.momentum.signatureReady = attacker.momentum.value >= 100;
  defender.momentum.signatureReady = defender.momentum.value >= 100;
}

export function tiltToQuality(tilt: number): number {
  return clamp((tilt + 1) / 2, 0, 1);
}