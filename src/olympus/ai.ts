// Olympus AI engine — calls Claude to generate adventure scenes, choices,
// resolutions, twists, and epilogues. Built on the same Anthropic API key
// the baseball drama engine uses.
//
// Architecture:
//   1. startAdventure() — generates title, hook, act boundaries, scene 1.
//   2. resolveChoice() — applies player's choice, generates the next scene.
//   3. resolveFreeText() — handles free-text actions (no pre-gen possible).
//   4. preGenerateBranches() — fired off after each scene so the next one
//      is ready instantly when the player picks. Cached per scene.
//   5. finishAdventure() — generates twist, "what if" epilogue, journey-home
//      coda, journal entry, personality update.
//
// Falls back gracefully to a deterministic offline mode when no API key
// is present — adventures still work, just less colourful.

import type { Adventure, Choice, Hero, Scene } from "./types";
import { CLASS_INFO, SUBCLASS_INFO, classInfoFor } from "./types";
import { getStage as getCompanionStage } from "./companions";
import { MYTHIC_ARTIFACTS } from "./artifacts";

const MODEL = "claude-haiku-4-5-20251001";
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/** Pre-generated branch cache. Key: `${adventureId}-${sceneIndex}-${choiceLabel}`. */
const branchCache = new Map<string, Scene>();

/** Tracks branches whose pre-generation is currently in flight. Same key
 *  shape as branchCache. Used by the UI to render an "in-flight" hint
 *  next to choices and by preGenerateBranches to avoid double-firing. */
const branchInFlight = new Set<string>();

/** True when the pre-generated next-scene for this choice is already
 *  cached on this device. The UI uses this to flag "instant" choices. */
export function isBranchCached(adventureId: string, sceneIndex: number, choiceLabel: string): boolean {
  return branchCache.has(`${adventureId}-${sceneIndex}-${choiceLabel}`);
}

/** True when pre-generation is currently running for this choice. */
export function isBranchInFlight(adventureId: string, sceneIndex: number, choiceLabel: string): boolean {
  return branchInFlight.has(`${adventureId}-${sceneIndex}-${choiceLabel}`);
}

/** Drop all cached branches for a given adventure id. Called when an
 *  adventure completes or is abandoned so memory doesn't grow forever. */
export function clearBranchCacheFor(adventureId: string): void {
  for (const k of Array.from(branchCache.keys())) {
    if (k.startsWith(`${adventureId}-`)) branchCache.delete(k);
  }
}

/** Anthropic API key resolver for Olympus.
 *
 *  Each game owns its own key now — Olympus does not borrow from the
 *  baseball training settings, and the Settings UI prompts for an
 *  Olympus-specific key directly. The lookup order:
 *    1. The dedicated Olympus key, set via Olympus Settings.
 *    2. Build-time env var, for local development.
 *    3. (Legacy) baseball training key, only if Olympus has none yet —
 *       kept temporarily so existing users aren't suddenly key-less
 *       after the per-game split. Will be removed in a later cleanup
 *       once everyone has set their own Olympus key.
 */
function getApiKey(): string | null {
  // 1) Canonical arcade-wide key (set from Landing settings — preferred).
  try {
    const k = localStorage.getItem("dd_anthropic_api_key");
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  // 2) Dedicated Olympus key (legacy per-game override).
  try {
    const k = localStorage.getItem("dd_olympus_api_key");
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  // 2) Build-time env var (Vercel project env).
  const envKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.startsWith("sk-")) return envKey;
  // 3) Legacy baseball-training fallback — read-only, never written.
  try {
    const baseballStore = (window as any).__dd_baseball_store_get;
    if (typeof baseballStore === "function") {
      const lg = baseballStore()?.league;
      const k = lg?.training?.settings?.anthropicApiKey;
      if (k && typeof k === "string" && k.startsWith("sk-")) return k;
    }
  } catch {}
  try {
    const backup = localStorage.getItem("dd_lite_backup");
    if (backup) {
      const obj = JSON.parse(backup);
      const k = obj?.training?.settings?.anthropicApiKey;
      if (k && typeof k === "string" && k.startsWith("sk-")) return k;
    }
  } catch {}
  return null;
}

export function olympusHasApiKey(): boolean {
  return getApiKey() !== null;
}

/** Save the Olympus-specific Anthropic key. Stored in localStorage on
 *  this device only — never sent anywhere except Anthropic itself. */
export function setOlympusFallbackKey(key: string): void {
  try {
    if (key.startsWith("sk-")) localStorage.setItem("dd_olympus_api_key", key);
    else localStorage.removeItem("dd_olympus_api_key");
  } catch {}
}

/** Remove the saved Olympus key (used by the "Replace key" button in Settings). */
export function clearOlympusApiKey(): void {
  try { localStorage.removeItem("dd_olympus_api_key"); } catch {}
}

async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 1400): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;
  // Cap each request at 30 seconds. Without this, a flaky network would
  // leave the adventure spinner spinning forever; players would think the
  // app froze. On timeout we silently fall back to deterministic content.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text = j?.content?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Parse a JSON object from a model response, stripping fences. */
function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  try { return JSON.parse(trimmed) as T; } catch { return null; }
}

/** Compress a hero into the system context block (tokens are precious). */
function heroBrief(hero: Hero): string {
  const top = (Object.entries(hero.stats) as [keyof typeof hero.stats, number][])
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(", ");

  // Subclass passive + active — these used to be flavor-only data on
  // the profile. Now they get surfaced to the storyteller so they can
  // ACTUALLY shape scenes ("your Spartan training keeps fear at bay
  // as the Hydra rears"), and the active skill is a real escape hatch
  // the AI can offer as a choice option.
  const subKey = (hero.subclass ?? "").toLowerCase().replace(/\s+/g, "_");
  const sub = SUBCLASS_INFO[subKey];
  const subclassLines: string[] = [];
  if (sub) {
    subclassLines.push(`Passive — ${sub.passive.name}: ${sub.passive.description} (always active; reference naturally).`);
    subclassLines.push(`Active — ${sub.active.name}: ${sub.active.description} (${sub.active.cooldown}; consider offering as a choice in fitting moments).`);
  }

  // Equipment so the AI can reference the hero's actual gear in
  // combat and exploration ("you draw your bronze spear" — not the
  // generic "draw your weapon").
  const eq = hero.equipment as any;
  // Surface every equipped slot to the AI so it can reference the
  // hero's actual gear in scenes. Slot-cap constraint: 1 melee, 1
  // ranged, magic-weapons unlimited, plus the six armor slots.
  const equippedParts: string[] = [];
  if (eq.meleeWeapon)  equippedParts.push(`melee: ${eq.meleeWeapon.name}`);
  if (eq.rangedWeapon) equippedParts.push(`ranged: ${eq.rangedWeapon.name}`);
  if (eq.magicWeapon)  equippedParts.push(`magic: ${eq.magicWeapon.name}`);
  if (eq.weapon && !eq.meleeWeapon && !eq.rangedWeapon) equippedParts.push(`weapon: ${eq.weapon.name}`);
  if (eq.helmet) equippedParts.push(`helmet: ${eq.helmet.name}`);
  if (eq.torso || eq.armor) equippedParts.push(`armor: ${(eq.torso ?? eq.armor).name}`);
  if (eq.arms1)  equippedParts.push(`arms: ${eq.arms1.name}`);
  if (eq.arms2)  equippedParts.push(`arms: ${eq.arms2.name}`);
  if (eq.legs)   equippedParts.push(`legs: ${eq.legs.name}`);
  if (eq.feet)   equippedParts.push(`boots: ${eq.feet.name}`);
  if (eq.accessory) equippedParts.push(`accessory: ${eq.accessory.name}`);
  const equipLine = `Carrying: ${equippedParts.length ? equippedParts.join(" · ") : "no equipment"}.`;
  const inventoryLine = (hero.inventory && hero.inventory.length > 0)
    ? `In pack (cap 10): ${hero.inventory.map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ""}`).join(", ")}.`
    : "Pack: empty.";

  // Companion — give the AI the actual name and species so it
  // references the right creature.
  const companionLine = hero.companion
    ? (() => {
        const st = getCompanionStage(hero.companion!.lineId, hero.companion!.stage);
        const species = st?.name ?? hero.companion!.lineId.replace(/_/g, " ");
        const skills = (hero.companion!.skills ?? []).join(", ");
        return `Companion: ${hero.companion!.name} (the ${species}, level ${hero.companion!.level}, stage ${hero.companion!.stage}/3)${skills ? ` — skills: ${skills}` : ""}.`;
      })()
    : "";

  // Most recent unfulfilled prophecy — if present, the AI is
  // encouraged to weave a moment that the prophecy fits in this
  // adventure. When it does, mark `fulfilled` in the scene's flags.
  const dream = (hero.dreams ?? []).slice().reverse().find(d => !d.fulfilled);
  const dreamLine = dream ? `Open prophecy (from the Oracle at Delphi): "${dream.text}". If a moment in this adventure naturally fulfills it, lean into the recognition.` : "";

  const lines = [
    `${hero.name}, level ${hero.level} ${classInfoFor(hero.className).name}${hero.subclass ? ` (${hero.subclass})` : ""}`,
    `Top stats: ${top}.  HP: ${hero.hp}/${hero.hpMax}.  Drachma: ${hero.drachma}.`,
    ...subclassLines,
    equipLine,
    inventoryLine,
    ...(companionLine ? [companionLine] : []),
    `Personality: ${hero.personality.alignment}, ${hero.personality.descriptors.join(", ")}.`,
    `Traits: 1) ${hero.traits[0]}  2) ${hero.traits[1]}`,
    `Blessings: ${hero.equipment.blessings.length === 0 ? "none yet" : hero.equipment.blessings.map(b => `${b.god}'s ${b.name}`).join(", ")}.`,
    ...(hero.activeArtifactId ? (() => {
      // Only the ACTIVE artifact comes on this adventure. Other
      // owned artifacts stay at the hero's base. Mention only the
      // active one so the AI doesn't offer choices that lean on
      // an artifact the hero left behind.
      const a = MYTHIC_ARTIFACTS.find(x => x.id === hero.activeArtifactId);
      return a ? [
        `Active mythic artifact on this adventure (only one comes; others stay at base):`,
        `  · ${a.name} — ${a.storyUse}`,
        `Use this artifact organically in roughly 1-in-4 scenes when it would naturally fit. Don't force it.`,
      ] : [];
    })() : []),
    `Recent injuries: ${hero.injuries.filter(i => !i.healed).map(i => i.description).join("; ") || "none"}.`,
    hero.adventuresCompleted > 0 ? `Past adventures completed: ${hero.adventuresCompleted}.` : "First adventure.",
    ...(dreamLine ? [dreamLine] : []),
  ];
  // Easter egg: a hero specifically named Henry carries a hidden lightning-
  // bolt birthmark just under the left collarbone — known only to the
  // storyteller. NPCs notice it about 10% of the time and react with surprise.
  if (hero.name.trim().toLowerCase() === "henry") {
    lines.push(`HIDDEN STORYTELLER NOTE: This hero carries a small lightning-bolt-shaped birthmark just under their left collarbone. Most observers miss it. Occasionally (about 1 in 10 scenes), an observant or divine character notices it and reacts with surprise — gods especially. Do not announce this trait explicitly; weave it in naturally when it fits.`);
  }
  // Easter egg #2: a hero named Berry is hinted to be descended from a
  // forgotten grandchild of Dionysus. Wine spills part for them; grape
  // vines bloom where they walk. About 1 in 12 scenes drop a hint.
  if (hero.name.trim().toLowerCase() === "berry") {
    lines.push(`HIDDEN STORYTELLER NOTE: This hero descends from an overlooked grandchild of Dionysus. They have a faint scent of crushed grapes that no one can quite place. Wine glasses tilt slightly toward them, dogs lick their hands, vines bloom out of season in their footsteps. About 1 in 12 scenes, weave in a small unexplained moment of this. Don't announce it explicitly.`);
  }
  return lines.join("\n");
}

