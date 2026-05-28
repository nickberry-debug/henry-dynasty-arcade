import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Pause, Play, MessageSquare, X } from "lucide-react";
import type {
  AbilityVfxType, AttackAnimType, BattlePhase, BattleLogEntry, BattleResult, BodyPlan,
  BuildRecipe, CharacterDef, MapConfig, SurfaceType, UnitFrameData, VFXEvent,
} from "./types";
import { PRESET_CHARACTERS, PRESET_CATEGORIES, MAPS } from "./presets";
import BattleCanvas from "./BattleCanvas";
import type { TeamSlot, PlaybackData } from "./BattleCanvas";
import { getAnthropicKey } from "../arcade/keys";

const SPEED_OPTIONS = [0.1, 0.15, 0.25, 0.5, 1] as const;

const COMMENTARY = [
  "OH WOW! These fighters are absolutely going for it!",
  "The crowd goes WILD! This is unbelievable!",
  "I have NEVER seen anything like this in my life!",
  "Strategy? What strategy? This is pure chaos and I LOVE it!",
  "Both sides are giving everything they have!",
  "The battlefield is absolutely ELECTRIC right now!",
  "Someone call a doctor! Wait, no — they're all fine, this is goofy!",
  "LOOK AT THAT! Did you see THAT?!",
  "This is the greatest battle in the history of battles!",
  "Unbelievable scenes! The fans are going absolutely berserk!",
  "I've been commentating for 20 years and THIS is something special!",
  "You simply cannot write this! It's incredible!",
];

// ── Types ─────────────────────────────────────────────────────────────────────

type Slot = { def: CharacterDef | null; count: number };

function teamLabel(slots: Slot[]): string {
  const names = slots.filter(s => s.def).map(s => s.def!.name);
  if (names.length === 0) return "Team";
  if (names.length === 1) return names[0];
  return names.slice(0, 2).join(" + ") + (names.length > 2 ? "…" : "");
}
function teamEmojis(slots: Slot[]): string {
  return slots.filter(s => s.def).map(s => s.def!.emoji).join(" ");
}
function teamTotal(slots: Slot[]): number {
  return slots.reduce((s, sl) => s + sl.count, 0);
}

const BODY_PLANS: BodyPlan[] = ["humanoid", "quadruped", "large_biped", "blob", "food_object", "mechanical"];
const SURFACES: SurfaceType[] = ["metal", "cloth", "fur", "scale", "stone", "organic", "plastic", "glow"];
const ATTACK_ANIMS: AttackAnimType[] = ["slash", "thrust", "slam", "spin", "ranged", "beam", "aoe_burst", "bite", "charge_ram", "ground_pound", "peck"];
const ABILITY_VFX: AbilityVfxType[] = ["lightning", "shockwave", "laser", "fire", "frost", "nature", "burst"];

const FEATURE_LIBRARY = [
  "crested_helmet", "full_helmet", "helmet_wings", "crown", "pointed_hat", "cap", "visor", "glasses",
  "beard", "beard_long", "mane", "bun_top", "big_eyes", "horns_pair", "horn_single", "pointy_ears",
  "wings_pair", "cape", "robe", "armor_plates", "armor_heavy", "shield_l", "sword_r", "spear_r",
  "hammer_r", "staff_r", "bow_l", "quiver_back", "gun_r", "lightning_bolt_r", "club_r", "mace_r",
  "baseball_bat_r", "pickaxe_r", "teeth_row", "fangs", "tail_heavy", "tail_generic", "spikes_back",
  "fin_top", "tail_fluke", "big_mouth", "stinger", "claws_f", "shell_back", "wheels", "boot_jets",
  "disc_body", "slots_top", "cord_back", "war_paint", "suit_tie", "tie_red",
];

function clampStat(value: unknown, fallback: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(10, Math.min(1000, Math.round(n)));
}

function pickAllowed<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

