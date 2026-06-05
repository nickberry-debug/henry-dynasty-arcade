// Cross-profile roster reader. The Multiplayer Roster Browser (A.6)
// needs to see every family member's named creations side by side so
// two kids on the same device can scout each other's heroes / pilots /
// agents before a versus match.
//
// Source of truth:
//   • Olympus heroes  → Dexie table `olympusHeroes` (profileId column)
//   • Mogul studios   → Dexie table `mogulStudios`  (profileId column)
//   • Cosmic saves    → localStorage `prof_<id>::dd_cosmic_saves`
//   • Temporal agents → localStorage `prof_<id>::dd_temporal_saves`
//
// All four already write-through to Firestore (heroes via sync/heroes,
// studios via sync/savedRecords, cosmic+temporal via sync/cloudBlob), so
// what's on this device's Dexie/localStorage is the merged family-wide
// view by the time the user opens the page.

import { db } from "../db/dexie";
import type { Hero } from "../olympus/types";
import type { Studio } from "../mogul/types";
import type { Save as CosmicSave } from "../cosmic/types";
import type { AgentSave } from "../temporal/types";
import { loadMechSaveFor } from "../mech/store";
import type { Bot } from "../mech/types";

// ── Olympus heroes ────────────────────────────────────────────────────────
export async function loadHeroesByProfile(): Promise<Map<string, Hero[]>> {
  const out = new Map<string, Hero[]>();
  try {
    const all = await db.olympusHeroes.toArray();
    for (const h of all) {
      if (h.archived) continue;
      const pid = (h as unknown as { profileId?: string }).profileId ?? "henry";
      const list = out.get(pid) ?? [];
      list.push(h as Hero);
      out.set(pid, list);
    }
    // Sort each profile's heroes by most-recent first.
    for (const [k, v] of out) {
      v.sort((a, b) => b.modifiedAt - a.modifiedAt);
      out.set(k, v);
    }
  } catch (err) {
    console.warn("[familyRosters] heroes load failed", err);
  }
  return out;
}

// ── Mogul studios ─────────────────────────────────────────────────────────
export async function loadStudiosByProfile(): Promise<Map<string, Studio[]>> {
  const out = new Map<string, Studio[]>();
  try {
    const all = await db.mogulStudios.toArray();
    for (const r of all) {
      const pid = r.profileId ?? "henry";
      const list = out.get(pid) ?? [];
      list.push(r.data);
      out.set(pid, list);
    }
    for (const [k, v] of out) {
      v.sort((a, b) => b.modifiedAt - a.modifiedAt);
      out.set(k, v);
    }
  } catch (err) {
    console.warn("[familyRosters] studios load failed", err);
  }
  return out;
}

