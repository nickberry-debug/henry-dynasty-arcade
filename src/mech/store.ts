// Mech Combat — per-profile save store, cloud-synced like every other game.

import { useEffect, useState } from "react";
import type { Bot, BotPart, Weapon, MechSave, SlotId, League } from "./types";
import { LEAGUE_ORDER, WINS_FOR_PROMOTION } from "./types";
import { getActiveProfileId, profileKey } from "../profiles/store";
import { setBlob as cloudSet, subscribeBlob as cloudSubscribe } from "../sync/cloudBlob";
import { getPart, getWeapon, partsBySlot, getBotPreset, isWeaponLocked, priceFor, priceForWeapon, scrapValue, repairCost, STARTER_WEAPON_IDS } from "./parts";
import { newlyUnlocked } from "./achievements";

const BLOB_KEY = "mech_save_v1";

function lsKey(): string { return profileKey(`dd_${BLOB_KEY}`); }

function defaultStarterBot(): Bot {
  // Every new profile gets a starter bot that's barely-legal-rookie.
  // Cheap parts, basic pulse cannon on one arm, fists on the other.
  const head    = getPart("h_visor")!;
  const arms    = getPart("la_basic")!;
  const armsR   = getPart("ra_basic")!;
  const chest   = getPart("c_scrap")!;
  const legs    = getPart("l_quad")!;
  const pulse   = getWeapon("w_pulse")!;
  return assembleBot({
    id: `bot_${Date.now()}`,
    name: "Tin Lizard",
    paint: "#94a3b8",
    parts: { head, leftArm: arms, rightArm: armsR, chest, legs },
    weapons: { right: pulse },
    personality: "balanced",
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    derived: { armor: 0, weight: 0, power: 0, energy: 0, balance: 0, speed: 0, hp: 0 },
  });
}

/** Compute the derived stat totals from the bot's installed parts. */
export function assembleBot(bot: Bot): Bot {
  const totals = { armor: 0, weight: 0, power: 0, energy: 0, balance: 0, speed: 0, hp: 0 };
  for (const slot of Object.keys(bot.parts) as SlotId[]) {
    const p = bot.parts[slot];
    if (!p) continue;
    for (const k of Object.keys(totals) as Array<keyof typeof totals>) {
      totals[k] += p.stats[k];
    }
  }
  // Weapons contribute weight; their damage is consumed by the sim.
  if (bot.weapons.left)  totals.weight += bot.weapons.left.weight;
  if (bot.weapons.right) totals.weight += bot.weapons.right.weight;
  return { ...bot, derived: totals };
}

// Starter parts every player owns out of the box. These match the
// defaultStarterBot() loadout so the player never starts with locked gear.
const STARTER_PART_IDS = ["h_recon", "c_scrap", "la_basic", "ra_basic", "l_sprinter"];

function defaultSave(profileId: string): MechSave {
  return {
    profileId,
    bots: [defaultStarterBot()],
    activeBotId: null,        // set on first hydrate
    money: 250,
    scrap: 0,
    league: "rookie",
    wins: 0,
    losses: 0,
    trophies: [],
    battles: [],
    achievements: [],
    ownedPartIds: STARTER_PART_IDS.slice(),
    ownedWeaponIds: STARTER_WEAPON_IDS.slice(),
    botHp: {},
    modifiedAt: Date.now(),
  };
}

/** Weapons the player owns. Pre-v1.10.79 saves omit ownedWeaponIds —
 *  for those we treat all weapons unlocked at their current league as
 *  owned (no retroactive paywall on existing fights). */
export function ownsWeapon(save: MechSave, weaponId: string): boolean {
  if (save.ownedWeaponIds) return save.ownedWeaponIds.includes(weaponId);
  // Back-compat: any weapon unlocked at the player's league is "owned".
  return !isWeaponLocked(weaponId, save.league);
}

/** Active bot's current HP fraction (0..1). 1 = full. */
export function activeBotHpFrac(save: MechSave): number {
  if (!save.activeBotId) return 1;
  return save.botHp?.[save.activeBotId] ?? 1;
}

/** Wins recorded in the player's current league. */
export function winsInCurrentLeague(save: MechSave): number {
  return save.leagueWins?.[save.league] ?? 0;
}

