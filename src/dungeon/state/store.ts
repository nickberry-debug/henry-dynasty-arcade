// state/store.ts — Zustand store for the dungeon crawler.
//
// Holds: hero list, active run, current map, inventory, combat state.
// Persists via existing Dexie helpers in src/db/dexie.ts.

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Hero, DungeonRun, Enemy, Item, RunPhase, CombatLogEntry, StatusEffect,
  HeroStats, DungeonClassId, FloatingText,
} from "../types";
import { RNG } from "../rng";
import { CLASSES, maxHpFor, maxMpFor, xpToNext } from "../content/classes";
import { ENEMIES, spawnPool } from "../content/enemies";
import { QUEST_BEATS } from "../content/quests";
import { ABILITIES } from "../content/abilities";
import { generateMap, recomputeVisibility } from "../engine/generator";
import { rollItem, rollShop, makeStarter } from "../engine/loot";
import {
  heroAttack, enemyAttack, awardXp, allocate,
  tickEnemyStatuses, tickHeroStatuses, effectiveStat,
} from "../engine/combat";
import { chooseEnemyAction, tickCooldowns } from "../engine/ai";
import { isWalkable, isBlockedByEnemy } from "../engine/turn";
import {
  saveDungeonHero, loadDungeonHero, listDungeonHeroes, deleteDungeonHero,
  saveDungeonRun, loadDungeonRunForHero, deleteDungeonRun,
} from "../../db/dexie";

// ─── Helpers ───────────────────────────────────────────────────────────────

function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

function logEntry(text: string, color = "#e2e8f0"): CombatLogEntry {
  return { id: newId("log"), text, color, t: Date.now() };
}

function emptyHeroStatuses(): StatusEffect[] { return []; }

/** Build a freshly leveled-1 hero of a given class. */
export function createHero(name: string, classId: DungeonClassId, statAlloc?: Partial<HeroStats>): Hero {
  const klass = CLASSES[classId];
  const stats: HeroStats = { ...klass.baseStats };
  if (statAlloc) {
    for (const k of Object.keys(statAlloc) as (keyof HeroStats)[]) {
      stats[k] += statAlloc[k] ?? 0;
    }
  }
  const maxHp = maxHpFor(classId, stats, 1);
  const maxMp = maxMpFor(classId, { intellect: stats.intellect }, 1);
  const weapon = makeStarter(klass.startGear.weapon);
  const armor = makeStarter(klass.startGear.armor);
  const id = newId("dh");
  return {
    id,
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    name,
    classId,
    level: 1,
    xp: 0,
    xpToNext: xpToNext(1),
    statPoints: 0,
    stats,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    gold: 25,
    equipment: { weapon, armor },
    inventory: [],
    abilities: ["attack", ...klass.abilities],
    appearance: { tint: classId === "warrior" ? "#dc2626" : classId === "ranger" ? "#16a34a" : "#7c3aed", emoji: klass.emoji },
    totals: { runs: 0, floorsCleared: 0, kills: 0, bossKills: 0 },
  };
}

