// engine/combat.ts — Damage calculations, ability application, status ticks.
//
// Pure functions: `attack`, `applyAbility`, `tickStatuses` return new
// HP/MP/state and a CombatLogEntry[] to surface in the UI. No React, no
// side effects.

import type {
  Hero, Enemy, Ability, StatusEffect, CombatLogEntry, Item, HeroStats,
} from "../types";
import { RNG } from "../rng";
import { CLASSES, maxHpFor, maxMpFor, xpToNext, POINTS_PER_LEVEL } from "../content/classes";
import { ABILITIES } from "../content/abilities";

/** Sum of stat bonuses contributed by equipped gear. */
export function gearStatBonus(hero: Hero, stat: keyof HeroStats): number {
  let total = 0;
  const items: Array<Item | undefined> = [hero.equipment.weapon, hero.equipment.armor, hero.equipment.trinket];
  for (const it of items) {
    if (!it) continue;
    for (const a of it.affixes) {
      if (a.stat === stat) total += a.bonus ?? 0;
    }
  }
  return total;
}

/** Total effective stat value (base + gear). */
export function effectiveStat(hero: Hero, stat: keyof HeroStats): number {
  return hero.stats[stat] + gearStatBonus(hero, stat);
}

/** Sum +Damage / +Armor / +Lifesteal / +Crit affixes. */
export function gearScalars(hero: Hero): { dmg: number; arm: number; lifesteal: number; crit: number } {
  let dmg = 0, arm = 0, lifesteal = 0, crit = 0;
  const items: Array<Item | undefined> = [hero.equipment.weapon, hero.equipment.armor, hero.equipment.trinket];
  for (const it of items) {
    if (!it) continue;
    if (it.armor) arm += it.armor;
    for (const a of it.affixes) {
      if (a.damageBonus) dmg += a.damageBonus;
      if (a.armorBonus) arm += a.armorBonus;
      if (a.lifesteal) lifesteal += a.lifesteal;
      if (a.critBonus) crit += a.critBonus;
    }
  }
  return { dmg, arm, lifesteal, crit };
}

/** Hero weapon damage range (post-affixes). */
export function heroWeaponDamage(hero: Hero): [number, number] {
  const w = hero.equipment.weapon;
  const base: [number, number] = w?.damage ? [w.damage[0], w.damage[1]] : [2, 4];
  const { dmg } = gearScalars(hero);
  return [base[0] + dmg, base[1] + dmg];
}

/** Hero armor value (post-affixes). */
export function heroArmor(hero: Hero): number {
  return gearScalars(hero).arm;
}

/** Base damage range an ability deals when used by the hero. */
function heroAbilityDamage(hero: Hero, ability: Ability): [number, number] {
  if (ability.flatDamage !== undefined) {
    // Caster scaling: + 60% of intellect for spell-flat abilities.
    const int = effectiveStat(hero, "intellect");
    const scale = ability.damageType && ability.damageType !== "physical" ? Math.floor(int * 0.6) : 0;
    const lo = Math.max(1, (ability.flatDamage ?? 0) + scale - 2);
    const hi = (ability.flatDamage ?? 0) + scale + 2;
    return [lo, hi];
  }
  const [lo, hi] = heroWeaponDamage(hero);
  const mult = ability.damageMult ?? 1;
  // Strength adds a flat bonus equal to half the strength stat.
  const str = effectiveStat(hero, "strength");
  return [Math.max(1, Math.floor(lo * mult) + Math.floor(str / 2)), Math.floor(hi * mult) + Math.floor(str / 2)];
}

/** Base damage range an enemy ability deals. */
function enemyAbilityDamage(enemy: Enemy, ability: Ability): [number, number] {
  if (ability.flatDamage !== undefined) {
    return [Math.max(1, ability.flatDamage - 2), ability.flatDamage + 2];
  }
  const mult = ability.damageMult ?? 1;
  return [Math.max(1, Math.floor(enemy.damage[0] * mult)), Math.floor(enemy.damage[1] * mult)];
}

/** Roll damage in [lo, hi] then subtract defender armor (min 1). */
function rollDamage(rng: RNG, range: [number, number], defenderArmor: number, crit: boolean): number {
  const raw = rng.int(range[0], range[1]);
  const mitigated = Math.max(1, raw - defenderArmor);
  return crit ? Math.floor(mitigated * 1.75) : mitigated;
}

/** Return the matching status on an entity (or undefined). */
function findStatus(list: StatusEffect[], kind: StatusEffect["kind"]) {
  return list.find(s => s.kind === kind);
}

function pushStatus(list: StatusEffect[], add: StatusEffect) {
  const existing = findStatus(list, add.kind);
  if (existing) {
    existing.duration = Math.max(existing.duration, add.duration);
    existing.power = Math.max(existing.power, add.power);
  } else {
    list.push({ ...add });
  }
}

