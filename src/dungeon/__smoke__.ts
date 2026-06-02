// Smoke test — exercise the pure engine without React/Dexie.
// Run with: npx tsx src/dungeon/__smoke__.ts

import { RNG } from "./rng";
import { generateMap, findPath } from "./engine/generator";
import { rollItem, rollShop, makeStarter } from "./engine/loot";
import { heroAttack, awardXp, allocate } from "./engine/combat";
import { chooseEnemyAction } from "./engine/ai";
import { ENEMIES } from "./content/enemies";
import { CLASSES } from "./content/classes";
import type { Enemy, Hero } from "./types";
import { maxHpFor, maxMpFor, xpToNext } from "./content/classes";

function makeTestHero(): Hero {
  const klass = CLASSES.warrior;
  const stats = { ...klass.baseStats };
  const maxHp = maxHpFor("warrior", stats, 1);
  const maxMp = maxMpFor("warrior", { intellect: stats.intellect }, 1);
  return {
    id: "test", createdAt: 0, modifiedAt: 0,
    name: "Test", classId: "warrior",
    level: 1, xp: 0, xpToNext: xpToNext(1),
    statPoints: 0, stats,
    hp: maxHp, maxHp, mp: maxMp, maxMp, gold: 50,
    equipment: { weapon: makeStarter(klass.startGear.weapon), armor: makeStarter(klass.startGear.armor) },
    inventory: [],
    abilities: ["attack", ...klass.abilities],
    appearance: { tint: "#dc2626", emoji: "⚔️" },
    totals: { runs: 0, floorsCleared: 0, kills: 0, bossKills: 0 },
  };
}

function makeTestEnemy(): Enemy {
  const tmpl = ENEMIES.goblin;
  return {
    id: "e1", templateId: tmpl.id, name: tmpl.name, emoji: tmpl.emoji, sprite: tmpl.sprite,
    x: 0, y: 0,
    hp: tmpl.baseHp, maxHp: tmpl.baseHp,
    damage: [...tmpl.damage], armor: tmpl.armor, speed: tmpl.speed,
    ai: tmpl.ai, range: tmpl.range ?? 1, xp: tmpl.xp, goldDrop: 5,
    statuses: [], cooldowns: {}, abilities: [...(tmpl.abilities ?? ["attack"])],
    alerted: true,
  };
}

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { console.log(`✓ ${name}`); passed++; }
  else { console.error(`✗ ${name}`); failed++; }
}

console.log("Dungeon Crawler smoke tests\n----------------------------");

// 1. Generator determinism
{
  const m1 = generateMap(1, 12345);
  const m2 = generateMap(1, 12345);
  check("map generation is deterministic for same seed", m1.start.x === m2.start.x && m1.start.y === m2.start.y);
  check("map has start + stairs", !!m1.start && !!m1.stairsDown);
}

// 2. Boss arena
{
  const boss = generateMap(10, 99);
  check("floor 10 is boss arena (single room)", boss.rooms.length === 1 && boss.rooms[0].kind === "boss");
}

// 3. Pathfinding
{
  const map = generateMap(1, 777);
  const path = findPath(map, map.start.x, map.start.y, map.stairsDown.x, map.stairsDown.y, () => false);
  check("A* finds a path from start to stairs", path.length > 0);
}

// 4. Loot rarity scaling
{
  const rng = new RNG(42);
  const items = Array.from({ length: 100 }, () => rollItem(rng, 1));
  const legendsF1 = items.filter(i => i.rarity === "legendary").length;
  const rng2 = new RNG(42);
  const items10 = Array.from({ length: 100 }, () => rollItem(rng2, 10));
  const legendsF10 = items10.filter(i => i.rarity === "legendary").length;
  check("floor 10 yields more legendaries than floor 1", legendsF10 >= legendsF1);
}

// 5. Hero attacks enemy
{
  const rng = new RNG(1);
  const hero = makeTestHero();
  const enemy = makeTestEnemy();
  const r = heroAttack(rng, hero, enemy, "attack");
  check("hero attack deals damage", r.enemyHp < enemy.hp);
  check("log entry present", r.log.length > 0);
}

// 6. Ability with mana cost requires mana
{
  const rng = new RNG(2);
  const hero = makeTestHero();
  hero.mp = 0;
  const enemy = makeTestEnemy();
  const r = heroAttack(rng, hero, enemy, "shield_bash");
  check("ability without mana fails", r.enemyHp === enemy.hp);
}

// 7. XP triggers level up
{
  const hero = makeTestHero();
  const before = hero.level;
  awardXp(hero, 10000);
  check("massive XP triggers multiple level-ups", hero.level > before);
  check("level-up grants stat points", hero.statPoints > 0);
}

// 8. Stat allocation
{
  const hero = makeTestHero();
  hero.statPoints = 3;
  const sBefore = hero.stats.strength;
  allocate(hero, "strength");
  check("allocate raises strength", hero.stats.strength === sBefore + 1);
  check("allocate consumes a point", hero.statPoints === 2);
}

// 9. Enemy AI picks an action
{
  const map = generateMap(1, 33);
  const hero = makeTestHero();
  const enemy = makeTestEnemy();
  enemy.x = map.start.x + 1; enemy.y = map.start.y;
  const action = chooseEnemyAction(enemy, hero, map, map.start.x, map.start.y, new Set([`${map.start.x},${map.start.y}`]));
  check("adjacent melee enemy attacks", action.kind === "attack");
}

// 10. Shop generates 6 items
{
  const rng = new RNG(5);
  const shop = rollShop(rng, 3, "warrior");
  check("shop has 6 items", shop.length === 6);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