/** Spawn enemies + loot for a freshly generated floor. */
function populateFloor(run: DungeonRun, hero: Hero) {
  if (!run.map) return;
  const rng = new RNG(run.seed ^ (run.floor * 0xa53f7b91));
  const map = run.map;
  const enemies: Enemy[] = [];
  const drops: DungeonRun["drops"] = [];

  if (run.floor === 10) {
    const boss = ENEMIES.dungeon_lord;
    enemies.push({
      id: newId("e"),
      templateId: boss.id,
      name: boss.name,
      emoji: boss.emoji,
      sprite: boss.sprite,
      x: map.rooms[0].cx + 4, y: map.rooms[0].cy,
      hp: boss.baseHp, maxHp: boss.baseHp,
      damage: [...boss.damage],
      armor: boss.armor,
      speed: boss.speed,
      ai: boss.ai,
      range: boss.range ?? 1,
      xp: boss.xp,
      goldDrop: rng.int(boss.gold[0], boss.gold[1]),
      statuses: [],
      cooldowns: {},
      abilities: [...(boss.abilities ?? ["attack"])],
      alerted: true,
    });
  } else {
    const pool = spawnPool(run.floor);
    if (pool.length === 0) return;
    // Spawn count scales with floor.
    const count = 4 + run.floor + rng.int(0, 3);
    let attempts = 0;
    while (enemies.length < count && attempts++ < 200) {
      const room = rng.pick(map.rooms);
      if (room.kind === "start" || room.kind === "shop") continue;
      const x = rng.int(room.x, room.x + room.w - 1);
      const y = rng.int(room.y, room.y + room.h - 1);
      const tile = map.tiles[y * map.width + x];
      if (tile.kind !== "floor") continue;
      if (enemies.some(e => e.x === x && e.y === y)) continue;
      const tmpl = rng.pick(pool);
      enemies.push({
        id: newId("e"),
        templateId: tmpl.id,
        name: tmpl.name,
        emoji: tmpl.emoji,
        sprite: tmpl.sprite,
        x, y,
        hp: tmpl.baseHp + run.floor * 2,
        maxHp: tmpl.baseHp + run.floor * 2,
        damage: [tmpl.damage[0], tmpl.damage[1]],
        armor: tmpl.armor,
        speed: tmpl.speed,
        ai: tmpl.ai,
        range: tmpl.range ?? 1,
        xp: tmpl.xp,
        goldDrop: rng.int(tmpl.gold[0], tmpl.gold[1]),
        statuses: [],
        cooldowns: {},
        abilities: [...(tmpl.abilities ?? ["attack"])],
        alerted: false,
      });
    }
  }

  // Treasure-room drops
  for (const r of map.rooms) {
    if (r.kind === "treasure") {
      drops.push({ id: newId("drop"), x: r.cx, y: r.cy, kind: "item", item: rollItem(rng, run.floor, { classId: hero.classId, rarity: "rare" }) });
      drops.push({ id: newId("drop"), x: r.cx, y: r.cy, kind: "gold", amount: 20 + run.floor * 8 });
    }
  }
  run.enemies = enemies;
  run.drops = drops;
}

/** Fresh run for a hero. */
function freshRun(hero: Hero, seedOverride?: number): DungeonRun {
  const seed = seedOverride ?? (Math.floor(Math.random() * 0xffffffff) >>> 0);
  const map = generateMap(1, seed);
  const run: DungeonRun = {
    id: newId("dr"),
    heroId: hero.id,
    seed,
    floor: 1,
    map,
    px: map.start.x, py: map.start.y,
    enemies: [],
    drops: [],
    projectiles: [],
    floatingText: [],
    phase: "exploring",
    turn: 0,
    aiming: null,
    quests: QUEST_BEATS.map(q => ({ ...q, seen: false })),
    lastShopFloor: 0,
    startedAt: Date.now(),
    modifiedAt: Date.now(),
    status: "active",
    log: [logEntry(`${hero.name} enters the dungeon. Floor 1.`, "#fde047")],
  };
  populateFloor(run, hero);
  recomputeVisibility(map, run.px, run.py);
  return run;
}

// ─── Store shape ───────────────────────────────────────────────────────────

export interface DungeonStoreState {
  hydrated: boolean;
  heroes: Hero[];
  activeHeroId: string | null;
  run: DungeonRun | null;
  /** Hero statuses live separately so we don't constantly mutate the hero. */
  heroStatuses: StatusEffect[];

  // Lifecycle
  hydrate: () => Promise<void>;
  selectHero: (id: string | null) => Promise<void>;
  createNewHero: (name: string, classId: DungeonClassId, statAlloc?: Partial<HeroStats>) => Promise<Hero>;
  deleteHero: (id: string) => Promise<void>;
  allocatePoint: (stat: keyof HeroStats) => void;

  // Run lifecycle
  startRun: (heroId: string, seed?: number) => Promise<void>;
  continueRun: (heroId: string) => Promise<boolean>;
  abandonRun: () => Promise<void>;

