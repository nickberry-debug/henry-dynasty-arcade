// The Cauldron — Potion Lab's centerpiece. Pick 2–5 ingredients, tap
// BREW, get an AI-narrated result + the potion appears on the shelf.

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, X, Sparkles, Lightbulb, Volume2, Loader2 } from "lucide-react";
import { PotionLabShell, LAB_PURPLE, LAB_AMBER } from "../components/PotionLabShell";
import { PotionBottle } from "../components/PotionBottle";
import { INGREDIENTS, RARITY_ORDER, RARITY_COLOR, ELEMENT_LABEL, schoolFor, type Ingredient, type Rarity } from "../data/ingredients";
import { matchRecipe, type Recipe } from "../data/recipes";
import { narrateBrew, brewmasterHint, sirenLullaby } from "../ai";
import { usePotionSave } from "../store";
import { speak } from "../../wordplay/voice";

const MAX_BREW = 5;
const MIN_BREW = 2;

export default function Cauldron() {
  const { state, setState } = usePotionSave();
  const [brew, setBrew] = useState<string[]>([]);
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [schoolFilter, setSchoolFilter] = useState<"all" | "Harry Potter" | "Greek Mythology" | "Skyrim" | "Schoolyard">("all");
  const [search, setSearch] = useState("");
  const [brewing, setBrewing] = useState(false);
  const [result, setResult] = useState<{ recipe: Recipe | null; narration: string; isNew: boolean } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return INGREDIENTS.filter(i => {
      if (rarityFilter !== "all" && i.rarity !== rarityFilter) return false;
      if (schoolFilter !== "all" && schoolFor(i.id) !== schoolFilter) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.element.includes(q) && !(schoolFor(i.id) ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rarityFilter, schoolFilter, search]);

  const add = (id: string) => {
    if (brew.includes(id)) return;
    if (brew.length >= MAX_BREW) return;
    setBrew(b => [...b, id]);
    setResult(null);
  };
  const remove = (id: string) => {
    setBrew(b => b.filter(x => x !== id));
    setResult(null);
  };
  const clearBrew = () => { setBrew([]); setResult(null); };

  const startBrew = async () => {
    if (brew.length < MIN_BREW) return;
    setBrewing(true);
    setResult(null);
    setHint(null);
    const matched = matchRecipe(brew);
    const narration = await narrateBrew({
      ingredients: brew, matched, isEasterEgg: matched?.kind === "easter",
    });
    const isNew = !!matched && !state.discovered.includes(matched.id);
    const isEgg = matched?.kind === "easter";

    setState(prev => {
      const next = { ...prev, modifiedAt: Date.now(), totalBrews: prev.totalBrews + 1 };
      if (!matched) {
        next.badBrews = prev.badBrews + 1;
      } else {
        if (!prev.discovered.includes(matched.id)) {
          next.discovered = [...prev.discovered, matched.id];
        }
        if (isEgg && !prev.easterEggsSeen.includes(matched.id)) {
          next.easterEggsSeen = [...prev.easterEggsSeen, matched.id];
        }
        const bottle = {
          id: `b-${Date.now()}`, recipeId: matched.id,
          name: matched.name, emoji: matched.emoji, color: matched.color,
          brewedAt: Date.now(), narration,
        };
        next.shelf = [bottle, ...prev.shelf].slice(0, 24);
      }
      return next;
    });

    setResult({ recipe: matched, narration, isNew });
    speak(narration);

    // Easter-egg effects
    if (isEgg) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 2400);
      if (matched?.eggKind === "voice") {
        // Special lullaby for siren recipe.
        const lullaby = await sirenLullaby();
        setTimeout(() => speak(lullaby), 4000);
      }
    }
    setBrewing(false);
  };

  const askForHint = async () => {
    setHintLoading(true);
    const h = await brewmasterHint({
      discoveredCount: state.discovered.length,
      recentMisses: [],
    });
    setHint(h);
    setHintLoading(false);
  };

  const cauldronColor = brew.length === 0
    ? "#1e1b4b"
    : mixColors(brew.map(id => INGREDIENTS.find(i => i.id === id)?.color ?? "#1e1b4b"));

  return (
    <PotionLabShell title="The Cauldron" subtitle={`${brew.length}/${MAX_BREW} ingredients`} backTo="/potion-lab" emoji="🧪"
      right={
        <button onClick={askForHint} disabled={hintLoading}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded font-display tracking-widest text-[10px] pressable touch-target"
          style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${LAB_AMBER}66`, color: LAB_AMBER, minHeight: 44 }}>
          <Lightbulb size={11} /> {hintLoading ? "…" : "HINT"}
        </button>
      }>

      <div className="space-y-4">
        {/* Cauldron + brew tray */}
        <section className="rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, ${LAB_PURPLE}22, rgba(10,6,18,0.9))`, border: `1px solid ${LAB_PURPLE}55` }}>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Visual cauldron */}
            <motion.div
              animate={{ scale: brewing ? [1, 1.04, 1] : 1 }}
              transition={{ duration: 0.8, repeat: brewing ? Infinity : 0 }}
              className="flex-shrink-0">
              <svg viewBox="0 0 96 96" width={140} height={140} aria-hidden="true">
                {/* Stand */}
                <rect x="14" y="78" width="68" height="6" fill="#4a3a1a" rx="2" />
                <rect x="20" y="84" width="6" height="8" fill="#4a3a1a" />
                <rect x="70" y="84" width="6" height="8" fill="#4a3a1a" />
                {/* Pot body */}
                <ellipse cx="48" cy="46" rx="32" ry="10" fill="#1c1917" />
                <path d="M 16 46 Q 16 78 30 80 L 66 80 Q 80 78 80 46 Z" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
                <ellipse cx="48" cy="46" rx="28" ry="6" fill={cauldronColor} stroke="#000" strokeWidth="0.4" />
                {brew.length > 0 && (
                  <>
                    <motion.circle cx="40" cy="43" r="2" fill="#fff" opacity="0.85"
                      animate={{ cy: [43, 38, 43], opacity: [0.85, 0, 0.85] }}
                      transition={{ duration: 2.2, repeat: Infinity }} />
                    <motion.circle cx="56" cy="44" r="1.5" fill="#fff" opacity="0.7"
                      animate={{ cy: [44, 39, 44], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 2.6, repeat: Infinity, delay: 0.5 }} />
                  </>
                )}
                {/* Steam when brewing */}
                {brewing && (
                  <>
                    <motion.circle cx="48" cy="32" r="3" fill="#fff" opacity="0.4"
                      animate={{ cy: [32, 12], opacity: [0.4, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity }} />
                    <motion.circle cx="40" cy="34" r="2" fill="#fff" opacity="0.3"
                      animate={{ cy: [34, 14], opacity: [0.3, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }} />
                    <motion.circle cx="56" cy="34" r="2" fill="#fff" opacity="0.3"
                      animate={{ cy: [34, 14], opacity: [0.3, 0] }}
                      transition={{ duration: 2.0, repeat: Infinity, delay: 0.6 }} />
                  </>
                )}
              </svg>
            </motion.div>

            {/* Brew tray */}
            <div className="flex-1 w-full">
              {brew.length === 0 ? (
                <div className="text-[12px] text-violet-200/85 italic">
                  Tap ingredients below to add them. The cauldron likes 2–5 at a time.
                </div>
              ) : (
                <ul className="flex flex-wrap gap-2 mb-2">
                  <AnimatePresence>
                    {brew.map(id => {
                      const i = INGREDIENTS.find(ing => ing.id === id)!;
                      return (
                        <motion.li key={id} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}>
                          <button onClick={() => remove(id)} aria-label={`Remove ${i.name}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] pressable touch-target"
                            style={{ background: `${i.color}33`, border: `1px solid ${i.color}88`, color: "#fef9c3", minHeight: 36 }}>
                            <span aria-hidden="true">{i.emoji}</span>{i.name}
                            <X size={11} aria-hidden="true" />
                          </button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <button onClick={startBrew} disabled={brew.length < MIN_BREW || brewing}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg font-display tracking-widest text-sm pressable touch-target disabled:opacity-40"
                  style={{ background: LAB_PURPLE, color: "#1e1b4b", minHeight: 48 }}>
                  {brewing ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> BREWING…</> : <><FlaskConical size={14} aria-hidden="true" /> BREW</>}
                </button>
                {brew.length > 0 && (
                  <button onClick={clearBrew}
                    className="px-3 py-3 rounded-lg text-[11px] pressable touch-target"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fef9c3", minHeight: 48 }}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              role="status" aria-live="polite"
              className="rounded-2xl p-4"
              style={{
                background: result.recipe
                  ? `linear-gradient(135deg, ${result.recipe.color}22, rgba(10,6,18,0.95))`
                  : "rgba(255,255,255,0.04)",
                border: `2px solid ${result.recipe ? result.recipe.color : "rgba(255,255,255,0.10)"}`,
              }}>
              <div className="flex items-start gap-3">
                {result.recipe && (
                  <div className="flex-shrink-0"><PotionBottle color={result.recipe.color} size={88} active /></div>
                )}
                <div className="flex-1 min-w-0">
                  {result.recipe ? (
                    <>
                      <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: result.recipe.color }}>
                        {result.isNew ? "✨ NEW DISCOVERY" : result.recipe.kind === "easter" ? "🌟 EASTER EGG" : "BREWED"}
                      </div>
                      <div className="font-display text-xl text-violet-50 mt-0.5">{result.recipe.emoji} {result.recipe.name}</div>
                      <div className="text-[11px] text-violet-100/85 mt-1">{result.recipe.effect}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: LAB_AMBER }}>NOT A KNOWN RECIPE — YET</div>
                      <div className="font-display text-base text-violet-50 mt-0.5">The cauldron settles…</div>
                    </>
                  )}
                  <div className="text-[12px] text-violet-100/95 mt-3 leading-relaxed italic">
                    "{result.narration}"
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => speak(result.narration)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] pressable touch-target"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fef9c3", minHeight: 40 }}>
                      <Volume2 size={11} aria-hidden="true" /> Read again
                    </button>
                    <button onClick={() => { setBrew([]); setResult(null); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-display tracking-widest pressable touch-target"
                      style={{ background: LAB_PURPLE, color: "#1e1b4b", minHeight: 40 }}>
                      <Sparkles size={11} aria-hidden="true" /> Brew another
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {hint && (
          <div role="status" aria-live="polite" className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: `${LAB_AMBER}18`, border: `1px solid ${LAB_AMBER}55` }}>
            <Lightbulb size={14} style={{ color: LAB_AMBER }} className="mt-0.5" aria-hidden="true" />
            <div className="text-[12px] text-violet-50 leading-relaxed flex-1">{hint}</div>
            <button onClick={() => setHint(null)} aria-label="Dismiss hint" className="text-violet-300/70 pressable" style={{ minWidth: 28, minHeight: 28 }}>
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Filters */}
        <section>
          <div className="text-[10px] tracking-[0.3em] font-display mb-2" style={{ color: LAB_PURPLE }}>SHELF</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <FilterChip active={rarityFilter === "all"} onClick={() => setRarityFilter("all")} label="All rarities" color="#fff" />
            {RARITY_ORDER.map(r => (
              <FilterChip key={r} active={rarityFilter === r} onClick={() => setRarityFilter(r)}
                label={r.charAt(0).toUpperCase() + r.slice(1)} color={RARITY_COLOR[r]} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <FilterChip active={schoolFilter === "all"} onClick={() => setSchoolFilter("all")} label="All schools" color="#fff" />
            <FilterChip active={schoolFilter === "Harry Potter"}    onClick={() => setSchoolFilter("Harry Potter")}    label="⚡ Harry Potter"     color="#fbbf24" />
            <FilterChip active={schoolFilter === "Greek Mythology"} onClick={() => setSchoolFilter("Greek Mythology")} label="🏛️ Greek Myth"      color="#fde68a" />
            <FilterChip active={schoolFilter === "Skyrim"}          onClick={() => setSchoolFilter("Skyrim")}          label="❄️ Nordic"           color="#67e8f9" />
            <FilterChip active={schoolFilter === "Schoolyard"}      onClick={() => setSchoolFilter("Schoolyard")}      label="🎒 Schoolyard"       color="#86efac" />
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ingredient or element…"
            aria-label="Search ingredients"
            className="w-full px-3 py-2 rounded-md bg-black/40 text-[13px] text-violet-50 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302] mb-3"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
        </section>

        {/* Ingredient shelf grid */}
        <section>
          {filtered.length === 0 && <div className="text-[12px] italic text-violet-200/85 py-8 text-center">Nothing matches that search.</div>}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map(i => {
              const isInBrew = brew.includes(i.id);
              const isFull = brew.length >= MAX_BREW && !isInBrew;
              return <IngredientCard key={i.id} ing={i} disabled={isFull} selected={isInBrew} onClick={() => isInBrew ? remove(i.id) : add(i.id)} />;
            })}
          </div>
        </section>

        {/* Confetti for easter eggs */}
        {confetti && <Confetti />}
      </div>
    </PotionLabShell>
  );
}

function IngredientCard({ ing, disabled, selected, onClick }: { ing: Ingredient; disabled: boolean; selected: boolean; onClick: () => void }) {
  const c = RARITY_COLOR[ing.rarity];
  const school = schoolFor(ing.id);
  return (
    <motion.button whileTap={{ scale: 0.96 }} whileHover={{ y: -1 }}
      onClick={onClick} disabled={disabled}
      aria-pressed={selected}
      aria-label={`${ing.name} — ${ing.rarity}. ${school ? school + ". " : ""}${ing.flavor}`}
      className="rounded-lg p-2.5 text-left pressable touch-target disabled:opacity-40"
      style={{
        background: selected
          ? `linear-gradient(135deg, ${ing.color}33, rgba(10,6,18,0.9))`
          : "rgba(0,0,0,0.45)",
        border: `1px solid ${selected ? ing.color : c + "55"}`,
        minHeight: 76,
      }}>
      <div className="flex items-start gap-2">
        <div className="text-2xl flex-shrink-0" aria-hidden="true">{ing.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-[12px] text-violet-50 truncate">{ing.name}</div>
          <div className="text-[10px] mt-0.5" style={{ color: c }}>{ing.rarity.toUpperCase()}</div>
          <div className="text-[10px] mt-0.5 text-violet-100/80 truncate">{ELEMENT_LABEL[ing.element]}</div>
          {school && (
            <div className="text-[9px] mt-0.5 inline-block px-1.5 py-0.5 rounded"
              style={{ background: "rgba(255,255,255,0.06)", color: "#fde68a", border: "1px solid rgba(253,230,138,0.25)" }}>
              {school}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

function FilterChip({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick}
      aria-pressed={active}
      className="px-3 py-1.5 rounded-md text-[11px] pressable touch-target"
      style={{
        background: active ? `${color}33` : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? `${color}aa` : "rgba(255,255,255,0.07)"}`,
        color: active ? color : "#ede9fe",
        minHeight: 32,
      }}>{label}</button>
  );
}

/** Naive average-of-hex color mixer. Adequate for the cauldron preview. */
function mixColors(hexes: string[]): string {
  if (hexes.length === 0) return "#1e1b4b";
  let r = 0, g = 0, b = 0;
  for (const h of hexes) {
    const cleaned = h.replace("#", "");
    r += parseInt(cleaned.slice(0, 2), 16);
    g += parseInt(cleaned.slice(2, 4), 16);
    b += parseInt(cleaned.slice(4, 6), 16);
  }
  r = Math.round(r / hexes.length);
  g = Math.round(g / hexes.length);
  b = Math.round(b / hexes.length);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 32 }, () => ({
    angle: Math.random() * 360, dist: 80 + Math.random() * 180,
    color: ["#fde68a", "#a78bfa", "#f472b6", "#86efac", "#60a5fa", "#fbbf24"][Math.floor(Math.random() * 6)],
    delay: Math.random() * 100,
  })), []);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      <div className="absolute" style={{ left: "50%", top: "40%" }}>
        {pieces.map((p, i) => (
          <motion.div key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
            animate={{
              x: Math.cos(p.angle * Math.PI / 180) * p.dist,
              y: Math.sin(p.angle * Math.PI / 180) * p.dist + 80,
              opacity: 0, scale: 1.1, rotate: Math.random() * 720,
            }}
            transition={{ duration: 1.6, delay: p.delay / 1000, ease: "easeOut" }}
            className="absolute w-2.5 h-3 rounded-sm"
            style={{ background: p.color, transform: "translate(-50%, -50%)" }} />
        ))}
      </div>
    </div>
  );
}
