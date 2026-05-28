// Olympus Party Mode AI — generates characters and scenes for the 10-minute
// local multiplayer mode. Completely separate from the solo adventure engine.
// All calls target the same API key as solo Olympus.

const MODEL = "claude-haiku-4-5-20251001";
const ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function getApiKey(): string | null {
  try {
    const k = localStorage.getItem("dd_anthropic_api_key");
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  try {
    const k = localStorage.getItem("dd_olympus_api_key");
    if (k && k.startsWith("sk-")) return k;
  } catch {}
  const env = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY;
  if (env && typeof env === "string" && env.startsWith("sk-")) return env;
  return null;
}

async function callAI(prompt: string, maxTokens = 900): Promise<string | null> {
  const key = getApiKey();
  if (!key) return null;
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
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(28_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

function extractJSON(text: string): unknown {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface PartyCast {
  name: string;
  title: string;
  symbol: string;
  color: string;
  personality: string;
  power: string;
}

export interface PartyScene {
  body: string;
  situation: string;
  activeCharacterIndex: number;
  choices: string[];
  atmosphere: "calm" | "tense" | "dramatic" | "mysterious" | "divine";
  sceneNumber: number;
}

export interface PartySummary {
  body: string;
  outcome: "victory" | "defeat" | "twist";
  characterMoments: { name: string; moment: string }[];
}

export interface PartyStart {
  title: string;
  hook: string;
  characters: PartyCast[];
  scene: PartyScene;
}

// ────────────────────────────────────────────────────────────────────────────
// Fallbacks
// ────────────────────────────────────────────────────────────────────────────

const FALLBACK_CAST: PartyCast[] = [
  { name: "Odysseus",    title: "The Schemer",     symbol: "🎭", color: "#F97316", personality: "Cunning and silver-tongued. Every trap is a puzzle he's already half-solved.", power: "Once this game, claim you prepared for this exact situation." },
  { name: "Achilles",   title: "The Champion",    symbol: "⚔️", color: "#EF4444", personality: "Unstoppable in battle, reckless with words. Glory is his compass.", power: "Once this game, your bold action cannot fail outright." },
  { name: "Cassandra",  title: "The Prophetess",  symbol: "🔮", color: "#A855F7", personality: "Sees the truth no one will believe. Sardonic, brilliant, always right.", power: "Once this game, reveal one secret the story hasn't said yet." },
  { name: "Hermes",     title: "The Trickster",   symbol: "⚡", color: "#EAB308", personality: "Quick, clever, immune to solemn moments. Finds the side door in every wall.", power: "Once this game, arrive or escape faster than should be possible." },
  { name: "Persephone", title: "The Queen",       symbol: "🌸", color: "#EC4899", personality: "Diplomatic surface, iron core. Speaks to both the living and the dead.", power: "Once this game, negotiate a temporary truce with an enemy." },
  { name: "Hephaestus", title: "The Maker",       symbol: "🔨", color: "#6B7280", personality: "Gruff, inventive, underestimated. Turns broken things — and people — into weapons.", power: "Once this game, improvise a tool or device from whatever is nearby." },
];

const FALLBACK_SCENES: PartyScene[] = [
  {
    body: "The Oracle of Delphi has spoken: a Titan stirs beneath Mount Etna, and Greece has three days before its chains break. The only thing that can reforge those chains is the Flame of Prometheus — stolen a century ago and hidden in three pieces across the world. You have gathered in the courtyard of the Oracle, torch-smoke curling around your feet, the weight of civilization on your shoulders.",
    situation: "The Oracle's priest hands you a shattered map. Where do you begin?",
    activeCharacterIndex: 0,
    choices: ['"The nearest fragment is in Corinth. I know a shortcut."', '"Someone here knows more than they\'re saying. I can see it."', '"We should split up — cover more ground, move faster."'],
    atmosphere: "tense",
    sceneNumber: 1,
  },
  {
    body: "You\'ve reached the ruins of Corinth. The first fragment of the Flame glows behind an iron gate guarded by a Cyclops who appears to be napping — or pretending to. The ground around the gate is littered with the armour of heroes who came before you.",
    situation: "The Cyclops cracks one enormous eye open. 'I smell Greeks.'",
    activeCharacterIndex: 1,
    choices: ['"Ho, great one! We bring you a gift — far better than these bones."', '"I\'ll keep his attention. The rest of you get to the gate."', '"Wait. I\'ve read about this Cyclops. There\'s something he fears."'],
    atmosphere: "dramatic",
    sceneNumber: 2,
  },
  {
    body: "Against all odds, the first fragment is in your hands. It pulses with cold blue fire. But word has spread fast — a shadow fleet flying black sails is already three hours behind you, sent by someone who wants the Titan free. The second fragment is on the island of Lemnos, across open sea.",
    situation: "The only boat in the harbour belongs to a one-eyed pirate who claims to owe somebody here a very large debt.",
    activeCharacterIndex: 2,
    choices: ['"I knew this day would come. He owes ME."', '"Name your price, captain. We\'re running out of time."', '"We don\'t need his permission. We need his boat."'],
    atmosphere: "tense",
    sceneNumber: 3,
  },
];

function fallbackStart(playerCount: number): PartyStart {
  const characters = FALLBACK_CAST.slice(0, playerCount);
  return {
    title: "The Titan's Chains",
    hook: "Three days. Three fragments. One Titan who must never walk free.",
    characters,
    scene: { ...FALLBACK_SCENES[0] },
  };
}

function fallbackAdvance(sceneNumber: number, activeCharacterIndex: number): PartyScene {
  const fb = FALLBACK_SCENES[Math.min(sceneNumber - 1, FALLBACK_SCENES.length - 1)];
  return { ...fb, sceneNumber, activeCharacterIndex };
}

function fallbackFinale(characters: PartyCast[]): PartySummary {
  return {
    body: `With the last fragment secured, the heroes raced back to Etna as dawn broke over the Aegean. ${characters[0].name} forged the three pieces together with steady hands. The Flame blazed white-hot, and the Titan's chains fused back into unbreakable myth. Greece would not know how close the end had come — and that was exactly how the heroes wanted it. Their names were carved into the cliff above the Oracle that very night.`,
    outcome: "victory",
    characterMoments: characters.map((c, i) => ({
      name: c.name,
      moment: i === 0 ? "Led the way when others hesitated." : i === 1 ? "Stood between the darkness and the team." : "Said exactly what needed to be said.",
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// AI calls
// ────────────────────────────────────────────────────────────────────────────

export async function startPartyAdventure(playerCount: number): Promise<PartyStart> {
  const prompt = `You are the game master of a 10-minute Greek mythology party game for ${playerCount} players.

Generate ${playerCount} distinct characters drawn from Greek mythology (heroes, gods, demigods, prophets).
Then write an exciting opening scene.

Rules:
- Scenes are SHORT — 80 to 110 words maximum. Players pass one device around.
- Choices are SPOKEN DIALOGUE LINES in quotation marks (e.g., "I've faced worse. Watch me.")
- Characters must feel VERY different from each other so they're fun to roleplay.
- Give each character a flavor "power" — just a fun roleplay permission, no mechanics.
- The adventure should feel epic but finish in 7 scenes.

Return ONLY valid JSON, no markdown, exactly this shape:
{
  "title": "The [Something] of [Place or Threat]",
  "hook": "One thrilling sentence — the danger in 20 words.",
  "characters": [
    {
      "name": "Name",
      "title": "The Epithet",
      "symbol": "single emoji",
      "color": "#hex",
      "personality": "2 sentences. Who are they, how do they talk?",
      "power": "Once this game, [player can do something specific and fun]."
    }
  ],
  "scene": {
    "body": "Opening narrative prose — 80 to 110 words. Vivid, immediate, dramatic.",
    "situation": "One sharp sentence: the exact choice the active character faces RIGHT NOW.",
    "activeCharacterIndex": 0,
    "choices": ["\"Dialogue line 1.\"", "\"Dialogue line 2.\"", "\"Dialogue line 3.\""],
    "atmosphere": "tense"
  }
}`;

  const raw = await callAI(prompt, 1100);
  if (!raw) return fallbackStart(playerCount);

  try {
    const parsed = extractJSON(raw) as PartyStart | null;
    if (
      parsed &&
      Array.isArray(parsed.characters) &&
      parsed.characters.length >= playerCount &&
      parsed.scene?.choices?.length >= 2
    ) {
      return {
        ...parsed,
        characters: parsed.characters.slice(0, playerCount),
        scene: { ...parsed.scene, sceneNumber: 1 },
      };
    }
  } catch {}

  return fallbackStart(playerCount);
}

export async function advancePartyAdventure(
  characters: PartyCast[],
  history: { character: PartyCast; choice: string }[],
  sceneNumber: number,
  totalScenes: number,
): Promise<PartyScene> {
  const recap = history
    .map((h, i) => `Scene ${i + 1}: ${h.character.name} said ${h.choice}`)
    .join("\n");

  const isClimax = sceneNumber === totalScenes;
  const cast = characters.map((c, i) => `Player ${i + 1}: ${c.name} the ${c.title} — ${c.personality}`).join("\n");

  // Don't repeat the same character twice in a row
  const lastActiveIdx = history.length > 0
    ? characters.findIndex(c => c.name === history[history.length - 1].character.name)
    : -1;

  const prompt = `You are the game master of a 10-minute Greek mythology party game.

Party members:
${cast}

Story so far (scene ${sceneNumber - 1} of ${totalScenes} total):
${recap || "No choices made yet — this is the first continuation."}

Write scene ${sceneNumber} of ${totalScenes}.${isClimax ? " THIS IS THE CLIMACTIC FINAL SCENE — raise the stakes to maximum." : ""}
Scene must be 80-110 words. Keep the drama high and the pace fast.
Choices are SPOKEN DIALOGUE LINES in quotation marks.
${lastActiveIdx >= 0 ? `Do NOT give Player ${lastActiveIdx + 1} (${characters[lastActiveIdx].name}) the active role this scene if possible — rotate to someone else.` : ""}

Return ONLY valid JSON, no markdown:
{
  "body": "Scene narrative — 80 to 110 words.",
  "situation": "One sharp sentence: the immediate choice.",
  "activeCharacterIndex": ${lastActiveIdx >= 0 ? "(a different number than " + lastActiveIdx + ")" : 0},
  "choices": ["\"Dialogue line 1.\"", "\"Dialogue line 2.\"", "\"Dialogue line 3.\""],
  "atmosphere": "tense|dramatic|mysterious|divine|calm"
}`;

  const raw = await callAI(prompt, 700);
  if (!raw) return fallbackAdvance(sceneNumber, (lastActiveIdx + 1) % characters.length);

  try {
    const parsed = extractJSON(raw) as PartyScene | null;
    if (parsed && parsed.body && Array.isArray(parsed.choices) && parsed.choices.length >= 2) {
      return {
        ...parsed,
        activeCharacterIndex: Math.min(
          Math.max(0, Number(parsed.activeCharacterIndex) || 0),
          characters.length - 1,
        ),
        sceneNumber,
      };
    }
  } catch {}

  return fallbackAdvance(sceneNumber, (lastActiveIdx + 1) % characters.length);
}

export async function finalePartyAdventure(
  characters: PartyCast[],
  history: { character: PartyCast; choice: string }[],
): Promise<PartySummary> {
  const recap = history
    .map((h, i) => `Scene ${i + 1}: ${h.character.name} said ${h.choice}`)
    .join("\n");

  const cast = characters.map(c => `${c.name} (${c.title})`).join(", ");

  const prompt = `You are the game master closing out a 10-minute Greek mythology party game.

Heroes: ${cast}
What happened:
${recap}

Write a SHORT dramatic epilogue (100-140 words) that:
- Resolves the story with a bang
- Gives EVERY character at least one specific heroic moment
- Has a clear outcome (victory, twist, or hard-won survival)

Return ONLY valid JSON:
{
  "body": "Epilogue prose — 100 to 140 words.",
  "outcome": "victory",
  "characterMoments": [
    {"name": "CharacterName", "moment": "One sentence: what they did that mattered."}
  ]
}`;

  const raw = await callAI(prompt, 600);
  if (!raw) return fallbackFinale(characters);

  try {
    const parsed = extractJSON(raw) as PartySummary | null;
    if (parsed && parsed.body && Array.isArray(parsed.characterMoments)) {
      return parsed;
    }
  } catch {}

  return fallbackFinale(characters);
}

export { getApiKey as partyHasApiKey };