function cleanHex(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function fallbackFeatures(attackType: CharacterDef["attackType"]): string[] {
  if (attackType === "ranged") return ["bow_l", "quiver_back"];
  if (attackType === "indirect") return ["staff_r", "robe"];
  return ["sword_r", "shield_l"];
}

function normalizeRecipe(raw: unknown, color: string, attackType: CharacterDef["attackType"]): BuildRecipe {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<BuildRecipe>;
  const secondary = cleanHex(r.palette?.[1], "#26324a");
  const accent = cleanHex(r.palette?.[2], "#ffd166");
  const features = Array.isArray(r.features)
    ? r.features.filter((f): f is string => typeof f === "string" && FEATURE_LIBRARY.includes(f)).slice(0, 6)
    : fallbackFeatures(attackType);
  return {
    bodyPlan: pickAllowed(r.bodyPlan, BODY_PLANS, "humanoid"),
    headScale: Math.max(0.65, Math.min(1.55, Number(r.headScale) || 1)),
    torsoScale: Math.max(0.65, Math.min(1.55, Number(r.torsoScale) || 1)),
    limbScale: Math.max(0.65, Math.min(1.35, Number(r.limbScale) || 1)),
    posture: pickAllowed(r.posture, ["upright", "hunched", "towering"] as const, "upright"),
    palette: [color, secondary, accent],
    surface: pickAllowed(r.surface, SURFACES, "cloth"),
    features: features.length ? features : fallbackFeatures(attackType),
    attackAnim: pickAllowed(r.attackAnim, ATTACK_ANIMS, attackType === "ranged" ? "ranged" : attackType === "indirect" ? "aoe_burst" : "slash"),
  };
}

// ── AI character generator ────────────────────────────────────────────────────

async function generateCustomCharacter(name: string): Promise<CharacterDef | null> {
  const key = getAnthropicKey();
  if (!key) return null;
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        system: `You generate battle stats for a silly, kid-friendly battle simulator (like TABS).
Return ONLY a JSON object, no markdown, no explanation. The JSON must have exactly these fields:
{"emoji":"single emoji","size":"tiny|small|medium|large|huge|colossal","attackType":"melee|ranged|indirect","stats":{"hp":10-1000,"power":10-1000,"speed":10-1000,"defense":10-1000,"special":10-1000},"color":"#hexcolor","cry":"short goofy or epic battle cry under 12 words","specialName":"2-4 word special ability name","specialVfx":"lightning|shockwave|laser|fire|frost|nature|burst","category":"Custom","recipe":{"bodyPlan":"humanoid|quadruped|large_biped|blob|food_object|mechanical","headScale":0.65-1.55,"torsoScale":0.65-1.55,"limbScale":0.65-1.35,"posture":"upright|hunched|towering","palette":["#primary","#secondary","#accent"],"surface":"metal|cloth|fur|scale|stone|organic|plastic|glow","features":["2-6 feature names"],"attackAnim":"slash|thrust|slam|spin|ranged|beam|aoe_burst|bite|charge_ram|ground_pound|peck"}}
Use only these feature names: ${FEATURE_LIBRARY.join(", ")}.
Make it funny and appropriate for kids ages 5-13. Match the stats, bodyPlan, features, surface, specialVfx, and attackAnim to the prompt so the generated fighter gets a unique procedural 3D model and ability effect. Use the full 10-1000 stat scale.`,
        messages: [{ role: "user", content: `Generate battle stats for: "${name}"` }],
      }),
    });
    const data = await resp.json();
    const text = data.content?.[0]?.text ?? "";
    const cleaned = text.replace(/```json?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const attackType = pickAllowed(parsed.attackType, ["melee", "ranged", "indirect"] as const, "melee");
    const color = cleanHex(parsed.color, "#66ccff");
    return {
      id: `custom_${Date.now()}`,
      name,
      emoji: typeof parsed.emoji === "string" ? parsed.emoji.slice(0, 4) : "✨",
      category: "Custom",
      size: pickAllowed(parsed.size, ["tiny", "small", "medium", "large", "huge", "colossal"] as const, "medium"),
      attackType,
      stats: {
        hp: clampStat(parsed.stats?.hp, 600),
        power: clampStat(parsed.stats?.power, 650),
        speed: clampStat(parsed.stats?.speed, 600),
        defense: clampStat(parsed.stats?.defense, 550),
        special: clampStat(parsed.stats?.special, 700),
      },
      color,
      cry: typeof parsed.cry === "string" ? parsed.cry.slice(0, 80) : "Let's battle!",
      specialName: typeof parsed.specialName === "string" ? parsed.specialName.slice(0, 40) : "Custom Surge",
      specialVfx: pickAllowed(parsed.specialVfx, ABILITY_VFX, attackType === "ranged" ? "laser" : attackType === "indirect" ? "burst" : "shockwave"),
      recipe: normalizeRecipe(parsed.recipe, color, attackType),
    };
  } catch {
    return null;
  }
}

function speak(text: string, rate = 0.88, pitch = 1.05) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate;
  u.pitch = pitch;
  speechSynthesis.speak(u);
}

// ── Multi-slot Character Picker ───────────────────────────────────────────────

interface MultiCharPickerProps {
  team: "A" | "B";
  slots: Slot[];
  onChange: (slots: Slot[]) => void;
}

function MultiCharPicker({ team, slots, onChange }: MultiCharPickerProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [generating, setGenerating] = useState(false);

  const accent = team === "A" ? "#5599FF" : "#FF5544";
  const label = team === "A" ? "TEAM A" : "TEAM B";
  const safeIdx = Math.min(activeIdx, slots.length - 1);
  const activeSlot = slots[safeIdx] ?? { def: null, count: 1 };
  const total = teamTotal(slots);

  function setDef(idx: number, def: CharacterDef) {
    onChange(slots.map((sl, i) => i === idx ? { ...sl, def } : sl));
  }
  function setCount(idx: number, raw: number) {
    const othersTotal = slots.reduce((s, sl, i) => i !== idx ? s + sl.count : s, 0);
    const count = Math.max(1, Math.min(25 - othersTotal, raw));
    onChange(slots.map((sl, i) => i === idx ? { ...sl, count } : sl));
  }
  function addSlot() {
    if (slots.length >= 3 || total >= 24) return;
    const newCount = Math.min(5, 25 - total);
    const next = [...slots, { def: null, count: newCount }];
    onChange(next);
    setActiveIdx(next.length - 1);
  }
  function removeSlot(idx: number) {
    if (slots.length <= 1) return;
    const next = slots.filter((_, i) => i !== idx);
    onChange(next);
    setActiveIdx(Math.min(safeIdx, next.length - 1));
  }

  const filtered = PRESET_CHARACTERS.filter(c => {
    if (catFilter !== "all" && c.category !== catFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleGenerate() {
    if (!customName.trim()) return;
    setGenerating(true);
    const def = await generateCustomCharacter(customName.trim());
    setGenerating(false);
    if (def) { setDef(safeIdx, def); setCustomName(""); }
    else alert("AI unavailable — add an Anthropic key in Settings to generate custom characters.");
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
          <span className="font-display text-xs tracking-widest" style={{ color: accent }}>{label}</span>
          <span className="text-[8px]" style={{ color: "#666" }}>{total}/25</span>
        </div>
        {slots.length < 3 && total < 24 && (
          <button onClick={addSlot}
            className="text-[8px] px-1.5 py-0.5 rounded font-display tracking-wide"
            style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}>
            + TYPE
          </button>
        )}
      </div>

      {/* Slot tabs */}
      <div className="flex gap-1">
        {slots.map((sl, i) => (
          <button key={i} onClick={() => setActiveIdx(i)}
            className="relative flex-1 rounded-lg p-1.5 text-center transition-all"
            style={{
              background: i === safeIdx ? `${accent}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${i === safeIdx ? accent : "rgba(255,255,255,0.08)"}`,
            }}>
            {sl.def ? (
              <>
                <div className="text-lg leading-none">{sl.def.emoji}</div>
                <div className="text-[7px] mt-0.5 leading-tight truncate" style={{ color: "#ccc" }}>{sl.def.name}</div>
                <div className="text-[8px]" style={{ color: accent }}>×{sl.count}</div>
              </>
            ) : (
              <div className="text-[8px] py-2" style={{ color: "#555" }}>Pick…</div>
            )}
            {slots.length > 1 && i === safeIdx && (
              <button onClick={e => { e.stopPropagation(); removeSlot(i); }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] leading-none"
                style={{ background: "#FF4444", color: "white" }}>
                ×
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Count for active slot */}
      {activeSlot.def && (
        <div className="flex items-center gap-1 py-1 px-2 rounded"
          style={{ background: `${accent}10`, border: `1px solid ${accent}25` }}>
          <span className="text-[8px] font-display" style={{ color: accent }}>FIGHTERS</span>
          <div className="flex items-center gap-0.5 ml-auto">
            <button onClick={() => setCount(safeIdx, activeSlot.count - 10)}
              className="w-7 h-5 rounded text-[8px] font-bold" style={{ background: `${accent}20` }}>−10</button>
            <button onClick={() => setCount(safeIdx, activeSlot.count - 1)}
              className="w-5 h-5 rounded text-xs font-bold" style={{ background: `${accent}30` }}>−</button>
            <input type="number" min={1} max={25} value={activeSlot.count}
              onChange={e => setCount(safeIdx, parseInt(e.target.value) || 1)}
              className="w-9 text-center font-display text-xs rounded outline-none"
              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}44` }} />
            <button onClick={() => setCount(safeIdx, activeSlot.count + 1)}
              className="w-5 h-5 rounded text-xs font-bold" style={{ background: `${accent}30` }}>+</button>
            <button onClick={() => setCount(safeIdx, activeSlot.count + 10)}
              className="w-7 h-5 rounded text-[8px] font-bold" style={{ background: `${accent}20` }}>+10</button>
          </div>
        </div>
      )}

      {/* Custom character */}
      <div className="flex gap-1.5">
        <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleGenerate()}
          placeholder="Type any character name…"
          className="flex-1 rounded px-2 py-1.5 text-xs outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }} />
        <button onClick={handleGenerate} disabled={generating || !customName.trim()}
          className="px-2 py-1.5 rounded text-xs font-display"
          style={{ background: generating ? "rgba(255,255,255,0.1)" : accent, color: team === "A" ? "#0a1a40" : "#3a0000", opacity: generating || !customName.trim() ? 0.6 : 1 }}>
          {generating ? "⏳" : "AI ✨"}
        </button>
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search presets…"
        className="rounded px-2 py-1.5 text-xs outline-none"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "white" }} />

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setCatFilter("all")}
          className="text-[7px] px-1.5 py-0.5 rounded-full font-display tracking-wide"
          style={{ background: catFilter === "all" ? accent : "rgba(255,255,255,0.07)", color: catFilter === "all" ? "#000" : "#9aa6bf" }}>
          ALL
        </button>
        {PRESET_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className="text-[7px] px-1.5 py-0.5 rounded-full font-display tracking-wide"
            style={{ background: catFilter === cat ? accent : "rgba(255,255,255,0.07)", color: catFilter === cat ? "#000" : "#9aa6bf" }}>
            {cat.split(" ").slice(1).join(" ").toUpperCase().slice(0, 9)}
          </button>
        ))}
      </div>

      {/* Character grid */}
      <div className="grid grid-cols-3 gap-1 overflow-y-auto" style={{ maxHeight: 220 }}>
        {filtered.map(char => (
          <button key={char.id} onClick={() => setDef(safeIdx, char)}
            className="rounded p-1.5 text-center transition-all"
            style={{
              background: activeSlot.def?.id === char.id ? `${accent}33` : "rgba(255,255,255,0.05)",
              border: `1px solid ${activeSlot.def?.id === char.id ? accent : "rgba(255,255,255,0.07)"}`,
            }}>
            <div className="text-xl leading-none">{char.emoji}</div>
            <div className="text-[8px] mt-0.5 leading-tight" style={{ color: "#bbb" }}>{char.name}</div>
            <div className="text-[7px]" style={{ color: "#888" }}>{char.size}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Map Selector ──────────────────────────────────────────────────────────────

function MapSelector({ maps, selected, onSelect }: { maps: MapConfig[]; selected: MapConfig; onSelect: (m: MapConfig) => void }) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {maps.map(m => (
        <button key={m.id} onClick={() => onSelect(m)}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
          style={{
            background: selected.id === m.id ? `${m.accentColor}33` : "rgba(255,255,255,0.05)",
            border: `1px solid ${selected.id === m.id ? m.accentColor : "rgba(255,255,255,0.10)"}`,
            minWidth: 90,
          }}>
          <span className="text-2xl">{m.emoji}</span>
          <span className="font-display text-xs tracking-wide">{m.name}</span>
          <span className="text-[8px] text-center" style={{ color: "#9aa6bf" }}>{m.terrainQuirk}</span>
        </button>
      ))}
    </div>
  );
}

// ── Stat Bar ──────────────────────────────────────────────────────────────────

function StatBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[9px] w-14 text-right" style={{ color: "#9aa6bf" }}>{label}</div>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, value / 10)}%`, background: accent }} />
      </div>
      <div className="text-[9px] w-8" style={{ color: accent }}>{value}</div>
    </div>
  );
}