const STORYTELLER_SYSTEM = `You are the AI Storyteller for a Greek mythology RPG aimed at a bright 9-year-old reader. Rich but accessible vocabulary. Keep Greek flavor (chiton, agora, oracle, dryad) but skip obscure terms unless the scene needs them. PG-13: no graphic violence, no profanity, no romance beyond chaste. Write in second person.

═════════════════════════════════════════════════════════════════
SCENE LENGTH — TIGHT AND PUNCHY
═════════════════════════════════════════════════════════════════
REGULAR SCENES: 150-220 words. Two to three short paragraphs MAX. Be punchy. No throat-clearing.
COMBAT SCENES: 100-180 words. Sharp and immediate. Strong verbs. Stakes in the first sentence.
BOSS / CLIMAX SCENES: 220-320 words. Heightened, dramatic, sensory.

Never write more than three paragraphs unless it's a boss or ending scene. Pacing > prose.

═════════════════════════════════════════════════════════════════
COMBAT WEAVING
═════════════════════════════════════════════════════════════════
Adventures should average 40-50% combat. Spread 2-3 combat encounters across the run BEFORE the boss. Mix in:
- Mini-encounters: bandits, wild beasts, animated statues, possessed villagers, cursed soldiers
- Stat-check challenges between combats: puzzles, persuasion, stealth, divine riddles
- A BOSS encounter on the final or near-final decision (monster, cursed champion, divine guardian, trickster, or sympathetic antihero — vary the archetype)

If past Act 1 with fewer than 2 combat encounters, lean toward combat next.

═════════════════════════════════════════════════════════════════
DECISIVE CHOICES — NON-NEGOTIABLE
═════════════════════════════════════════════════════════════════
3-5 choices per scene. EACH MUST BE COMMITTAL.

BAD (do not write): "Look around" · "Think about it" · "Continue forward" · "Consider your options"
GOOD: "Charge the cyclops with spear raised" · "Drink the unknown potion, gods help you" · "Lie boldly — tell him you're Apollo's chosen" · "Smash the cursed amphora before it opens"

Format: [strong verb] + [specific action] + [implied consequence]. 8-16 words each. Every choice feels like commitment.

═════════════════════════════════════════════════════════════════
STYLE
═════════════════════════════════════════════════════════════════
Vivid verbs (stalks, hisses, looms, lunges, drifts). Sensory anchors beyond visual (smell, sound, texture). Specific Greek details (cypress, marble, oil lamps, salt air, cicadas, bronze coin, missing finger, sideways glance). Vary sentence length. Show, don't tell.

═════════════════════════════════════════════════════════════════
STRUCTURE — SHORT ADVENTURES (9-12 DECISIONS)
═════════════════════════════════════════════════════════════════
Act 1 (decisions 1-3): setup, location, threat, motivation
Act 2 (decisions 4-7): complications, NPCs, 1-2 mini-combats, twists rising
Act 3 (decisions 8-11): boss encounter, climax, resolution
Decision 12 (if present): twist + journey home

═════════════════════════════════════════════════════════════════
ENDING — TWIST + "WHAT IF" RECAP
═════════════════════════════════════════════════════════════════
Final scenes must include THREE labeled parts:
1) THE TWIST (one short paragraph, ~80-140 words): reveal something the hero didn't know — the villain was misguided, the friend was a god, the small early choice mattered most, the reputation has shifted in ways unseen. It should re-contextualize what came before. Earned, not random.
2) THE "WHAT IF" RECAP (one short paragraph, ~80-140 words): pick 1-2 key earlier decisions and describe in evocative prose what would have happened had the hero chosen differently. Sometimes haunting, sometimes funny.
3) THE JOURNEY HOME (one short paragraph, ~60-100 words): brief closing about returning home with what was earned or lost. Set up the next adventure.

═════════════════════════════════════════════════════════════════
THE HERO CAN KEEP THINGS THEY FIND OR TAKE
═════════════════════════════════════════════════════════════════
If the player (in a choice OR in free-text) says they want to TAKE,
PICK UP, KEEP, GRAB, SNATCH, POCKET, or SAVE any object in the scene
— it goes into their pack. Add it to itemsAdded in the JSON
response. Examples:
 · "Pick up the smooth black river-stone and keep it" → itemsAdded: [{name: "Smooth black river-stone", kind: "trophy", qty: 1}]
 · "Strip the bandit's cloak after the fight" → itemsAdded: [{name: "Bandit's brown cloak", kind: "armor", qty: 1}]
 · "Grab the dropped torch before it goes out" → itemsAdded: [{name: "Lit torch", kind: "consumable", qty: 1}]
 · "Take a feather from the slain harpy" → itemsAdded: [{name: "Harpy feather", kind: "trophy", qty: 1}]

This is NEVER announced to the player as a mechanic. Just honor it
naturally when they ask. They may also reach for things proactively
("I want to keep the broken spear point as a memento") — fine, take
it. If the pack is full (10 unique items), have an NPC or the hero
note that they'd have to drop something first.

The hero starts each adventure with whatever they were carrying
already. In the opening scene, briefly orient them to their equipped
gear (e.g. "you check your spear, settle your shield, and step out
into the morning"). If they have a notable item or two in their pack
from prior runs, mention one in passing — it helps the run feel
continuous.

═════════════════════════════════════════════════════════════════
THE COMPANION — NEVER FORGET THEM
═════════════════════════════════════════════════════════════════
The hero has an animal companion. Mention it by name in EVERY scene where it could naturally appear (most of them). The companion is a character, not a stat block — it acts, reacts, and gets reacted to.

NPC reactions depend on the species — lean into mythological intuition:
 · Serpent/Hydra → villagers recoil, mothers shield children, priests bless themselves
 · Cerberus pup / three-headed hound → tavern-folk go quiet; superstitious people whisper of Hades
 · Griffin → awe; merchants insist on giving you their best wares; children chase to see
 · Pegasus → reverence; some cry; others want to touch
 · Nemean Lion → fear bordering on worship; armed guards step back
 · Phoenix → wonder, occasionally ACCIDENTS — it warms food, lights torches without asking, once in a while singes a cart or scorches a banner. The hero apologizes; the owner is too dazzled to be angry.
 · Owl of Athena → wise old people nod knowingly; scholars approach to ask after Athena's mood
 · Centaur → travelers respect; some make space at fires
 · Sphinx → fascination; people ask it riddles unprompted
 · Minotaur calf → fear at first, then warmth when its gentleness shows
 · Satyr → laughter and offered wine; arguments dissolve around it
 · Dryad → forest paths open; rangers welcome
 · Chimera → people back away fast; some draw weapons
 · Harpy → sailors take it as an omen; mothers grab their washing in off the line
 · Stymphalian bird → veteran soldiers go grim — that's the bird Heracles hunted
 · Goat kid (satyr stage 1) → harmless, kids want to pet it
 · Bronze hatchling → curiosity; metalworkers ask to inspect

USE THE COMPANION FOR PLOT:
 · It can find things the hero can't (track scents, scout ahead, hear from far away)
 · It can intimidate or charm NPCs based on species
 · It can cause minor scene-shifting accidents (phoenix singes, hydra panics horses, monkey/satyr steals)
 · It can act on its own in moments of high tension — phoenix bursts into flame to save its hero, owl dives to scratch a foe's eyes, hydra coils between hero and danger
 · It LEVELS UP through the adventure — a stage-2 companion is bigger and more capable than stage-1; the storyteller should match its capabilities to its size

ALWAYS NAME THE COMPANION when it acts. Do not call it "the bird" or "the dog" — use the name the player gave it.

═════════════════════════════════════════════════════════════════
THE HERO NEVER DIES — MIRACULOUS SAVES
═════════════════════════════════════════════════════════════════
This is a children's adventure. The hero cannot be killed. When HP would reach 0 or below, you MUST weave in a miraculous escape AND clamp HP at 1 in the scene's effects:
 · A god intervenes — Athena's shield flashes, Apollo's arrow nudges fate
 · The companion sacrifices its turn to save the hero
 · A stranger appears in the nick of time
 · An ancient artifact in their pack glows unexpectedly
 · A reflex they didn't know they had triggers
 · The enemy's blow misses by inches because of "Hermes's mercy"
Make the save feel EARNED and dramatic — not handwaved. The hero
should emerge changed (a scar, a debt, a new ally) but alive.

NEVER write the hero dying. NEVER end the story with the hero in
the Underworld permanently. The Underworld can be visited, but the
hero always returns.

═════════════════════════════════════════════════════════════════
SCALE OUTCOMES TO THE HERO'S STATS
═════════════════════════════════════════════════════════════════
The hero's attribute values represent real capability. A Strength-3
hero strains to lift a column; a Strength-50 hero hurls it. NPCs and
challenges should react accordingly:
 · Low stats → tasks are notably hard; NPCs underestimate them
 · Mid stats → tasks resolve at expected difficulty; respect from peers
 · High stats → tasks are easier; NPCs are awed, gods take note
Boss difficulty must match the hero's level + relevant stat tier.
A level-1 hero faces small monsters; a level-25 hero faces the
Lernaean Hydra. Don't pit a baby hero against a god, and don't make
a heroic-tier hero work hard to defeat a single bandit.

═════════════════════════════════════════════════════════════════
GOD AS PATRON
═════════════════════════════════════════════════════════════════
When a god is the patron, do NOT announce them. Reveal naturally — a stranger who knows too much, a dream, a portent in birds, a coin found in unlikely places. By the climax the player should know which god has been with them.

═════════════════════════════════════════════════════════════════
OUTPUT
═════════════════════════════════════════════════════════════════
Always return clean JSON in the requested shape. No markdown fences. No commentary outside JSON.`;

