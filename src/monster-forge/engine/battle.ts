// Monster Forge - Phase 4 turn-based battle engine.
//
// Pure logic, no Three.js / React dependencies. Two monsters take turns:
//   - ATTACK (free, costs no charge)
//   - POWER  (uses 1 of 3 charges per battle, picks from monster.powers)
//   - DEFEND (no damage, halves incoming next round)
//
// Damage formula:
//   raw = (atk * actionMul) - (def * 0.5)
//   raw *= elementMatchup(attackerElem, defenderElem)
//   raw *= defender.defending ? 0.5 : 1.0
//   raw = max(1, round(raw))   // min 1 dmg
//
// Element matchup table (Nick's spec):
//   Fire     → Earth     2.0
//   Earth    → Spark     2.0
//   Spark    → Aqua      2.0
//   Aqua     → Fire      2.0
//   Light↔Dark   1.5 either way
//   Same-element 0.5
// (Where "Light" = wind/steam, "Dark" = shade/plague/toxic in our potion set.)
//
// Turn order: higher SPD acts first each round; ties broken random.
// No flee. Kid-friendly: battles always conclude.

import type { StatBlock } from "./stats";
import type { Power } from "./powers";
import { powersFor } from "./powers";
import type { SavedMonster, BodyType } from "../partsManifest";
import { POTIONS_BY_ID } from "../data/potions";

export type BattleElement =
  | "fire" | "earth" | "spark" | "aqua"
  | "light" | "dark" | "physical";

export interface BattleMonster {
  id: string;
  name: string;
  stats: StatBlock;       // HP/ATK/DEF/SPD/MAG (post potions)
  bodyType: BodyType;
  element: BattleElement;
  powers: Power[];        // up to 3 powers (signature + elemental + mutation)
  hp: number;             // current HP this battle
  maxHp: number;          // == stats.hp (for the HP bar)
  charges: number;        // power charges remaining (start 3)
  defending: boolean;     // defend flag — halves next incoming hit
  isCpu?: boolean;
}

export interface BattleEvent {
  kind: "attack" | "power" | "defend" | "ko" | "matchup" | "round";
  side: "player" | "opponent";
  damage?: number;
  powerId?: string;
  powerName?: string;
  matchupMul?: number;
  matchupText?: string;
  text?: string;
}

export interface BattleState {
  player: BattleMonster;
  opponent: BattleMonster;
  round: number;
  log: BattleEvent[];
  winner: "player" | "opponent" | null;
  /** Side that acts next this half-round; null = round resolved, ready to advance. */
  nextActor: "player" | "opponent" | null;
  /** Order this round (high SPD first, tied random). */
  order: ("player" | "opponent")[];
}

// ─── Element matchup ──────────────────────────────────────────────────

const STRONG_AGAINST: Partial<Record<BattleElement, BattleElement>> = {
  fire:  "earth",
  earth: "spark",
  spark: "aqua",
  aqua:  "fire",
};

export function elementMatchup(
  attacker: BattleElement,
  defender: BattleElement,
): { mul: number; text: string } {
  if (attacker === defender && attacker !== "physical") {
    return { mul: 0.5, text: "Not very effective…" };
  }
  if (STRONG_AGAINST[attacker] === defender) {
    return { mul: 2.0, text: "SUPER EFFECTIVE!" };
  }
  const isLight = (e: BattleElement) => e === "light";
  const isDark  = (e: BattleElement) => e === "dark";
  if ((isLight(attacker) && isDark(defender)) || (isDark(attacker) && isLight(defender))) {
    return { mul: 1.5, text: "It's effective!" };
  }
  return { mul: 1.0, text: "" };
}

// ─── Element extraction from a saved monster ──────────────────────────

const POTION_TO_ELEMENT: Record<string, BattleElement> = {
  fire: "fire", ice: "aqua", spark: "spark", shade: "dark", toxic: "dark",
  aqua: "aqua", earth: "earth", wind: "light",
  steam: "light", plague: "dark", tempest: "spark",
};

export function elementFor(monster: { activePotions: string[]; config?: { body?: string } }): BattleElement {
  for (const pid of monster.activePotions) {
    const aura = POTIONS_BY_ID[pid]?.effect?.aura;
    if (aura && POTION_TO_ELEMENT[aura]) return POTION_TO_ELEMENT[aura];
  }
  return "physical";
}

// ─── Build a BattleMonster from a SavedMonster ────────────────────────

export function toBattleMonster(m: SavedMonster, bodyType: BodyType, isCpu = false): BattleMonster {
  const powers = powersFor(bodyType, m.activePotions ?? []);
  const maxHp = Math.max(5, m.stats.hp * 4); // HP bar feels more dramatic at ~4x stat
  return {
    id: m.id, name: m.name,
    stats: m.stats, bodyType,
    element: elementFor(m),
    powers,
    hp: maxHp, maxHp,
    charges: 3, defending: false,
    isCpu,
  };
}

// ─── Damage formula + actions ─────────────────────────────────────────

export interface ActionResult {
  damage: number;
  matchupMul: number;
  matchupText: string;
}

export function computeAttackDamage(attacker: BattleMonster, defender: BattleMonster, mul: number): ActionResult {
  const matchup = elementMatchup(attacker.element, defender.element);
  let raw = (attacker.stats.atk * mul) - (defender.stats.def * 0.5);
  raw *= matchup.mul;
  if (defender.defending) raw *= 0.5;
  raw = Math.max(1, Math.round(raw));
  return { damage: raw, matchupMul: matchup.mul, matchupText: matchup.text };
}

