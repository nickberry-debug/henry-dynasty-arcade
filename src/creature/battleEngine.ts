// Creature Keeper — pure turn-based battle engine.
//
// One state object, one resolve() entrypoint. The UI calls resolve() with
// the player's chosen move id; the engine plays out BOTH sides for the
// round (player + foe), updates HP / energy / log / phase, and returns a
// fresh state. No side effects — random rolls are seeded by Date.now()
// per turn, log lines are plain strings, and the engine never touches
// the store.
//
// Damage formula (kid-friendly tuning — combat resolves in ~6-10 turns):
//
//   raw = power * (att.attack / max(1, def.defense))
//   typed = raw * matchup(moveType, defType)   // 1.5 / 1.0 / 0.6
//   variance = typed * (0.85 + rand * 0.30)
//   level = variance * (1 + (attacker.level - 1) * 0.04)
//   damage = max(1, round(level / 4))
//
// Focus moves cost 0 energy and restore some energy instead of attacking.
// Out of energy? You auto-Tackle for tiny damage at cost 1.

import { typeMatchup, type Creature, type Move } from "./types";
import { getMove, getSpecies } from "./catalog";

export interface BattleSide {
  creature: Creature;
  hpNow: number;
  hpMax: number;
  energyNow: number;
  energyMax: number;
  /** Mid-battle items used. */
  itemsUsed: string[];
}

export type BattlePhase = "choose" | "animating" | "won" | "lost" | "fled";

export interface BattleState {
  player: BattleSide;
  foe: BattleSide;
  log: string[];
  turn: number;
  phase: BattlePhase;
  /** Reward awarded on win — computed once at battle end. */
  reward?: { berries: number; xp: number; itemDropId?: string };
  /** Most recent action's damage numbers for the UI's float-up popups. */
  lastDamage?: { side: "player" | "foe"; amount: number; type: string; effective?: "super" | "weak" | "normal" };
}

function makeSide(c: Creature): BattleSide {
  return {
    creature: c,
    hpNow: c.stats.hp,
    hpMax: c.stats.hp,
    energyNow: c.stats.energy,
    energyMax: c.stats.energy,
    itemsUsed: [],
  };
}

export function newBattle(player: Creature, foe: Creature): BattleState {
  return {
    player: makeSide(player),
    foe:    makeSide(foe),
    log: [
      `A wild ${getSpecies(foe.speciesId)?.stageNames[foe.stage] ?? "creature"} appeared!`,
      `${player.nickname}, ready up!`,
    ],
    turn: 1,
    phase: "choose",
  };
}

const TACKLE_FALLBACK: Move = {
  id: "_struggle", name: "Struggle", type: "stone", power: 10, cost: 0,
  flavor: "Out of energy — just shove them.",
};

function damageOf(att: BattleSide, def: BattleSide, move: Move): { dmg: number; effective: "super" | "weak" | "normal" } {
  const defSpecies = getSpecies(def.creature.speciesId);
  const defType = defSpecies?.type ?? "stone";
  const mul = typeMatchup(move.type, defType);
  const raw = move.power * (att.creature.stats.attack / Math.max(1, def.creature.stats.defense));
  const variance = raw * (0.85 + Math.random() * 0.30);
  const leveled = variance * (1 + (att.creature.level - 1) * 0.04);
  const dmg = Math.max(1, Math.round((leveled * mul) / 4));
  const effective = mul >= 1.4 ? "super" : mul <= 0.7 ? "weak" : "normal";
  return { dmg, effective };
}

/** Foe AI: pick the move with highest expected damage against the player's
 *  current defending type. Falls back to struggle if energy is empty. */
function pickFoeMove(state: BattleState): Move {
  const foe = state.foe;
  const candidates = foe.creature.activeMoveIds
    .map(id => getMove(id))
    .filter((m): m is Move => !!m && m.cost <= foe.energyNow);
  if (candidates.length === 0) return TACKLE_FALLBACK;
  // Score = power * matchup vs player type.
  const playerSpecies = getSpecies(state.player.creature.speciesId);
  const playerType = playerSpecies?.type ?? "stone";
  let best = candidates[0];
  let bestScore = -1;
  for (const m of candidates) {
    if (m.power === 0) continue;
    const score = m.power * typeMatchup(m.type, playerType);
    if (score > bestScore) { best = m; bestScore = score; }
  }
  // Add randomness so the foe isn't deterministic.
  if (Math.random() < 0.25 && candidates.length > 1) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  return best;
}

function effectivenessLine(effective: "super" | "weak" | "normal"): string {
  if (effective === "super") return " — super effective!";
  if (effective === "weak") return " — not very effective…";
  return "";
}

/** Award computation: scales with foe level + variant + win streak. */
function rollReward(state: BattleState): { berries: number; xp: number; itemDropId?: string } {
  const foeLvl = state.foe.creature.level;
  const baseBerries = 12 + foeLvl * 4;
  const baseXp = 18 + foeLvl * 6;
  const variantMul = state.foe.creature.variant ? 2 : 1;
  const itemDropId =
    Math.random() < 0.25 ? "food_basic" :
    Math.random() < 0.10 ? "treat" :
    Math.random() < 0.05 ? "potion" :
    undefined;
  return {
    berries: Math.round(baseBerries * variantMul),
    xp: Math.round(baseXp * variantMul),
    itemDropId,
  };
}