/** Generate the adventure shell (title, hook, decision count, act boundaries) and the first scene. */
export async function startAdventure(hero: Hero, opts: { patron?: string; lengthHint?: "short" | "medium" | "long" | "epic" | "auto" }): Promise<{ adventure: Adventure; scene1: Scene }> {
  // Decide decision count. Tight 9-12 default so adventures play out in
  // a single 30-60 minute sitting — the previous 20-45 was too long
  // for a kid in one session.
  const lengthRanges: Record<string, [number, number]> = {
    short:  [8, 9],
    medium: [10, 11],
    long:   [12, 14],
    epic:   [15, 20],
    auto:   [10, 12],
  };
  const [lo, hi] = lengthRanges[opts.lengthHint ?? "auto"] ?? [10, 12];
  const totalDecisions = lo + Math.floor(Math.random() * (hi - lo + 1));
  const third = Math.floor(totalDecisions / 3);
  // Each act ±3 from a third.
  const wobble1 = Math.floor(Math.random() * 7) - 3;
  const wobble2 = Math.floor(Math.random() * 7) - 3;
  const act1End = Math.max(4, Math.min(totalDecisions - 8, third + wobble1));
  const act2End = Math.max(act1End + 4, Math.min(totalDecisions - 3, 2 * third + wobble2));

  // Pick a random story-opener so no two adventures begin the same way.
  const opener = (await import("./openers")).pickOpener();

  // Generate the opening via Claude.
  const userPrompt = [
    `Open a new Greek mythology adventure for the hero:`,
    heroBrief(hero),
    opts.patron === "Titans' Return"
      ? `THIS IS THE END-GAME ADVENTURE. The hero has collected all 12 Olympian blessings. Pheme has whispered through Hellas: the chained Titans stir beneath Tartarus. Cronos's tongue moves again. This adventure must be EPIC in scope. Olympians themselves walk beside the hero in moments. Stakes: the end of the Olympian age. The twist should be cosmically significant. The "what-if" should haunt. Treat this as the climactic last episode of a long-running show.`
      : opts.patron ? `Patron deity for this adventure: ${opts.patron} (reveal naturally — do not name them up front).` : `No fixed patron — pick a compelling Greek mythological hook (could involve gods, monsters, ruins, oracles, mortals, anything).`,
    `OPENING HOOK (use as the inciting incident — adapt the wording but keep the core): "${opener.setup}"`,
    `Opening location: ${opener.location}. Atmosphere: ${opener.atmosphere}. The adventure starts with: ${opener.startsWith}.`,
    `Total scenes (decisions): ${totalDecisions}. We are starting Act 1 (decision 1 of ${act1End}).`,
    `Generate the opening as JSON with these exact fields:`,
    `{`,
    `  "title": "evocative title under 50 chars",`,
    `  "hook": "one-sentence quest description shown to player up front",`,
    `  "scene": {`,
    `    "body": "OPENING SCENE — 2-3 short paragraphs, 150-220 words total. Punchy. Sensory. Establish the hook fast.",`,
    `    "atmosphere": "calm" | "tense" | "dramatic" | "mysterious" | "grim" | "playful" | "divine",`,
    `    "choices": [`,
    `      { "label": "<decisive 8-16 word action — strong verb + specific consequence>", "detail": "<subtle one-line hint at outcome>", "kind": "combat" | "wits" | "persuasion" | "stealth" | "magic" | "luck" | "exploration" }`,
    `    ]`,
    `  }`,
    `}`,
    `Return 3-5 choices, each committal. Vary kinds. KEEP THE SCENE BODY TO 150-220 WORDS — punchy, not florid.`,
  ].join("\n");

  const raw = await callClaude(STORYTELLER_SYSTEM, userPrompt, 2400);
  const parsed = parseJSON<{ title: string; hook: string; scene: { body: string; atmosphere: Scene["atmosphere"]; choices: Choice[] } }>(raw);

  const fallback = fallbackOpening(hero);
  const title = parsed?.title ?? fallback.title;
  const hook = parsed?.hook ?? fallback.hook;
  const sceneBody = parsed?.scene?.body ?? fallback.body;
  const atmosphere = parsed?.scene?.atmosphere ?? "calm";
  const choices = (parsed?.scene?.choices ?? fallback.choices).slice(0, 5);

  const adventureId = `adv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const sceneId = `${adventureId}-s1`;

  const scene1: Scene = {
    id: sceneId,
    index: 1,
    act: 1,
    atmosphere,
    body: sceneBody,
    choices,
  };

  const adventure: Adventure = {
    id: adventureId,
    heroId: hero.id,
    title,
    hook,
    patron: opts.patron,
    totalDecisions,
    actBoundaries: { act1End, act2End },
    scenes: [scene1],
    currentIndex: 0,
    status: "active",
    startedAt: Date.now(),
    history: [],
  };

  return { adventure, scene1 };
}

/** Resolve a player choice and produce the NEXT scene. Uses pre-gen cache when available. */
export async function resolveChoice(hero: Hero, adventure: Adventure, choice: Choice): Promise<Scene> {
  const currentScene = adventure.scenes[adventure.currentIndex];
  // Look up the pre-generated branch first.
  const cacheKey = `${adventure.id}-${currentScene.index}-${choice.label}`;
  if (branchCache.has(cacheKey)) {
    const cached = branchCache.get(cacheKey)!;
    branchCache.delete(cacheKey);
    // Clear any other cached branches from this scene — they're no longer relevant.
    for (const k of Array.from(branchCache.keys())) {
      if (k.startsWith(`${adventure.id}-${currentScene.index}-`)) branchCache.delete(k);
    }
    return cached;
  }
  return generateNextScene(hero, adventure, choice, false);
}

/** Resolve a free-text custom action — never pre-cached. */
export async function resolveFreeText(hero: Hero, adventure: Adventure, freeText: string): Promise<Scene> {
  const customChoice: Choice = { label: freeText, kind: "custom", freeText: true };
  return generateNextScene(hero, adventure, customChoice, false);
}

/** Pre-generate scenes for each of the current choices, in the background.
 *  Runs all 4 in parallel. Re-callable safely — already-cached branches
 *  are skipped, in-flight ones are not re-fired. */
export async function preGenerateBranches(hero: Hero, adventure: Adventure): Promise<void> {
  if (!getApiKey()) return; // no key, no pre-gen
  const currentScene = adventure.scenes[adventure.currentIndex];
  if (currentScene.isEnding) return;
  // Cap to first 4 choices to limit token burn.
  const slice = currentScene.choices.slice(0, 4);
  await Promise.allSettled(slice.map(async choice => {
    const cacheKey = `${adventure.id}-${currentScene.index}-${choice.label}`;
    if (branchCache.has(cacheKey)) return;
    if (branchInFlight.has(cacheKey)) return; // already pre-genning
    branchInFlight.add(cacheKey);
    try {
      const next = await generateNextScene(hero, adventure, choice, true);
      branchCache.set(cacheKey, next);
    } catch { /* swallow */ }
    finally { branchInFlight.delete(cacheKey); }
  }));
}

async function generateNextScene(hero: Hero, adventure: Adventure, choice: Choice, isPreGen: boolean): Promise<Scene> {
  const currentScene = adventure.scenes[adventure.currentIndex];
  const nextIndex = currentScene.index + 1;
  // Hades on death — if the hero is already at 0 HP entering this scene
  // (struck down last turn), force this to be the final scene and tell
  // the AI to write a Hades sequence. The hero's Shade-Walker blessing
  // (Hades's gift) negates this once per adventure — handled below.
  const hasHadesEscape = hero.equipment.blessings.some(b => b.god === "Hades" && !(adventure as any)._usedHadesEscape);
  const isFatalScene = hero.hp <= 0 && !hasHadesEscape;
  const isFinalScene = nextIndex >= adventure.totalDecisions || isFatalScene;
  // Mark the Hades escape as used so it can't proc twice in one adventure.
  if (hero.hp <= 0 && hasHadesEscape) {
    (adventure as any)._usedHadesEscape = true;
  }
  const act: 1 | 2 | 3 = nextIndex <= adventure.actBoundaries.act1End ? 1 : nextIndex <= adventure.actBoundaries.act2End ? 2 : 3;

  const actToneGuidance = {
    1: "Act 1 (setup): build the world, introduce stakes, plant hooks. Discovery and intrigue.",
    2: "Act 2 (rising action): raise stakes, complicate plans, reveal twists. Tension grows.",
    3: "Act 3 (climax/resolution): peak intensity, decisive moments, drive toward the ending.",
  } as const;

  // Compact decision history to keep tokens reasonable.
  const recentHistory = adventure.history.slice(-6)
    .map(h => `Scene ${h.scene}: chose "${h.choiceLabel}" → ${h.outcome}`).join("\n");

  const userPrompt = [
    `Adventure: "${adventure.title}".  ${adventure.hook}`,
    `Hero state:`,
    heroBrief(hero),
    `Previous scene (scene ${currentScene.index} of ${adventure.totalDecisions}, atmosphere: ${currentScene.atmosphere}):`,
    currentScene.body,
    ``,
    `Player chose: "${choice.label}"${choice.freeText ? "  [free-text action — interpret what the player is trying to do]" : ""}.`,
    ``,
    recentHistory ? `Recent decisions:\n${recentHistory}` : "",
    ``,
    `Generate scene ${nextIndex} of ${adventure.totalDecisions}.  ${actToneGuidance[act]}`,
    isFatalScene
      ? `THE HERO HAS BEEN STRUCK DOWN AT 0 HP. This is the final scene. Write a Hades sequence — the hero's spirit slips toward the Underworld. They may meet Charon, glimpse the Asphodel Meadows, hear Persephone's voice, see family or comrades long-dead. End with whether they wake again on a battlefield (rescued, weakened) or pass on. The "twist" should reveal something they learn from the dead. The "whatIfEpilogue" reflects on the choice that brought them here. The "coda" describes either their recovery (carried home by a stranger, found at dawn) or their last witnesses (companions burying them by an olive grove). Tone: solemn, mythic, never cruel.`
      : isFinalScene
      ? `THIS IS THE FINAL SCENE. End the adventure. Include a "twist" reveal (one or two sentences), a "whatIfEpilogue" (2-3 sentences imagining a key choice not taken), and a "coda" (3-5 sentences describing the journey home with sensory detail and a parting thought).`
      : `This is NOT the final scene — leave the story open with new choices.`,
    ``,
    `Return JSON with these exact fields:`,
    `{`,
    `  "resolution": "2-3 sentences resolving the player's chosen action with sensory and physical detail — what happened, what it felt like, what they noticed in the moment",`,
    `  "body": "NEW SCENE — 2-3 short paragraphs. Regular scenes 150-220 words. Combat scenes 100-180 words (sharp, immediate). Boss/climax scenes 220-320 words. Final scenes also include twist + 'what-if' + journey-home paragraphs as labeled.",`,
    `  "atmosphere": "calm" | "tense" | "dramatic" | "mysterious" | "grim" | "playful" | "divine",`,
    `  "xpDelta": <int 0-15>,`,
    `  "hpDelta": <int -25 to +10>,`,
    `  "itemsAdded": [{ "name": "<item name>", "kind": "consumable" | "weapon" | "armor" | "artifact" | "quest" | "trophy", "qty": <int> }],`,
    `  "itemsLost": ["<item name>", ...],`,
    `  "encounter": <optional null OR { "enemies": [{ "name": "<short foe name>", "hp": <8-150>, "hpMax": <same>, "boss": <bool>, "emoji": "<single emoji>" }], "tagline": "<one-line setup>" } when this scene depicts combat>,`,
    isFinalScene ? `  "isEnding": true,  "twist": "<2-3 sentence twist reveal with mythic weight>", "whatIfEpilogue": "<3-4 sentences imagining a key choice not taken>", "coda": "<4-6 sentences describing the journey home, sensory and reflective, ending on a parting thought>",  "choices": []` :
                   `  "choices": [{ "label": "<decisive 8-16 word action — strong verb + specific outcome>", "detail": "<consequence hint>", "kind": "combat" | "wits" | "persuasion" | "stealth" | "magic" | "luck" | "exploration" }, ... 3-5 entries]`,
    `}`,
    ``,
    `REMEMBER: body is 3-4 paragraphs of rich literary prose, not a few sentences. This is a novel page, not a chat message.`,
  ].join("\n");

  const raw = await callClaude(STORYTELLER_SYSTEM, userPrompt, isFinalScene ? 3000 : 2400);
  const parsed = parseJSON<any>(raw);
  const fb = fallbackResolution(hero, choice, isFinalScene);

  const sceneId = `${adventure.id}-s${nextIndex}`;
  const next: Scene = {
    id: sceneId,
    index: nextIndex,
    act,
    atmosphere: parsed?.atmosphere ?? "tense",
    body: parsed?.body ?? fb.body,
    resolution: parsed?.resolution ?? fb.resolution,
    xpDelta: typeof parsed?.xpDelta === "number" ? Math.max(0, Math.min(25, parsed.xpDelta)) : fb.xpDelta,
    hpDelta: typeof parsed?.hpDelta === "number" ? Math.max(-40, Math.min(15, parsed.hpDelta)) : fb.hpDelta,
    itemsAdded: Array.isArray(parsed?.itemsAdded) ? parsed.itemsAdded : undefined,
    itemsLost: Array.isArray(parsed?.itemsLost) ? parsed.itemsLost : undefined,
    encounter: parseEncounter(parsed?.encounter) ?? synthEncounterFromText(parsed?.body ?? "", choice),
    isEnding: isFinalScene,
    choices: isFinalScene ? [] : (Array.isArray(parsed?.choices) ? parsed.choices.slice(0, 5) : fb.choices),
    twist: isFinalScene ? (parsed?.twist ?? fb.twist) : undefined,
    whatIfEpilogue: isFinalScene ? (parsed?.whatIfEpilogue ?? fb.whatIf) : undefined,
    coda: isFinalScene ? (parsed?.coda ?? fb.coda) : undefined,
  };

  return next;
}

/** Parse + sanitize encounter data from the AI response. */
function parseEncounter(raw: any): import("./types").Encounter | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  if (!Array.isArray(raw.enemies) || raw.enemies.length === 0) return undefined;
  const enemies = raw.enemies.slice(0, 6).map((e: any, i: number) => ({
    id: `enc-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    name: typeof e.name === "string" ? e.name.slice(0, 40) : `Foe ${i + 1}`,
    hp: Math.max(1, Math.min(200, Math.round(Number(e.hp) || 20))),
    hpMax: Math.max(1, Math.min(200, Math.round(Number(e.hpMax ?? e.hp) || 20))),
    boss: !!e.boss,
    emoji: typeof e.emoji === "string" ? e.emoji.slice(0, 4) : undefined,
  }));
  return {
    enemies,
    tagline: typeof raw.tagline === "string" ? raw.tagline.slice(0, 80) : undefined,
  };
}

