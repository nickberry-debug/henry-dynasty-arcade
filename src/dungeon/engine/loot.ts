// engine/loot.ts — Procedural item generation + rarity rolls.

import type { Item, ItemAffix, Rarity, DungeonClassId } from "../types";
import { ITEM_TEMPLATES, AFFIX_POOL, AFFIX_VALUE_BANDS, RARITY_AFFIX_COUNT, TEMPLATE_BY_ID, RARITY_NAME } from "../content/items";
import { RNG } from "../rng";

/** Floor-scaled drop chance per rarity. Floor 1 = mostly common; Floor 10 = legendary-rich. */
export function rarityWeights(floor: number): { item: Rarity; weight: number }[] {
  const f = Math.min(10, Math.max(1, floor));
  return [
    { item: "common",    weight: Math.max(0, 60 - f * 5) },
    { item: "rare",      weight: 30 + f * 2 },
    { item: "epic",      weight: 5 + f * 2 },
    { item: "legendary", weight: Math.max(1, f * 1.5) },
  ];
}

function rollAffix(rng: RNG, rarity: Rarity, used: Set<string>): ItemAffix | null {
  const candidates = AFFIX_POOL.filter(a => !used.has(a.label));
  if (!candidates.length) return null;
  const pick = rng.pick(candidates);
  used.add(pick.label);
  const result: ItemAffix = { label: pick.label };
  if (pick.stat) {
    const band = AFFIX_VALUE_BANDS.stat[rarity];
    const v = rng.int(band[0], band[1]);
    result.stat = pick.stat;
    result.bonus = v;
    result.label = pick.label.replace("%d", String(v));
  } else if (pick.damageBonus !== undefined) {
    const band = AFFIX_VALUE_BANDS.damageBonus[rarity];
    const v = rng.int(band[0], band[1]);
    result.damageBonus = v;
    result.label = pick.label.replace("%d", String(v));
  } else if (pick.armorBonus !== undefined) {
    const band = AFFIX_VALUE_BANDS.armorBonus[rarity];
    const v = rng.int(band[0], band[1]);
    result.armorBonus = v;
    result.label = pick.label.replace("%d", String(v));
  } else if (pick.lifesteal !== undefined) {
    const band = AFFIX_VALUE_BANDS.lifesteal[rarity];
    const v = rng.int(band[0], band[1]);
    result.lifesteal = v;
    result.label = pick.label.replace("%d", String(v));
  } else if (pick.critBonus !== undefined) {
    const band = AFFIX_VALUE_BANDS.critBonus[rarity];
    const v = rng.int(band[0], band[1]);
    result.critBonus = v;
    result.label = pick.label.replace("%d", String(v));
  }
  return result;
}

/** Generate a random item appropriate for the floor, optionally biased toward a class. */
export function rollItem(rng: RNG, floor: number, opts?: { rarity?: Rarity; slot?: Item["slot"]; classId?: DungeonClassId }): Item {
  const rarity: Rarity = opts?.rarity ?? rng.weighted(rarityWeights(floor));

  // Pick a template by slot + ilvl band
  const ilvlBand: [number, number] = [
    Math.max(1, floor - 2),
    Math.min(10, floor + 1),
  ];
  let pool = ITEM_TEMPLATES.filter(t => {
    if (opts?.slot && t.slot !== opts.slot) return false;
    if (t.baseIlvl < ilvlBand[0] || t.baseIlvl > ilvlBand[1]) return false;
    if (opts?.classId && t.classLock && t.classLock !== opts.classId) {
      // Allow neutral items always; only filter cross-class weapons
      if (t.slot === "weapon") return false;
    }
    return true;
  });
  if (!pool.length) pool = ITEM_TEMPLATES.filter(t => !opts?.slot || t.slot === opts.slot);
  if (!pool.length) pool = ITEM_TEMPLATES;
  const template = rng.pick(pool);

  const affixCount = RARITY_AFFIX_COUNT[rarity];
  const used = new Set<string>();
  const affixes: ItemAffix[] = [];
  for (let i = 0; i < affixCount; i++) {
    const a = rollAffix(rng, rarity, used);
    if (a) affixes.push(a);
  }

  const id = "itm_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const rarityPrefix = rarity === "common" ? "" : `${RARITY_NAME[rarity]} `;
  const priceBase = template.baseIlvl * 12 + (template.damage ? (template.damage[0] + template.damage[1]) * 3 : 0) + (template.armor ?? 0) * 6;
  const rarityMult = rarity === "common" ? 1 : rarity === "rare" ? 2.5 : rarity === "epic" ? 6 : 16;
  return {
    id,
    baseId: template.baseId,
    name: `${rarityPrefix}${template.name}`,
    slot: template.slot,
    rarity,
    ilvl: template.baseIlvl,
    damage: template.damage ? [...template.damage] : undefined,
    armor: template.armor,
    classLock: template.classLock,
    affixes,
    price: Math.max(5, Math.floor(priceBase * rarityMult)),
    icon: template.icon,
    description: template.flavor,
  };
}

/** Generate a starting item by baseId (no affixes — common). */
export function makeStarter(baseId: string): Item {
  const t = TEMPLATE_BY_ID[baseId];
  if (!t) throw new Error(`Unknown item template: ${baseId}`);
  return {
    id: "itm_starter_" + baseId,
    baseId: t.baseId,
    name: t.name,
    slot: t.slot,
    rarity: "common",
    ilvl: t.baseIlvl,
    damage: t.damage ? [...t.damage] : undefined,
    armor: t.armor,
    classLock: t.classLock,
    affixes: [],
    price: 10,
    icon: t.icon,
    description: t.flavor,
  };
}

/** Roll a shop inventory for the merchant. 6 items, biased toward player class. */
export function rollShop(rng: RNG, floor: number, classId: DungeonClassId): Item[] {
  const items: Item[] = [];
  // Always two weapons biased to class
  items.push(rollItem(rng, floor, { slot: "weapon", classId, rarity: "common" }));
  items.push(rollItem(rng, floor, { slot: "weapon", classId, rarity: rng.chance(0.5) ? "rare" : "common" }));
  items.push(rollItem(rng, floor, { slot: "armor", classId, rarity: "common" }));
  items.push(rollItem(rng, floor, { slot: "armor", classId, rarity: rng.chance(0.5) ? "rare" : "common" }));
  items.push(rollItem(rng, floor, { slot: "trinket", rarity: "rare" }));
  // Random epic chance
  if (rng.chance(0.35)) {
    items.push(rollItem(rng, floor, { classId, rarity: "epic" }));
  } else {
    items.push(rollItem(rng, floor, { classId }));
  }
  return items;
}