function sideRef(state: BattleState, side: "player" | "opponent"): BattleMonster {
  return side === "player" ? state.player : state.opponent;
}

function opposite(side: "player" | "opponent"): "player" | "opponent" {
  return side === "player" ? "opponent" : "player";
}

// ─── Initial state + round mgmt ───────────────────────────────────────

export function createBattle(player: BattleMonster, opponent: BattleMonster): BattleState {
  return {
    player, opponent, round: 1, log: [], winner: null,
    nextActor: null, order: [],
    ...rollOrder(player, opponent, 1),
  } as BattleState;
}

function rollOrder(p: BattleMonster, o: BattleMonster, _round: number) {
  const pSpd = p.stats.spd, oSpd = o.stats.spd;
  let order: ("player" | "opponent")[];
  if (pSpd > oSpd) order = ["player", "opponent"];
  else if (oSpd > pSpd) order = ["opponent", "player"];
  else order = Math.random() < 0.5 ? ["player", "opponent"] : ["opponent", "player"];
  return { order, nextActor: order[0] };
}

export function startRound(state: BattleState): BattleState {
  // Reset defend flags from previous round, roll new order.
  const next: BattleState = {
    ...state,
    player: { ...state.player, defending: false },
    opponent: { ...state.opponent, defending: false },
    round: state.round + 1,
    log: [...state.log, { kind: "round", side: "player", text: `Round ${state.round + 1}` }],
  };
  Object.assign(next, rollOrder(next.player, next.opponent, next.round));
  return next;
}

// ─── Apply an action ──────────────────────────────────────────────────

export type Action =
  | { kind: "attack" }
  | { kind: "power"; powerIndex: number }
  | { kind: "defend" };

export function applyAction(state: BattleState, side: "player" | "opponent", action: Action): BattleState {
  if (state.winner) return state;
  if (state.nextActor !== side) return state;
  const attacker = sideRef(state, side);
  const defender = sideRef(state, opposite(side));
  const next: BattleState = {
    ...state,
    player: { ...state.player },
    opponent: { ...state.opponent },
    log: [...state.log],
  };
  const newAtk = sideRef(next, side);
  const newDef = sideRef(next, opposite(side));

  if (action.kind === "defend") {
    newAtk.defending = true;
    next.log.push({ kind: "defend", side, text: `${attacker.name} braces.` });
  } else if (action.kind === "attack") {
    const r = computeAttackDamage(attacker, defender, 1.0);
    newDef.hp = Math.max(0, newDef.hp - r.damage);
    next.log.push({
      kind: "attack", side,
      damage: r.damage, matchupMul: r.matchupMul, matchupText: r.matchupText,
      text: `${attacker.name} attacks for ${r.damage}!`,
    });
    if (r.matchupText) {
      next.log.push({ kind: "matchup", side, matchupMul: r.matchupMul, matchupText: r.matchupText });
    }
  } else if (action.kind === "power") {
    if (newAtk.charges <= 0 || !attacker.powers[action.powerIndex]) {
      // Invalid — fall back to attack so the player isn't stuck.
      return applyAction(state, side, { kind: "attack" });
    }
    newAtk.charges -= 1;
    const pw = attacker.powers[action.powerIndex];
    const r = computeAttackDamage(attacker, defender, pw.power);
    newDef.hp = Math.max(0, newDef.hp - r.damage);
    next.log.push({
      kind: "power", side,
      damage: r.damage, matchupMul: r.matchupMul, matchupText: r.matchupText,
      powerId: pw.id, powerName: pw.name,
      text: `${attacker.name} uses ${pw.name} for ${r.damage}!`,
    });
    if (r.matchupText) {
      next.log.push({ kind: "matchup", side, matchupMul: r.matchupMul, matchupText: r.matchupText });
    }
  }

  // KO check
  if (newDef.hp <= 0) {
    next.winner = side;
    next.nextActor = null;
    next.log.push({ kind: "ko", side, text: `${defender.name} fainted!` });
    return next;
  }
  // Advance turn / round
  const idx = next.order.indexOf(side);
  if (idx < 0 || idx === next.order.length - 1) {
    // End of round — the next call to startRound() advances.
    next.nextActor = null;
  } else {
    next.nextActor = next.order[idx + 1];
  }
  return next;
}

/** Tiny CPU heuristic: low HP → defend sometimes; powers up first; else attack. */
export function aiChooseAction(state: BattleState, side: "player" | "opponent"): Action {
  const me = sideRef(state, side);
  const them = sideRef(state, opposite(side));
  const myHpPct = me.hp / me.maxHp;
  // Use a power early if matchup is great
  if (me.charges > 0) {
    const pickable = me.powers.map((_, i) => i);
    if (pickable.length > 0) {
      // 60% chance to power if we have charges, weighted by matchup
      const mu = elementMatchup(me.element, them.element).mul;
      const roll = Math.random();
      if (mu >= 2.0 || (mu >= 1.5 && roll < 0.7) || roll < 0.5) {
        // Pick the strongest available power
        let bestIdx = 0, best = -1;
        for (let i = 0; i < me.powers.length; i++) {
          const p = me.powers[i];
          if (p.power > best) { best = p.power; bestIdx = i; }
        }
        return { kind: "power", powerIndex: bestIdx };
      }
    }
  }
  if (myHpPct < 0.3 && Math.random() < 0.45) return { kind: "defend" };
  return { kind: "attack" };
}