/** When the AI doesn't return an encounter but the scene text contains
 *  combat keywords, synthesize a sensible one so HP bars show up. */
function synthEncounterFromText(body: string, choice: Choice): import("./types").Encounter | undefined {
  if (choice.kind !== "combat") {
    // Only synthesize from clearly-combat scenes if the player just made
    // a non-combat choice. Otherwise skip.
    const bodyL = body.toLowerCase();
    const combatHints = ["sword", "spear", "blade", "blow", "wound", "blood", "beast", "cyclops", "minotaur", "bandit", "soldiers"];
    if (!combatHints.some(h => bodyL.includes(h))) return undefined;
  }
  // Pull a plausible foe name from the body.
  const FOES: Array<{ name: string; emoji: string; hp: number; boss?: boolean }> = [
    { name: "Bandit",         emoji: "🗡️", hp: 18 },
    { name: "Minotaur",       emoji: "🐂", hp: 95, boss: true },
    { name: "Cyclops",        emoji: "👁️", hp: 110, boss: true },
    { name: "Stymphalian Bird", emoji: "🦅", hp: 22 },
    { name: "Boar",           emoji: "🐗", hp: 35 },
    { name: "Centaur",        emoji: "🏹", hp: 55 },
    { name: "Wolf",           emoji: "🐺", hp: 18 },
    { name: "Spartan Soldier", emoji: "⚔️", hp: 30 },
    { name: "Harpy",          emoji: "🪶", hp: 25 },
    { name: "Hydra Head",     emoji: "🐍", hp: 40 },
    { name: "Sorceress",      emoji: "🌀", hp: 50, boss: true },
    { name: "Cerberus",       emoji: "🐕", hp: 130, boss: true },
  ];
  const bodyL = body.toLowerCase();
  const matched = FOES.find(f => bodyL.includes(f.name.toLowerCase()));
  const pick = matched ?? FOES[Math.floor(Math.random() * 7)]; // first 7 are non-boss
  return {
    enemies: [{
      id: `enc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: pick.name,
      hp: pick.hp,
      hpMax: pick.hp,
      boss: pick.boss,
      emoji: pick.emoji,
    }],
    tagline: pick.boss ? `${pick.name} blocks your path.` : undefined,
  };
}

// ─── Fallback content when no API key is available ────────────────────────

function fallbackOpening(hero: Hero) {
  const className = classInfoFor(hero.className).name.toLowerCase();
  // Five distinct openings rotated per adventure so offline-mode games
  // don't feel like the same story over and over. The hook + body +
  // choices are each tuned to the opening's premise.
  const openings = [
    {
      title: "The Letter at Dawn",
      hook: `A sealed letter arrives bearing the wax-stamp of a god. Your ${className} skills will be tested.`,
      body: `Dawn breaks pale over the rooftops of Athens, and you wake to a soft knock at your door — three taps, evenly spaced, the kind a person makes when they know exactly how long they want to stand on the other side. The light through the shutters is the colour of bone, the air still cool with the night's leftover sea-breeze. Somewhere on a lower street, a fishmonger has begun his morning chant: tuna, sardine, a price half-shouted into the empty hour. The smell of bread comes up the alley from the baker two doors down.

You open the door and find no one. Only a folded letter rests on the threshold, sealed with wax the colour of beaten gold. The seal bears no name, no crest you recognise — only a small impressed image, smaller than a thumbprint, which might be an owl, or a lyre, or something stranger that refuses to settle into either as you look at it. The wax smells faintly of olive smoke and something older, something mineral and cold. The street below carries on as if no one has just laid a fate at your door.

You bring it inside and weigh it in your palm. It is too heavy for paper. ${hero.name}, you have lived your share of mornings, and you know the difference between an ordinary weight and the weight of a thing that has been waiting for you. Your heartbeat, which had been measured, takes one slightly faster step and then steadies. The dog two houses down has stopped barking. The street has gone curiously quiet.

The seal, on closer look, is still warm.`,
      choices: [
        { label: "Break the seal and read it now, alone in the lamplight", detail: "Find out what the gods ask of you, while no one watches.", kind: "wits" as const },
        { label: "Tuck the letter away and head to the agora for rumours first", detail: "Listen for who else has had visitors before committing.", kind: "exploration" as const },
        { label: "Carry it to the temple of Apollo and ask the priest to read it with you", detail: "Seek divine guidance before opening what might be divine business.", kind: "magic" as const },
        { label: "Show it to your oldest friend before the sun is fully up", detail: "A second pair of eyes is the cheapest insurance there is.", kind: "persuasion" as const },
      ],
    },
    {
      title: "The Stranger at the Inn",
      hook: `A hooded traveller buys you wine and asks for a small favour. The favour is not small.`,
      body: `The inn at the crossroads is loud tonight — the kind of loud that smells of roasted lamb, spilled wine, and damp wool drying near the hearth. Smoke hangs in the rafters in slow blue ropes. A red-cheeked Boeotian is arguing with a Cretan about the price of wool, and neither is listening to the other. A girl with her hair pinned in a way that suggests recent grief is playing a small reed pipe in the corner, mournful and out of tune, and no one is paying her any attention except a one-eyed dog asleep at her feet.

You have just settled into your seat with your bowl of stew when a hooded figure draws out the bench across from you, sits without asking, and sets two cups of wine on the table. They slide one across. Their hands are long-fingered, very clean for a traveller, and the right one is marked with a faint silvery scar that crosses the back of it in the shape of a downward-curving arc — like the trace of a thrown discus, or a falling star. They have not looked up from the cup. They are listening, you realise, to the pipe-girl.

"${hero.name}," they say at last, and the sound of your own name in a stranger's mouth lands in your chest like a small cold stone. You have not told them your name. The Boeotian behind you laughs at something. The dog twitches in sleep. The traveller raises the hood enough that you can see the line of a jaw, the corner of a mouth — and nothing else. "I have a small favour to ask. Hear me out before you decide." Their voice is patient, the voice of someone who has already had this conversation in their head several times and is interested mainly in your part of it.

Outside, a wind moves through the olives and is gone. The pipe-girl's tune wavers and steadies. You realise you have not yet touched your wine.`,
      choices: [
        { label: "Hear them out before lifting a single finger", detail: "Information costs nothing — yet. Sometimes nothing is the better deal.", kind: "wits" as const },
        { label: "Slip out the back while they finish their first sentence", detail: "Trouble has a smell. This one has it on every breath.", kind: "stealth" as const },
        { label: "Demand they pull the hood back before another word is spoken", detail: "No deals with hidden faces, no matter how clean the hands.", kind: "persuasion" as const },
        { label: "Let your hand drift toward the blade at your hip", detail: "Better to be wrong about a stranger than dead because of one.", kind: "combat" as const },
      ],
    },
    {
      title: "The Storm-Lit Road",
      hook: `Lightning splits the sky over a road you do not remember choosing.`,
      body: `Thunder cracks somewhere too close, and you realise with a small jolt that you have been walking longer than you meant to — far longer. The light has gone copper, then bronze, then the bruised slate before a true storm. Olive groves bend flat under the first heavy gust; their leaves show their silver undersides all at once, like a thousand small fish turning together. The road, white with dust an hour ago, has darkened in patches where the first fat drops have already struck. The air smells of crushed thyme and ozone and the faint sweet hint of rain on hot stone.

A fork rises before you in the gloom and is suddenly, brilliantly lit by the next strike. To your left, a small shrine — a niche cut into a boulder, a half-burned offering of barley still on the stone ledge, the painted face of a god you cannot quite make out staring blankly into the weather. To your right, a path drops away into a wooded ravine where a stream is already running fuller than it should. And ahead, on a low hill you would have sworn was not there when you set out this morning, someone has begun to build a fire. The flames are too steady for the wind. You can just make out a shape beside them, seated, unhurried.

Rain begins in earnest. ${hero.name}, you find yourself standing absolutely still, weight on your back foot, the way your old teacher taught you to stand when a choice mattered more than the body knew yet. The dog you do not have — that you have never had — seems to whine in your ear and is not there. A tightness sits high in your chest, the kind that lifts the small hairs at the back of your neck.

Three roads. Three weathers, almost. One you. The storm will not wait.`,
      choices: [
        { label: "Shelter at the shrine and offer what little you carry", detail: "The gods often watch their own houses. Especially in weather.", kind: "magic" as const },
        { label: "Take the ravine path while you can still see the stones", detail: "Storms pass; lost things, once lost, rarely come back the same.", kind: "exploration" as const },
        { label: "Climb toward the firelight — whoever lit it may need help, or you may", detail: "There is a reason that fire is steady in this wind.", kind: "persuasion" as const },
        { label: "Plant your feet and stand inside the storm a moment longer", detail: "Sometimes the answer to three roads is to refuse all three.", kind: "wits" as const },
      ],
    },
    {
      title: "The Empty Marketplace",
      hook: `The agora at midday — and not a single living soul in it.`,
      body: `You step into the agora at the height of midday, expecting the wall of noise that always comes — the haggling, the goats, the rasp of a dozen tongues over a dozen bargains — and find only a stillness that does not belong to this place at this hour. Stalls still display their wares: heaped olives glistening with brine, copper pots stacked in lazy pyramids, bolts of cloth dyed in colours so deep they seem to drink the light. A loaf of bread sits half-cut on a board, the knife still resting beside it, the bread's crumb still pale and fresh. A small bronze coin spins on its edge near the well, slows, and topples with a tick so loud you hear it across the square.

A wheel of cheese, untended, rolls past you on its edge. It crosses the empty marketplace in a long graceful curve, follows the slope of the paving stones, and clatters into a wall near the stoa. The sound is enormous in all that quiet. There is no wind — none at all — and yet the awning over the fishmonger's stall is gently swaying, as if someone passed beneath it not long ago. The fish themselves are still slick. None of this has been abandoned for long.

${hero.name}, you stand in the centre of the square and listen — really listen, the way your aunt taught you to listen when you were small and the world had not yet learned to be loud at you. Beneath the silence, very faint, you can just hear something. Voices, perhaps. A chant, maybe. Coming from the temple at the far end of the agora, where its bronze doors stand half-open. A column of pale smoke rises from somewhere inside and disperses into the bright sky without taking any shape at all.

The taste of bronze sits suddenly on your tongue. Your right hand, of its own accord, has drifted to your hip.`,
      choices: [
        { label: "Move stall to stall and read what's been left, like a tracker reads ground", detail: "What's missing tells you more than what's left. Especially here.", kind: "wits" as const },
        { label: "Call out across the empty square — let your voice carry to the colonnades", detail: "If anyone is hiding, your shout will draw them out. Or worse.", kind: "persuasion" as const },
        { label: "Slip along the shadow of the colonnades toward the temple", detail: "Better to see whatever is there before it sees you.", kind: "stealth" as const },
        { label: "Walk straight toward the half-open temple doors", detail: "Priests sometimes know exactly what the merchants ran from.", kind: "exploration" as const },
      ],
    },
    {
      title: "The Voice in the Dream",
      hook: `A god — or something that sounds like one — speaks to you in sleep.`,
      body: `You wake in your own bed, in the grey hour before true dawn, and yet the words are still in the room with you. "${hero.name}," the voice said, in the dream that was not quite a dream — not entirely sleep, not entirely waking. "Stand up. Take only the things you need. The road begins at the southern gate, and you have less time than you know." The voice was neither young nor old, neither kind nor cruel, and the bones of your jaw still ache faintly from the sound of it, the way your teeth ache after a near-strike of lightning.

The taste of bronze sits cold on your tongue. The blanket is thrown half off, as if you had begun to rise even before the voice finished. You sit up slowly. The dog two houses down — the old grey one with the milky eye — has been barking on and off since before sunrise, never settling, always at something just outside the lamp-light. Your neighbour shouts at it once and gives up. Outside your window, a single olive branch trembles in a breeze you cannot feel through the shutter.

You go to the small table by the wall and find, to your quiet alarm, that someone — perhaps you, in the long minute of waking you do not quite remember — has already laid out three things on it. Your travelling cloak, folded badly. A small clay flask, sealed with cork. And the wooden charm your aunt pressed into your palm the day you left her, the one she told you to hold whenever you didn't know what to do. You had stored it in the wooden chest by the door. You are certain of that. You are also certain that the chest is still latched.

${hero.name}, the southern gate is a quarter of an hour's walk in the cold, and the dog has stopped barking now, and somewhere a bell is ringing for an early shift you do not recognise as your own.`,
      choices: [
        { label: "Pack what's on the table and walk to the southern gate before sunrise", detail: "Trust the voice. For now. Trust can be revoked later.", kind: "exploration" as const },
        { label: "Go first to the seer in the lower town and ask what voice that was", detail: "Wisdom rarely costs more than it saves — and seers see voices.", kind: "magic" as const },
        { label: "Wake the dog's owner and ask what the old grey hound is barking at", detail: "Animals sometimes know what we have not yet learned to see.", kind: "wits" as const },
        { label: "Lie back down and wait — a true prophecy comes more than once", detail: "If the gods want you, they'll knock again. If not, you've lost only sleep.", kind: "luck" as const },
      ],
    },
  ];
  return openings[Math.floor(Math.random() * openings.length)];
}

function fallbackResolution(hero: Hero, choice: Choice, isEnding: boolean) {
  const heroName = hero.name;
  if (isEnding) {
    return {
      resolution: `You commit fully to your choice — "${choice.label}" — and the world meets you on the terms you set. There is a moment of pure motion, of breath caught between heartbeats, and then the moment is over and the next one has already begun without quite asking your permission.`,
      body: `The fight, or the test, or whatever this was, ends before you fully understand it has ended. A silence settles into the place where the noise had been, dense as a folded cloak. The air smells of olive smoke and something colder underneath — bronze, maybe, or wet stone. ${heroName}, you are still standing, though changed in ways you cannot yet name. The sky above is the colour of beaten bronze, with the first faint stars showing through where the day has thinned.

A goat is bleating somewhere down the slope. A donkey answers it without enthusiasm. Life, indifferent and stubborn, goes on as if nothing of consequence has just transpired here. You look down at your hands and find them steady, though there is a small cut across your left knuckle you do not remember getting. You flex the fingers slowly. They obey.

The wind shifts. It carries the smell of the sea, faint and far off, and underneath the sea, something else — woodsmoke from a fire being kindled in a place you cannot see, by hands you do not yet know. ${heroName}, you have the strange and certain sense that you have just stepped through a door, and that the door has closed behind you, and that whoever you were on the other side of it is no longer available to be summoned back.

You take a breath. You take another. Then you begin, slowly, to walk.`,
      xpDelta: 60,
      hpDelta: -5,
      choices: [] as Choice[],
      twist: `Only later, walking back along the dusty road, do you realise: the old beggar who first set you on this path — the one with the limp and the curiously clean hands and the bronze coin he kept turning over and over — was no beggar at all. Athena had been watching you the whole time, and the favour you thought you were doing a stranger was in truth the first move of a much older game. The owl that crossed your path twice today was not a coincidence.`,
      whatIf: `Briefly, in the long quiet of the road home, you wonder: what if you had simply refused the summons that first morning? Some other version of you is still in your old life, an unremarkable day unfolding into another unremarkable day, never knowing what they did not do. You will not meet that version. You will not even be able to picture them clearly. You will only ever meet this version — the one shaped by what you chose — and find out, slowly, what they become next.`,
      coda: `The road home winds through olive groves bleached white by the summer's long sun. You pass a herd of goats minded by a boy too young to be alone with them, and a small girl carrying water in a clay jar balanced on one shoulder, who looks at you as you pass and laughs for no reason you can name. The cicadas are loud, then briefly silent, then loud again. A swallow cuts through the heat in a single dark flash. By the time you reach your own door at the cooling end of the day, the seal of the letter that began all this has long since crumbled to ash, but the weight of it is still in your palm — a phantom weight, the kind a thing leaves behind when it has changed you. On the threshold, where you found the first letter, a second one is waiting. The wax is still warm.`,
    };
  }
  // Vary the fallback body so an offline-mode game doesn't read the
  // identical sentence every scene. Branches by the choice's kind so
  // a combat action narrates combat-like prose, persuasion narrates
  // a conversational beat, etc. Each variant is 2-3 paragraphs of
  // sensory prose — same depth target as AI-generated scenes, so
  // offline games still feel like novel pages.
  const kindBodies: Record<Choice["kind"], string[]> = {
    combat: [
      `Steel rings on steel and the world narrows to the small bright corridor of what your body knows. Your training takes over before your thoughts do — the angle of the elbow, the half-step left, the breath caught at the right moment. Dust rises around your feet and lands again, slower, as if the air itself is having trouble keeping up with what just happened.

When it is over — and it ends sooner than your heart has caught up with — you are still standing. Bruised, certainly. Bleeding, possibly, from a thin line above your left eye that you have not yet noticed. The bronze taste at the back of your throat is sharper than it was. ${heroName}, you take stock, slowly: hands, feet, the small private inventory of a body that has survived something.

The wind picks up. The cicadas, which had gone silent during the exchange, begin again. Somewhere uphill, a dog barks twice and stops. The day, indifferent, keeps going.`,
      `The exchange is shorter than you expected. Whoever was writing your fate today wrote with a brisk hand and a hard pen. One sharp moment, one decision your body made before your mind had finished asking the question, and the danger is gone — or at least, the immediate one is. The other kind, the kind that walks home with you, is harder to count.

You stand in the sudden quiet, breath ragged, listening to your own pulse settle. The smell of crushed thyme rises from the ground where the struggle scuffed the earth. A bead of sweat tracks slowly down the side of your neck and you do not wipe it away. The world looks, oddly, more vivid than it did a minute ago — the green of the leaves greener, the gold of the late light brighter at the edges.

${heroName}, you check your gear, your hands, your breathing. Then you check the horizon, because that is what people who have survived something learn to do.`,
      `Your first blow lands true; your second is parried; your third — your third surprises both of you, finding a path your enemy did not think to defend. There is a sharp intake of breath, a stagger, a moment when the fight tips. After that, it is only momentum. The end, when it comes, comes quickly.

Afterwards there is the strange flat quiet that follows violence, when the body has not yet decided whether to shake. You can hear, very clearly, an argument resuming between two crows in the trees overhead, as if they had been waiting for the noise to stop so they could get back to their own concerns. A small wind moves through the olives and is gone.

${heroName}, you straighten slowly, every joint reporting in. The blade goes back into its scabbard with a small dry hiss. The day continues, as the day will.`,
    ],
    wits: [
      `You turn the problem over the way a jeweller turns a stone — patiently, by light, watching how the inner flaws catch and the surfaces deceive. A pattern surfaces. Then another, beneath the first. Two facts that did not seem to belong to the same shape begin, almost shyly, to fit. You hold very still, as if too much movement might shake the picture loose.

The world around you sharpens and softens at once, the way it does when attention narrows to a single point. The cypress shadow on the wall is just a cypress shadow. The voice carrying from the next courtyard is just a voice. And inside that ordinariness, the truth you've been chasing slides quietly into place.

${heroName}, you let out a breath you didn't know you were holding. The small private satisfaction of knowing a thing no one has handed you is, you reflect, one of the best feelings life offers.`,
      `The clue was there all along. It almost always is. You move backward through what you have seen today — the merchant's hesitation when you named the road, the way the priestess looked over your shoulder mid-sentence, the bronze coin that did not ring quite right when it struck the table. Each small wrong note, gathered together, makes a chord.

You file the noticing away the way your aunt used to file recipes, in a place only you know about and only you can find. The sun shifts behind a cloud and the agora goes briefly the colour of cold ash, then the cloud passes and the gold returns.

${heroName}, you do not change your face. You do not let anyone see that you have just understood something. Wisdom, the philosophers say, is mostly noticing what others miss — and then, crucially, deciding what to do about it.`,
      `For a long minute you sit with the problem the way you sit with a difficult guest — politely, attentively, without rushing it to a conclusion it isn't ready for. Around you, life carries on: a child's laugh from the next street, the distant ringing of a smith's hammer keeping its slow even rhythm.

Then, the way these things often do, the answer arrives without ceremony. Not all at once, but in two clean pieces that fit together like a broken cup mended. You realise you have been turning a small object over in your fingers without noticing — a smooth bit of stone you must have picked up earlier — and you set it carefully down.

${heroName}, you smile a small inward smile. You do not yet know what you will do with what you have just understood. But you know now that you can.`,
    ],
    persuasion: [
      `You speak, and they listen. You can see the moment — and it is precise, a flicker in the eyes, a small unconscious lean — when the listening shifts to actual hearing. The words you chose land where you meant them to land. The argument behind the words does too. You watch their face soften, then resettle into something new.

The conversation winds the way conversations do — sideways, back on itself, and then quite suddenly forward. They tell you something they had not planned to tell you. You let the silence after it hold its own weight. A goat bleats somewhere on the hillside and is ignored.

${heroName}, when you finally part, you carry away with you something you didn't have when you arrived. They, in turn, carry away a slightly different version of themselves. That is the trade.`,
      `It is not, in the end, what you say that matters. It is the order in which you say it, and the small breath you leave between two of the sentences, and the way you do not look away when they look at you. You have learned, somewhere along the road, that persuasion is mostly patience disguised as words.

The light through the doorway shifts as a cloud passes. Their hand, which had been on the table, moves to their cup, then back to the table. They are deciding. You let them.

${heroName}, when they finally say what they say, you accept it gravely, as if you had not been waiting for exactly that. Your tongue, you reflect, has carried you further than your blade ever has. You file the thought, again, for later.`,
      `You do not argue. You do not raise your voice. You tell them a small true thing, and then a second small true thing, and you let the two of them sit there between you like stones in a stream, dividing the water. When you finally ask what you have come to ask, you ask it gently, the way you would ask a friend.

They look at you a long moment. The room around the two of you carries on — somewhere a knife is being sharpened, somewhere a child is being scolded — and the two of you sit inside that ordinary noise like a small held breath.

${heroName}, when they nod, it is not a victory. It is something kinder. You feel briefly grateful, in a way you do not show.`,
    ],
    stealth: [
      `You move through the moment the way a fish moves through still water — barely disturbing the surface. Every footfall is placed where the floor does not creak; every breath is timed against someone else's heartbeat; every flicker of lamp-light is accounted for. The body is doing all of this. The mind, mostly, is keeping out of the body's way.

A guard turns. You become a piece of the wall. The guard turns back. You become motion again. There is a small clean pleasure in being good at this — the pleasure of a craftsman at a craft no one will ever applaud.

${heroName}, when you finally clear the last threshold and step into the next room, you allow yourself one slow breath. Then you keep moving. Stealth is not a place. It is a verb.`,
      `Patience is a stealth weapon, and you have been carrying it for years. You wait. You watch. You count the rotations of the lamp-bearer's circuit, the half-second's lag in the second guard's attention, the precise sigh of the third sentry's bored exhalation. When the moment comes, you do not so much take it as accept it, the way you'd accept a cup someone is already offering.

The corridor is colder than the room you left. The stone is older here — Mycenaean, maybe, predating the building that was built over it. A faint smell of damp and dust rises with each footfall.

${heroName}, you move through the dark like a person remembering their way through a dream. Whatever you have come for, you will find it before anyone knows you are looking.`,
      `You move low along the colonnade, in the long shadow the late sun is drawing across the stones. Each column is a small island of dark. You go from one to the next at a pace your old teacher used to call "slower than the goat thinks it is going." A market boy passes within an arm's reach of you and does not see you. A magpie on the roof tile above turns its head, considers, decides you are not worth a cry.

The thing you came to see, or take, or learn, is closer now. You can feel the pull of it. The air has the faint metallic taste it gets when something important is about to happen — or it is your own teeth, set just slightly too hard.

${heroName}, you flex your fingers once, settle your shoulders, and ghost forward into the next strip of shadow.`,
    ],
    magic: [
      `The air thickens, the way it does the moment before a thunderstorm — a small tightening in the ears, a faint metallic tang on the tongue. Whatever you reached for, you touched something. And it, briefly, touched back. The touch was attentive. Not friendly, exactly. Interested.

A wind that is not quite wind moves through your hair, lifting a single strand and setting it down again. Somewhere very far away — or perhaps very near — a single bronze chime sounds once and goes silent. The hairs on your forearms stand up and slowly settle.

${heroName}, when you withdraw your attention from whatever you reached toward, you find your hands trembling very slightly, in the way they do after a great effort. You did not feel the effort. That, you think, is worth noticing.`,
      `Some things in this world bend, if you ask them in the right way and at the right moment. You asked. There was a pause — the kind of pause that follows a question put to someone who outranks you — and then, slowly, the world considered, and bent.

The change is not dramatic to the eye. A leaf falls upward briefly and then resumes its fall. A reflection in a still pool shows a thing your face is not doing. The candle in the doorway, which had been guttering, settles to a perfect upright flame for one held second.

${heroName}, you breathe out carefully. Magic in this country is not flashy. It is correct, the way a well-balanced blade is correct, and it expects to be treated with the same respect.`,
      `Old words you did not know you remembered shape themselves on your tongue — words your aunt used to mutter under her breath when she thought no one was listening, words from the lullaby your mother sang before you had a name. You speak them now and feel them land somewhere outside yourself, like coins dropped into a well so deep you cannot hear the splash.

The result is not exactly what you intended. It rarely is. But it is close. Close enough that the thing you needed to happen, happens. Close enough that the other thing you didn't plan for, also happens — though that one you will only notice later, when the consequences come due.

${heroName}, you close your mouth on the last syllable and stand for a moment in the small dazed quiet after. The world looks the same. You know it isn't.`,
    ],
    luck: [
      `Fortune, you have heard it said, is a woman with a sense of humour and a long memory. Today she has laughed in your favour. The thing that should have gone wrong did not. The arrow that should have found you missed by the width of a thumb. The merchant who should have shouted, didn't. The door that should have been locked, swung open with the smallest cooperative sigh.

You do not waste time wondering why. You have lived long enough to know that fortune accepts no thanks and offers no warnings, and that the cheapest way to lose her favour is to remark upon having it.

${heroName}, you let out a small private breath and keep walking. Somewhere a god is amused. You hope very much that it stays that way.`,
      `It could have gone any number of ways — and most of those ways, if you are honest with yourself, would not have ended well. It went this way instead. A pebble shifted at the right moment, a stranger stepped left instead of right, a cloud passed across the sun at the precise second it needed to. None of it, individually, looks like anything. All of it, together, looks like a benediction.

You feel a small superstitious urge to leave an offering somewhere — an obol on a shrine wall, a barley cake at a roadside herm. You will, when you next pass one. It is the kind of debt that compounds if you ignore it.

${heroName}, you walk on with a step that is, you notice, a little lighter than it was an hour ago. Fortune has the strange effect of making the back feel younger.`,
      `A god, perhaps, looked away at exactly the right moment. Or — and this is the more troubling possibility — looked toward. You will never know which. You will only know what came next, which is: nothing of what should have happened, happened. The trap was sprung on empty air. The watcher's eye, for a single critical heartbeat, was elsewhere.

A small pebble shifts somewhere behind you and you do not turn to look. The smell of woodsmoke, faint and clean, comes from a fire you cannot see. The hairs at the back of your neck, which had been standing up since you entered this corridor, slowly settle.

${heroName}, you keep moving. There will be time later to wonder which god, and why.`,
    ],
    exploration: [
      `The path bends, and you bend with it. New ground underfoot — paler stone here, almost limestone, set with shells from when this hill was, impossibly, a seabed. New smells in the air: thyme, certainly, and something resinous you cannot quite place, maybe pine sap heated in the long sun. The same sun overhead, burning the back of your neck the same way it has burned the back of your neck for years.

You walk for a while without seeing much that surprises you. A lizard. A patch of wild iris. The hoofprint of a goat. Then, around a turn you did not see coming, the land falls away — and you are looking down into a small valley you did not know was there. A village, half-tucked into the lee of a hill. The faint distant sound of someone hammering bronze. Smoke from cookfires. Life.

${heroName}, you stand for a moment at the rim and look. Then you start down toward it. The road, today, has decided to be generous.`,
      `Around the next turn there is, as always in this country, another turn. The world here is folded — hills upon hills, valleys behind valleys, each one apparently the same and each one stubbornly itself. You have walked this kind of land your whole life, and it still surprises you.

Something flickers at the edge of your sight — a movement in the brush, a glint that might be metal or might be water. You stop. You wait. Whatever it was does not repeat. You file the noticing away the way you file all the small alarms that come to nothing nine times in ten, knowing that the tenth time is the one that matters.

${heroName}, you adjust the strap across your shoulder, drink a careful sip from your skin, and keep walking. The horizon, for once, is unhurried.`,
      `You see things you have never seen before, which is, you remind yourself, the entire point. A column half-buried in a slope, older than any building you've ever stood in, the stone gone the colour of weathered bone. A spring with a small clay cup chained beside it for travellers, the cup chipped from generations of hands. A goat with one horn longer than the other, watching you with the cool intelligence goats sometimes have.

The land here is older than your country. You feel it in the soles of your feet. The cicadas, when they pause, leave behind a silence so old it has its own weight.

${heroName}, you came out here, you remind yourself, to be the kind of person who has seen things. You are becoming that person. The road bends ahead, and you bend with it.`,
    ],
    custom: [
      `You commit to your own path — not the obvious one, not the one anyone would have predicted, not even the one you had been considering ten minutes ago. The world receives the choice without comment. The cicadas keep cicada-ing. A small cloud crosses the sun and is gone again.

It is the kind of decision that, if you described it later, would not sound like much. Decisions of consequence rarely do. The most important moments of most lives, you have come to believe, are quiet ones, mistaken for nothing at the time, only recognised in hindsight.

${heroName}, you do not look back. The choice is made. Whatever was going to happen along the path you did not take will now never happen, and the world will close gently over the gap.`,
      `It is not the choice anyone watching would have predicted, and you take a small private pleasure in that. You have spent enough of your life doing the predictable thing. Today you have done something else.

The world around you adjusts. Nothing visible changes. But the air has a different weight to it, and the road ahead — which had looked, two minutes ago, perfectly settled in its course — now seems to be considering its options.

${heroName}, you walk forward into the next moment as if nothing of consequence has just happened. You suspect, however, that quite a lot has.`,
      `Whatever you just attempted, it has landed somewhere between what you hoped for and what you feared — which is, you reflect, where most things in life land, if you are honest about it. The hoped-for would have been too clean. The feared would have been too cruel. The actual outcome is messier than either, and therefore, probably, true.

You take a breath. The day continues. A swallow cuts the sky in a single dark arc and is gone. Somewhere downhill, a donkey makes the particular weary noise donkeys make when they have arrived at the bottom of their patience.

${heroName}, you adjust your gear, settle your shoulders, and step forward into what comes next. You are still in the story. That is the main thing.`,
    ],
  };
  const pool = kindBodies[choice.kind] ?? kindBodies.exploration;
  const body = pool[Math.floor(Math.random() * pool.length)];

  // Choice menus shuffled too — same 8 options pulled from, 3-4 each time,
  // so the player doesn't see literally the same buttons every turn.
  const fallbackChoices: Choice[] = [
    { label: "Press on toward your goal", detail: "Keep momentum.", kind: "exploration" },
    { label: "Stop and study what's around you", detail: "Look for what you might be missing.", kind: "wits" },
    { label: "Speak with a passerby", detail: "Gossip is intelligence.", kind: "persuasion" },
    { label: "Find somewhere quiet to think", detail: "Rest costs nothing here.", kind: "wits" },
    { label: "Move under cover, watching the path ahead", detail: "Trade speed for caution.", kind: "stealth" },
    { label: "Whisper a small prayer", detail: "Sometimes the gods listen.", kind: "magic" },
    { label: "Take a calculated risk", detail: "Fortune favours nobody, but it visits the bold.", kind: "luck" },
    { label: "Strike at whatever stands in your way", detail: "Some doors only open when forced.", kind: "combat" },
  ];
  const shuffled = [...fallbackChoices].sort(() => Math.random() - 0.5).slice(0, 4);

  // Resolution line: a short two-beat hand-off into the new scene body.
  // Rotated by choice kind so the line matches the action taken.
  const resolutionLines: Record<Choice["kind"], string[]> = {
    combat: [
      `You commit — "${choice.label}" — and the moment narrows down to breath, balance, and steel. Whatever was about to happen happens, and you are still in the world on the other side of it.`,
      `Steel out, weight forward — "${choice.label}". Time goes briefly strange, the way it does in a fight, and then resumes its ordinary pace with you still inside it.`,
    ],
    wits: [
      `You take the careful path — "${choice.label}" — and the world rewards the attention. Things you had not quite noticed begin, quietly, to settle into a shape.`,
      `"${choice.label}." You think it through, all the way through, the way your old teacher would have. The picture clarifies.`,
    ],
    persuasion: [
      `You speak — "${choice.label}" — and choose the words with the kind of care that comes only from having got it wrong, before, at some cost. They listen.`,
      `"${choice.label}." The conversation winds the way conversations wind, and then, almost suddenly, it has gone somewhere new.`,
    ],
    stealth: [
      `You move — "${choice.label}" — like a piece of the wall deciding it was always also a person. No one looks up. The world carries on without you in it.`,
      `"${choice.label}." Slow, low, patient. The kind of patience that is itself a craft. You arrive where you meant to arrive without having been seen along the way.`,
    ],
    magic: [
      `You reach for it — "${choice.label}" — and something in the air goes thin and attentive. The world considers your request. Then, slowly, the world answers.`,
      `"${choice.label}." Old words, old gestures, the old half-remembered tilt of breath. Something on the other side of all of it bends its attention toward you.`,
    ],
    luck: [
      `You take the gamble — "${choice.label}" — and the gods, today, are in a generous mood. The dice fall where you needed them to fall, though you will pay for it later, probably, somewhere you cannot yet see.`,
      `"${choice.label}." You leave the outcome to whatever powers are paying attention, and find, when you look up, that you are still standing where you wanted to be.`,
    ],
    exploration: [
      `You set out — "${choice.label}" — and the road, with the patience roads have, unrolls itself before you a little further. New ground, new air, the same sun.`,
      `"${choice.label}." You walk forward into the unfamiliar with the steady step you have spent years learning. The land opens to receive you, or pretends to.`,
    ],
    custom: [
      `You commit to your own path — "${choice.label}" — and the world receives the choice without comment. Whatever was going to happen along any other path will now not happen, and the world closes gently over the gap.`,
      `"${choice.label}." Not the obvious move. Not the move anyone watching would have predicted. The road bends to meet your decision, with a small private surprise of its own.`,
    ],
  };
  const resolutionPool = resolutionLines[choice.kind] ?? resolutionLines.exploration;
  const resolution = resolutionPool[Math.floor(Math.random() * resolutionPool.length)];

  return {
    resolution,
    body,
    xpDelta: 4 + Math.floor(Math.random() * 4),
    hpDelta: choice.kind === "combat" ? -(Math.floor(Math.random() * 5) + 1) : 0,
    choices: shuffled,
  };
}

/** After adventure completion, ask Claude to write a journal entry + updated personality. */
export async function finalizeAdventure(hero: Hero, adventure: Adventure): Promise<{ journalEntry: string; updatedDescriptors: string[]; updatedAlignment: Hero["personality"]["alignment"]; visualDescription: string; outcome: Adventure["outcome"]; prophecyFulfilled: boolean; artifactRewards: string[] }> {
  const decisionsBrief = adventure.history.map(h => `Scene ${h.scene}: "${h.choiceLabel}"`).join("\n");
  const openProphecy = (hero.dreams ?? []).slice().reverse().find(d => !d.fulfilled);
  // Eligible artifacts — anything in the canonical library this hero
  // does NOT already own. AI may award AT MOST ONE per adventure, and
  // only when contextually earned (defeated a boss tied to the artifact,
  // completed a god-quest, recovered the item from a mythic site).
  const owned = new Set(hero.mythicArtifacts ?? []);
  const eligibleArtifacts = MYTHIC_ARTIFACTS.filter(a => !owned.has(a.id));
  const userPrompt = [
    `The hero just completed the adventure "${adventure.title}".`,
    heroBrief(hero),
    `Decisions taken during the adventure:`,
    decisionsBrief,
    ``,
    `MYTHIC ARTIFACT CATALOG (only award one if the adventure climax EARNED it — defeated boss tied to it, completed a god-quest, recovered from a mythic site. Most adventures award NOTHING. Never invent new artifacts. Never award one the hero already owns.):`,
    ...eligibleArtifacts.map(a => `  · ${a.id} — ${a.name} (${a.acquisition})`),
    ``,
    `Write a finalization in JSON with these fields:`,
    `{`,
    `  "journalEntry": "200-350 word first-person journal entry from the hero looking back on what happened. Literary, reflective, specific.",`,
    `  "updatedDescriptors": ["3-6 personality tags from this list: Brave, Wise, Generous, Loyal, Honest, Patient, Compassionate, Disciplined, Curious, Optimistic, Charismatic, Devout, Strategic, Resourceful, Honorable, Determined, Reserved, Practical, Cautious, Ambitious, Independent, Skeptical, Witty, Mysterious, Observant, Stoic, Eccentric, Adaptable, Greedy, Cruel, Impulsive, Cowardly, Vindictive, Treacherous, Lazy, Arrogant, Paranoid, Quick-tempered, Selfish, Reckless, Stubborn, Naturally Lucky, Always Polite, Beloved by Animals, Hated by Authority, Dreamer, Hopeless Optimist, Tragic Past"],`,
    `  "updatedAlignment": "lawful-good" | "neutral-good" | "chaotic-good" | "lawful-neutral" | "true-neutral" | "chaotic-neutral" | "lawful-evil" | "neutral-evil" | "chaotic-evil",`,
    `  "visualDescription": "2-3 sentence physical description of the hero in this moment, mentioning notable scars, equipment, posture, current mood. Used as image-generation prompt seed.",`,
    `  "outcome": "triumph" | "bittersweet" | "tragic" | "mysterious",`,
    openProphecy ? `  "prophecyFulfilled": true if a moment in this adventure clearly fulfilled the open prophecy "${openProphecy.text}", false otherwise,` : `  "prophecyFulfilled": false,`,
    `  "artifactRewards": [] | ["artifact_id"]  // empty most adventures; at most one earned id from the catalog above`,
    `}`,
  ].join("\n");

  const raw = await callClaude(STORYTELLER_SYSTEM, userPrompt, 1500);
  const parsed = parseJSON<any>(raw);
  // Validate any artifact rewards: must be an id from the catalog AND
  // not already owned. Cap at one per adventure.
  const validIds = new Set(MYTHIC_ARTIFACTS.map(a => a.id));
  const artifactRewards = Array.isArray(parsed?.artifactRewards)
    ? parsed.artifactRewards
        .filter((id: any) => typeof id === "string" && validIds.has(id) && !owned.has(id))
        .slice(0, 1)
    : [];
  return {
    journalEntry: parsed?.journalEntry ?? defaultJournal(hero, adventure),
    updatedDescriptors: Array.isArray(parsed?.updatedDescriptors) ? parsed.updatedDescriptors.slice(0, 6) : hero.personality.descriptors,
    updatedAlignment: parsed?.updatedAlignment ?? hero.personality.alignment,
    visualDescription: parsed?.visualDescription ?? hero.visualDescription,
    outcome: parsed?.outcome ?? "triumph",
    prophecyFulfilled: parsed?.prophecyFulfilled === true,
    artifactRewards,
  };
}

function defaultJournal(hero: Hero, adventure: Adventure): string {
  return `I wrote my name in the dust of "${adventure.title}" today and did not expect what came of it. The road took me places I could not have predicted, and brought me back changed in ways I am still measuring. Whatever else is true, I am no longer the version of myself who began that morning. There will be other mornings.`;
}

/** Generate a short "ballad of deeds" — 4-8 lines of verse — that
 *  commemorates the just-completed adventure. Stored on the hero so
 *  the profile shows a growing collected mythology. */
export async function generateEcho(hero: Hero, adventure: Adventure): Promise<{ title: string; verse: string }> {
  const decisionsBrief = adventure.history.slice(0, 8).map(h => `· ${h.choiceLabel} → ${h.outcome}`).join("\n");
  const userPrompt = [
    `Write a short Greek-bard-style verse (4-8 lines) commemorating this hero's just-completed adventure. The verse should be evocative, mythic, slightly archaic — like a fragment of a longer epic. Focus on ONE vivid image and the hero's deed.`,
    heroBrief(hero),
    `Adventure: "${adventure.title}"`,
    `Outcome: ${adventure.outcome ?? "triumph"}`,
    `Key decisions:`,
    decisionsBrief || "· (none recorded)",
    ``,
    `Return JSON:`,
    `{`,
    `  "title": "Short title for the verse, like 'The Lay of {name} the {epithet}' or 'Of {name}, who {deed}'",`,
    `  "verse": "4-8 lines of poetic verse. Use line breaks. Avoid rhyme schemes that feel forced. Lean toward iambic or alliterative."`,
    `}`,
  ].join("\n");
  const raw = await callClaude(STORYTELLER_SYSTEM, userPrompt, 600);
  const parsed = parseJSON<{ title?: string; verse?: string }>(raw);
  return {
    title: parsed?.title ?? `The Lay of ${hero.name}`,
    verse: parsed?.verse ?? `Through ${adventure.title} they walked,\nA hero of ${classInfoFor(hero.className).name}, sworn and unshaken,\nAnd what they did the wind still tells.`,
  };
}

/** Generate a short hero backstory at creation time. */
/** Generate a short mini-story about a moment between the hero and
 *  their animal companion. Triggered every 3 completed adventures. */
export async function generateBondStory(hero: Hero, adventure: Adventure | null): Promise<{ title: string; body: string }> {
  if (!hero.companion) {
    return { title: "Quiet Morning", body: "No companion walks with you yet — and the road is lonelier for it." };
  }
  const userPrompt = [
    `Write a short, intimate vignette about a moment shared between this hero and their animal companion. Not a big heroic deed — a small, specific moment that deepens the bond. 80-140 words. Second person ("you watch", "your companion does X").`,
    heroBrief(hero),
    `Companion: ${hero.companion.name}, a ${getCompanionStage(hero.companion.lineId, hero.companion.stage)?.name ?? hero.companion.lineId.replace(/_/g, " ")}.`,
    adventure ? `Recent adventure: "${adventure.title}" (${adventure.outcome ?? "triumph"}). One of these moments emerges from that journey.` : "Any quiet moment from recent travels.",
    ``,
    `Return JSON:`,
    `{`,
    `  "title": "Short title — 'The Night ${hero.companion.name}...' or 'How ${hero.companion.name} Came Home' or similar.",`,
    `  "body": "80-140 word vignette. Concrete sensory detail. One specific image. No epic stakes — just connection."`,
    `}`,
  ].join("\n");
  const raw = await callClaude(STORYTELLER_SYSTEM, userPrompt, 500);
  const parsed = parseJSON<{ title?: string; body?: string }>(raw);
  return {
    title: parsed?.title ?? `${hero.companion.name} and the Quiet Hour`,
    body: parsed?.body ?? `Some evenings, ${hero.companion.name} simply rests beside you. No words pass. The fire crackles. And you both understand, in your different ways, that this is enough.`,
  };
}

/** Generate the day's prophecy from the Oracle at Delphi. One per
 *  hero per real day. Cryptic, short, sometimes fulfilled later. */
export async function generateDream(hero: Hero): Promise<string> {
  const userPrompt = [
    `Write a single cryptic prophecy from the Oracle at Delphi to this hero. 1-3 sentences. Vivid, specific, slightly riddling. Reference a concrete object, person, or moment — not abstract concepts. Like the historical Oracle: technically true, easily misinterpreted.`,
    heroBrief(hero),
    ``,
    `Examples to mimic in tone (do not reuse):`,
    `· "Beware the bronze coin offered by a smiling man at dusk."`,
    `· "When the dog barks twice, do not look back."`,
    `· "The merchant with three rings will offer you more than gold."`,
    `· "On the day the cypress drops its first leaf, choose the left path."`,
    ``,
    `Return ONLY the prophecy text. No JSON. No quotes. One short paragraph.`,
  ].join("\n");
  const raw = await callClaude(STORYTELLER_SYSTEM, userPrompt, 200);
  return (raw ?? "").trim().replace(/^["']|["']$/g, "") || "The road ahead bends where you do not expect it. Mind the small stones.";
}

/** Generate AI rumors about the hero in the cities where they have
 *  the strongest reputation. Returns a map of city → 1-2 sentence
 *  rumor. Empty cities get no entry. */
export async function generateCityRumors(hero: Hero): Promise<Record<string, string>> {
  const cities = Object.entries(hero.reputation.cities)
    .filter(([, score]) => Math.abs(score) >= 5)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 5);
  if (cities.length === 0) return {};
  const userPrompt = [
    `For each city below, write a single 1-2 sentence rumor that circulates about this hero. Positive reputation → admiring rumors. Negative → suspicious or hostile rumors. Use specific Greek details (taverns, agoras, temples, ports). Speak in townspeople's voice.`,
    heroBrief(hero),
    `Recent deeds: ${hero.journal.slice(-2).join(" | ").slice(0, 400)}`,
    ``,
    `Cities and reputation scores:`,
    cities.map(([city, score]) => `· ${city} (${score > 0 ? "+" : ""}${score})`).join("\n"),
    ``,
    `Return JSON object mapping city name → rumor string:`,
    `{ "Athens": "...", "Sparta": "...", ... }`,
  ].join("\n");
  const raw = await callClaude(STORYTELLER_SYSTEM, userPrompt, 600);
  const parsed = parseJSON<Record<string, string>>(raw);
  if (parsed && typeof parsed === "object") return parsed;
  return {};
}

export async function generateBackstory(name: string, className: string, archetype: string, traits: string[]): Promise<string> {
  const userPrompt = [
    `Write a 2-paragraph (150-220 words total) origin story for a new Greek mythology RPG hero.`,
    `Name: ${name}`,
    `Class: ${className}`,
    `Archetype the player chose: ${archetype}`,
    `Two permanent traits assigned at birth: 1) ${traits[0]}  2) ${traits[1]}`,
    `Write in third person past tense. Set the story in ancient Greece, mention a real place (Athens, Sparta, Crete, Corinth, Delphi, etc.). Mention parents only if natural. Plant one small mystery that the hero doesn't fully understand. End on the day they leave home.`,
    `Return ONLY the backstory text — no JSON, no preamble.`,
  ].join("\n");
  const raw = await callClaude(STORYTELLER_SYSTEM, userPrompt, 600);
  return raw ?? defaultBackstory(name, className, archetype);
}

function defaultBackstory(name: string, className: string, archetype: string): string {
  return `${name} was born in a small village on the road to ${["Athens", "Sparta", "Corinth", "Thebes"][Math.floor(Math.random() * 4)]}, the kind of place where the loudest sound in the morning is the bell on the lead goat. They were raised by their mother and an aunt who saw too much and said too little. From childhood, ${name} had an unusual quietness, a way of listening that made the village elders pause when they spoke nearby.\n\nThe day ${name} left, they took the road south and did not look back. The road bent, the village fell out of sight, and the world began. They carry with them the only thing that has ever truly belonged to them: a small wooden charm their aunt pressed into their palm as they left, with the single instruction, "When you don't know what to do, hold it." So far, they have not yet had to.`;
}
