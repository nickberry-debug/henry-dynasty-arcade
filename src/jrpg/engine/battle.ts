// AETHERSONG battle engine - ATB turn system.

import type { BattleEnemy, EnemyTemplate, Hero, BattleResult, AbilityRef } from "../types";
import { ABILITIES, ITEMS, awardXp } from "../data/heroes";

export type BattleEventKind =
  | "tick"
  | "hero-attack"
  | "hero-ability"
  | "hero-item"
  | "enemy-attack"
  | "damage"
  | "heal"
  | "miss"
  | "victory"
  | "defeat"
  | "fled"
  | "boss-intro"
  | "level-up"
  | "dialog";

export interface BattleEvent {
  kind: BattleEventKind;
  text?: string;
  actorId?: string;
  targetId?: string;
  amount?: number;
}

export interface BattleStateExternal {
  hero: Hero;
  inventory: { itemId: string; qty: number }[];
  enemies: BattleEnemy[];
  heroAtb: number;
  heroReady: boolean;
  busy: boolean;
  targetIdx: number;
  result?: BattleResult;
  log: string[];
  xpAward: number;
  goldAward: number;
  intro?: string;
  heroFlash: number;
  heroSilenced: boolean;
}

export function rollDamage(atk: number, def: number, power = 1): number {
  const base = Math.max(1, atk * power - def * 0.5);
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.max(1, Math.round(base * jitter));
}

export function newBattle(hero: Hero, inv: { itemId: string; qty: number }[], templates: EnemyTemplate[]): BattleStateExternal {
  const enemies: BattleEnemy[] = templates.map((t, i) => ({
    ...t,
    battleId: t.id + "#" + i,
    hpNow: t.stats.hp,
    mpNow: t.stats.mp,
    atb: 30 + Math.random() * 30,
    dead: false,
    hitFlash: 0,
  }));
  return {
    hero,
    inventory: inv.map(e => ({ ...e })),
    enemies,
    heroAtb: 50,
    heroReady: false,
    busy: false,
    targetIdx: 0,
    log: [],
    xpAward: 0,
    goldAward: 0,
    intro: templates.find(t => t.isBoss)?.introLine,
    heroFlash: 0,
    heroSilenced: false,
  };
}

export function tickAtb(s: BattleStateExternal, dt: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (s.result || s.busy) return events;
  if (!s.heroReady) {
    s.heroAtb += s.hero.stats.spd * 0.6 * dt;
    if (s.heroAtb >= 100) {
      s.heroAtb = 100;
      s.heroReady = true;
      events.push({ kind: "tick" });
    }
  }
  for (const e of s.enemies) {
    if (e.dead) continue;
    if (e.hitFlash > 0) e.hitFlash -= dt * 30;
    e.atb += e.stats.spd * 0.55 * dt;
    if (e.atb >= 100) {
      e.atb = 0;
      const acts = enemyChoose(s, e);
      events.push(...acts);
    }
  }
  if (s.hero.stats.hp <= 0 && !s.result) {
    s.result = "defeat";
    events.push({ kind: "defeat", text: "Liora falls. Reset to last save." });
  }
  if (!s.result && s.enemies.every(e => e.dead)) {
    s.result = "victory";
    const totalXp = s.enemies.reduce((a, e) => a + e.xpReward, 0);
    const totalGold = s.enemies.reduce((a, e) => a + e.goldReward, 0);
    s.xpAward = totalXp; s.goldAward = totalGold;
    const lvl = awardXp(s.hero, totalXp);
    events.push({ kind: "victory", text: "Victory! +" + totalXp + " XP, +" + totalGold + " gold." });
    if (lvl.levelUps > 0) {
      lvl.gains.forEach(g => events.push({ kind: "level-up", text: "Liora reached Level " + g.newLevel + "!" }));
    }
  }
  return events;
}

function enemyChoose(s: BattleStateExternal, e: BattleEnemy): BattleEvent[] {
  const events: BattleEvent[] = [];
  if (e.isBoss && Math.random() < 0.33) {
    s.heroSilenced = true;
    const dmg = rollDamage(e.stats.voice, s.hero.stats.resist, 0.8);
    s.hero.stats.hp = Math.max(0, s.hero.stats.hp - dmg);
    events.push({ kind: "enemy-attack", actorId: e.battleId, text: e.name + " sings Silver Silence." });
    events.push({ kind: "damage", targetId: "hero", amount: dmg });
    s.heroFlash = 8;
    return events;
  }
  const dmg = rollDamage(e.stats.atk, s.hero.stats.def);
  s.hero.stats.hp = Math.max(0, s.hero.stats.hp - dmg);
  events.push({ kind: "enemy-attack", actorId: e.battleId, text: e.name + " attacks!" });
  events.push({ kind: "damage", targetId: "hero", amount: dmg });
  s.heroFlash = 8;
  return events;
}