/** Apply the chosen player move, then the foe's reaction, into a fresh
 *  state. Speed determines who acts first within the round. Returns the
 *  new state and a queue of log lines (already appended to state.log,
 *  the queue is just to help the UI animate one-by-one). */
export function resolveTurn(state: BattleState, moveId: string): BattleState {
  if (state.phase !== "choose") return state;
  const playerMove = getMove(moveId) ?? TACKLE_FALLBACK;
  // Energy check — fall back to struggle if too low.
  let effectivePlayerMove: Move = playerMove;
  if (playerMove.cost > state.player.energyNow) effectivePlayerMove = TACKLE_FALLBACK;
  const foeMove = pickFoeMove(state);

  const playerFirst = state.player.creature.stats.speed >= state.foe.creature.stats.speed;
  const log: string[] = [...state.log];
  let player = { ...state.player };
  let foe = { ...state.foe };
  let lastDamage: BattleState["lastDamage"];

  function doPlayerAction(): void {
    // Focus / heal: power == 0 restores energy + 0 damage.
    if (effectivePlayerMove.power === 0) {
      const restored = Math.min(player.energyMax - player.energyNow, 14);
      player = { ...player, energyNow: player.energyNow + restored };
      log.push(`${player.creature.nickname} catches a breath (+${restored} energy).`);
      return;
    }
    const { dmg, effective } = damageOf(player, foe, effectivePlayerMove);
    foe = { ...foe, hpNow: Math.max(0, foe.hpNow - dmg) };
    player = { ...player, energyNow: Math.max(0, player.energyNow - effectivePlayerMove.cost) };
    log.push(`${player.creature.nickname} used ${effectivePlayerMove.name}! −${dmg} HP${effectivenessLine(effective)}`);
    lastDamage = { side: "foe", amount: dmg, type: effectivePlayerMove.type, effective };
  }
  function doFoeAction(): void {
    if (foe.hpNow <= 0) return;
    if (foeMove.power === 0) {
      const restored = Math.min(foe.energyMax - foe.energyNow, 14);
      foe = { ...foe, energyNow: foe.energyNow + restored };
      log.push(`The foe focuses (+${restored} energy).`);
      return;
    }
    const { dmg, effective } = damageOf(foe, player, foeMove);
    player = { ...player, hpNow: Math.max(0, player.hpNow - dmg) };
    foe = { ...foe, energyNow: Math.max(0, foe.energyNow - foeMove.cost) };
    log.push(`Foe used ${foeMove.name}! −${dmg} HP${effectivenessLine(effective)}`);
    lastDamage = { side: "player", amount: dmg, type: foeMove.type, effective };
  }

  if (playerFirst) { doPlayerAction(); doFoeAction(); }
  else { doFoeAction(); if (player.hpNow > 0) doPlayerAction(); }

  let phase: BattlePhase = "choose";
  let reward: BattleState["reward"];
  if (foe.hpNow === 0) {
    phase = "won";
    log.push(`${player.creature.nickname} wins!`);
    reward = rollReward({ ...state, player, foe });
    log.push(`+${reward.berries} berries · +${reward.xp} XP${reward.itemDropId ? " · item drop!" : ""}`);
  } else if (player.hpNow === 0) {
    phase = "lost";
    log.push(`${player.creature.nickname} fainted!`);
  }

  return {
    ...state,
    player, foe,
    log: log.slice(-60),
    turn: state.turn + 1,
    phase,
    reward,
    lastDamage,
  };
}

/** Use a battle item mid-fight. Doesn't consume the turn — kid-friendly. */
export function useBattleItem(state: BattleState, item: { id: string; effect: { kind: string; hp?: number; energy?: number } }): BattleState {
  if (state.phase !== "choose") return state;
  let player = state.player;
  const log = [...state.log];
  if (item.effect.kind === "battle-heal" && item.effect.hp) {
    const restored = Math.min(player.hpMax - player.hpNow, item.effect.hp);
    player = { ...player, hpNow: player.hpNow + restored, itemsUsed: [...player.itemsUsed, item.id] };
    log.push(`Used ${item.id}: +${restored} HP.`);
  } else if (item.effect.kind === "battle-energy" && item.effect.energy) {
    const restored = Math.min(player.energyMax - player.energyNow, item.effect.energy);
    player = { ...player, energyNow: player.energyNow + restored, itemsUsed: [...player.itemsUsed, item.id] };
    log.push(`Used ${item.id}: +${restored} energy.`);
  }
  return { ...state, player, log: log.slice(-60) };
}

/** Flee from a wild battle. Kid-friendly — always works, no win/loss. */
export function fleeBattle(state: BattleState): BattleState {
  if (state.phase !== "choose") return state;
  return {
    ...state,
    phase: "fled",
    log: [...state.log, `${state.player.creature.nickname} backed away safely.`],
  };
}
