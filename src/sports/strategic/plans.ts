// src/sports/strategic/plans.ts
import type { GamePlan, PlanId } from "./types";

export const GAME_PLANS: Record<PlanId, GamePlan> = {
  aggressive: {
    id: "aggressive",
    label: "AGGRESSIVE",
    tradeoff: "Bigger plays, faster gas. Risky shots reward more, stamina drains harder.",
    riskBias: +0.45,
    rewardMultiplier: 1.20,
    staminaDrain: 1.35,
    momentumGain: 1.20,
  },
  balanced: {
    id: "balanced",
    label: "BALANCED",
    tradeoff: "No edge, no weakness. Solid in every situation.",
    riskBias: 0,
    rewardMultiplier: 1.0,
    staminaDrain: 1.0,
    momentumGain: 1.0,
  },
  defensive: {
    id: "defensive",
    label: "DEFENSIVE",
    tradeoff: "Conserve gas. Smaller swings, more reliable outcomes.",
    riskBias: -0.35,
    rewardMultiplier: 0.85,
    staminaDrain: 0.75,
    momentumGain: 0.90,
  },
};

export function planById(id: PlanId): GamePlan { return GAME_PLANS[id]; }
export const PLAN_LIST: GamePlan[] = [GAME_PLANS.aggressive, GAME_PLANS.balanced, GAME_PLANS.defensive];