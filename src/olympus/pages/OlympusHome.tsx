// Olympus hub — shows the roster, an empty-state if no heroes exist, the
// most-recent hero's status / continue button, and the entry to create a
// new hero.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useOlympus } from "../store";
import { HeroSprite } from "../components/HeroSprite";
import { OlympusDivider } from "../components/OlympusDivider";
import { Plus, Play, BookOpen, Sparkles, Archive, Store } from "lucide-react";
import { GameSwitcher } from "../../components/GameSwitcher";
import { olympusHasApiKey } from "../ai";

export default function OlympusHome() {
  const [showArchived, setShowArchived] = useState(false);
  const hydrated = useOlympus(s => s.hydrated);
  const allHeroes = useOlympus(s => s.heroes);
  const heroes = showArchived ? allHeroes : allHeroes.filter(h => !h.archived);
  const archivedCount = allHeroes.filter(h => h.archived).length;
  const activeHero = useOlympus(s => s.heroes.find(h => h.id === s.activeHeroId));
  const activeAdventure = useOlympus(s => s.activeAdventure);
  const setActiveHero = useOlympus(s => s.setActiveHero);
  const navigate = useNavigate();
  const hasApiKey = olympusHasApiKey();

  // Show nothing while Dexie is loading — avoids flashing the
  // empty-state on first paint when there are actually saved heroes.
  if (!hydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-xs uppercase tracking-[0.3em]" style={{ color: "rgba(218,165,32,0.6)" }}>Loading…</div>
      </div>
    );
  }

  if (allHeroes.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="text-7xl mb-4">⚔️</div>
          <h1 className="font-display text-4xl tracking-[0.2em] mb-3" style={{ color: "#DAA520", fontFamily: "'Cinzel', serif" }}>OLYMPUS</h1>
          <p className="text-lg leading-relaxed mb-2">An ancient world waits.</p>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(233,227,210,0.7)" }}>
            Greek mythology RPG. AI-driven adventures with real three-act structure.
            Build a hero whose story is permanent, whose deeds are recorded, and whose
            blessings from the gods you collect like stars. Voice in, voice out — or
            tap your way through.
          </p>
          {!hasApiKey && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 mb-6 text-xs">
              💡 You don't have an Anthropic API key set yet. Olympus will run with
              hand-written fallbacks for now — playable, but less personalised.
              Add a key in Settings → Olympus for the full AI experience.
            </div>
          )}
          <button
            onClick={() => navigate("/olympus/create")}
            className="px-6 py-3 rounded-2xl font-display tracking-[0.2em] text-base pressable touch-target inline-flex items-center gap-2"
            style={{ background: "#DAA520", color: "#0F1B2D" }}
          >
            <Plus size={18} /> CREATE YOUR FIRST HERO
          </button>
        </motion.div>
        <GameSwitcher />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      <header className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(233,227,210,0.6)" }}>Your Roster</div>
        <h1 className="font-display text-3xl tracking-[0.15em]" style={{ color: "#DAA520", fontFamily: "'Cinzel', serif" }}>HEROES OF OLYMPUS</h1>
        <div className="max-w-xs mx-auto mt-2">
          <OlympusDivider variant={3} />
        </div>
      </header>

      {activeAdventure && activeAdventure.status === "active" && activeHero && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 lg:p-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(218,165,32,0.18), rgba(15,27,45,0.4) 60%)", border: "1px solid rgba(218,165,32,0.3)" }}
        >
          <div className="flex items-start gap-4">
            <HeroSprite hero={activeHero} size={80} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest font-display" style={{ color: "#DAA520" }}>Adventure In Progress</div>
              <div className="font-display text-xl mt-0.5" style={{ fontFamily: "'Cinzel', serif" }}>{activeAdventure.title}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(233,227,210,0.7)" }}>{activeAdventure.hook}</div>
              <div className="text-[11px] mt-2 font-mono" style={{ color: "rgba(218,165,32,0.85)" }}>
                Scene {activeAdventure.currentIndex + 1} of {activeAdventure.totalDecisions}
              </div>
              <button
                onClick={() => navigate(`/olympus/adventure`)}
                className="mt-3 px-4 py-2 rounded-xl font-display tracking-wider text-xs flex items-center gap-2 pressable touch-target"
                style={{ background: "#DAA520", color: "#0F1B2D" }}
              >
                <Play size={14} /> Resume
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {heroes.map(hero => (
          <button
            key={hero.id}
            onClick={async () => { await setActiveHero(hero.id); navigate(`/olympus/hero/${hero.id}`); }}
            className="text-left p-3 rounded-2xl pressable touch-target relative overflow-hidden"
            style={{
              background: hero.id === activeHero?.id
                ? "linear-gradient(135deg, rgba(218,165,32,0.18), rgba(15,27,45,0.4))"
                : "rgba(15,27,45,0.4)",
              border: hero.id === activeHero?.id ? "1px solid rgba(218,165,32,0.4)" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-start gap-3">
              <HeroSprite hero={hero} size={72} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-base leading-tight" style={{ fontFamily: "'Cinzel', serif", color: "#e9e3d2" }}>
                  {hero.name}
                  {hero.nickname && <span className="block text-[10px] italic mt-0.5" style={{ color: "rgba(218,165,32,0.85)" }}>"{hero.nickname}"</span>}
                </div>
                <div className="text-[11px] mt-1" style={{ color: "rgba(233,227,210,0.6)" }}>
                  Level {hero.level} · {hero.className}
                </div>
                <div className="text-[10px] mt-2 flex gap-2 flex-wrap" style={{ color: "rgba(233,227,210,0.55)" }}>
                  <span>HP {hero.hp}/{hero.hpMax}</span>
                  <span>·</span>
                  <span>{hero.drachma} dr</span>
                  <span>·</span>
                  <span>{hero.adventuresCompleted} adv</span>
                </div>
                {hero.equipment.blessings.length > 0 && (
                  <div className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "#DAA520" }}>
                    <Sparkles size={10} /> {hero.equipment.blessings.length} blessing{hero.equipment.blessings.length > 1 ? "s" : ""}
                  </div>
                )}
                {hero.archived && (
                  <div className="text-[9px] mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(233,227,210,0.55)" }}>
                    <Archive size={9} /> ARCHIVED
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-2 flex-wrap">
        <button
          onClick={() => navigate("/olympus/create")}
          className="px-5 py-3 rounded-2xl font-display tracking-wider text-sm pressable touch-target flex items-center gap-2"
          style={{ background: "#DAA520", color: "#0F1B2D" }}
        >
          <Plus size={16} /> Create New Hero
        </button>
        {activeHero && !activeHero.archived && !activeAdventure && (
          <>
            <button
              onClick={() => navigate("/olympus/adventure/new")}
              className="px-5 py-3 rounded-2xl font-display tracking-wider text-sm pressable touch-target flex items-center gap-2"
              style={{ background: "rgba(218,165,32,0.15)", border: "1px solid rgba(218,165,32,0.4)", color: "#DAA520" }}
            >
              <BookOpen size={16} /> Begin Adventure
            </button>
            <button
              onClick={() => navigate("/olympus/shops")}
              className="px-5 py-3 rounded-2xl font-display tracking-wider text-sm pressable touch-target flex items-center gap-2"
              style={{ background: "rgba(218,165,32,0.08)", border: "1px solid rgba(218,165,32,0.25)", color: "#DAA520" }}
            >
              <Store size={16} /> Visit Shops
            </button>
          </>
        )}
        {archivedCount > 0 && (
          <button
            onClick={() => setShowArchived(s => !s)}
            className="px-4 py-3 rounded-2xl text-xs pressable touch-target flex items-center gap-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(233,227,210,0.65)" }}
          >
            <Archive size={13} /> {showArchived ? "Hide" : "Show"} archived ({archivedCount})
          </button>
        )}
      </div>

      <GameSwitcher
        summaries={{
          olympus: activeHero
            ? `${activeHero.name} · L${activeHero.level}`
            : `${heroes.length} hero${heroes.length === 1 ? "" : "es"}`,
        }}
      />
    </div>
  );
}