// ── Main BattleForge Component ────────────────────────────────────────────────

export default function BattleForge() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<BattlePhase>("hub");
  const [teamA, setTeamA] = useState<Slot[]>([{ def: null, count: 15 }]);
  const [teamB, setTeamB] = useState<Slot[]>([{ def: null, count: 15 }]);
  const [selectedMap, setSelectedMap] = useState<MapConfig>(MAPS[0]);
  const [speed, setSpeed] = useState<number>(0.15);
  const [paused, setPaused] = useState(false);
  const [lastBattle, setLastBattle] = useState<{ teamA: Slot[]; teamB: Slot[]; map: MapConfig; speed: number } | null>(null);
  const [replayFrames, setReplayFrames] = useState<UnitFrameData[][] | null>(null);
  const [replayInterval, setReplayInterval] = useState(8);
  const [replayTotalTicks, setReplayTotalTicks] = useState(0);
  const [replayTick, setReplayTick] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const replayLastTimeRef = useRef(0);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [commentary, setCommentary] = useState<string | null>(null);
  const [aHp, setAHp] = useState(0);
  const [aMax, setAMax] = useState(1);
  const [bHp, setBHp] = useState(0);
  const [bMax, setBMax] = useState(1);
  const [winProb, setWinProb] = useState(0.5);
  const [introStep, setIntroStep] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const commentaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vfxQueue = useMemo<VFXEvent[]>(() => [], []);

  const canStart = teamA.length > 0 && teamB.length > 0 &&
    teamA.every(s => s.def !== null) && teamB.every(s => s.def !== null);

  const aTotal = teamTotal(teamA);
  const bTotal = teamTotal(teamB);

  // Convert slots for BattleCanvas (filter out null defs, just in case)
  const teamASlots: TeamSlot[] = teamA
    .filter(s => s.def !== null)
    .map(s => ({ def: s.def!, count: s.count }));
  const teamBSlots: TeamSlot[] = teamB
    .filter(s => s.def !== null)
    .map(s => ({ def: s.def!, count: s.count }));

  const handleLogEntry = useCallback((entry: BattleLogEntry) => {
    setLog(prev => [entry, ...prev].slice(0, 80));
  }, []);

  const handleStats = useCallback((ah: number, am: number, bh: number, bm: number) => {
    setAHp(ah); setAMax(am); setBHp(bh); setBMax(bm);
    const total = ah + bh;
    setWinProb(total === 0 ? 0.5 : ah / total);
  }, []);

  const handleBattleEnd = useCallback((result: BattleResult) => {
    if (commentaryTimer.current) clearTimeout(commentaryTimer.current);
    setBattleResult(result);
    speak(result.winner === "draw"
      ? "It's a draw! An incredible battle!"
      : `${result.winner === "A" ? result.teamAName : result.teamBName}... WINS!`, 0.8, 1.2);
    setTimeout(() => setPhase("results"), 1500);
  }, []);

  const handleRecordingReady = useCallback((frames: UnitFrameData[][], interval: number, totalTicks: number) => {
    setReplayFrames(frames);
    setReplayInterval(interval);
    setReplayTotalTicks(totalTicks);
  }, []);

  // Replay auto-play timer
  useEffect(() => {
    if (phase !== "replay" || !replayPlaying) return;
    replayLastTimeRef.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - replayLastTimeRef.current;
      replayLastTimeRef.current = now;
      const ticksToAdvance = (dt / 1000) * 60 * replaySpeed;
      setReplayTick(t => {
        const next = t + ticksToAdvance;
        if (next >= replayTotalTicks) { setReplayPlaying(false); return replayTotalTicks; }
        return next;
      });
    }, 16);
    return () => clearInterval(id);
  }, [phase, replayPlaying, replaySpeed, replayTotalTicks]);

  // Commentary loop
  useEffect(() => {
    if (phase !== "battle" || paused) return;
    function scheduleCommentary() {
      const delay = 12000 + Math.random() * 15000;
      commentaryTimer.current = setTimeout(() => {
        const msg = COMMENTARY[Math.floor(Math.random() * COMMENTARY.length)];
        setCommentary(msg);
        speak(msg, 1.0, 1.15);
        setTimeout(() => setCommentary(null), 5000);
        scheduleCommentary();
      }, delay);
    }
    scheduleCommentary();
    return () => { if (commentaryTimer.current) clearTimeout(commentaryTimer.current); };
  }, [phase, paused]);

  // Forging → intro
  useEffect(() => {
    if (phase !== "forging") return;
    const t = setTimeout(() => setPhase("intro"), 1600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Intro sequence
  useEffect(() => {
    if (phase !== "intro") return;
    setIntroStep(0);
    const firstACry = teamA[0]?.def?.cry ?? "";
    const firstBCry = teamB[0]?.def?.cry ?? "";
    const steps: { delay: number; fn: () => void }[] = [
      { delay: 400,  fn: () => { setIntroStep(0); speak(firstACry, 0.82, 1.1); } },
      { delay: 3500, fn: () => { setIntroStep(1); speak(firstBCry, 0.82, 0.85); } },
      { delay: 7000, fn: () => setIntroStep(2) },
      { delay: 8200, fn: () => { setIntroStep(3); setCountdownNum(3); speak("3", 0.7, 1.0); } },
      { delay: 9200, fn: () => { setCountdownNum(2); speak("2", 0.7, 1.0); } },
      { delay: 10200,fn: () => { setCountdownNum(1); speak("1", 0.7, 1.0); } },
      { delay: 11200,fn: () => { speak("FIGHT!", 0.75, 1.3); } },
      { delay: 12000,fn: () => setPhase("battle") },
    ];
    const timers = steps.map(s => setTimeout(s.fn, s.delay));
    return () => timers.forEach(t => clearTimeout(t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── HUB ────────────────────────────────────────────────────────────────────
  if (phase === "hub") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "radial-gradient(ellipse at 50% 30%, #1a0505 0%, #050208 80%)", paddingTop: "max(env(safe-area-inset-top,0px),16px)", paddingBottom: "max(env(safe-area-inset-bottom,0px),24px)" }}>
        <button onClick={() => navigate("/play")}
          className="absolute top-4 left-4 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center px-6">
          <div className="text-[10px] tracking-[0.4em] font-display mb-2" style={{ color: "#9aa6bf" }}>BERRY KID'S ARCADE</div>
          <div className="font-display text-5xl sm:text-7xl tracking-[0.1em] mb-2" style={{ color: "#FF4444", textShadow: "0 0 40px rgba(255,68,68,0.5)" }}>BATTLE</div>
          <div className="font-display text-5xl sm:text-7xl tracking-[0.1em]" style={{ color: "#FF8800", textShadow: "0 0 40px rgba(255,136,0,0.5)" }}>FORGE</div>
          <div className="text-sm mt-4 mb-8" style={{ color: "#9aa6bf" }}>
            190+ fighters · 14 arenas · mixed teams · epic battles
          </div>
        </motion.div>

        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="flex flex-col items-center gap-3 px-6 w-full max-w-xs">
          <button onClick={() => setPhase("setup")}
            className="w-full py-5 rounded-2xl font-display text-2xl tracking-[0.15em] pressable"
            style={{ background: "linear-gradient(135deg, #FF4444, #FF8800)", color: "white", boxShadow: "0 8px 40px rgba(255,68,68,0.4)" }}>
            ⚔️ FORGE YOUR BATTLE
          </button>
          <p className="text-xs text-center" style={{ color: "#9aa6bf" }}>
            Mix up to 3 character types per side, choose an arena, unleash chaos!
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-8 flex flex-wrap gap-2 justify-center px-6 max-w-sm">
          {["🐝 Killer Bee + ⚡ Thor vs 🐋 Blue Whale", "💪 Hercules + 🐉 Dragon Knight vs 😈 Dark Overlord", "🤖 Terminator + 🥷 Neo vs 🦁 Kali + ⚔️ Samurai"].map(txt => (
            <div key={txt} className="text-[10px] px-3 py-1.5 rounded-full" style={{ background: "rgba(255,68,68,0.12)", border: "1px solid rgba(255,68,68,0.25)", color: "#FF8888" }}>{txt}</div>
          ))}
        </motion.div>
      </div>
    );
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(180deg, #0a0510 0%, #05020A 100%)", paddingTop: "max(env(safe-area-inset-top,0px),16px)", paddingBottom: "max(env(safe-area-inset-bottom,0px),24px)" }}>
        <header className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setPhase("hub")} className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <ArrowLeft size={18} />
          </button>
          <div className="font-display text-xl tracking-widest" style={{ color: "#FF6644" }}>⚔️ BATTLE SETUP</div>
        </header>

        <div className="flex-1 px-4 overflow-y-auto">
          {/* Map selector */}
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-[0.3em] font-display mb-3" style={{ color: "#9aa6bf" }}>Choose Arena</div>
            <MapSelector maps={MAPS} selected={selectedMap} onSelect={setSelectedMap} />
          </div>

          {/* Character pickers */}
          <div className="flex gap-3">
            <MultiCharPicker team="A" slots={teamA} onChange={setTeamA} />
            <div className="flex items-center text-xl font-display pt-8" style={{ color: "#444" }}>VS</div>
            <MultiCharPicker team="B" slots={teamB} onChange={setTeamB} />
          </div>

          {/* Preview stats */}
          {canStart && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mt-4 rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-[10px] uppercase tracking-[0.3em] mb-3 text-center" style={{ color: "#9aa6bf" }}>Battle Preview</div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { slots: teamA, accent: "#5599FF" },
                  { slots: teamB, accent: "#FF5544" },
                ].map(({ slots, accent }, ti) => (
                  <div key={ti}>
                    {slots.filter(s => s.def).map((sl, i) => (
                      <div key={i} className={i > 0 ? "mt-3 pt-2 border-t border-white/5" : ""}>
                        <div className="text-xs font-display mb-1.5 truncate" style={{ color: accent }}>
                          {sl.count}× {sl.def!.name}
                        </div>
                        <StatBar label="HP"  value={sl.def!.stats.hp}      accent={accent} />
                        <StatBar label="PWR" value={sl.def!.stats.power}   accent={accent} />
                        <StatBar label="SPD" value={sl.def!.stats.speed}   accent={accent} />
                        <StatBar label="DEF" value={sl.def!.stats.defense} accent={accent} />
                        <StatBar label="SPC" value={sl.def!.stats.special} accent={accent} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Start button */}
        <div className="px-4 pt-4">
          <button onClick={() => { if (canStart) { setLastBattle({ teamA, teamB, map: selectedMap, speed }); setPhase("forging"); } }} disabled={!canStart}
            className="w-full py-4 rounded-2xl font-display text-xl tracking-[0.15em] pressable transition-all"
            style={{
              background: canStart ? "linear-gradient(135deg, #FF4444, #FF8800)" : "rgba(255,255,255,0.08)",
              color: canStart ? "white" : "#555",
              boxShadow: canStart ? "0 6px 30px rgba(255,68,68,0.35)" : "none",
            }}>
            {canStart ? `⚔️ BEGIN THE BATTLE — ${aTotal + bTotal} FIGHTERS` : "Pick all character types to begin"}
          </button>
        </div>
      </div>
    );
  }

  // ── FORGING ────────────────────────────────────────────────────────────────
  if (phase === "forging" && canStart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 50% 50%, #0d0208 0%, #050208 100%)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-6 px-6">
          <div className="font-display text-3xl tracking-[0.15em]" style={{ color: "#FF8800", textShadow: "0 0 30px rgba(255,136,0,0.5)" }}>
            ⚔️ FORGING BATTLE…
          </div>
          <div className="flex items-center gap-10">
            <div className="text-center">
              <div className="text-5xl mb-1">{teamEmojis(teamA)}</div>
              <div className="font-display text-xs mt-1" style={{ color: "#5599FF" }}>
                {teamA.filter(s => s.def).map(s => `${s.count}× ${s.def!.name}`).join(" + ")}
              </div>
            </div>
            <div className="font-display text-4xl" style={{ color: "#FF4444", textShadow: "0 0 20px rgba(255,68,68,0.5)" }}>VS</div>
            <div className="text-center">
              <div className="text-5xl mb-1">{teamEmojis(teamB)}</div>
              <div className="font-display text-xs mt-1" style={{ color: "#FF5544" }}>
                {teamB.filter(s => s.def).map(s => `${s.count}× ${s.def!.name}`).join(" + ")}
              </div>
            </div>
          </div>
          <div className="w-64 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
            <motion.div className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #FF4444, #FF8800)" }}
              initial={{ width: "0%" }} animate={{ width: "100%" }}
              transition={{ duration: 1.4, ease: "linear" }} />
          </div>
          <div className="text-xs tracking-widest font-display" style={{ color: "#9aa6bf" }}>
            {selectedMap.emoji} {selectedMap.name.toUpperCase()}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    const introTeam = introStep <= 1 ? (introStep === 0 ? teamA : teamB) : null;
    const introAccent = introStep === 0 ? "#5599FF" : "#FF5544";
    const introLabel = introStep === 0 ? "TEAM A" : "TEAM B";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 50% 50%, #1a0010 0%, #050208 100%)" }}>
        <AnimatePresence mode="wait">
          {introStep <= 1 && introTeam && (
            <motion.div key={`team-${introStep}`}
              initial={{ opacity: 0, x: introStep === 0 ? -80 : 80, scale: 0.85 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              className="text-center px-6">
              <div className="text-[10px] tracking-[0.4em] font-display mb-4" style={{ color: introAccent }}>{introLabel}</div>
              <div className="text-7xl mb-3">{teamEmojis(introTeam)}</div>
              <div className="font-display text-3xl tracking-[0.1em] mb-1">
                {introTeam.filter(s => s.def).map(s => `${s.count}× ${s.def!.name}`).join(" + ")}
              </div>
              <div className="text-sm italic mt-3" style={{ color: "#9aa6bf" }}>
                "{introTeam[0]?.def?.cry}"
              </div>
              <div className="mt-4 text-[10px] tracking-[0.3em] font-display" style={{ color: introAccent }}>
                {selectedMap.emoji} {selectedMap.name.toUpperCase()}
              </div>
            </motion.div>
          )}

          {introStep === 2 && (
            <motion.div key="vs"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-center">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl">{teamEmojis(teamA)}</div>
                  <div className="font-display text-sm mt-2" style={{ color: "#5599FF" }}>{teamLabel(teamA)}</div>
                </div>
                <div className="font-display text-6xl" style={{ color: "#FF4444", textShadow: "0 0 30px rgba(255,68,68,0.6)" }}>VS</div>
                <div className="text-center">
                  <div className="text-5xl">{teamEmojis(teamB)}</div>
                  <div className="font-display text-sm mt-2" style={{ color: "#FF5544" }}>{teamLabel(teamB)}</div>
                </div>
              </div>
            </motion.div>
          )}

          {introStep === 3 && (
            <motion.div key={`countdown-${countdownNum}`}
              initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="font-display text-9xl"
              style={{ color: "#FFD700", textShadow: "0 0 60px rgba(255,215,0,0.7)" }}>
              {countdownNum}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── BATTLE ─────────────────────────────────────────────────────────────────
  if (phase === "battle" && canStart) {
    const aCount = Math.round((aHp / (aMax || 1)) * aTotal);
    const bCount = Math.round((bHp / (bMax || 1)) * bTotal);
    const probPct = Math.round(winProb * 100);

    return (
      <div className="min-h-screen flex flex-col"
        style={{ background: "#050208", paddingTop: "max(env(safe-area-inset-top,0px),0px)", paddingBottom: "max(env(safe-area-inset-bottom,0px),0px)" }}>

        {/* Team HP bars */}
        <div className="flex gap-2 items-center px-3 py-2" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="flex justify-between text-[9px] font-display" style={{ color: "#5599FF" }}>
              <span>{teamEmojis(teamA)} {teamLabel(teamA)}</span>
              <span>{aCount} alive</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(aHp / (aMax || 1)) * 100}%`, background: "#5599FF" }} />
            </div>
          </div>
          <div className="font-display text-xs px-2" style={{ color: "#666" }}>VS</div>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="flex justify-between text-[9px] font-display" style={{ color: "#FF5544" }}>
              <span>{bCount} alive</span>
              <span>{teamLabel(teamB)} {teamEmojis(teamB)}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all duration-300 ml-auto"
                style={{ width: `${(bHp / (bMax || 1)) * 100}%`, background: "#FF5544" }} />
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <BattleCanvas
            teamA={teamASlots}
            teamB={teamBSlots}
            map={selectedMap}
            speed={speed}
            paused={paused}
            onBattleEnd={handleBattleEnd}
            onLogEntry={handleLogEntry}
            onStats={handleStats}
            vfxQueue={vfxQueue}
            onRecordingReady={handleRecordingReady}
          />

          {/* Commentary overlay */}
          <AnimatePresence>
            {commentary && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs text-center max-w-xs"
                style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,215,0,0.3)", color: "#FFD700" }}>
                📢 {commentary}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Battle log panel */}
          <AnimatePresence>
            {showLog && (
              <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="absolute top-0 right-0 h-full w-56 flex flex-col"
                style={{ background: "rgba(5,2,10,0.92)", borderLeft: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[10px] font-display tracking-widest" style={{ color: "#9aa6bf" }}>BATTLE LOG</span>
                  <button onClick={() => setShowLog(false)}><X size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1">
                  {log.map((entry, i) => (
                    <div key={i} className="text-[10px] leading-relaxed"
                      style={{ color: entry.type === "special" ? "#FFD700" : entry.type === "kill" ? "#FF8888" : "#9aa6bf" }}>
                      {entry.text}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: "rgba(0,0,0,0.7)" }}>
          {/* Pause */}
          <button onClick={() => setPaused(p => !p)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: paused ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${paused ? "#FFD700" : "rgba(255,255,255,0.15)"}` }}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>

          {/* Speed */}
          <div className="flex gap-1">
            {SPEED_OPTIONS.map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className="px-2 h-8 rounded-lg text-xs font-display"
                style={{ background: speed === s ? "#FF4444" : "rgba(255,255,255,0.07)", color: speed === s ? "white" : "#9aa6bf" }}>
                {s}×
              </button>
            ))}
          </div>

          {/* Win probability */}
          <div className="flex-1 mx-2">
            <div className="flex justify-between text-[8px] mb-0.5" style={{ color: "#9aa6bf" }}>
              <span style={{ color: "#5599FF" }}>{probPct}%</span>
              <span className="text-[8px]" style={{ color: "#9aa6bf" }}>Win Prob</span>
              <span style={{ color: "#FF5544" }}>{100 - probPct}%</span>
            </div>
            <div className="h-1.5 rounded-full flex overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full transition-all duration-500" style={{ width: `${probPct}%`, background: "#5599FF" }} />
              <div className="h-full transition-all duration-500" style={{ width: `${100 - probPct}%`, background: "#FF5544" }} />
            </div>
          </div>

          {/* Log toggle */}
          <button onClick={() => setShowLog(s => !s)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: showLog ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${showLog ? "#60A5FA" : "rgba(255,255,255,0.15)"}` }}>
            <MessageSquare size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === "results" && battleResult) {
    const { winner, teamAName, teamBName, teamASurvivors, teamBSurvivors, mvp, durationMs, totalKills } = battleResult;
    const winnerName = winner === "A" ? teamAName : winner === "B" ? teamBName : null;
    const winnerEmoji = winner === "A" ? (teamA[0]?.def?.emoji ?? "⚔️")
      : winner === "B" ? (teamB[0]?.def?.emoji ?? "⚔️") : "🤝";
    const winnerColor = winner === "A" ? "#5599FF" : winner === "B" ? "#FF5544" : "#FFD700";
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: "radial-gradient(ellipse at 50% 30%, #1a0505 0%, #050208 80%)", paddingTop: "max(env(safe-area-inset-top,0px),24px)", paddingBottom: "max(env(safe-area-inset-bottom,0px),24px)" }}>

        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
          className="text-center mb-8">
          <div className="text-[10px] tracking-[0.4em] font-display mb-2" style={{ color: "#9aa6bf" }}>
            {winner === "draw" ? "IT'S A DRAW!" : "WINNER"}
          </div>
          <div className="text-8xl mb-3">{winnerEmoji}</div>
          <div className="font-display text-4xl tracking-[0.1em]" style={{ color: winnerColor, textShadow: `0 0 30px ${winnerColor}88` }}>
            {winner === "draw" ? "DRAW!" : winnerName}
          </div>
          {winner !== "draw" && (
            <div className="text-sm mt-2" style={{ color: "#9aa6bf" }}>
              {winner === "A" ? teamASurvivors : teamBSurvivors} units survived
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3 mb-6 w-full max-w-sm">
          {[
            { label: "Total Kills", value: totalKills.toString() },
            { label: "Battle Time", value: `${mins}:${String(secs).padStart(2, "0")}` },
            { label: "Survivors",   value: `${teamASurvivors + teamBSurvivors}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div className="font-display text-xl" style={{ color: winnerColor }}>{value}</div>
              <div className="text-[9px] mt-1" style={{ color: "#9aa6bf" }}>{label}</div>
            </div>
          ))}
        </motion.div>

        {mvp && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-sm rounded-2xl p-4 mb-6 flex items-center gap-4"
            style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(5,2,10,0.8))", border: "1px solid rgba(255,215,0,0.3)" }}>
            <div className="text-5xl">{mvp.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-display tracking-[0.3em] mb-0.5" style={{ color: "#FFD700" }}>⭐ MVP</div>
              <div className="font-display text-lg truncate">{mvp.name}</div>
              <div className="text-xs mt-1" style={{ color: "#9aa6bf" }}>
                {mvp.kills} kills · {mvp.damageDealt.toLocaleString()} damage
              </div>
            </div>
            <div className="text-3xl">🏆</div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="flex gap-3 w-full max-w-sm">
          {replayFrames && (
            <button onClick={() => {
              setReplayTick(0);
              setReplayPlaying(true);
              setReplaySpeed(1);
              setPhase("replay");
            }}
              className="flex-1 py-4 rounded-2xl font-display text-base tracking-[0.1em] pressable"
              style={{ background: "linear-gradient(135deg, #FF4444, #FF8800)", color: "white" }}>
              🔄 REPLAY
            </button>
          )}
          <button onClick={() => { setBattleResult(null); setLog([]); setPhase("setup"); }}
            className="flex-1 py-4 rounded-2xl font-display text-base tracking-[0.1em] pressable"
            style={{ background: lastBattle ? "rgba(255,255,255,0.10)" : "linear-gradient(135deg, #FF4444, #FF8800)", color: "white", border: lastBattle ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
            ⚔️ REMATCH
          </button>
          <button onClick={() => {
            setBattleResult(null);
            setTeamA([{ def: null, count: 15 }]);
            setTeamB([{ def: null, count: 15 }]);
            setLog([]);
            setPhase("hub");
          }}
            className="px-4 py-4 rounded-2xl font-display text-sm tracking-wide pressable"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
            🏠
          </button>
        </motion.div>
      </div>
    );
  }

  // ── REPLAY ─────────────────────────────────────────────────────────────────
  if (phase === "replay" && replayFrames && canStart) {
    const replayProgress = replayTotalTicks > 0 ? replayTick / replayTotalTicks : 0;
    const replayMins = Math.floor((replayTick / 60) / 60);
    const replaySecs = Math.floor((replayTick / 60) % 60);
    const totalMins  = Math.floor((replayTotalTicks / 60) / 60);
    const totalSecs  = Math.floor((replayTotalTicks / 60) % 60);
    const playbackData: PlaybackData = {
      frames: replayFrames,
      interval: replayInterval,
      currentTick: Math.round(replayTick),
    };
    const noopVfx = vfxQueue; // same ref, won't be used in playback mode
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#050208", paddingTop: "max(env(safe-area-inset-top,0px),0px)" }}>
        {/* Canvas */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <BattleCanvas
            teamA={teamASlots}
            teamB={teamBSlots}
            map={selectedMap}
            speed={1}
            paused={false}
            onBattleEnd={() => {}}
            onLogEntry={() => {}}
            onStats={() => {}}
            vfxQueue={noopVfx}
            playbackData={playbackData}
          />
          {/* Timestamp overlay */}
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.7)", borderRadius: 8, padding: "4px 10px", color: "#FFD700", fontFamily: "monospace", fontSize: 12, letterSpacing: "0.1em" }}>
            ⏪ INSTANT REPLAY &nbsp;{replayMins}:{String(replaySecs).padStart(2,"0")} / {totalMins}:{String(totalSecs).padStart(2,"0")}
          </div>
        </div>

        {/* Scrubber + controls */}
        <div className="px-4 py-3" style={{ background: "rgba(0,0,0,0.88)", borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          {/* Progress bar / scrubber */}
          <div className="relative mb-2" style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, cursor: "pointer" }}
            onClick={e => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const frac = (e.clientX - rect.left) / rect.width;
              setReplayTick(Math.round(frac * replayTotalTicks));
              setReplayPlaying(false);
            }}>
            <div style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#FF4444,#FF8800)", width: `${replayProgress * 100}%`, transition: "width 0.05s linear" }} />
            {/* Thumb */}
            <div style={{ position: "absolute", top: "50%", left: `${replayProgress * 100}%`, transform: "translate(-50%,-50%)", width: 14, height: 14, borderRadius: "50%", background: "#FFD700", border: "2px solid white", cursor: "grab" }} />
          </div>

          {/* Scrubber range input (invisible, overlaid for drag support) */}
          <input type="range" min={0} max={replayTotalTicks} step={1}
            value={Math.round(replayTick)}
            onChange={e => { setReplayTick(Number(e.target.value)); setReplayPlaying(false); }}
            style={{ position: "absolute", opacity: 0, width: "calc(100% - 32px)", height: 18, marginTop: -20, cursor: "pointer" }}
          />

          {/* Controls row */}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => { setReplayTick(0); setReplayPlaying(false); }}
              className="w-8 h-8 rounded flex items-center justify-center text-sm"
              style={{ background: "rgba(255,255,255,0.08)", color: "#9aa6bf" }}>⏮</button>

            <button onClick={() => setReplayPlaying(p => !p)}
              className="px-4 py-1.5 rounded-xl font-display text-sm tracking-wide"
              style={{ background: replayPlaying ? "#FF4444" : "#FF8800", color: "white", minWidth: 80 }}>
              {replayPlaying ? "⏸ PAUSE" : "▶ PLAY"}
            </button>

            <div className="flex gap-1">
              {([0.5, 1, 2, 4] as const).map(s => (
                <button key={s} onClick={() => { setReplaySpeed(s); if (!replayPlaying) setReplayPlaying(true); }}
                  className="px-2 py-1 rounded text-xs font-display"
                  style={{ background: replaySpeed === s ? "#FF4444" : "rgba(255,255,255,0.08)", color: replaySpeed === s ? "white" : "#9aa6bf" }}>
                  {s}×
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <button onClick={() => { setReplayPlaying(false); setPhase("results"); }}
              className="px-3 py-1.5 rounded-xl font-display text-xs tracking-wide"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#9aa6bf" }}>
              📊 Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
