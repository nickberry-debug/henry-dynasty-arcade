// Dungeon3D — Discovery events.
//
// At specific floor depths, descending into the new floor surfaces a
// scripted Discovery event instead of the standard floor-clear flow.
// Each Discovery has its own visual flavor (tint, ambient hue, label).
//
// The actual reward application is handled in Dungeon3DRun.tsx where
// the engine state is mutated (HP changes, item drops, ability points).
// Data here is purely descriptive.

export type DiscoveryKind =
  | "echoing_vault"
  | "whispers_in_the_walls"
  | "lost_cantor"
  | "sealed_door";

export interface DiscoveryEvent {
  kind: DiscoveryKind;
  floor: number;
  title: string;
  flavor: string;
  /** Three choice slots — drives the on-screen prompt buttons. */
  choices: ReadonlyArray<{
    id: string;
    label: string;
    /** One-line description of the consequence. */
    blurb: string;
    /** Card tint used for the choice border. */
    tint: string;
  }>;
  /** Background tint applied to the overlay while the event is up. */
  ambient: string;
}

export const DISCOVERIES: readonly DiscoveryEvent[] = [
  {
    kind: "echoing_vault",
    floor: 5,
    title: "The Echoing Vault",
    flavor:
      "Three chests sit on three pedestals. One whispers your name in your mother's voice. One whispers in someone else's. One is silent. Choose.",
    choices: [
      { id: "left",   label: "Left Chest",   blurb: "Looks plain. Probably safe.",                   tint: "#a78bfa" },
      { id: "middle", label: "Middle Chest", blurb: "Hums faintly — like an instrument being tuned.", tint: "#fde047" },
      { id: "right",  label: "Right Chest",  blurb: "A cold draft trails out from the seam.",          tint: "#22d3ee" },
    ],
    ambient: "rgba(180,160,240,0.18)",
  },
  {
    kind: "whispers_in_the_walls",
    floor: 10,
    title: "Whispers in the Walls",
    flavor:
      "A pale shape rises from the floor stones — a Cantor's ghost, soft-edged and patient. \"Find three silver shards before the next boss,\" she sings. \"Then I'll know which song you are.\"",
    choices: [
      { id: "accept",  label: "Accept the Quest",   blurb: "+25% loot rarity until the next boss.",  tint: "#fde047" },
      { id: "decline", label: "Walk Past",          blurb: "Skip the quest, keep your pace.",        tint: "#94a3b8" },
      { id: "ask",     label: "Ask Her Name",       blurb: "Earn a small lore card. No buff.",       tint: "#a78bfa" },
    ],
    ambient: "rgba(160,200,240,0.18)",
  },
  {
    kind: "lost_cantor",
    floor: 15,
    title: "The Lost Cantor's Resting Place",
    flavor:
      "A modest shrine sits in a clearing, mossy and silent. A note pinned to it reads: 'Press your hand here. Pay what you can spare.' The shrine glows when you draw close.",
    choices: [
      { id: "blood",   label: "Bleed (-10% HP)",     blurb: "Sacrifice 10% current HP. Gain +1 ability pick.", tint: "#ef4444" },
      { id: "coins",   label: "Tithe (-100 coins)",  blurb: "Drop 100 coins. Heal to full and gain +20 HP cap.", tint: "#fde047" },
      { id: "decline", label: "Leave it Be",         blurb: "The shrine dims. You feel watched for a moment.", tint: "#94a3b8" },
    ],
    ambient: "rgba(253,224,71,0.18)",
  },
  {
    kind: "sealed_door",
    floor: 20,
    title: "The Sealed Door",
    flavor:
      "A great iron door, three locks high. Glyphs flicker around its hinges. Behind it: a sound like an animal that has been waiting too long to be fed.",
    choices: [
      { id: "force",  label: "Force It Open", blurb: "Spawns a mini-boss; legendary guaranteed on kill.",    tint: "#ef4444" },
      { id: "study",  label: "Read the Glyphs", blurb: "Reveals a permanent lore card. No combat.",          tint: "#22d3ee" },
      { id: "leave",  label: "Walk Past Quietly", blurb: "Skip entirely. The whispers fade behind you.",     tint: "#94a3b8" },
    ],
    ambient: "rgba(220,80,80,0.18)",
  },
] as const;

const DISCOVERY_FLOORS = new Set(DISCOVERIES.map(d => d.floor));

export function isDiscoveryFloor(depth: number): boolean {
  return DISCOVERY_FLOORS.has(depth);
}

export function getDiscoveryForFloor(depth: number): DiscoveryEvent | null {
  return DISCOVERIES.find(d => d.floor === depth) ?? null;
}

// Per-profile bookkeeping so a player doesn't see the same Discovery
// twice in a single profile lifetime (Discoveries are tied to depth
// landmarks rather than random rolls).
const SEEN_KEY = "henry-dungeon-discovery-v1";

interface SeenSave { ids: string[]; }

export function loadSeenDiscoveries(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as SeenSave;
    return new Set(Array.isArray(parsed?.ids) ? parsed.ids : []);
  } catch {
    return new Set();
  }
}

export function markDiscoverySeen(kind: DiscoveryKind) {
  if (typeof window === "undefined") return;
  const seen = loadSeenDiscoveries();
  seen.add(kind);
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify({ ids: Array.from(seen) }));
  } catch {
    /* noop */
  }
}