  // Gameplay
  moveHero: (dx: number, dy: number) => void;
  useAbility: (abilityIndex: number, target?: { x: number; y: number; enemyId?: string }) => void;
  pickUpDrop: () => void;
  equipItem: (itemId: string) => void;
  sellItem: (itemId: string) => void;
  buyItem: (item: Item) => void;
  drinkPotion: (kind: "heal" | "mana") => void;
  purchasePotion: (kind: "heal" | "mana", cost: number) => void;
  descend: () => void;
  leaveShop: () => void;
  setAiming: (idx: number | null) => void;
  dismissQuest: () => void;
}

// ─── Helpers shared by store actions ───────────────────────────────────────

function currentHero(state: DungeonStoreState): Hero | null {
  return state.heroes.find(h => h.id === state.activeHeroId) ?? null;
}

function inCombat(run: DungeonRun): boolean {
  // Combat triggers when an alerted enemy is within 6 tiles.
  return run.enemies.some(e => e.hp > 0 && e.alerted && Math.abs(e.x - run.px) + Math.abs(e.y - run.py) < 8);
}

/** Look up the enemy nearest to (px,py), preferring adjacent. */
function nearestEnemy(run: DungeonRun): Enemy | null {
  let best: Enemy | null = null;
  let bestD = Infinity;
  for (const e of run.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.abs(e.x - run.px) + Math.abs(e.y - run.py);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function maybeFireQuest(run: DungeonRun) {
  const q = run.quests.find(q => q.triggerFloor === run.floor && !q.seen);
  if (q) {
    q.seen = true;
    run.log.unshift(logEntry(`📜 ${q.title}: ${q.beat}`, "#c084fc"));
  }
}

// ─── Store implementation ──────────────────────────────────────────────────

export const useDungeon = create<DungeonStoreState>()(immer((set, get) => ({
  hydrated: false,
  heroes: [],
  activeHeroId: null,
  run: null,
  heroStatuses: [],

  async hydrate() {
    if (get().hydrated) return;
    try {
      const heroes = await listDungeonHeroes();
      set(s => {
        s.heroes = heroes;
        s.hydrated = true;
        const lastId = (() => { try { return localStorage.getItem("dd_dungeon_last_hero"); } catch { return null; } })();
        if (lastId && heroes.some(h => h.id === lastId)) s.activeHeroId = lastId;
        else if (heroes.length > 0) s.activeHeroId = heroes[0].id;
      });
    } catch (e) {
      console.warn("[Dungeon] hydrate failed", e);
      set(s => { s.hydrated = true; });
    }
  },

  async selectHero(id) {
    set(s => { s.activeHeroId = id; });
    if (id) {
      try { localStorage.setItem("dd_dungeon_last_hero", id); } catch {}
    }
  },

  async createNewHero(name, classId, statAlloc) {
    const hero = createHero(name, classId, statAlloc);
    await saveDungeonHero(hero);
    set(s => {
      s.heroes.unshift(hero);
      s.activeHeroId = hero.id;
    });
    return hero;
  },

  async deleteHero(id) {
    await deleteDungeonHero(id);
    set(s => {
      s.heroes = s.heroes.filter(h => h.id !== id);
      if (s.activeHeroId === id) s.activeHeroId = s.heroes[0]?.id ?? null;
      if (s.run?.heroId === id) s.run = null;
    });
  },

  allocatePoint(stat) {
    const heroId = get().activeHeroId;
    if (!heroId) return;
    set(s => {
      const hero = s.heroes.find(h => h.id === heroId);
      if (!hero) return;
      allocate(hero, stat);
    });
    const hero = get().heroes.find(h => h.id === heroId);
    if (hero) saveDungeonHero(hero).catch(() => {});
  },

  async startRun(heroId, seed) {
    const hero = get().heroes.find(h => h.id === heroId);
    if (!hero) return;
    // Wipe any existing active run.
    const existing = await loadDungeonRunForHero(heroId);
    if (existing) await deleteDungeonRun(existing.id);
    const run = freshRun(hero, seed);
    set(s => {
      s.run = run;
      s.heroStatuses = [];
      const h = s.heroes.find(x => x.id === heroId);
      if (h) {
        h.hp = h.maxHp;
        h.mp = h.maxMp;
        h.totals.runs += 1;
        h.modifiedAt = Date.now();
      }
      s.activeHeroId = heroId;
    });
    const h = get().heroes.find(x => x.id === heroId);
    if (h) await saveDungeonHero(h);
    await saveDungeonRun(get().run!);
    maybeFireQuest(get().run!);
    set(s => { if (s.run) maybeFireQuest(s.run); });
  },

  async continueRun(heroId) {
    const existing = await loadDungeonRunForHero(heroId);
    if (!existing) return false;
    set(s => {
      s.run = existing;
      s.activeHeroId = heroId;
      s.heroStatuses = [];
    });
    return true;
  },

  async abandonRun() {
    const run = get().run;
    if (!run) return;
    await deleteDungeonRun(run.id);
    set(s => { s.run = null; s.heroStatuses = []; });
  },

  moveHero(dx, dy) {
    const heroId = get().activeHeroId;
    if (!heroId) return;
    set(s => {
      const run = s.run; if (!run || !run.map) return;
      if (run.phase !== "exploring" && run.phase !== "combat") return;
      const nx = run.px + dx, ny = run.py + dy;
      if (!isWalkable(run.map, nx, ny)) return;
      const enemyHere = run.enemies.find(e => e.hp > 0 && e.x === nx && e.y === ny);
      const hero = s.heroes.find(h => h.id === heroId);
      if (!hero) return;
      if (enemyHere) {
        // Bump-attack with basic attack.
        const rng = new RNG(Date.now() ^ run.turn);
        const r = heroAttack(rng, hero, enemyHere, "attack");
        enemyHere.hp = r.enemyHp;
        hero.hp = r.heroHp;
        hero.mp = r.heroMp;
        run.log.unshift(...r.log);
        run.log = run.log.slice(0, 60);
        run.phase = "combat";
        if (r.killed) {
          run.enemies = run.enemies.filter(e => e.id !== enemyHere.id);
          hero.totals.kills += 1;
          if (r.gold) hero.gold += r.gold;
          if (r.xp) {
            const xpLog = awardXp(hero, r.xp);
            run.log.unshift(...xpLog);
          }
        }
        endHeroTurnInplace(s, run, hero);
        return;
      }
      // Step
      run.px = nx; run.py = ny;
      recomputeVisibility(run.map, nx, ny);
      // Auto-pickup
      const drop = run.drops.find(d => d.x === nx && d.y === ny);
      if (drop) {
        if (drop.kind === "gold") {
          hero.gold += drop.amount ?? 0;
          run.log.unshift(logEntry(`Picked up ${drop.amount}g.`, "#fde047"));
        } else if (drop.kind === "item" && drop.item) {
          hero.inventory.push(drop.item);
          run.log.unshift(logEntry(`Picked up ${drop.item.name}.`, "#86efac"));
        }
        run.drops = run.drops.filter(d => d.id !== drop.id);
      }
      // Stairs check
      const tile = run.map.tiles[ny * run.map.width + nx];
      if (tile.kind === "stairsDown") {
        run.log.unshift(logEntry("Stairs down — press D to descend.", "#93c5fd"));
      } else if (tile.kind === "shrine" && !run.map.rooms.some(r => r.kind === "shop" && r.cx === nx && r.cy === ny && tile.kind === "shrine")) {
        // not a shop, just a sprite — ignore
      } else if (tile.kind === "chest") {
        const rng = new RNG(run.seed ^ nx * 31 ^ ny * 17);
        const item = rollItem(rng, run.floor, { classId: hero.classId, rarity: "epic" });
        hero.inventory.push(item);
        run.map.tiles[ny * run.map.width + nx].kind = "floor";
        run.log.unshift(logEntry(`Chest! Found ${item.name}.`, "#fde047"));
      }
      // Shop encounter — when standing on shop shrine
      const onShop = run.map.rooms.find(r => r.kind === "shop" && r.cx === nx && r.cy === ny);
      if (onShop && run.lastShopFloor !== run.floor) {
        run.phase = "shopping";
        run.lastShopFloor = run.floor;
        run.log.unshift(logEntry("A merchant nods. (Shop)", "#fde047"));
      }
      // Phase transition: exploring vs combat
      if (inCombat(run)) {
        run.phase = "combat";
      } else if (run.phase === "combat") {
        run.phase = "exploring";
      }
      endHeroTurnInplace(s, run, hero);
    });
    persistRun();
  },

  useAbility(abilityIndex, target) {
    const heroId = get().activeHeroId;
    if (!heroId) return;
    set(s => {
      const run = s.run; if (!run || !run.map) return;
      const hero = s.heroes.find(h => h.id === heroId); if (!hero) return;
      const abilityId = hero.abilities[abilityIndex];
      const ability = ABILITIES[abilityId]; if (!ability) return;
      const rng = new RNG(Date.now() ^ run.turn ^ abilityIndex);

      // Self-target healing / mana
      if (ability.target === "self") {
        if (ability.heal) {
          const healed = Math.min(hero.maxHp - hero.hp, ability.heal);
          hero.hp += healed;
          run.log.unshift(logEntry(`${ability.name} +${healed} HP.`, "#86efac"));
        }
        endHeroTurnInplace(s, run, hero);
        return;
      }

      // All-enemies AoE — hit every enemy within ability.aoe of target tile (or hero if self-centered).
      if (ability.target === "all-enemies") {
        if (hero.mp < ability.cost) {
          run.log.unshift(logEntry(`Not enough mana for ${ability.name}.`, "#fda4af"));
          return;
        }
        hero.mp -= ability.cost;
        const cx = target?.x ?? run.px, cy = target?.y ?? run.py;
        const radius = ability.aoe ?? 1;
        for (const enemy of run.enemies) {
          if (enemy.hp <= 0) continue;
          const d = Math.max(Math.abs(enemy.x - cx), Math.abs(enemy.y - cy));
          if (d > radius) continue;
          // Apply damage without the mana cost (already paid).
          const tmpAbility = { ...ability, cost: 0 };
          (ABILITIES as any).__tmp = tmpAbility;
          const r = heroAttack(rng, { ...hero, mp: 999 }, enemy, "__tmp");
          delete (ABILITIES as any).__tmp;
          enemy.hp = r.enemyHp;
          run.log.unshift(...r.log);
          if (r.killed && r.xp) {
            hero.totals.kills += 1;
            if (r.gold) hero.gold += r.gold;
            const xpLog = awardXp(hero, r.xp);
            run.log.unshift(...xpLog);
          }
        }
        run.enemies = run.enemies.filter(e => e.hp > 0);
        run.log = run.log.slice(0, 60);
        endHeroTurnInplace(s, run, hero);
        return;
      }

      // Single-enemy target.
      const enemy = target?.enemyId
        ? run.enemies.find(e => e.id === target.enemyId)
        : nearestEnemy(run);
      if (!enemy) {
        run.log.unshift(logEntry("No target in range.", "#fda4af"));
        return;
      }
      const dist = Math.max(Math.abs(enemy.x - run.px), Math.abs(enemy.y - run.py));
      if (dist > ability.range) {
        run.log.unshift(logEntry(`${enemy.name} is out of range.`, "#fda4af"));
        return;
      }
      const r = heroAttack(rng, hero, enemy, abilityId);
      enemy.hp = r.enemyHp;
      hero.hp = r.heroHp;
      hero.mp = r.heroMp;
      run.log.unshift(...r.log);
      run.log = run.log.slice(0, 60);
      if (r.killed) {
        run.enemies = run.enemies.filter(e => e.id !== enemy.id);
        hero.totals.kills += 1;
        if (r.gold) hero.gold += r.gold;
        if (r.xp) {
          const xpLog = awardXp(hero, r.xp);
          run.log.unshift(...xpLog);
        }
        // AoE splash?
        if (ability.aoe && ability.aoe > 0) {
          const cx = enemy.x, cy = enemy.y;
          for (const e2 of run.enemies) {
            if (e2.hp <= 0) continue;
            const d = Math.max(Math.abs(e2.x - cx), Math.abs(e2.y - cy));
            if (d > ability.aoe) continue;
            const splash = Math.floor((r.enemyHp >= 0 ? 0 : 0));
            // Apply quarter damage from same ability (rough splash)
            const tmpAbility = { ...ability, cost: 0, damageMult: (ability.damageMult ?? 1) * 0.5 };
            (ABILITIES as any).__tmp = tmpAbility;
            const r2 = heroAttack(rng, { ...hero, mp: 999 }, e2, "__tmp");
            delete (ABILITIES as any).__tmp;
            e2.hp = r2.enemyHp;
            if (splash) run.log.unshift(logEntry(`Splash → ${e2.name}`, "#fcd34d"));
          }
          run.enemies = run.enemies.filter(e => e.hp > 0);
        }
      }
      run.phase = inCombat(run) ? "combat" : "exploring";
      endHeroTurnInplace(s, run, hero);
    });
    persistRun();
  },

  pickUpDrop() {
    set(s => {
      const run = s.run; if (!run) return;
      const heroId = s.activeHeroId; const hero = s.heroes.find(h => h.id === heroId); if (!hero) return;
      const drop = run.drops.find(d => d.x === run.px && d.y === run.py);
      if (!drop) return;
      if (drop.kind === "gold") {
        hero.gold += drop.amount ?? 0;
        run.log.unshift(logEntry(`Picked up ${drop.amount}g.`, "#fde047"));
      } else if (drop.kind === "item" && drop.item) {
        hero.inventory.push(drop.item);
        run.log.unshift(logEntry(`Picked up ${drop.item.name}.`, "#86efac"));
      }
      run.drops = run.drops.filter(d => d.id !== drop.id);
    });
    persistRun();
  },

  equipItem(itemId) {
    set(s => {
      const heroId = s.activeHeroId; const hero = s.heroes.find(h => h.id === heroId); if (!hero) return;
      const item = hero.inventory.find(i => i.id === itemId); if (!item) return;
      if (item.classLock && item.classLock !== hero.classId) return;
      const current = hero.equipment[item.slot];
      hero.equipment[item.slot] = item;
      hero.inventory = hero.inventory.filter(i => i.id !== itemId);
      if (current) hero.inventory.push(current);
      // Recompute max HP/MP in case stats changed.
      hero.maxHp = maxHpFor(hero.classId, { strength: effectiveStat(hero, "strength"), vitality: effectiveStat(hero, "vitality") }, hero.level);
      hero.maxMp = maxMpFor(hero.classId, { intellect: effectiveStat(hero, "intellect") }, hero.level);
      hero.hp = Math.min(hero.hp, hero.maxHp);
      hero.mp = Math.min(hero.mp, hero.maxMp);
      if (s.run) s.run.log.unshift(logEntry(`Equipped ${item.name}.`, "#86efac"));
    });
    const hero = get().heroes.find(h => h.id === get().activeHeroId);
    if (hero) saveDungeonHero(hero).catch(() => {});
    persistRun();
  },

  sellItem(itemId) {
    set(s => {
      const heroId = s.activeHeroId; const hero = s.heroes.find(h => h.id === heroId); if (!hero) return;
      const item = hero.inventory.find(i => i.id === itemId); if (!item) return;
      const sellPrice = Math.max(1, Math.floor(item.price / 3));
      hero.gold += sellPrice;
      hero.inventory = hero.inventory.filter(i => i.id !== itemId);
      if (s.run) s.run.log.unshift(logEntry(`Sold ${item.name} for ${sellPrice}g.`, "#fde047"));
    });
    persistRun();
  },

  buyItem(item) {
    set(s => {
      const heroId = s.activeHeroId; const hero = s.heroes.find(h => h.id === heroId); if (!hero) return;
      if (hero.gold < item.price) {
        if (s.run) s.run.log.unshift(logEntry("Not enough gold.", "#fda4af"));
        return;
      }
      hero.gold -= item.price;
      hero.inventory.push(item);
      if (s.run) s.run.log.unshift(logEntry(`Bought ${item.name}.`, "#86efac"));
    });
    persistRun();
  },

  drinkPotion(kind) {
    set(s => {
      const heroId = s.activeHeroId; const hero = s.heroes.find(h => h.id === heroId); if (!hero) return;
      if (kind === "heal") {
        const heal = Math.min(40, hero.maxHp - hero.hp);
        hero.hp += heal;
        if (s.run) s.run.log.unshift(logEntry(`+${heal} HP.`, "#86efac"));
      } else {
        const mp = Math.min(30, hero.maxMp - hero.mp);
        hero.mp += mp;
        if (s.run) s.run.log.unshift(logEntry(`+${mp} MP.`, "#93c5fd"));
      }
    });
    persistRun();
  },

  purchasePotion(kind, cost) {
    set(s => {
      const heroId = s.activeHeroId; const hero = s.heroes.find(h => h.id === heroId); if (!hero) return;
      if (hero.gold < cost) {
        if (s.run) s.run.log.unshift(logEntry("Not enough gold.", "#fda4af"));
        return;
      }
      hero.gold -= cost;
      if (kind === "heal") {
        const heal = Math.min(40, hero.maxHp - hero.hp);
        hero.hp += heal;
        if (s.run) s.run.log.unshift(logEntry(`Bought potion. +${heal} HP.`, "#86efac"));
      } else {
        const mp = Math.min(30, hero.maxMp - hero.mp);
        hero.mp += mp;
        if (s.run) s.run.log.unshift(logEntry(`Bought vial. +${mp} MP.`, "#93c5fd"));
      }
    });
    persistRun();
  },

  descend() {
    set(s => {
      const run = s.run; if (!run || !run.map) return;
      const heroId = s.activeHeroId; const hero = s.heroes.find(h => h.id === heroId); if (!hero) return;
      const tile = run.map.tiles[run.py * run.map.width + run.px];
      if (tile.kind !== "stairsDown" && run.floor < 10) return;
      hero.totals.floorsCleared += 1;
      run.floor += 1;
      if (run.floor > 10) {
        run.phase = "victory";
        run.status = "won";
        hero.totals.bossKills += 1;
        run.log.unshift(logEntry("The Dungeon Lord is vanquished. Victory!", "#fde047"));
        return;
      }
      const seed = (run.seed ^ (run.floor * 0xc2b2ae35)) >>> 0;
      run.map = generateMap(run.floor, seed);
      run.px = run.map.start.x; run.py = run.map.start.y;
      run.enemies = []; run.drops = []; run.projectiles = []; run.floatingText = [];
      run.lastShopFloor = run.floor === 10 ? run.floor : run.lastShopFloor;
      populateFloor(run, hero);
      recomputeVisibility(run.map, run.px, run.py);
      run.phase = "exploring";
      maybeFireQuest(run);
      run.log.unshift(logEntry(`Descending to floor ${run.floor}.`, "#93c5fd"));
    });
    persistRun();
  },

  leaveShop() {
    set(s => {
      if (!s.run) return;
      if (s.run.phase === "shopping") s.run.phase = "exploring";
    });
    persistRun();
  },

  setAiming(idx) {
    set(s => { if (s.run) s.run.aiming = idx; });
  },

  dismissQuest() {
    set(s => {
      if (!s.run) return;
      // No-op: quest beats are already marked seen when shown; this just hides the floating quest panel.
      // We use a transient flag via localStorage rather than store mutations.
      try { localStorage.setItem("dd_dungeon_quest_dismissed_floor", String(s.run.floor)); } catch {}
    });
  },
})));

// ─── Helpers tied to set() ─────────────────────────────────────────────────

/**
 * Apply the end-of-hero-turn enemy AI pass + status ticks. Mutates run/hero
 * in place because Immer is in scope.
 */
function endHeroTurnInplace(state: DungeonStoreState, run: DungeonRun, hero: Hero) {
  if (!run.map) return;
  run.turn += 1;

  // Tick hero statuses (read from state.heroStatuses; we keep them in store).
  const hr = tickHeroStatuses(hero, state.heroStatuses);
  hero.hp = hr.hp;
  hero.mp = Math.min(hero.maxMp, hr.mp);
  state.heroStatuses = hr.nextStatuses;
  run.log.unshift(...hr.log);
  if (hero.hp <= 0) {
    run.phase = "defeat";
    run.status = "lost";
    run.log.unshift(logEntry(`${hero.name} has fallen on floor ${run.floor}.`, "#fca5a5"));
    return;
  }

  // Tick enemy statuses (poison/burn etc.)
  for (const e of run.enemies) {
    const r = tickEnemyStatuses(e);
    e.hp = r.hp;
    run.log.unshift(...r.log);
  }
  run.enemies = run.enemies.filter(e => e.hp > 0);

  // Enemy AI pass — each enemy moves OR attacks.
  const occupied = new Set<string>();
  occupied.add(`${run.px},${run.py}`);
  for (const e of run.enemies) occupied.add(`${e.x},${e.y}`);

  const rng = new RNG(Date.now() ^ run.turn);
  for (const e of run.enemies) {
    if (e.hp <= 0) continue;
    tickCooldowns(e);
    const action = chooseEnemyAction(e, hero, run.map, run.px, run.py, occupied);
    if (action.kind === "move") {
      occupied.delete(`${e.x},${e.y}`);
      e.x = action.x; e.y = action.y;
      occupied.add(`${e.x},${e.y}`);
    } else if (action.kind === "attack") {
      const r = enemyAttack(rng, e, hero, action.abilityId);
      hero.hp = r.heroHp;
      run.log.unshift(...r.log);
      const ability = ABILITIES[action.abilityId];
      if (ability) e.cooldowns[action.abilityId] = ability.cooldown;
      if (r.statusToHero) {
        for (const st of r.statusToHero) {
          const existing = state.heroStatuses.find(s2 => s2.kind === st.kind);
          if (existing) {
            existing.duration = Math.max(existing.duration, st.duration);
            existing.power = Math.max(existing.power, st.power);
          } else {
            state.heroStatuses.push({ ...st });
          }
        }
      }
      if (r.heroDied) {
        run.phase = "defeat";
        run.status = "lost";
        run.log.unshift(logEntry(`${hero.name} has fallen on floor ${run.floor}.`, "#fca5a5"));
        return;
      }
    }
  }
  run.log = run.log.slice(0, 60);
  if (inCombat(run)) run.phase = run.phase === "shopping" ? "shopping" : "combat";
  else if (run.phase === "combat") run.phase = "exploring";
}

/** Best-effort run persistence — fire and forget. */
function persistRun() {
  const run = useDungeon.getState().run;
  if (run) {
    saveDungeonRun(run).catch(() => {});
  }
  const heroId = useDungeon.getState().activeHeroId;
  const hero = useDungeon.getState().heroes.find(h => h.id === heroId);
  if (hero) {
    saveDungeonHero(hero).catch(() => {});
  }
}

// ─── Selectors ────────────────────────────────────────────────────────────

/** Get the active hero (or null). */
export function useActiveHero(): Hero | null {
  return useDungeon(s => s.heroes.find(h => h.id === s.activeHeroId) ?? null);
}

/** Render-time helper to compute hero status snapshot. */
export function heroStatusSnapshot(hero: Hero) {
  return { hp: hero.hp, mp: hero.mp, level: hero.level, xp: hero.xp, xpToNext: hero.xpToNext };
}