export function heroAttack(s: BattleStateExternal): BattleEvent[] {
  if (!s.heroReady || s.busy) return [];
  s.heroReady = false;
  s.heroAtb = 0;
  s.busy = true;
  if (s.heroSilenced) s.heroSilenced = false;
  const target = s.enemies[s.targetIdx];
  if (!target || target.dead) {
    s.busy = false;
    return [{ kind: "miss", text: "No target." }];
  }
  const dmg = rollDamage(s.hero.stats.atk, target.stats.def);
  target.hpNow = Math.max(0, target.hpNow - dmg);
  target.hitFlash = 8;
  if (target.hpNow <= 0) target.dead = true;
  return [
    { kind: "hero-attack", actorId: "hero", targetId: target.battleId },
    { kind: "damage", targetId: target.battleId, amount: dmg },
  ];
}

export function heroUseAbility(s: BattleStateExternal, ref: AbilityRef): BattleEvent[] {
  if (!s.heroReady || s.busy) return [];
  if (s.heroSilenced) return [{ kind: "miss", text: "Liora is Silenced - no Verse this turn." }];
  const ab = ABILITIES[ref.id];
  if (!ab) return [];
  if (s.hero.stats.mp < ab.mp) return [{ kind: "miss", text: "Not enough MP." }];
  s.heroReady = false;
  s.heroAtb = 0;
  s.busy = true;
  s.hero.stats.mp -= ab.mp;
  if (ab.kind === "heal") {
    const amount = 18 + s.hero.stats.voice * 2 + Math.floor(Math.random() * 8);
    s.hero.stats.hp = Math.min(s.hero.stats.maxHp, s.hero.stats.hp + amount);
    return [
      { kind: "hero-ability", actorId: "hero", text: "Liora hums Hush-Mend." },
      { kind: "heal", targetId: "hero", amount },
    ];
  }
  const target = s.enemies[s.targetIdx];
  if (!target || target.dead) {
    s.busy = false;
    return [{ kind: "miss", text: "No target." }];
  }
  const dmg = rollDamage(s.hero.stats.voice, target.stats.resist, ab.power);
  target.hpNow = Math.max(0, target.hpNow - dmg);
  target.hitFlash = 12;
  if (target.hpNow <= 0) target.dead = true;
  return [
    { kind: "hero-ability", actorId: "hero", targetId: target.battleId, text: "Liora sings " + ab.name + "!" },
    { kind: "damage", targetId: target.battleId, amount: dmg },
  ];
}

export function heroUseItem(s: BattleStateExternal, itemId: string): BattleEvent[] {
  if (!s.heroReady || s.busy) return [];
  const entry = s.inventory.find(e => e.itemId === itemId);
  if (!entry || entry.qty <= 0) return [{ kind: "miss", text: "No items." }];
  const item = ITEMS[itemId];
  if (!item) return [];
  entry.qty -= 1;
  s.heroReady = false;
  s.heroAtb = 0;
  s.busy = true;
  if (item.use.kind === "heal-hp") {
    const a = item.use.amount;
    s.hero.stats.hp = Math.min(s.hero.stats.maxHp, s.hero.stats.hp + a);
    return [
      { kind: "hero-item", text: "Liora uses " + item.name + "." },
      { kind: "heal", targetId: "hero", amount: a },
    ];
  }
  if (item.use.kind === "heal-mp") {
    s.hero.stats.mp = Math.min(s.hero.stats.maxMp, s.hero.stats.mp + item.use.amount);
    return [{ kind: "hero-item", text: "Liora uses " + item.name + ". +" + item.use.amount + " MP." }];
  }
  return [];
}

export function heroFlee(s: BattleStateExternal): BattleEvent[] {
  if (!s.heroReady) return [];
  if (s.enemies.some(e => e.isBoss && !e.dead)) {
    s.heroAtb = 60;
    s.heroReady = false;
    return [{ kind: "miss", text: "Cannot flee from this voice." }];
  }
  if (Math.random() < 0.7) {
    s.result = "fled";
    return [{ kind: "fled", text: "Liora slips back into the corridor." }];
  }
  s.heroReady = false;
  s.heroAtb = 0;
  return [{ kind: "miss", text: "The enemies block the way!" }];
}

export function endHeroAction(s: BattleStateExternal): void {
  s.busy = false;
}