// ── Cosmic + Temporal — localStorage blobs keyed by profile ──────────────
function readProfileBlob<T>(profileId: string, baseKey: string): T[] {
  try {
    // Saves stored at `prof_<id>::<baseKey>` (per profile-scoped writes).
    const raw = localStorage.getItem(`prof_${profileId}::${baseKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch { return []; }
}

export function loadCosmicByProfile(profileIds: string[]): Map<string, CosmicSave[]> {
  const out = new Map<string, CosmicSave[]>();
  for (const pid of profileIds) {
    const list = readProfileBlob<CosmicSave>(pid, "dd_cosmic_saves");
    if (list.length) out.set(pid, list.sort((a, b) => b.modifiedAt - a.modifiedAt));
  }
  // Henry inherits legacy global saves too (the un-prefixed key) since
  // the pre-profile world was Henry's by default.
  if (!out.get("henry")) {
    const legacy = readProfileBlob<CosmicSave>("__legacy_placeholder__", "dd_cosmic_saves");
    // The legacy global key has no prefix, read it directly.
    try {
      const raw = localStorage.getItem("dd_cosmic_saves");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          out.set("henry", parsed.sort((a: CosmicSave, b: CosmicSave) => b.modifiedAt - a.modifiedAt));
        }
      }
    } catch { /* ignore */ }
    void legacy;
  }
  return out;
}

export function loadTemporalByProfile(profileIds: string[]): Map<string, AgentSave[]> {
  const out = new Map<string, AgentSave[]>();
  for (const pid of profileIds) {
    const list = readProfileBlob<AgentSave>(pid, "dd_temporal_saves");
    if (list.length) out.set(pid, list.sort((a, b) => b.modifiedAt - a.modifiedAt));
  }
  // Legacy global → Henry fallback as above.
  if (!out.get("henry")) {
    try {
      const raw = localStorage.getItem("dd_temporal_saves");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          out.set("henry", parsed.sort((a: AgentSave, b: AgentSave) => b.modifiedAt - a.modifiedAt));
        }
      }
    } catch { /* ignore */ }
  }
  return out;
}

// ── Aggregator ────────────────────────────────────────────────────────────

export interface RosterEntry {
  /** Logical class — drives the section + icon. */
  kind: "hero" | "studio" | "cosmic" | "agent" | "mech";
  /** Owning profile id; UI looks up name + color from the profile list. */
  profileId: string;
  /** Stable id, just for React keys. */
  id: string;
  /** Display name as the kid named it. */
  name: string;
  /** Short subtitle ("L6 Spartan", "Bronze Tier · 12 mission flown"). */
  subtitle: string;
  /** Long-tail descriptor for tooltips/labels. */
  description?: string;
  /** Sortable timestamp for "most recent" ordering inside a section. */
  modifiedAt: number;
  /** Opaque payload — only set for Mech bots so we can pull the full Bot
   *  object into a duel without re-fetching localStorage on click. */
  payload?: unknown;
}

/** Family member's Mech bots — one row per bot, returned as Bots so the
 *  duel screen can use them directly. */
export function loadMechByProfile(profileIds: string[]): Map<string, Bot[]> {
  const out = new Map<string, Bot[]>();
  for (const pid of profileIds) {
    const save = loadMechSaveFor(pid);
    if (save.bots && save.bots.length) {
      out.set(pid, save.bots.slice().sort((a, b) => b.modifiedAt - a.modifiedAt));
    }
  }
  return out;
}

export async function loadAllFamilyRosters(profileIds: string[]): Promise<RosterEntry[]> {
  const [heroes, studios] = await Promise.all([
    loadHeroesByProfile(),
    loadStudiosByProfile(),
  ]);
  const cosmics = loadCosmicByProfile(profileIds);
  const agents = loadTemporalByProfile(profileIds);
  const mechs = loadMechByProfile(profileIds);

  const out: RosterEntry[] = [];
  for (const [pid, list] of heroes) for (const h of list) {
    out.push({
      kind: "hero", profileId: pid, id: h.id, name: h.name,
      subtitle: `L${h.level} ${h.className}`,
      description: h.nickname ? `"${h.nickname}"` : undefined,
      modifiedAt: h.modifiedAt,
    });
  }
  for (const [pid, list] of studios) for (const s of list) {
    out.push({
      kind: "studio", profileId: pid, id: s.id, name: s.player.name,
      subtitle: `${s.era ?? "Modern"} · ${s.year} · $${Math.round(s.player.cash).toLocaleString()}M`,
      description: `${(s.releases ?? []).filter(r => r.studioId === s.player.id).length} releases`,
      modifiedAt: s.modifiedAt,
    });
  }
  for (const [pid, list] of cosmics) for (const c of list) {
    out.push({
      kind: "cosmic", profileId: pid, id: c.id, name: c.callsign || c.pilotName,
      subtitle: `Rank ${c.rank} · ${c.completedMissions.length} missions`,
      description: `${c.wingmen.length} wingmen · ${c.credits} cr`,
      modifiedAt: c.modifiedAt,
    });
  }
  for (const [pid, list] of agents) for (const a of list) {
    out.push({
      kind: "agent", profileId: pid, id: a.id, name: a.agentName,
      subtitle: `L${a.level} · Integrity ${a.integrity}`,
      description: `${a.missionsCompleted.length} resolved`,
      modifiedAt: a.modifiedAt,
    });
  }
  for (const [pid, list] of mechs) for (const b of list) {
    out.push({
      kind: "mech", profileId: pid, id: b.id, name: b.name,
      subtitle: `${b.parts.chest.name} · ${b.parts.legs.name}`,
      description: `HP ${b.derived.hp} · ATK ${b.derived.power}`,
      modifiedAt: b.modifiedAt,
      payload: b,
    });
  }
  return out;
}
