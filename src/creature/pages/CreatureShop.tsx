// Creature Keeper — items shop. Spend berries (earned from battles) on
// care items + battle items. All items already in the catalog; this is
// just the purchasing UI.

import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useCreature } from "../store";
import { ITEMS } from "../catalog";

export default function CreatureShop() {
  const navigate = useNavigate();
  const c = useCreature();

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 20% 0%, rgba(253,224,71,0.16), transparent 60%), " +
          "linear-gradient(180deg, #1a1408 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/creature")} aria-label="Back to creature hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#fde047" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>BERRY STORE</h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-widest opacity-70" style={{ color: "#fde047" }}>WALLET</div>
          <div className="font-display text-base" style={{ color: "#fde047" }}>{c.save.berries} 🍒</div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
        <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(229,231,235,0.7)" }}>
          Earn berries by winning battles. Spend them on food, healing, and battle items.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ITEMS.map((item, i) => {
            const canAfford = c.save.berries >= item.price;
            const owned = c.save.items[item.id] ?? 0;
            return (
              <motion.div key={item.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl p-3"
                style={{
                  background: "linear-gradient(135deg, rgba(253,224,71,0.08), rgba(10,10,20,0.85))",
                  border: "1px solid rgba(253,224,71,0.30)",
                  opacity: canAfford ? 1 : 0.6,
                }}>
                <div className="flex items-start gap-3">
                  <div className="text-3xl" aria-hidden="true">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[14px] tracking-wide" style={{ color: "#fef3c7" }}>{item.name}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "rgba(229,231,235,0.65)" }}>{item.description}</div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-[10px] tracking-widest" style={{ color: "#86efac" }}>
                        OWNED: {owned}
                      </div>
                      <button
                        onClick={() => canAfford && c.buyItem(item.id, item.price)}
                        disabled={!canAfford}
                        aria-label={`Buy ${item.name} for ${item.price} berries`}
                        className="px-3 py-1.5 rounded-full pressable touch-target font-display tracking-widest text-[10px]"
                        style={{
                          background: canAfford ? "#fde047" : "rgba(255,255,255,0.05)",
                          color: canAfford ? "#0a0a14" : "#9aa6bf",
                          border: canAfford ? "none" : "1px solid rgba(255,255,255,0.15)",
                        }}>
                        BUY · {item.price} 🍒
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-[11px] text-center mt-6 opacity-65" style={{ color: "#fde047" }}>
          More items unlock as new species are discovered in the wild.
        </div>
      </main>
    </div>
  );
}
