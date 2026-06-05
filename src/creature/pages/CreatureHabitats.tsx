// Creature Keeper — habitat picker. Cosmetic background swap + a small
// passive bond bonus for type-matching creatures. Habitats unlock with
// berries.

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { useCreature } from "../store";
import { HABITATS } from "../catalog";
import { TYPE_INFO } from "../types";

export default function CreatureHabitats() {
  const navigate = useNavigate();
  const c = useCreature();
  const ownedKey = (id: string) => `habitat_${id}`;

  function isOwned(id: string): boolean {
    if (id === "meadow") return true;
    return (c.save.items[ownedKey(id)] ?? 0) > 0;
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 80% 0%, rgba(134,239,172,0.18), transparent 60%), " +
          "linear-gradient(180deg, #08130a 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/creature")} aria-label="Back to creature hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#86efac" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>HABITATS</h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-widest opacity-70" style={{ color: "#fde047" }}>WALLET</div>
          <div className="font-display text-base" style={{ color: "#fde047" }}>{c.save.berries} 🍒</div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
        <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(229,231,235,0.7)" }}>
          Pick where your creatures live. Type-matched creatures get a small bond bonus from their favored habitat.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HABITATS.map((h, i) => {
            const owned = isOwned(h.id);
            const active = c.save.habitatId === h.id;
            const canBuy = !owned && c.save.berries >= h.unlockCost;
            const favoredType = TYPE_INFO[h.favoredType];
            return (
              <motion.div key={h.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: h.bgGradient,
                  border: `2px solid ${active ? h.accent : `${h.accent}55`}`,
                  boxShadow: active ? `0 8px 22px -8px ${h.accent}66` : undefined,
                }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-3xl mb-1" aria-hidden="true">{h.emoji}</div>
                      <div className="font-display text-base tracking-wide" style={{ color: h.accent }}>{h.name}</div>
                      <div className="text-[10px] mt-0.5 opacity-80" style={{ color: "rgba(229,231,235,0.85)" }}>
                        Favors {favoredType.emoji} {favoredType.label}
                      </div>
                    </div>
                    {active && (
                      <span aria-label="Active habitat"
                        className="px-2 py-1 rounded-full text-[9px] font-display tracking-widest"
                        style={{ background: h.accent, color: "#0a0a14" }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-2 leading-relaxed" style={{ color: "rgba(229,231,235,0.78)" }}>
                    {h.description}
                  </p>
                  <div className="mt-3">
                    {owned ? (
                      <button onClick={() => c.setHabitat(h.id, 0)}
                        disabled={active}
                        className="w-full px-3 py-2 rounded-full pressable touch-target font-display tracking-widest text-[10px]"
                        style={{
                          background: active ? "rgba(255,255,255,0.06)" : h.accent,
                          color: active ? "#9aa6bf" : "#0a0a14",
                          border: active ? "1px solid rgba(255,255,255,0.18)" : "none",
                        }}>
                        {active ? (<><Check size={11} className="inline mr-1" />SELECTED</>) : "MOVE IN"}
                      </button>
                    ) : (
                      <button onClick={() => canBuy && c.setHabitat(h.id, h.unlockCost)}
                        disabled={!canBuy}
                        className="w-full px-3 py-2 rounded-full pressable touch-target font-display tracking-widest text-[10px]"
                        style={{
                          background: canBuy ? "#fde047" : "rgba(255,255,255,0.05)",
                          color: canBuy ? "#0a0a14" : "#9aa6bf",
                          border: canBuy ? "none" : "1px solid rgba(255,255,255,0.15)",
                        }}>
                        {canBuy ? `UNLOCK · ${h.unlockCost} 🍒` : (<><Lock size={10} className="inline mr-1" />NEED {h.unlockCost} 🍒</>)}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