/** Wins needed before the promotion match unlocks. */
export function winsNeededForPromotion(league: League): number {
  return WINS_FOR_PROMOTION[league];
}

/** True if the player has unlocked the promotion match in their
 *  current league (and hasn't yet been promoted out of it). Legend
 *  league is terminal — always returns false. */
export function isPromotionReady(save: MechSave): boolean {
  if (save.league === "legend") return false;
  return winsInCurrentLeague(save) >= WINS_FOR_PROMOTION[save.league];
}

/** Name + flavor for the promotion match's "champion" enemy in each
 *  league. Plain-spoken so kids can read the stakes. */
export const LEAGUE_CHAMPION_NAMES: Record<League, string> = {
  rookie:   "Crushlock, the Rookie Champion",
  amateur:  "Iron Marlene, Amateur Arena Champion",
  pro:      "Voidcrown, the Pro Circuit Reigning Champion",
  champion: "Aegis Prime, Champion's Forge Undefeated",
  legend:   "—",  // unreachable
};

function loadSave(profileId: string): MechSave {
  try {
    const raw = localStorage.getItem(lsKey());
    if (!raw) return defaultSave(profileId);
    const parsed: MechSave = JSON.parse(raw);
    // Re-derive each bot in case a part schema changed between versions.
    parsed.bots = parsed.bots.map(b => assembleBot(b));
    if (!parsed.activeBotId && parsed.bots[0]) parsed.activeBotId = parsed.bots[0].id;
    const merged = { ...defaultSave(profileId), ...parsed };
    // Migration: pre-shop saves get the starter pack + every part they
    // already have equipped (no retroactive paywall on existing bots).
    if (!Array.isArray(merged.ownedPartIds) || merged.ownedPartIds.length === 0) {
      const equipped = new Set<string>(STARTER_PART_IDS);
      for (const b of merged.bots) {
        for (const slot of Object.keys(b.parts) as SlotId[]) {
          const p = b.parts[slot];
          if (p) equipped.add(p.id);
        }
      }
      merged.ownedPartIds = Array.from(equipped);
    }
    return merged;
  } catch { return defaultSave(profileId); }
}

function persist(save: MechSave): void {
  try { localStorage.setItem(lsKey(), JSON.stringify(save)); } catch { /* ignore */ }
  try { cloudSet(save.profileId, BLOB_KEY, save); } catch { /* ignore */ }
}

