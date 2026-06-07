import type { EnemyTemplate } from "../types";

export const ENEMIES: Record<string, EnemyTemplate> = {
  hush_goblin: {
    id: "hush_goblin",
    spriteId: "goblin",
    name: "Hush-Twisted Goblin",
    level: 1,
    scale: 1.0,
    xpReward: 12,
    goldReward: 6,
    stats: { hp: 28, maxHp: 28, mp: 0, maxMp: 0, atk: 7, def: 3, voice: 0, resist: 2, spd: 9 },
    introLine: "It muttered nonsense in your mother's voice.",
  },
  belltongue_slime: {
    id: "belltongue_slime",
    spriteId: "mushroom",
    name: "Belltongue Slime",
    level: 1,
    scale: 0.95,
    xpReward: 10,
    goldReward: 5,
    stats: { hp: 22, maxHp: 22, mp: 0, maxMp: 0, atk: 6, def: 4, voice: 0, resist: 3, spd: 7 },
    introLine: "A pale fungus hums a single, lost note.",
  },
  pewter_wraith: {
    id: "pewter_wraith",
    spriteId: "skeleton",
    name: "Pewter Wraith",
    level: 2,
    scale: 1.0,
    xpReward: 16,
    goldReward: 8,
    stats: { hp: 34, maxHp: 34, mp: 0, maxMp: 0, atk: 8, def: 5, voice: 0, resist: 4, spd: 10 },
    introLine: "Bones bound by silver smoke. It still wears a choir-robe.",
  },
  hush_echo_boss: {
    id: "hush_echo_boss",
    spriteId: "flying_eye",
    name: "The Hush Echo",
    level: 4,
    scale: 1.6,
    xpReward: 60,
    goldReward: 40,
    stats: { hp: 110, maxHp: 110, mp: 20, maxMp: 20, atk: 12, def: 7, voice: 11, resist: 8, spd: 9 },
    isBoss: true,
    introLine: "The lantern dims as the chapel bell begins to swing. A great silver eye opens above the altar.\n\n\"Liora... come home. Mother is so quiet here.\"",
    abilities: [{ id: "silver_silence", mp: 10 }],
  },
};

export function randomTrashEncounter(rand: () => number = Math.random): EnemyTemplate[] {
  const pool: EnemyTemplate[][] = [
    [ENEMIES.hush_goblin],
    [ENEMIES.belltongue_slime, ENEMIES.belltongue_slime],
    [ENEMIES.hush_goblin, ENEMIES.belltongue_slime],
    [ENEMIES.pewter_wraith],
  ];
  const i = Math.floor(rand() * pool.length);
  return pool[i].map(t => JSON.parse(JSON.stringify(t)));
}
