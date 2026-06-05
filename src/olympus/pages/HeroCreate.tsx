// Hero creation flow — DiceBear personas sprite, 10 classes, 30
// subclasses, 10 mythological companion lines with three-stage
// Pokémon-style evolution. Archetype step removed per polish pass —
// backstory now derives from class + subclass + traits.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOlympus } from "../store";
import { CLASS_INFO, SUBCLASS_INFO, STAT_INFO, getTier, STAT_HARD_CAP, type Hero, type HeroAppearance, type OlympusClass, type HeroCompanion } from "../types";
import { rollTraits } from "../traits";
import { generateBackstory } from "../ai";
import { CharacterSprite } from "../components/CharacterSprite";
import { CompanionSprite } from "../components/CompanionSprite";
import { InfoTooltip } from "../components/InfoTooltip";
import { COMPANION_LINES, randomLine, getStage, xpForLevel, COMPANION_PALETTES } from "../companions";
import { ArrowLeft, ArrowRight, Shuffle, Loader, Sparkles } from "lucide-react";

// Back to the original 6 attributes. Each starts at 1, player gets
// 15 points to distribute (max 10 per attribute at creation). Class +
// subclass deltas land on top.
// 8 attributes. Each starts at 1, player gets 14 points to distribute
// however they want — no per-stat cap during distribution. Class +
// subclass deltas (4 + 4 = 8 total) land on top. Hard cap is 100 per
// stat (only relevant late-game).
const STAT_POOL = 14;
const BASE_STAT = 1;

