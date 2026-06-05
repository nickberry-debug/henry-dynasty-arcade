// Creature Keeper — wild encounter picker. Roll a list of opponents
// near your active creature's level and pick which one to challenge.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useCreature } from "../store";
import { SPECIES, getSpecies, getHabitat, DEFAULT_HABITAT, hiddenSpeciesUnlocked } from "../catalog";
import { TYPE_INFO, CLASS_INFO } from "../types";
import { CreatureSprite } from "../CreatureSprite";
import { makeCreatureFor } from "../store";

interface FoeOption {
  id: string;
  speciesId: string;
  level: number;
}

function rollFoes(playerLevel: number, count: number, favoredType: string | null, hiddenAllowed: boolean): FoeOption[] {
  const out: FoeOption[] = [];
  // Bias the pool toward common+uncommon early; rare/mythic appear at L8+.
  const pool = SPECIES.filter(s => {
    // Hidden species only appear in the wild once the reveal condition is met.
    if (s.hidden && !hiddenAllowed) return false;
    if (playerLevel < 5) return s.rarity === "common";
    if (playerLevel < 12) return s.rarity === "common" || s.rarity === "uncommon";
    if (playerLevel < 22) return s.rarity !== "mythic";
    return true;
  });
  // The habitat's favored type appears slightly more often.
  const weighted: typeof pool = favoredType
    ? [...pool, ...pool.filter(s => s.type === favoredType)]
    : pool;
  for (let i = 0; i < count; i++) {
    const s = weighted[Math.floor(Math.random() * weighted.length)];
    const lvl = Math.max(1, playerLevel - 1 + Math.floor(Math.random() * 4));
    out.push({ id: `f_${i}_${Date.now()}`, speciesId: s.id, level: lvl });
  }
  return out;
}

export default function CreatureWild() {
  const navigate = useNavigate();
  const c = useCreature();
  const active = c.activeCreatures[0];
  const habitat = getHabitat(c.save.habitatId) ?? getHabitat(DEFAULT_HABITAT)!;

  const [rollSeed, setRollSeed] = useState(0);
  const foes = useMemo(
    () => active ? rollFoes(active.level, 4, habitat.favoredType, hiddenSpeciesUnlocked(c.save.seenSpeciesIds)) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active?.id, active?.level, habitat.id, rollSeed]
  );

  if (!active) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center"
        style={{ background: habitat.bgGradient, color: "#fef3c7" }}>
        <div>
          <div className="font-display text-lg mb-2" style={{ color: habitat.accent }}>No active creature.</div>
          <button onClick={() => navigate("/creature")}
            className="px-4 py-2 rounded-full"
            style={{ background: `${habitat.accent}22`, border: `1px solid ${habitat.accent}55`, color: habitat.accent }}>
            Back to hub
          </button>
        </div>
      </div>
    );
  }

  function challenge(foe: FoeOption) {
    navigate("/creature/battle", {
      state: { playerId: active!.id, foeSpeciesId: foe.speciesId, foeLevel: foe.level },
    });
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(900px 600px at 20% 0%, ${habitat.accent}22, transparent 60%), ` +
                    habitat.bgGradient,
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/creature")} aria-label="Back to creature hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: habitat.accent }}>
            {habitat.emoji} {habitat.name.toUpperCase()}
          </div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>WILD HUNT</h1>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>
            Pick an opponent · {c.save.berries} 🍒
          </div>
        </div>
        <button onClick={() => setRollSeed(n => n + 1)} aria-label="Reroll opponents"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: `${habitat.accent}22`, border: `1px solid ${habitat.accent}55`, color: habitat.accent }}>
          <RefreshCw size={16} />
        </button>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full space-y-3">
        {/* Player tag */}
        <section className="rounded-2xl p-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
          <CreatureSprite creature={active} size={56} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-widest opacity-70" style={{ color: habitat.accent }}>YOUR FIGHTER</div>
            <div className="font-display text-base truncate" style={{ color: "#fef3c7" }}>
              {active.nickname} · L{active.level}
            </div>
            <div className="text-[10px]" style={{ color: "rgba(229,231,235,0.6)" }}>
              HP {active.stats.hp} · ATK {active.stats.attack} · DEF {active.stats.defense}
            </div>
          </div>
        </section>

        {/* Foe options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {foes.map((foe, i) => {
            const sp = getSpecies(foe.speciesId);
            if (!sp) return null;
            const t = TYPE_INFO[sp.type];
            const stageIdx = Math.min(2, Math.floor(foe.level / 8)) as 0 | 1 | 2;
            // Build a transient creature just for the sprite.
            const dummy = makeCreatureFor(foe.speciesId);
            const previewCreature = { ...dummy, stage: stageIdx };
            return (
              <motion.button key={foe.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => challenge(foe)}
                aria-label={`Challenge ${sp.stageNames[stageIdx]} L${foe.level}`}
                className="rounded-2xl p-3 text-left pressable touch-target"
                style={{
                  background: `linear-gradient(135deg, ${t.color}1f, rgba(10,10,20,0.85))`,
                  border: `1.5px solid ${t.color}66`,
                }}>
                <div className="flex items-center gap-3">
                  <CreatureSprite creature={previewCreature} size={64} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] tracking-widest" style={{ color: t.color }}>
                      {t.emoji} {t.label} · {CLASS_INFO[sp.class].emoji} {CLASS_INFO[sp.class].label} · {sp.rarity.toUpperCase()}
                    </div>
                    <div className="font-display text-base truncate" style={{ color: "#fef3c7" }}>
                      {sp.stageNames[stageIdx]} L{foe.level}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>
                      {sp.flavor}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="text-[11px] text-center mt-4 opacity-65" style={{ color: habitat.accent }}>
          Tap a fighter to challenge them. Wins earn 🍒 berries · XP · sometimes a dropped item.
        </div>
      </main>
    </div>
  );
}