/** React hook — returns the current profile's mech save + actions. */
export function useMech() {
  const [pid, setPid] = useState<string | null>(() => getActiveProfileId());
  useEffect(() => {
    const onChange = () => setPid(getActiveProfileId());
    window.addEventListener("arcade-active-profile-changed", onChange);
    return () => window.removeEventListener("arcade-active-profile-changed", onChange);
  }, []);

  const [save, setSave] = useState<MechSave>(() => loadSave(pid ?? "guest"));

  // Reload save on profile switch.
  useEffect(() => {
    setSave(loadSave(pid ?? "guest"));
  }, [pid]);

  // Live cloud subscribe — another device's edits flow back here.
  useEffect(() => {
    if (!pid) return;
    return cloudSubscribe<MechSave>(pid, BLOB_KEY, remote => {
      if (!remote || typeof remote !== "object") return;
      try { localStorage.setItem(lsKey(), JSON.stringify(remote)); } catch { /* ignore */ }
      setSave({ ...remote, bots: remote.bots.map(b => assembleBot(b)) });
    });
  }, [pid]);

  function update(mutator: (s: MechSave) => MechSave): void {
    setSave(prev => {
      const next = { ...mutator(prev), modifiedAt: Date.now() };
      persist(next);
      return next;
    });
  }

  return {
    save,
    activeBot: save.bots.find(b => b.id === save.activeBotId) ?? save.bots[0] ?? null,
    /** Replace one slot's part on the active bot. */
    swapPart(slot: SlotId, partId: string) {
      const part = getPart(partId);
      if (!part || part.slot !== slot) return;
      update(s => {
        const bots = s.bots.map(b => {
          if (b.id !== (s.activeBotId ?? b.id)) return b;
          return assembleBot({ ...b, parts: { ...b.parts, [slot]: part }, modifiedAt: Date.now() });
        });
        return { ...s, bots };
      });
    },
    /** Attach (or detach) a weapon to one of the active bot's arms. */
    setWeapon(arm: "left" | "right", weaponId: string | null) {
      update(s => {
        const bots = s.bots.map(b => {
          if (b.id !== (s.activeBotId ?? b.id)) return b;
          const w = weaponId ? getWeapon(weaponId) : undefined;
          return assembleBot({ ...b, weapons: { ...b.weapons, [arm]: w }, modifiedAt: Date.now() });
        });
        return { ...s, bots };
      });
    },
    /** Rename / repaint the active bot. */
    customize(patch: Partial<Pick<Bot, "name" | "paint" | "decals" | "personality">>) {
      update(s => {
        const bots = s.bots.map(b => b.id !== s.activeBotId ? b : { ...b, ...patch, modifiedAt: Date.now() });
        return { ...s, bots };
      });
    },
    /** Apply a bot archetype preset — replaces all parts + weapons on
     *  the active bot. Weapons that don't fit the arm mount or that are
     *  locked under the current league are silently skipped. */
    applyPreset(presetId: string) {
      const preset = getBotPreset(presetId);
      if (!preset) return;
      update(s => {
        const bots = s.bots.map(b => {
          if (b.id !== s.activeBotId) return b;
          const head    = getPart(preset.parts.head);
          const chest   = getPart(preset.parts.chest);
          const leftArm = getPart(preset.parts.leftArm);
          const rightArm= getPart(preset.parts.rightArm);
          const legs    = getPart(preset.parts.legs);
          if (!head || !chest || !leftArm || !rightArm || !legs) return b;
          const parts = { head, chest, leftArm, rightArm, legs };
          // Validate weapons: must match mount size + not be locked.
          const pickWeapon = (id: string | null, mountSize?: "small" | "large") => {
            if (!id) return undefined;
            const w = getWeapon(id);
            if (!w) return undefined;
            if (mountSize && w.mount !== mountSize) return undefined;
            if (isWeaponLocked(id, s.league)) return undefined;
            return w;
          };
          const weapons = {
            left:  pickWeapon(preset.weapons.left,  leftArm.weaponMount?.size),
            right: pickWeapon(preset.weapons.right, rightArm.weaponMount?.size),
          };
          return assembleBot({
            ...b, parts, weapons,
            paint: preset.paint,
            modifiedAt: Date.now(),
          });
        });
        // Grant ownership of the preset's parts as a one-time gift so
        // kids can experiment with templates without grinding the shop.
        const grantedPartIds = [
          preset.parts.head, preset.parts.chest, preset.parts.leftArm,
          preset.parts.rightArm, preset.parts.legs,
        ];
        const ownedPartIds = Array.from(new Set([...s.ownedPartIds, ...grantedPartIds]));
        return { ...s, bots, ownedPartIds };
      });
    },
    /** Buy a part from the shop. Adds to ownedPartIds and deducts cash.
     *  No-op if already owned or not enough cash. Returns the new balance. */
    buyPart(partId: string) {
      const part = getPart(partId);
      if (!part) return;
      update(s => {
        if (s.ownedPartIds.includes(partId)) return s;
        const price = priceFor(part);
        if (s.money < price) return s;
        return {
          ...s,
          money: s.money - price,
          ownedPartIds: [...s.ownedPartIds, partId],
        };
      });
    },
    /** Buy a weapon from the shop. */
    buyWeapon(weaponId: string) {
      const w = getWeapon(weaponId);
      if (!w) return;
      update(s => {
        const owned = s.ownedWeaponIds ?? STARTER_WEAPON_IDS.slice();
        if (owned.includes(weaponId)) return s;
        const price = priceForWeapon(w);
        if (s.money < price) return s;
        return { ...s, money: s.money - price, ownedWeaponIds: [...owned, weaponId] };
      });
    },
    /** Salvage an owned part for scrap. Cannot salvage if the part is
     *  currently equipped on any bot (avoid foot-gun). */
    salvagePart(partId: string) {
      const part = getPart(partId);
      if (!part) return;
      update(s => {
        if (!s.ownedPartIds.includes(partId)) return s;
        // Don't salvage equipped parts.
        for (const b of s.bots) {
          for (const slot of Object.keys(b.parts) as SlotId[]) {
            if (b.parts[slot]?.id === partId) return s;
          }
        }
        // Don't salvage starter parts (keep the floor intact).
        if (STARTER_PART_IDS.includes(partId)) return s;
        const gain = scrapValue(part);
        return {
          ...s,
          ownedPartIds: s.ownedPartIds.filter(id => id !== partId),
          scrap: s.scrap + gain,
        };
      });
    },
    /** Pay to repair the active bot back to full HP. Cost depends on
     *  the missing fraction × league multiplier. */
    repairActiveBot() {
      update(s => {
        if (!s.activeBotId) return s;
        const frac = s.botHp?.[s.activeBotId] ?? 1;
        const cost = repairCost(frac, s.league);
        if (cost === 0) return s;
        if (s.money < cost) return s;
        const botHp = { ...(s.botHp ?? {}) };
        botHp[s.activeBotId] = 1;
        return { ...s, money: s.money - cost, botHp };
      });
    },
    /** Convert scrap into money in the workshop (cheap repair currency). */
    sellScrap(amount: number) {
      update(s => {
        const sell = Math.min(s.scrap, Math.max(0, Math.floor(amount)));
        if (sell <= 0) return s;
        // 1 scrap = $2 (much worse than direct sales — incentive to keep
        // scrap for crafting if a future pass adds it).
        return { ...s, scrap: s.scrap - sell, money: s.money + sell * 2 };
      });
    },
    /** Record post-battle residual HP fraction on the active bot. The
     *  battle screen calls this once the fight resolves. */
    applyBattleDamage(remainingHpFrac: number) {
      update(s => {
        if (!s.activeBotId) return s;
        const botHp = { ...(s.botHp ?? {}) };
        botHp[s.activeBotId] = Math.max(0, Math.min(1, remainingHpFrac));
        return { ...s, botHp };
      });
    },
    /** Check the save for newly-met achievement criteria and credit their
     *  cash rewards. Returns the list of just-unlocked definitions so the
     *  UI can pop a toast. Idempotent — already-unlocked achievements are
     *  skipped. */
    claimAchievements() {
      const unlocked = newlyUnlocked(save);
      if (unlocked.length === 0) return [];
      update(s => ({
        ...s,
        achievements: [...s.achievements, ...unlocked.map(a => a.id)],
        money: s.money + unlocked.reduce((sum, a) => sum + a.rewardCash, 0),
      }));
      return unlocked;
    },
    /** Add a fresh starter bot to the stable (player slot expansion). */
    addBot(name: string) {
      update(s => {
        const fresh = { ...defaultStarterBot(), id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name };
        return { ...s, bots: [...s.bots, fresh], activeBotId: fresh.id };
      });
    },
    selectBot(id: string) { update(s => ({ ...s, activeBotId: id })); },
    /** Record a league-specific win — fires in addition to total `wins`.
     *  Called by MechBattle on a non-promotion victory. */
    recordLeagueWin() {
      update(s => {
        const lw = { ...(s.leagueWins ?? {}) };
        lw[s.league] = (lw[s.league] ?? 0) + 1;
        return { ...s, leagueWins: lw };
      });
    },
    /** Promote to the next league. Called after winning the promotion
     *  match. Resets the leagueWins counter for the new league so the
     *  player isn't immediately ready for the NEXT promotion. */
    promoteLeague() {
      update(s => {
        const idx = LEAGUE_ORDER.indexOf(s.league);
        const next = LEAGUE_ORDER[Math.min(LEAGUE_ORDER.length - 1, idx + 1)];
        const lw = { ...(s.leagueWins ?? {}) };
        // Clear the league we just left (cosmetic — leaves history but
        // resets so the new league starts at 0).
        lw[next] = 0;
        return { ...s, league: next, leagueWins: lw };
      });
    },
  };
}

/** Headless reader — for cross-profile family viewing later. */
export function loadMechSaveFor(profileId: string): MechSave {
  try {
    const raw = localStorage.getItem(`prof_${profileId}::dd_${BLOB_KEY}`);
    if (!raw) return defaultSave(profileId);
    const parsed = JSON.parse(raw);
    parsed.bots = (parsed.bots ?? []).map((b: Bot) => assembleBot(b));
    return parsed;
  } catch { return defaultSave(profileId); }
}

export { partsBySlot };