function isStunned(list: StatusEffect[]): boolean {
  return list.some(s => s.kind === "stun" && s.duration > 0);
}

// ─── Hero attacks Enemy ────────────────────────────────────────────────────

export interface AttackResult {
  enemyHp: number;
  heroHp: number;
  heroMp: number;
  log: CombatLogEntry[];
  killed: boolean;
  /** XP / gold to award if killed. */
  xp?: number;
  gold?: number;
}

function nowId() {
  return Math.random().toString(36).slice(2, 9);
}

function entry(text: string, color = "#e2e8f0"): CombatLogEntry {
  return { id: nowId(), text, color, t: Date.now() };
}

export function heroAttack(
  rng: RNG,
  hero: Hero,
  enemy: Enemy,
  abilityId: string,
): AttackResult {
  const ability = ABILITIES[abilityId] ?? ABILITIES.attack;
  const log: CombatLogEntry[] = [];

  let enemyHp = enemy.hp;
  let heroHp = hero.hp;
  let heroMp = hero.mp;

  // Mana check
  if (ability.cost > heroMp) {
    log.push(entry(`Not enough mana for ${ability.name}.`, "#fda4af"));
    return { enemyHp, heroHp, heroMp, log, killed: false };
  }
  heroMp -= ability.cost;

  if (ability.heal && ability.target === "self") {
    const healed = Math.min(hero.maxHp - heroHp, ability.heal);
    heroHp += healed;
    log.push(entry(`${hero.name} drinks ${ability.name} (+${healed} HP).`, "#86efac"));
    return { enemyHp, heroHp, heroMp, log, killed: false };
  }

  if (ability.target === "self" && (ability.flatDamage ?? 0) < 0) {
    // Mana vial: negative flatDamage = MP restore.
    const restored = Math.min(hero.maxMp - heroMp, -(ability.flatDamage ?? 0));
    heroMp += restored;
    log.push(entry(`${hero.name} drinks ${ability.name} (+${restored} MP).`, "#93c5fd"));
    return { enemyHp, heroHp, heroMp, log, killed: false };
  }

  // Damage
  const range = heroAbilityDamage(hero, ability);
  const { lifesteal, crit: critBonus } = gearScalars(hero);
  const agi = effectiveStat(hero, "agility");
  const critChance = Math.min(60, 5 + agi * 0.6 + critBonus);
  const crit = rng.chance(critChance / 100);
  const dmg = rollDamage(rng, range, enemy.armor, crit);

  enemyHp = Math.max(0, enemyHp - dmg);
  log.push(entry(
    `${hero.name} uses ${ability.name}${crit ? " — CRIT!" : ""} for ${dmg} damage.`,
    crit ? "#fde047" : "#e2e8f0",
  ));

  if (lifesteal > 0) {
    const heal = Math.max(1, Math.floor((dmg * lifesteal) / 100));
    const before = heroHp;
    heroHp = Math.min(hero.maxHp, heroHp + heal);
    if (heroHp > before) log.push(entry(`Lifesteal restores ${heroHp - before} HP.`, "#86efac"));
  }

  // Inflict statuses on the enemy
  if (ability.inflicts && enemyHp > 0) {
    for (const st of ability.inflicts) {
      pushStatus(enemy.statuses, { ...st, source: ability.name });
      log.push(entry(`${enemy.name} is ${st.kind} (${st.duration} turns).`, "#c084fc"));
    }
  }
  if (ability.selfBuff) {
    // Self-buffs applied to enemy.statuses doesn't make sense; we leave it
    // to the store/turn to apply to hero. Caller can read ability.selfBuff
    // separately. We log it here for transparency.
    for (const st of ability.selfBuff) {
      log.push(entry(`${hero.name} gains ${st.kind}.`, "#86efac"));
    }
  }

  const killed = enemyHp <= 0;
  if (killed) {
    log.push(entry(`${enemy.name} defeated! +${enemy.xp} XP, +${enemy.goldDrop}g.`, "#fde047"));
  }

  return {
    enemyHp, heroHp, heroMp, log,
    killed,
    xp: killed ? enemy.xp : undefined,
    gold: killed ? enemy.goldDrop : undefined,
  };
}

// ─── Enemy attacks Hero ────────────────────────────────────────────────────

