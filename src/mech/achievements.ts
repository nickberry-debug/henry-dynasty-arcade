// Scrapyard Kings — achievement catalog. Each entry has an id, a label,
// a description, and a check function that decides whether the save now
// meets the criteria. Awards are flat cash bonuses paid when the
// achievement first unlocks.

import type { MechSave } from "./types";

export interface AchievementDef {
  id: string;
  emoji: string;
  name: string;
  description: string;
  rewardCash: number;
  check: (save: MechSave) => boolean;
}

export const MECH_ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_blood", emoji: "🏆", name: "First Blood",
    description: "Win your first battle.", rewardCash: 50,
    check: s => s.wins >= 1,
  },
  {
    id: "rookie_grad", emoji: "🎓", name: "Rookie Graduate",
    description: "Reach the Amateur Arena.", rewardCash: 75,
    check: s => s.league === "amateur" || s.league === "pro" || s.league === "champion" || s.league === "legend",
  },
  {
    id: "pro_climb", emoji: "📈", name: "Pro Material",
    description: "Reach the Pro Circuit.", rewardCash: 150,
    check: s => s.league === "pro" || s.league === "champion" || s.league === "legend",
  },
  {
    id: "champion", emoji: "👑", name: "Champion's Forge",
    description: "Reach Champion's Forge.", rewardCash: 300,
    check: s => s.league === "champion" || s.league === "legend",
  },
  {
    id: "legend", emoji: "🌟", name: "Legend",
    description: "Reach the Legend's Coliseum.", rewardCash: 600,
    check: s => s.league === "legend",
  },
  {
    id: "ten_wins", emoji: "🔟", name: "Ten-Win Streak",
    description: "Win 10 battles total.", rewardCash: 100,
    check: s => s.wins >= 10,
  },
  {
    id: "fifty_wins", emoji: "5️⃣0️⃣", name: "Veteran",
    description: "Win 50 battles.", rewardCash: 350,
    check: s => s.wins >= 50,
  },
  {
    id: "rich", emoji: "💰", name: "Cash King",
    description: "Hold 5,000 cash at once.", rewardCash: 200,
    check: s => s.money >= 5000,
  },
  {
    id: "loaded", emoji: "💎", name: "Loaded",
    description: "Hold 20,000 cash at once.", rewardCash: 500,
    check: s => s.money >= 20000,
  },
  {
    id: "first_loss", emoji: "🛠️", name: "Back to the Shop",
    description: "Lose your first battle — every bot gets cooked sometimes.", rewardCash: 25,
    check: s => s.losses >= 1,
  },
];

/** Returns the ids of achievements that are now unlocked but weren't
 *  before, given the current save vs the recorded unlock list. */
export function newlyUnlocked(save: MechSave): AchievementDef[] {
  const known = new Set(save.achievements);
  return MECH_ACHIEVEMENTS.filter(a => !known.has(a.id) && a.check(save));
}

export function totalAchievementCash(achievementIds: string[]): number {
  const idSet = new Set(achievementIds);
  return MECH_ACHIEVEMENTS
    .filter(a => idSet.has(a.id))
    .reduce((sum, a) => sum + a.rewardCash, 0);
}
