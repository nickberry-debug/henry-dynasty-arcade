// src/sports/strategic/types.ts
//
// Shared strategic-layer types. Sport-agnostic primitives that bolt on
// top of any existing versus engine: a pre-match game plan, RPS-style
// per-decision play-calling, momentum, stamina, signature plays.
//
// Combat sports (Boxing/Wrestling) will reuse this module as-is, so it
// stays free of sport-specific naming.

export type PlanId = "aggressive" | "balanced" | "defensive";

export interface GamePlan {
  id: PlanId;
  label: string;
  tradeoff: string;
  riskBias: number;
  rewardMultiplier: number;
  staminaDrain: number;
  momentumGain: number;
}

export interface PlayAction {
  id: string;
  safe: boolean;
}

export type MatchupResult = "attacker_wins" | "defender_wins" | "neutral";

export interface StrategicResolve {
  matchup: MatchupResult;
  tilt: number;
  attackerRisky: boolean;
  defenderRisky: boolean;
  attackerUsedSignature: boolean;
  defenderUsedSignature: boolean;
}

export interface MomentumState {
  value: number;
  signatureReady: boolean;
}

export interface StaminaState {
  value: number;
}

export interface SideState {
  plan: GamePlan;
  momentum: MomentumState;
  stamina: StaminaState;
  recentPicks: string[];
}

export interface MatchStrategicState {
  attacker: SideState;
  defender: SideState;
}

export interface SportStrategyConfig {
  sportId: string;
  attackerActions: string[];
  defenderActions: string[];
  matchup: number[][];
  signatureActionId: string;
  signatureTilt: number;
}

export interface MatchResult {
  margin: number;
  attackerScore: number;
  defenderScore: number;
  decisionsResolved: number;
  signaturesUsed: { attacker: number; defender: number };
}