export default function HeroCreate() {
  const navigate = useNavigate();
  const upsertHero = useOlympus(s => s.upsertHero);
  const setActiveHero = useOlympus(s => s.setActiveHero);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [className, setClassNameState] = useState<OlympusClass>("warrior");
  const [subclass, setSubclass] = useState<string>("hoplite");
  const [appearance, setAppearance] = useState<HeroAppearance>(() => randomAppearance());
  const [stats, setStats] = useState({
    strength: BASE_STAT, agility: BASE_STAT, wisdom: BASE_STAT,
    charisma: BASE_STAT, luck: BASE_STAT, endurance: BASE_STAT,
    intuition: BASE_STAT, magic: BASE_STAT,
  });
  const traits = useMemo(() => rollTraits(Math.random), []);
  const [companionLine, setCompanionLine] = useState(() => randomLine());
  const [companionName, setCompanionName] = useState(companionLine.stages[0].name);
  const [companionNameDirty, setCompanionNameDirty] = useState(false);
  const [companionColors, setCompanionColors] = useState(COMPANION_PALETTES[0]);
  const [rerolls, setRerolls] = useState(0);
  const [busy, setBusy] = useState(false);

  // 8 attributes × BASE_STAT baseline → STAT_POOL points distributed.
  const remaining = STAT_POOL - (Object.values(stats).reduce((a, b) => a + b, 0) - 8 * BASE_STAT);

  // Reset subclass when class changes.
  useEffect(() => {
    const first = CLASS_INFO[className].subclasses[0];
    setSubclass(toSubclassId(first));
  }, [className]);

  // Default companion-name follows the roll until user types.
  useEffect(() => {
    if (!companionNameDirty) setCompanionName(companionLine.stages[0].name);
  }, [companionLine.id]);

  const dicebearSeed = useMemo(() => name || "hero", [name]);
  const steps = ["Name", "Class", "Subclass", "Appearance", "Stats", "Companion", "Commit"];

  const rollCompanion = () => {
    if (rerolls >= 5) return;
    setRerolls(r => r + 1);
    setCompanionLine(randomLine());
    setCompanionNameDirty(false);
  };

  const commit = async () => {
    if (busy) return;
    setBusy(true);
    const starterWeapon = starterWeaponFor(className);
    // Class + subclass stat deltas applied on top of the player's
    // 15-point allocation. Surfaced visibly at the Stats step (below)
    // so the player can see exactly what bonuses they'll receive.
    const finalStats = (() => {
      const s: any = { ...stats };
      const apply = (deltas: Record<string, number | undefined>) => {
        for (const [k, v] of Object.entries(deltas)) if (typeof v === "number") s[k] = (s[k] ?? 1) + v;
      };
      apply((CLASS_INFO[className].statDeltas ?? {}) as Record<string, number>);
      apply((SUBCLASS_INFO[subclass]?.statDeltas ?? {}) as Record<string, number>);
      // Hard cap at 100 per attribute (Mythic-tier ceiling).
      for (const k of Object.keys(s)) s[k] = Math.min(STAT_HARD_CAP, s[k]);
      return s;
    })();
    // No more archetype prompt — backstory derives from class +
    // subclass + traits, which is plenty for the AI to work with.
    const archetypeLabel = `${CLASS_INFO[className].name} · ${SUBCLASS_INFO[subclass]?.name ?? ""}`.trim();
    const backstory = await generateBackstory(name, CLASS_INFO[className].name, archetypeLabel, [...traits]);

    const stage0 = companionLine.stages[0];
    const heroCompanion: HeroCompanion = {
      lineId: companionLine.id,
      stage: 1,
      name: companionName.trim() || stage0.name,
      level: 1,
      xp: 0,
      xpToNext: xpForLevel(2),
      skills: [...stage0.skills],
      primaryColor: companionColors.primary,
      secondaryColor: companionColors.secondary,
      accentColor: companionColors.accent,
    };

    const newHero: Hero = {
      id: `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(), modifiedAt: Date.now(),
      name: name.trim() || "Hero",
      className,
      subclass: SUBCLASS_INFO[subclass]?.name,
      level: 1, xp: 0, xpToNext: 100,
      stats: finalStats,
      hp: 50 + finalStats.endurance * 5, hpMax: 50 + finalStats.endurance * 5,
      drachma: 50,
      appearance,
      equipment: {
        weapon: starterWeapon,
        armor: { name: "Linen Tunic", tier: 1 },
        blessings: [],
      },
      traits: [...traits],
      backstory,
      personality: { alignment: "true-neutral", descriptors: ["Curious", "Determined"], lastUpdated: 0 },
      reputation: { cities: { Athens: 0, Sparta: 0, Corinth: 0, Thebes: 0, Delphi: 0 }, level: "unknown" },
      injuries: [],
      inventory: [{ id: "starter-rations", name: "Dried figs and bread", kind: "consumable", qty: 3 }],
      adventuresCompleted: 0,
      journal: [],
      visualDescription: `${name.trim()} stands ready for the road, a ${stage0.name.toLowerCase()} at their side.`,
      companion: heroCompanion,
    };
    await upsertHero(newHero);
    await setActiveHero(newHero.id);
    setBusy(false);
    navigate(`/olympus/hero/${newHero.id}`);
  };

  const cls = CLASS_INFO[className];
  const sub = SUBCLASS_INFO[subclass];
  const stage0 = companionLine.stages[0];

  // Combined class + subclass deltas, summed per stat — used to show
  // the player exactly what their class will contribute on top of
  // their 15-point allocation.
  const combinedDeltas = useMemo(() => {
    const d: Partial<Record<keyof typeof stats, number>> = {};
    const add = (src: Record<string, number | undefined>) => {
      for (const [k, v] of Object.entries(src)) {
        if (typeof v === "number") (d as any)[k] = ((d as any)[k] ?? 0) + v;
      }
    };
    add((cls.statDeltas ?? {}) as Record<string, number>);
    add((sub?.statDeltas ?? {}) as Record<string, number>);
    return d;
  }, [className, subclass]);

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "#DAA520" }}>Forge a Hero · Step {step + 1} of {steps.length}</div>
        <h1 className="font-display text-2xl tracking-[0.15em]" style={{ fontFamily: "'Cinzel', serif" }}>{steps[step].toUpperCase()}</h1>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        <div>
          {/* ── 0: Name ───────────────────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-3">
              <label className="block text-xs" style={{ color: "rgba(233,227,210,0.7)" }}>Hero's name — a name worth singing about.</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value.slice(0, 30))}
                placeholder="Atalanta, Demetrios, Iolaus…"
                aria-label="Hero name"
                className="w-full px-4 py-3 rounded-xl text-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffb302]"
                style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.3)", color: "#e9e3d2" }}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {["Cassander", "Theron", "Iphigenia", "Lysander", "Pyrrhe", "Brasidas", "Calliope", "Demos"].map(s => (
                  <button key={s} onClick={() => setName(s)} className="px-2.5 py-1.5 rounded-lg text-xs pressable touch-target" style={{ background: "rgba(218,165,32,0.1)", color: "#DAA520" }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── 1: Class — premium card grid with gold halo + larger emoji ── */}
          {step === 1 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(Object.keys(CLASS_INFO) as OlympusClass[]).map(c => {
                const info = CLASS_INFO[c];
                const sel = c === className;
                return (
                  <div key={c} className="relative">
                    <button
                      onClick={() => setClassNameState(c)}
                      className="text-left w-full p-4 rounded-2xl pressable touch-target relative overflow-hidden"
                      style={{
                        background: sel
                          ? "linear-gradient(135deg, rgba(218,165,32,0.25), rgba(15,27,45,0.6))"
                          : "linear-gradient(135deg, rgba(15,27,45,0.55), rgba(7,16,30,0.7))",
                        border: sel ? "1.5px solid rgba(218,165,32,0.85)" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: sel
                          ? "0 0 0 1px rgba(218,165,32,0.5) inset, 0 6px 24px -8px rgba(218,165,32,0.45)"
                          : undefined,
                        minHeight: 130,
                      }}
                    >
                      {sel && (
                        <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                          style={{ background: "radial-gradient(380px 140px at 80% -20%, rgba(218,165,32,0.28), transparent 60%)" }} />
                      )}
                      <div className="relative">
                        <div className="text-4xl mb-1.5" style={{ filter: sel ? "drop-shadow(0 0 12px rgba(218,165,32,0.6))" : undefined }}>{info.emoji}</div>
                        <div className="font-display tracking-wider text-base" style={{ fontFamily: "'Cinzel', serif", color: sel ? "#DAA520" : "#e9e3d2" }}>{info.name}</div>
                        <div className="text-[11px] mt-1 leading-snug" style={{ color: "rgba(233,227,210,0.75)" }}>{info.description}</div>
                        <div className="text-[10px] mt-2.5 font-display tracking-[0.15em] uppercase" style={{ color: sel ? "#fde68a" : "#DAA520" }}>
                          {info.statBonuses.join(" · ")}
                        </div>
                      </div>
                    </button>
                    <div className="absolute top-2 right-2">
                      <InfoTooltip title={info.name} description={info.description} bonuses={info.statBonuses} storyImpact={info.storyImpact} examples={info.examples} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 2: Subclass ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-2">
              <div className="text-xs mb-2" style={{ color: "rgba(233,227,210,0.7)" }}>
                Subclass for <span style={{ color: "#DAA520" }}>{cls.name}</span> — each grants a unique passive and active skill.
              </div>
              {cls.subclasses.map(label => {
                const id = toSubclassId(label);
                const info = SUBCLASS_INFO[id];
                const sel = id === subclass;
                if (!info) return null;
                return (
                  <div key={id} className="relative">
                    <button
                      onClick={() => setSubclass(id)}
                      className="text-left w-full p-3.5 rounded-xl pressable touch-target relative overflow-hidden"
                      style={{
                        background: sel
                          ? "linear-gradient(135deg, rgba(218,165,32,0.25), rgba(15,27,45,0.6))"
                          : "linear-gradient(135deg, rgba(15,27,45,0.55), rgba(7,16,30,0.7))",
                        border: sel ? "1.5px solid rgba(218,165,32,0.85)" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: sel ? "0 0 0 1px rgba(218,165,32,0.4) inset, 0 4px 18px -6px rgba(218,165,32,0.4)" : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-display tracking-wide" style={{ fontFamily: "'Cinzel', serif", color: sel ? "#DAA520" : "#e9e3d2" }}>{info.name}</div>
                        <div className="text-[10px] font-display tracking-wider" style={{ color: sel ? "#fde68a" : "#DAA520" }}>{info.bonuses.slice(0, 2).join(" · ")}</div>
                      </div>
                      <div className="text-[11px] mt-1" style={{ color: "rgba(233,227,210,0.7)" }}>{info.description}</div>
                      <div className="text-[10px] mt-1.5 flex flex-wrap gap-2">
                        <span style={{ color: "#86efac" }}>✦ {info.passive.name}</span>
                        <span style={{ color: "#7dd3fc" }}>✦ {info.active.name}</span>
                      </div>
                    </button>
                    <div className="absolute top-2 right-2">
                      <InfoTooltip title={info.name} description={info.description} bonuses={info.bonuses} storyImpact={info.storyImpact} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 3: Appearance ────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="text-xs mb-2" style={{ color: "rgba(233,227,210,0.7)" }}>
                Every option below changes the sprite as you tap. Cycle through skin tones, body shapes, hair, faces — over <span style={{ color: "#DAA520" }}>{12 * 25 * 6 * 4 * 7 * 6 * 3}</span> possible combinations.
              </div>
              <AppearancePicker appearance={appearance} onChange={setAppearance} />
              <button
                onClick={() => setAppearance(randomAppearance())}
                className="px-3 py-2 rounded-lg text-xs font-display tracking-wider flex items-center gap-1.5 pressable touch-target"
                style={{ background: "rgba(218,165,32,0.15)", color: "#DAA520" }}
              >
                <Shuffle size={12} /> Randomise
              </button>
            </div>
          )}

          {/* ── 4: Stats ─────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="text-xs" style={{ color: "rgba(233,227,210,0.7)" }}>
                You have <span className="font-display text-base" style={{ color: "#DAA520" }}>{remaining}</span> points to distribute. Your class adds the bolded numbers on top.
              </div>
              <div className="rounded-lg px-3 py-2" style={{ background: "rgba(218,165,32,0.08)", border: "1px solid rgba(218,165,32,0.25)" }}>
                <div className="text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: "#DAA520" }}>{cls.name} · {sub?.name ?? ""} bonus</div>
                <div className="text-[11px] flex flex-wrap gap-x-3 gap-y-1" style={{ color: "rgba(233,227,210,0.85)" }}>
                  {Object.entries(combinedDeltas).length === 0
                    ? <span>(none)</span>
                    : Object.entries(combinedDeltas).map(([k, v]) => (
                        <span key={k} className="capitalize">
                          {k}: <span style={{ color: "#DAA520" }}>+{v as number}</span>
                        </span>
                      ))}
                </div>
              </div>
              {(Object.keys(stats) as Array<keyof typeof stats>).map(k => {
                const info = STAT_INFO[k];
                const bonus = (combinedDeltas as any)[k] ?? 0;
                return (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-28 text-sm capitalize flex items-center gap-1.5" style={{ color: k === cls.primaryStat ? "#DAA520" : "rgba(233,227,210,0.85)" }}>
                      {k}{k === cls.primaryStat ? " ★" : ""}
                      <InfoTooltip title={info.title} description={info.description} storyImpact={info.storyImpact} examples={info.examples} />
                    </div>
                    <button
                      disabled={stats[k] <= BASE_STAT}
                      onClick={() => setStats(s => ({ ...s, [k]: s[k] - 1 }))}
                      className="w-9 h-9 rounded-lg pressable touch-target disabled:opacity-30"
                      style={{ background: "rgba(218,165,32,0.15)", color: "#DAA520" }}
                    >–</button>
                    <div className="flex items-baseline w-28 justify-center gap-1">
                      <span className="font-display text-lg" style={{ color: "#DAA520" }}>{stats[k]}</span>
                      {bonus > 0 && <span className="font-display text-xs" style={{ color: "#86efac" }}>+{bonus}</span>}
                      <span className="text-[9px] uppercase tracking-widest ml-1" style={{ color: "rgba(233,227,210,0.45)" }}>
                        {getTier(stats[k] + bonus).name}
                      </span>
                    </div>
                    <button
                      disabled={remaining <= 0}
                      onClick={() => setStats(s => ({ ...s, [k]: s[k] + 1 }))}
                      className="w-9 h-9 rounded-lg pressable touch-target disabled:opacity-30"
                      style={{ background: "rgba(218,165,32,0.15)", color: "#DAA520" }}
                    >+</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── 5: Companion ─────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4" style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.3)" }}>
                <CompanionSprite lineId={companionLine.id} stage={1} accentColor={companionColors.accent} size="lg" />
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(233,227,210,0.6)" }}>Stage 1 of 3 · sacred to {companionLine.mythLink}</div>
                  <div className="font-display tracking-wide text-xl flex items-center gap-2" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>
                    {stage0.name}
                    <InfoTooltip title={stage0.name} description={stage0.description} bonuses={stage0.skills} storyImpact={stage0.ability} />
                  </div>
                  <p className="text-xs mt-2 leading-relaxed" style={{ color: "rgba(233,227,210,0.8)" }}>{stage0.description}</p>
                  <div className="mt-2 text-[10px] italic" style={{ color: "#DAA520" }}>{stage0.ability}</div>
                  {/* Evolution preview */}
                  <div className="mt-3 rounded-lg px-2.5 py-2" style={{ background: "rgba(218,165,32,0.06)", border: "1px solid rgba(218,165,32,0.18)" }}>
                    <div className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: "#DAA520" }}>Evolution Path</div>
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(233,227,210,0.85)" }}>
                      <span style={{ color: "#DAA520" }}>{companionLine.stages[0].name}</span>
                      <span style={{ color: "rgba(233,227,210,0.45)" }}> → </span>
                      <span>{companionLine.stages[1].name}</span>
                      <span style={{ color: "rgba(233,227,210,0.45)" }}> → </span>
                      <span>{companionLine.stages[2].name}</span>
                    </div>
                    <div className="text-[9px] mt-1" style={{ color: "rgba(233,227,210,0.5)" }}>
                      Evolves at level 10 and level 25. Gains XP after every adventure.
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: "#DAA520" }}>Name your companion</label>
                <input
                  value={companionName}
                  onChange={e => { setCompanionName(e.target.value.slice(0, 24)); setCompanionNameDirty(true); }}
                  placeholder={stage0.name}
                  className="w-full px-3 py-2.5 rounded-xl text-base outline-none"
                  style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.3)", color: "#e9e3d2" }}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: "#DAA520" }}>Pendant palette</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {COMPANION_PALETTES.map((p, i) => {
                    const sel = p.label === companionColors.label;
                    return (
                      <button
                        key={i}
                        onClick={() => setCompanionColors(p)}
                        className="p-2 rounded-lg pressable touch-target text-[10px] uppercase tracking-widest text-left"
                        style={{
                          background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`,
                          color: p.accent,
                          border: sel ? "2px solid #DAA520" : "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={rollCompanion}
                  disabled={rerolls >= 5}
                  className="px-3 py-2 rounded-lg text-xs font-display tracking-wider flex items-center gap-1.5 pressable touch-target disabled:opacity-40"
                  style={{ background: "rgba(218,165,32,0.18)", border: "1px solid rgba(218,165,32,0.4)", color: "#DAA520" }}
                >
                  <Shuffle size={12} /> Reroll companion ({5 - rerolls} left)
                </button>
                <span className="text-[10px]" style={{ color: "rgba(233,227,210,0.5)" }}>{COMPANION_LINES.length} mythological lines · 3 evolutions each</span>
              </div>
            </div>
          )}

          {/* ── 6: Commit ────────────────────────────────────────── */}
          {step === 6 && (
            <div className="space-y-3 text-sm" style={{ color: "rgba(233,227,210,0.85)" }}>
              <p>About to commit. Most choices made here are permanent. Read once more:</p>
              <div className="rounded-xl p-4" style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(218,165,32,0.25)" }}>
                <div className="font-display text-xl" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{name || "Unnamed"}</div>
                <div className="text-[11px] mt-0.5">Level 1 {cls.name} · {sub?.name ?? "—"}</div>
                <div className="text-[11px] mt-1">Companion: <span style={{ color: "#DAA520" }}>{companionName || stage0.name}</span> the {stage0.name}</div>
                <div className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: "#DAA520" }}>Traits</div>
                <ul className="text-[11px] space-y-1 italic">{traits.map((t, i) => <li key={i}>· {t}</li>)}</ul>
                <div className="mt-3 text-[10px] uppercase tracking-widest" style={{ color: "#DAA520" }}>Final Stats</div>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  {Object.entries(stats).map(([k, v]) => {
                    const bonus = (combinedDeltas as any)[k] ?? 0;
                    return (
                      <div key={k} className="capitalize">
                        {k}: <span style={{ color: "#DAA520" }}>{(v as number) + bonus}</span>
                        {bonus > 0 && <span style={{ color: "#86efac" }} className="text-[10px]"> (+{bonus})</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={commit}
                disabled={busy || !name.trim() || remaining > 0}
                className="w-full px-5 py-4 rounded-2xl font-display tracking-[0.2em] pressable touch-target disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: "#DAA520", color: "#0F1B2D" }}
              >
                {busy ? <><Loader size={16} className="animate-spin" /> Crafting backstory…</> : <><Sparkles size={16} /> FORGE THIS HERO</>}
              </button>
              {!name.trim() && <div className="text-xs text-amber-300">You need to name your hero before committing.</div>}
              {remaining > 0 && <div className="text-xs text-amber-300">You have {remaining} stat points left.</div>}
            </div>
          )}
        </div>

        {/* ── Live preview (desktop) ───────────────────────────────── */}
        <div className="lg:sticky lg:top-20 self-start hidden lg:block space-y-3">
          <SpriteFrame>
            <CharacterSprite seed={dicebearSeed} appearance={appearance} size="lg" />
          </SpriteFrame>
          <div className="rounded-xl p-2.5 text-center" style={{ background: "rgba(15,27,45,0.5)", border: "1px solid rgba(218,165,32,0.25)" }}>
            <div className="font-display text-sm truncate" style={{ fontFamily: "'Cinzel', serif", color: "#DAA520" }}>{name || "Unnamed"}</div>
            <div className="text-[10px]" style={{ color: "rgba(233,227,210,0.55)" }}>{cls.name}{sub ? ` · ${sub.name}` : ""}</div>
          </div>
          <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: "rgba(15,27,45,0.5)", border: "1px solid rgba(218,165,32,0.2)" }}>
            <CompanionSprite lineId={companionLine.id} stage={1} accentColor={companionColors.accent} size="sm" />
            <div className="text-[11px] min-w-0">
              <div className="font-display truncate" style={{ color: "#DAA520" }}>{companionName || stage0.name}</div>
              <div className="truncate" style={{ color: "rgba(233,227,210,0.6)" }}>Stage 1/3</div>
            </div>
          </div>
        </div>

        {/* Compact mobile preview (top of step content). */}
        <div className="lg:hidden">
          <div className="flex gap-2 items-center mb-3">
            <SpriteFrame size="sm">
              <CharacterSprite seed={dicebearSeed} appearance={appearance} size="sm" />
            </SpriteFrame>
            <CompanionSprite lineId={companionLine.id} stage={1} accentColor={companionColors.accent} size="sm" />
            <div className="text-[11px] flex-1">
              <div className="font-display truncate" style={{ color: "#DAA520" }}>{name || "Unnamed"}</div>
              <div className="truncate" style={{ color: "rgba(233,227,210,0.55)" }}>{cls.name} · {stage0.name}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-6 sticky bottom-20">
        <button
          onClick={() => step === 0 ? navigate("/olympus") : setStep(s => s - 1)}
          className="px-4 py-2.5 rounded-xl text-sm pressable touch-target flex items-center gap-2"
          style={{ background: "rgba(218,165,32,0.1)", border: "1px solid rgba(218,165,32,0.25)", color: "#DAA520" }}
        >
          <ArrowLeft size={14} /> {step === 0 ? "Cancel" : "Back"}
        </button>
        <div className="flex-1" />
        {step < steps.length - 1 && (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 0 && !name.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-display tracking-wider pressable touch-target flex items-center gap-2 disabled:opacity-40"
            style={{ background: "#DAA520", color: "#0F1B2D" }}
          >
            Next <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function SpriteFrame({ children, size = "lg" }: { children: React.ReactNode; size?: "sm" | "lg" }) {
  return (
    <div
      className="relative rounded-2xl p-3 text-center"
      style={{
        background: "radial-gradient(circle at 30% 20%, rgba(218,165,32,0.15), rgba(10,16,28,0.6))",
        border: "2px double rgba(218,165,32,0.5)",
        boxShadow: "0 8px 32px rgba(218,165,32,0.15)",
      }}
    >
      <div className="flex items-center justify-center">{children}</div>
    </div>
  );
}

function toSubclassId(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "_");
}

function AppearancePicker({ appearance, onChange }: { appearance: HeroAppearance; onChange: (a: HeroAppearance) => void }) {
  const cycle = (k: keyof HeroAppearance, max: number) => () => {
    onChange({ ...appearance, [k]: ((appearance[k] as number) + 1) % max });
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <SwatchRow label="Gender"      onClick={() => onChange({ ...appearance, gender: (appearance.gender ?? "male") === "male" ? "female" : "male" })} value={(appearance.gender ?? "male") === "male" ? "Male" : "Female"} />
      <SwatchRow label="Skin"        onClick={cycle("skinTone", 12)}                                                  value={`Tone ${appearance.skinTone + 1}/12`} />
      <SwatchRow label="Body Shape"  onClick={cycle("build", 4)}                                                       value={["Slim", "Athletic", "Broad", "Lean"][appearance.build]} />
      <SwatchRow label="Hair Style"  onClick={cycle("hairStyle", 29)}                                                  value={`Style ${appearance.hairStyle + 1}/29`} />
      <SwatchRow label="Hair Colour" onClick={cycle("hairColor", 12)}                                                  value={`Shade ${appearance.hairColor + 1}/12`} />
      <SwatchRow label="Eyes"        onClick={cycle("eyeColor", 24)}                                                   value={`Variant ${appearance.eyeColor + 1}/24`} />
      <SwatchRow label="Mouth"       onClick={() => onChange({ ...appearance, mouth: (((appearance.mouth ?? 0) + 1) % 29) })} value={`Variant ${(appearance.mouth ?? 0) + 1}/29`} />
      <SwatchRow label="Nose"        onClick={() => onChange({ ...appearance, nose:  (((appearance.nose ?? 0) + 1) % 6) })}  value={`Variant ${(appearance.nose ?? 0) + 1}/6`} />
      <SwatchRow label="Facial Hair" onClick={cycle("facialHair", 8)}                                                  value={["Clean Shaven", "Stubble", "Mustache", "Goatee", "Chin Beard", "Full Beard", "Long Beard", "Handlebar"][appearance.facialHair]} />
      <ColorRow  label="Tunic" value={appearance.tunicColor} onChange={c => onChange({ ...appearance, tunicColor: c })} />
      <ColorRow  label="Cloak" value={appearance.cloakColor} onChange={c => onChange({ ...appearance, cloakColor: c })} />
    </div>
  );
}

function SwatchRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left p-2.5 rounded-lg pressable touch-target" style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(233,227,210,0.55)" }}>{label}</div>
      <div className="text-sm" style={{ color: "#DAA520" }}>{value}</div>
    </button>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const swatches = ["#8b1a1a", "#1a3a8b", "#1a8b3a", "#8b6b1a", "#DAA520", "#5a1a8b", "#3a3a3a", "#d4c5a0"];
  return (
    <div className="p-2.5 rounded-lg" style={{ background: "rgba(15,27,45,0.6)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "rgba(233,227,210,0.55)" }}>{label}</div>
      <div className="flex gap-1 flex-wrap">
        {swatches.map(s => (
          <button
            key={s}
            onClick={() => onChange(s)}
            aria-label={`Choose ${label} colour ${s}`}
            className="w-6 h-6 rounded-md pressable touch-target"
            style={{ background: s, border: value === s ? "2px solid #DAA520" : "1px solid rgba(255,255,255,0.15)" }}
          />
        ))}
      </div>
    </div>
  );
}

function randomAppearance(): HeroAppearance {
  const tunics = ["#8b1a1a", "#1a3a8b", "#1a8b3a", "#8b6b1a", "#DAA520", "#5a1a8b"];
  const cloaks = ["#3a3a3a", "#1a1a3a", "#3a1a1a", "#1a3a3a", "#5a5a5a"];
  const gender: "male" | "female" = Math.random() < 0.5 ? "male" : "female";
  return {
    skinTone:   Math.floor(Math.random() * 12),
    hairStyle:  Math.floor(Math.random() * 29),
    hairColor:  Math.floor(Math.random() * 12),
    eyeColor:   Math.floor(Math.random() * 24),
    build:      Math.floor(Math.random() * 4),
    // Facial hair is uncommon on female heroes by default — keep the
    // option available via the picker, but bias the random roll away
    // from it so a female random doesn't always come up bearded.
    facialHair: gender === "female"
      ? (Math.random() < 0.1 ? 1 : 0)
      : (Math.random() < 0.5 ? 0 : 1 + Math.floor(Math.random() * 7)),
    mouth:      Math.floor(Math.random() * 29),
    nose:       Math.floor(Math.random() * 6),
    gender,
    tunicColor: tunics[Math.floor(Math.random() * tunics.length)],
    cloakColor: cloaks[Math.floor(Math.random() * cloaks.length)],
    scarLayer:  "none",
  };
}

function starterWeaponFor(c: OlympusClass): Hero["equipment"]["weapon"] {
  if (c === "warrior")     return { name: "Bronze Spear",        kind: "spear",  tier: 1 };
  if (c === "hunter")      return { name: "Yew Bow",             kind: "bow",    tier: 1 };
  if (c === "oracle")      return { name: "Oaken Staff",         kind: "staff",  tier: 1 };
  if (c === "rogue")       return { name: "Hooked Dagger",       kind: "dagger", tier: 1 };
  if (c === "champion")    return { name: "Iron Sword",          kind: "sword",  tier: 1 };
  if (c === "scholar")     return { name: "Walking Staff",       kind: "staff",  tier: 1 };
  if (c === "firebrand")   return { name: "Smoking Iron Staff",  kind: "staff",  tier: 1 };
  if (c === "tideborn")    return { name: "Coral Trident",       kind: "spear",  tier: 1 };
  if (c === "shadowsworn") return { name: "Obsidian Blade",      kind: "dagger", tier: 1 };
  if (c === "titan_blood") return { name: "Iron Hammer of Old",  kind: "sword",  tier: 1 };
  return { name: "Walking Staff", kind: "staff", tier: 1 };
}