export function enemyAttack(
  rng: RNG,
  enemy: Enemy,
  hero: Hero,
  abilityId: string,
): { heroHp: number; log: CombatLogEntry[]; heroDied: boolean; statusToHero?: StatusEffect[] } {
  const ability = ABILITIES[abilityId] ?? ABILITIES.attack;
  const log: CombatLogEntry[] = [];

  if (isStunned(enemy.statuses)) {
    log.push(entry(`${enemy.name} is stunned and can't act.`, "#94a3b8"));
    return { heroHp: hero.hp, log, heroDied: false };
  }

  const range = enemyAbilityDamage(enemy, ability);
  const armor = heroArmor(hero);
  // Hero agility grants dodge chance.
  const dodgeChance = Math.min(40, 3 + effectiveStat(hero, "agility") * 0.5);
  if (rng.chance(dodgeChance / 100)) {
    log.push(entry(`${hero.name} dodges ${enemy.name}'s ${ability.name}.`, "#86efac"));
    return { heroHp: hero.hp, log, heroDied: false };
  }
  const dmg = rollDamage(rng, range, armor, false);
  const heroHp = Math.max(0, hero.hp - dmg);
  log.push(entry(
    `${enemy.name} uses ${ability.name} on ${hero.name} for ${dmg} damage.`,
    "#fca5a5",
  ));

  const statusToHero: StatusEffect[] = [];
  if (ability.inflicts && heroHp > 0) {
    for (const st of ability.inflicts) {
      statusToHero.push({ ...st, source: ability.name });
      log.push(entry(`${hero.name} is ${st.kind} (${st.duration} turns).`, "#c084fc"));
    }
  }

  return { heroHp, log, heroDied: heroHp <= 0, statusToHero: statusToHero.length ? statusToHero : undefined };
}

// ─── Status tick (per-turn) ────────────────────────────────────────────────

/** Apply per-turn status damage / regen and decrement durations. */
export function tickEnemyStatuses(enemy: Enemy): { hp: number; log: CombatLogEntry[]; died: boolean } {
  const log: CombatLogEntry[] = [];
  let hp = enemy.hp;
  for (const st of enemy.statuses) {
    if (st.duration <= 0) continue;
    if (st.kind === "poison" || st.kind === "burn" || st.kind === "bleed") {
      hp = Math.max(0, hp - st.power);
      log.push(entry(`${enemy.name} takes ${st.power} ${st.kind} damage.`, "#fca5a5"));
    }
    st.duration -= 1;
  }
  enemy.statuses = enemy.statuses.filter(s => s.duration > 0);
  return { hp, log, died: hp <= 0 };
}

export function tickHeroStatuses(hero: Hero, statuses: StatusEffect[]): {
  hp: number; mp: number; log: CombatLogEntry[]; died: boolean; nextStatuses: StatusEffect[];
} {
  const log: CombatLogEntry[] = [];
  let hp = hero.hp, mp = hero.mp;
  const next: StatusEffect[] = [];
  for (const st of statuses) {
    if (st.duration <= 0) continue;
    if (st.kind === "poison" || st.kind === "burn" || st.kind === "bleed") {
      hp = Math.max(0, hp - st.power);
      log.push(entry(`${hero.name} takes ${st.power} ${st.kind} damage.`, "#fca5a5"));
    } else if (st.kind === "regen") {
      const healed = Math.min(hero.maxHp - hp, st.power);
      hp += healed;
      if (healed > 0) log.push(entry(`${hero.name} regenerates ${healed} HP.`, "#86efac"));
    }
    const nd = st.duration - 1;
    if (nd > 0) next.push({ ...st, duration: nd });
  }
  return { hp, mp, log, died: hp <= 0, nextStatuses: next };
}

// ─── XP / level-up ────────────────────────────────────────────────────────

/** Awards XP and applies as many level-ups as it triggers. Returns log entries. */
export function awardXp(hero: Hero, xp: number): CombatLogEntry[] {
  const log: CombatLogEntry[] = [];
  hero.xp += xp;
  while (hero.xp >= hero.xpToNext) {
    hero.xp -= hero.xpToNext;
    hero.level += 1;
    hero.xpToNext = xpToNext(hero.level);
    hero.statPoints += POINTS_PER_LEVEL;
    // Refresh max HP/MP
    hero.maxHp = maxHpFor(hero.classId, hero.stats, hero.level);
    hero.maxMp = maxMpFor(hero.classId, { intellect: hero.stats.intellect }, hero.level);
    hero.hp = hero.maxHp;
    hero.mp = hero.maxMp;
    log.push(entry(
      `🎉 ${hero.name} reaches level ${hero.level}! +${POINTS_PER_LEVEL} stat points.`,
      "#fde047",
    ));
  }
  return log;
}

/** Spend a stat point. Returns updated hero (mutates). */
export function allocate(hero: Hero, stat: keyof HeroStats): boolean {
  if (hero.statPoints <= 0) return false;
  hero.stats[stat] += 1;
  hero.statPoints -= 1;
  hero.maxHp = maxHpFor(hero.classId, hero.stats, hero.level);
  hero.maxMp = maxMpFor(hero.classId, { intellect: hero.stats.intellect }, hero.level);
  // Don't auto-heal — only the levelup heals.
  hero.hp = Math.min(hero.hp, hero.maxHp);
  hero.mp = Math.min(hero.mp, hero.maxMp);
  return true;
}

/** Re-export class table for convenience. */
export { CLASSES };
