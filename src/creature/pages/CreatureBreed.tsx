// Creature Keeper — breeding screen. Pick two parents (both need bond > 40),
// pay berries, instantly hatch a baby with inherited traits. Variant chance
// is way higher if either parent is a variant.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart } from "lucide-react";
import { useCreature } from "../store";
import { getSpecies } from "../catalog";
import { TYPE_INFO, type Creature } from "../types";
import { CreatureSprite } from "../CreatureSprite";

const BREED_COST = 50;
const BOND_MIN = 40;

export default function CreatureBreed() {
  const navigate = useNavigate();
  const c = useCreature();
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [hatched, setHatched] = useState<Creature | null>(null);

  const canBreed =
    !!a && !!b && a !== b &&
    c.save.berries >= BREED_COST &&
    (c.save.archive.find(x => x.id === a)?.bond ?? 0) >= BOND_MIN &&
    (c.save.archive.find(x => x.id === b)?.bond ?? 0) >= BOND_MIN;

  function doBreed() {
    if (!canBreed || !a || !b) return;
    const beforeIds = new Set(c.save.archive.map(x => x.id));
    c.breed(a, b, BREED_COST);
    // The newest creature with parentIds is the baby — pick it up after state settles.
    setTimeout(() => {
      const fresh = c.save.archive.find(x => !beforeIds.has(x.id) && x.parentIds);
      if (fresh) setHatched(fresh);
    }, 60);
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(900px 600px at 30% 0%, rgba(244,114,182,0.18), transparent 60%), " +
          "linear-gradient(180deg, #1a0820 0%, #050308 100%)",
      }}>
      <header className="px-4 py-4 flex items-center gap-3 max-w-3xl mx-auto w-full safe-top">
        <button onClick={() => navigate("/creature")} aria-label="Back to creature hub"
          className="w-11 h-11 rounded-full flex items-center justify-center pressable touch-target"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.3em] font-display" style={{ color: "#f9a8d4" }}>BERRY KIDS' ARCADE</div>
          <h1 className="font-display text-2xl tracking-wider" style={{ color: "#fde047" }}>BREEDING NEST</h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-widest opacity-70" style={{ color: "#fde047" }}>WALLET</div>
          <div className="font-display text-base" style={{ color: "#fde047" }}>{c.save.berries} 🍒</div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 max-w-3xl mx-auto w-full">
        <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(229,231,235,0.78)" }}>
          Pair two creatures from your archive. Both parents must have bond ≥ {BOND_MIN}.
          Costs {BREED_COST} 🍒. Variant parents double the variant baby chance!
        </p>

        {/* Parent slots */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <ParentSlot label="Parent A" selectedId={a} onPick={setA} />
          <ParentSlot label="Parent B" selectedId={b} onPick={setB} />
        </div>

        {/* Pool to pick from */}
        <section className="rounded-2xl p-3 mb-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-[10px] tracking-[0.3em] mb-2" style={{ color: "#f9a8d4" }}>YOUR ARCHIVE</div>
          {c.save.archive.length < 2 ? (
            <div className="text-[12px] py-4 text-center opacity-70" style={{ color: "rgba(229,231,235,0.7)" }}>
              You need at least 2 creatures to breed. Win some Wild Hunts to grow your archive.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {c.save.archive.map(cr => {
                const sp = getSpecies(cr.speciesId);
                if (!sp) return null;
                const t = TYPE_INFO[sp.type];
                const bondOk = cr.bond >= BOND_MIN;
                const isPicked = cr.id === a || cr.id === b;
                return (
                  <button key={cr.id}
                    onClick={() => {
                      if (!bondOk) return;
                      if (cr.id === a) setA(null);
                      else if (cr.id === b) setB(null);
                      else if (!a) setA(cr.id);
                      else if (!b) setB(cr.id);
                      else setA(cr.id);
                    }}
                    disabled={!bondOk}
                    aria-label={`${cr.nickname} bond ${cr.bond}`}
                    className="rounded-xl p-2 text-center pressable touch-target"
                    style={{
                      background: isPicked
                        ? `linear-gradient(135deg, ${t.color}33, rgba(10,10,20,0.85))`
                        : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${isPicked ? t.color : t.color + "44"}`,
                      opacity: bondOk ? 1 : 0.4,
                    }}>
                    <div className="flex justify-center"><CreatureSprite creature={cr} size={56} /></div>
                    <div className="font-display text-[10px] truncate mt-1" style={{ color: "#fef3c7" }}>{cr.nickname}</div>
                    <div className="text-[9px]" style={{ color: bondOk ? "#86efac" : "#fca5a5" }}>
                      <Heart size={8} className="inline" /> {cr.bond}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <button onClick={doBreed} disabled={!canBreed}
          className="w-full py-3 rounded-2xl pressable touch-target font-display tracking-widest text-[13px]"
          style={{
            background: canBreed ? "linear-gradient(135deg, #f9a8d4, #fbbf24)" : "rgba(255,255,255,0.05)",
            color: canBreed ? "#0a0a14" : "#9aa6bf",
            border: canBreed ? "none" : "1px solid rgba(255,255,255,0.15)",
            minHeight: 56,
          }}>
          {canBreed ? `🥚 HATCH BABY · ${BREED_COST} 🍒` :
            c.save.berries < BREED_COST ? `Need ${BREED_COST} 🍒` :
            !a || !b ? "Pick two parents" :
            "Both parents need bond ≥ 40"}
        </button>

        {/* Hatched modal */}
        <AnimatePresence>
          {hatched && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 flex items-center justify-center p-4"
              style={{ background: "rgba(0,0,0,0.6)" }}>
              <motion.div
                initial={{ y: 24, scale: 0.9 }} animate={{ y: 0, scale: 1 }}
                className="rounded-2xl p-6 text-center max-w-sm w-full"
                style={{
                  background: "linear-gradient(135deg, rgba(249,168,212,0.18), rgba(10,10,20,0.95))",
                  border: "1.5px solid #f9a8d4",
                }}>
                <div className="text-4xl mb-2">🥚</div>
                <div className="font-display text-xl tracking-wider mb-2" style={{ color: "#fde047" }}>HATCHED!</div>
                <div className="flex justify-center mb-3"><CreatureSprite creature={hatched} size={120} /></div>
                <div className="font-display text-base" style={{ color: "#fef3c7" }}>{hatched.nickname}</div>
                <div className="text-[11px] mt-1" style={{ color: "rgba(229,231,235,0.7)" }}>
                  {hatched.variant ? "✨ A variant baby! Lucky roll." : "A healthy baby creature joins your archive."}
                </div>
                <button onClick={() => { setHatched(null); setA(null); setB(null); }}
                  className="mt-4 px-4 py-2 rounded-full pressable touch-target font-display tracking-widest text-[11px]"
                  style={{ background: "#f9a8d4", color: "#0a0a14" }}>
                  CONTINUE
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );

  function ParentSlot({ label, selectedId, onPick }: { label: string; selectedId: string | null; onPick: (id: string | null) => void }) {
    const cr = selectedId ? c.save.archive.find(x => x.id === selectedId) : null;
    return (
      <div className="rounded-2xl p-3 text-center"
        style={{
          background: cr
            ? "linear-gradient(135deg, rgba(249,168,212,0.15), rgba(10,10,20,0.85))"
            : "rgba(255,255,255,0.04)",
          border: `1.5px solid ${cr ? "#f9a8d4" : "rgba(255,255,255,0.15)"}`,
          minHeight: 140,
        }}>
        <div className="text-[10px] tracking-[0.3em] mb-1" style={{ color: "#f9a8d4" }}>{label}</div>
        {cr ? (
          <>
            <div className="flex justify-center"><CreatureSprite creature={cr} size={72} /></div>
            <div className="font-display text-[12px] mt-1" style={{ color: "#fef3c7" }}>{cr.nickname}</div>
            <button onClick={() => onPick(null)}
              className="text-[9px] mt-1 underline opacity-70" style={{ color: "#fca5a5" }}>
              clear
            </button>
          </>
        ) : (
          <div className="text-[11px] py-6 opacity-60" style={{ color: "rgba(229,231,235,0.7)" }}>
            Pick from below
          </div>
        )}
      </div>
    );
  }
}
