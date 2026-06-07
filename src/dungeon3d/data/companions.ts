// Dungeon3D — companion encounters.
//
// A one-time NPC who joins you for 3 consecutive floors then departs.
// The encounter floor is rolled per-run in the 7-12 range, persisted
// to localStorage so it survives reloads inside a run.

export type CompanionKind = "brawler" | "healer" | "scholar";

export interface CompanionDef {
  kind: CompanionKind;
  name: string;
  blurb: string;
  greeting: string;
  goodbye: string;
  /** Damage multiplier (1.0 = none). */
  dmgMult: number;
  /** HP/sec passive regen. */
  regenPerSec: number;
  /** XP multiplier (1.0 = none). */
  xpMult: number;
  tint: string;
}

export const COMPANIONS: readonly CompanionDef[] = [
  {
    kind: "brawler",
    name: "Garm of the Hollow",
    blurb: "Walking knuckles in a coat that's mostly straps.",
    greeting:
      "\"You hit like a librarian. Watch me a few floors — I'll fix that.\"",
    goodbye:
      "\"My contract was three floors. Keep punching like I taught you, kid.\"",
    dmgMult: 1.15,
    regenPerSec: 0,
    xpMult: 1.0,
    tint: "#fb7185",
  },
  {
    kind: "healer",
    name: "Sister Vell",
    blurb: "Walks two paces behind, humming a low warding tune.",
    greeting:
      "\"You're losing more than you're earning. Stand close. I'll mend what I can.\"",
    goodbye:
      "\"Three floors, three psalms, three patches. Bleed slower out there.\"",
    dmgMult: 1.0,
    regenPerSec: 0.5,
    xpMult: 1.0,
    tint: "#6ee07a",
  },
  {
    kind: "scholar",
    name: "Archivist Ren",
    blurb: "Smaller than his lantern. Asks more questions than he answers.",
    greeting:
      "\"You kill, I'll record. The dungeon teaches more than the textbooks ever did.\"",
    goodbye:
      "\"My notes are done. Read them aloud above ground — they grow taller in the sun.\"",
    dmgMult: 1.0,
    regenPerSec: 0,
    xpMult: 1.25,
    tint: "#22d3ee",
  },
] as const;

const RUN_KEY = "henry-dungeon-companion-run-v1";

interface RunCompanionState {
  /** Encounter floor for this run (set on first descend). */
  encounterFloor: number;
  /** Kind that will spawn. Rolled at the same time. */
  kind: CompanionKind;
  /** Floor on which they leave (= encounter + 3). */
  departFloor: number;
  /** Run-id we attached this to (newGame timestamp). */
  runStartedAt: number;
  /** Have we shown the greeting card yet? */
  greeted: boolean;
  /** Have we shown the goodbye card yet? */
  saidGoodbye: boolean;
}

function pickKind(): CompanionKind {
  const kinds: CompanionKind[] = ["brawler", "healer", "scholar"];
  return kinds[Math.floor(Math.random() * kinds.length)];
}

function pickEncounterFloor(): number {
  // 7..12 inclusive
  return 7 + Math.floor(Math.random() * 6);
}

function newRunState(runStartedAt: number): RunCompanionState {
  const encounter = pickEncounterFloor();
  return {
    encounterFloor: encounter,
    kind: pickKind(),
    departFloor: encounter + 3,
    runStartedAt,
    greeted: false,
    saidGoodbye: false,
  };
}

export function getOrInitCompanionState(runStartedAt: number): RunCompanionState {
  if (typeof window === "undefined") return newRunState(runStartedAt);
  try {
    const raw = window.localStorage.getItem(RUN_KEY);
    if (!raw) {
      const s = newRunState(runStartedAt);
      window.localStorage.setItem(RUN_KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as RunCompanionState;
    // If the run has changed, start fresh.
    if (!parsed || parsed.runStartedAt !== runStartedAt) {
      const s = newRunState(runStartedAt);
      window.localStorage.setItem(RUN_KEY, JSON.stringify(s));
      return s;
    }
    return parsed;
  } catch {
    return newRunState(runStartedAt);
  }
}

export function persistCompanionState(s: RunCompanionState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(RUN_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export function clearCompanionRun() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(RUN_KEY); } catch { /* noop */ }
}

export function getCompanionDef(kind: CompanionKind): CompanionDef {
  return COMPANIONS.find(c => c.kind === kind) ?? COMPANIONS[0];
}

/** Is the companion currently traveling with the player at this depth? */
export function isCompanionActive(s: RunCompanionState, depth: number): boolean {
  return depth >= s.encounterFloor && depth < s.departFloor;
}
