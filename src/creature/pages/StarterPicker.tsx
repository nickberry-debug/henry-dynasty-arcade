// Creature Keeper — Pokemon-style starter selection. Shown the first
// time a profile opens the hub with an empty archive. Three offered
// starters across distinct types so the player makes a real choice.

import { motion } from "framer-motion";
import { useCreature } from "../store";
import { getSpecies } from "../catalog";
import { TYPE_INFO, type Creature } from "../types";
import { CreatureSprite } from "../CreatureSprite";

// Three classic starters — one Flame, one Tide, one Bloom (RPS triad).
const STARTER_IDS = ["pyrekit", "tideling", "mossling"];

interface Props {
  onPicked: () => void;
}

export function StarterPicker({ onPicked }: Props) {
  const c = useCreature();

  function pick(speciesId: string) {
    c.chooseStarter(speciesId);
    onPicked();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(900px 600px at 50% 0%, rgba(134,239,172,0.18), transparent 60%), " +
          "linear-gradient(180deg, #050a05 0%, #02050a 100%)",
      }}>
      <div className="max-w-2xl w-full">
        <header className="text-center mb-5">
          <div className="text-[10px] tracking-[0.4em]" style={{ color: "#86efac" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-3xl tracking-wider mt-1" style={{ color: "#fde047" }}>
            CHOOSE YOUR STARTER
          </h1>
          <p className="text-[12px] mt-2 max-w-md mx-auto leading-relaxed" style={{ color: "rgba(229,231,235,0.78)" }}>
            Pick one of three creatures to begin your journey. You can find more in the wild as you battle and explore.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STARTER_IDS.map((id, i) => {
            const sp = getSpecies(id);
            if (!sp) return null;
            const t = TYPE_INFO[sp.type];
            // Preview creature for the sprite renderer.
            const preview: Creature = {
              id: `preview-${id}`,
              speciesId: id,
              nickname: sp.stageNames[0],
              stage: 0, level: 1, xp: 0, bond: 10,
              personality: "playful",
              variant: false,
              stats: { hp: 40, attack: 10, defense: 8, speed: 9, special: 9, energy: 30 },
              learnedMoveIds: sp.movesByStage[0],
              activeMoveIds: sp.movesByStage[0].slice(0, 4),
              needs: { hunger: 80, happiness: 80, energy: 90, cleanliness: 90, health: 100 },
              careStreak: 0,
              bornAt: Date.now(), modifiedAt: Date.now(),
            };
            return (
              <motion.button key={id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 220, damping: 22 }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => pick(id)}
                aria-label={`Choose ${sp.lineName}`}
                className="rounded-2xl p-4 pressable touch-target text-center"
                style={{
                  background: `linear-gradient(180deg, ${t.color}22, rgba(10,15,10,0.92))`,
                  border: `2px solid ${t.color}99`,
                  boxShadow: `0 8px 24px -10px ${t.color}88`,
                  minHeight: 240,
                }}>
                <div className="flex justify-center mb-2">
                  <CreatureSprite creature={preview} size={120} />
                </div>
                <div className="text-[10px] tracking-widest" style={{ color: t.color }}>{t.emoji} {t.label.toUpperCase()}</div>
                <div className="font-display text-lg tracking-wide mt-0.5" style={{ color: "#fef3c7" }}>{sp.lineName}</div>
                <div className="text-[11px] mt-1 leading-snug" style={{ color: "rgba(229,231,235,0.72)" }}>
                  {sp.flavor}
                </div>
                <div className="mt-3 inline-block px-3 py-1.5 rounded-full text-[11px] font-display tracking-widest"
                  style={{ background: t.color, color: "#0a0a14" }}>
                  PICK ME
                </div>
              </motion.button>
            );
          })}
        </div>

        <p className="text-[10px] text-center mt-5 opacity-70" style={{ color: "#c4b5fd" }}>
          More creatures live in the wild. Defeat them in battles to add them to your roster.
        </p>
      </div>
    </motion.div>
  );
}
